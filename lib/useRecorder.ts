"use client";

import { useRef, useState, useCallback } from "react";

type UseRecorderReturn = {
  isRecording: boolean;
  start: () => Promise<void>;
  stop: () => void;
};

/**
 * Grava áudio em blocos (sliceMs) e envia cada blob para
 * /api/convert-upload, que converte WebM→WAV e salva no Storage.
 */
export function useRecorder(
  consultId: string,
  onUploaded: (publicUrl: string, seq: number) => void,
  sliceMs = 5_000
): UseRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const seqRef = useRef(0);

  const start = useCallback(async () => {
    if (isRecording) return;

    /* 1. Solicita microfone */
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    /* 2. Define mimeType – Chrome/Firefox ok com WebM; Safari aceita mas não toca */
    const rec = new MediaRecorder(stream, {
      mimeType: "audio/webm;codecs=opus",
      audioBitsPerSecond: 96_000,
    });
    recRef.current = rec;
    seqRef.current = 0;

    /* 3. Callback a cada blob */
    rec.ondataavailable = async (e: BlobEvent) => {
      if (!e.data.size) return;
      const seq = seqRef.current++;

      /* monta multipart/form-data */
      const fd = new FormData();
      fd.append("file", e.data, "chunk.webm");
      fd.append("consultId", consultId);
      fd.append("seq", String(seq));

      try {
        const res = await fetch("/api/convert-upload", {
          method: "POST",
          body: fd,
        });
        if (!res.ok) throw new Error(await res.text());

        const { url } = (await res.json()) as { url: string };
        onUploaded(url, seq);
      } catch (err) {
        console.error("upload failed", err);
      }
    };

    rec.start(sliceMs); // grava em blocos de 5 s
    setIsRecording(true);
  }, [consultId, isRecording, onUploaded, sliceMs]);

  const stop = useCallback(() => {
    recRef.current?.stop();
    recRef.current?.stream.getTracks().forEach((t) => t.stop());
    recRef.current = null;
    setIsRecording(false);
  }, []);

  return { isRecording, start, stop };
}
