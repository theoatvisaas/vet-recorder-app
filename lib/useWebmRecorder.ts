// lib/useWebmRecorder.ts
"use client";
import { useState, useRef, useCallback } from "react";
import { supabase } from "./supa";

/* remove elemento Duration (ID 44 89) do header */
function stripDuration(header: Uint8Array) {
  for (let i = 0; i < header.length - 1; i++) {
    if (header[i] === 0x44 && header[i + 1] === 0x89) {
      const sizeFirst = header[i + 2]; // 1º byte do tamanho EBML
      const sizeLen = 1; // para Duration cabe sempre em 1 byte
      const dataLen = sizeFirst & 0b01111111; // remove bit marcador
      const end = i + 2 + sizeLen + dataLen;
      const out = new Uint8Array(header.length - (end - i));
      out.set(header.slice(0, i), 0);
      out.set(header.slice(end), i);
      return out;
    }
  }
  return header; // Duration não encontrado
}

/* divide header e clusters */
function splitWebM(raw: Uint8Array) {
  for (let i = 0; i < raw.length - 3; i++) {
    if (
      raw[i] === 0x1f &&
      raw[i + 1] === 0x43 &&
      raw[i + 2] === 0xb6 &&
      raw[i + 3] === 0x75
    ) {
      return {
        header: raw.slice(0, i),
        clusters: raw.slice(i),
      };
    }
  }
  return { header: new Uint8Array(), clusters: raw };
}

async function upload(
  blob: Blob,
  consultId: string,
  seq: number,
  onUrl: (url: string, seq: number) => void
) {
  const path = `${consultId}/${seq.toString().padStart(4, "0")}.webm`;
  const { error } = await supabase.storage
    .from("consult-audio")
    .upload(path, blob, { contentType: "audio/webm", upsert: true });

  if (error) return console.error(error);

  const { data } = supabase.storage.from("consult-audio").getPublicUrl(path);
  onUrl(data.publicUrl, seq);
}

export function useWebmRecorder(
  consultId: string,
  onUploaded: (url: string, seq: number) => void,
  sliceMs = 5_000
) {
  const [isRecording, setIsRecording] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const seqRef = useRef(0);
  const headerRef = useRef<Uint8Array>();

  const handleChunk = async (ev: BlobEvent) => {
    if (!ev.data.size) return;

    const raw = new Uint8Array(await ev.data.arrayBuffer());
    const { header, clusters } = splitWebM(raw);
    const seq = seqRef.current++;

    if (!headerRef.current) {
      headerRef.current = stripDuration(header); // ← ajuste
      // blob #0 já inclui áudio → sobe completo
      await upload(ev.data, consultId, seq, onUploaded);
      return;
    }

    const combo = new Uint8Array(headerRef.current.length + clusters.length);
    combo.set(headerRef.current, 0);
    combo.set(clusters, headerRef.current.length);

    const fixed = new Blob([combo], { type: "audio/webm" });
    await upload(fixed, consultId, seq, onUploaded);
  };

  const start = useCallback(async () => {
    if (isRecording) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const rec = new MediaRecorder(stream, {
      mimeType: "audio/webm;codecs=opus",
      audioBitsPerSecond: 96_000,
    });
    rec.addEventListener("dataavailable", handleChunk);
    rec.start(sliceMs);

    recRef.current = rec;
    seqRef.current = 0;
    headerRef.current = undefined;
    setIsRecording(true);
  }, [isRecording, sliceMs]);

  const stop = useCallback(() => {
    recRef.current?.stop();
    recRef.current?.stream.getTracks().forEach((t) => t.stop());
    recRef.current = null;
    setIsRecording(false);
  }, []);

  return { isRecording, start, stop };
}
