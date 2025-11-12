"use client";
import { useRef, useState, useCallback } from "react";

type UseRecorderReturn = {
  isRecording: boolean;
  start: () => Promise<void>;
  stop: () => void;
};

/**
 * Grava áudio em blocos de 10 s (Opus) e chama onBlob(blob, seq).
 * Mantém o MediaRecorder ativo enquanto a aba não for descarregada pelo SO.
 */
export function useRecorder(
  onBlob: (blob: Blob, seq: number) => void,
  sliceMs = 10_000
): UseRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const seqRef = useRef(0);

  const start = useCallback(async () => {
    if (isRecording) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Safari iOS precisa de mimeType explícito.
    const rec = new MediaRecorder(stream, {
      mimeType: "audio/webm;codecs=opus",
      audioBitsPerSecond: 96_000,
    });
    recRef.current = rec;
    seqRef.current = 0;

    rec.ondataavailable = (e) => {
      if (e.data.size) onBlob(e.data, seqRef.current++);
    };
    rec.start(sliceMs);
    setIsRecording(true);
  }, [isRecording, onBlob, sliceMs]);

  const stop = useCallback(() => {
    recRef.current?.stop();
    recRef.current?.stream.getTracks().forEach((t) => t.stop());
    recRef.current = null;
    setIsRecording(false);
  }, []);

  return { isRecording, start, stop };
}
