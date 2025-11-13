"use client";
import { useRef, useState, useCallback } from "react";
import { pickMime, MIMES } from "./mediaSupport";
import { startWebmRecorder } from "./webmInternal";
import { supabase } from "./supa";

/* ---------- MP4 helpers ---------- */
function splitMp4(raw: Uint8Array) {
  for (let i = 0; i < raw.length - 7; i++) {
    if (
      raw[i + 4] === 0x6d &&
      raw[i + 5] === 0x6f &&
      raw[i + 6] === 0x6f &&
      raw[i + 7] === 0x66 // 'moof'
    ) {
      return { header: raw.slice(0, i), fragment: raw.slice(i) };
    }
  }
  return { header: new Uint8Array(), fragment: raw };
}

async function upload(
  blob: Blob,
  consultId: string,
  seq: number,
  ext: "webm" | "m4a",
  onUrl: (u: string, s: number) => void
) {
  const path = `${consultId}/${seq.toString().padStart(4, "0")}.${ext}`;
  const { error } = await supabase.storage
    .from("consult-audio")
    .upload(path, blob, { contentType: blob.type, upsert: true });

  if (error) {
    console.error(error);
    return;
  }
  const { data } = supabase.storage.from("consult-audio").getPublicUrl(path);
  onUrl(data.publicUrl, seq);
}

/* ---------- Hook unificado ---------- */
export function useUniversalRecorder(
  consultId: string,
  onUrl: (u: string, s: number) => void,
  sliceMs = 5_000
) {
  const [isRecording, setRec] = useState(false);
  const mime = pickMime(); // decide em runtime
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const start = useCallback(async () => {
    if (isRecording || !mime) {
      if (!mime) alert("Navegador não suporta MediaRecorder.");
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    if (mime === "webm") {
      // --- caminho Android / iOS 18.4+
      recRef.current = startWebmRecorder(stream, consultId, onUrl, sliceMs);
    } else {
      // --- caminho AAC / mp4
      let seq = 0;
      let header: Uint8Array | null = null;

      const handler = async (e: BlobEvent) => {
        const raw = new Uint8Array(await e.data.arrayBuffer());
        const { header: hdr, fragment } = splitMp4(raw);

        if (!header) {
          // primeiro bloco: guarda header
          header = hdr;
          await upload(e.data, consultId, seq++, "m4a", onUrl);
          return;
        }
        const combo = new Uint8Array(header.length + fragment.length);
        combo.set(header, 0);
        combo.set(fragment, header.length);

        await upload(
          new Blob([combo], { type: "audio/mp4" }),
          consultId,
          seq++,
          "m4a",
          onUrl
        );
      };

      const rec = new MediaRecorder(stream, { mimeType: MIMES.mp4 });
      rec.ondataavailable = handler;
      rec.start(sliceMs);
      recRef.current = rec;
    }
    setRec(true);
  }, [isRecording, mime, sliceMs, consultId, onUrl]);

  const stop = useCallback(() => {
    recRef.current?.stop();
    recRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setRec(false);
  }, []);

  return { isRecording, start, stop };
}
