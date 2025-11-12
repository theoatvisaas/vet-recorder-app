import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import Busboy from "busboy";
import { readFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { Readable } from "stream";
import crypto from "crypto";

/* ---------- escolhe binário:  ffmpeg-static (Linux)  ||  @ffmpeg-installer (mac/Win) ---------- */
ffmpeg.setFfmpegPath(ffmpegPath!);

/* ---------- Supabase admin (somente no server) ---------- */
const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // NUNCA expose no client
);

export const runtime = "nodejs"; // garante Node (Vercel Function)
export const dynamic = "force-dynamic"; // sem cache

export async function POST(req: NextRequest) {
  if (!req.body) {
    return NextResponse.json({ error: "no body" }, { status: 415 });
  }

  /* ---------- prepara arquivos temporários ---------- */
  const tmpIn = join(tmpdir(), `${crypto.randomUUID()}.webm`);
  const tmpOut = tmpIn.replace(".webm", ".wav");

  let consultId = "";
  let seq = "";

  /* ---------- parse multipart via Busboy ---------- */
  const bb = Busboy({ headers: Object.fromEntries(req.headers) });

  const done = new Promise<void>((resolve, reject) => {
    bb.on("file", (_, stream) =>
      stream.pipe(require("fs").createWriteStream(tmpIn))
    );
    bb.on("field", (name, value) => {
      if (name === "consultId") consultId = value;
      if (name === "seq") seq = value;
    });
    bb.once("finish", resolve);
    bb.once("error", reject);
  });

  Readable.fromWeb(req.body as any).pipe(bb);
  await done;

  /* ---------- WebM → WAV 16 kHz mono ---------- */
  await new Promise<void>((ok, err) =>
    ffmpeg(tmpIn)
      .audioChannels(1)
      .audioFrequency(16000)
      .output(tmpOut)
      .on("end", ok)
      .on("error", err)
      .run()
  );

  /* ---------- upload para Supabase ---------- */
  const filePath = `${consultId}/${seq.padStart(4, "0")}.wav`;
  const wavBuf = await readFile(tmpOut);

  const { error } = await supa.storage
    .from("consult-audio")
    .upload(filePath, wavBuf, {
      contentType: "audio/wav",
      upsert: true,
    });

  // limpa tmp
  await unlink(tmpIn).catch(() => {});
  await unlink(tmpOut).catch(() => {});

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = supa.storage.from("consult-audio").getPublicUrl(filePath);
  return NextResponse.json({ url: data.publicUrl });
}
