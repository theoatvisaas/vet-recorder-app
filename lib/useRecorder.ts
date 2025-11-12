"use client";

import { supabase } from "./supa";
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
  consultId: string,
  onUploaded: (publicUrl: string, seq: number) => void,
  sliceMs = 5_000
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

    rec.ondataavailable = async (e) => {
      if (!e.data.size) return;
      const seq = seqRef.current++;
      // caminho: consultId/seq.webm
      const filePath = `${consultId}/${seq.toString().padStart(4, "0")}.webm`;

      const { error } = await supabase.storage
        .from("consult-audio")
        .upload(filePath, e.data, { contentType: "audio/webm" });

      if (error) {
        console.error("upload failed", error);
        return;
      }

      // pegar URL pública
      const { data } = supabase.storage
        .from("consult-audio")
        .getPublicUrl(filePath);

      onUploaded(data.publicUrl, seq);
    };
    rec.start(sliceMs);
    setIsRecording(true);
  }, [isRecording, onUploaded, sliceMs]);

  const stop = useCallback(() => {
    recRef.current?.stop();
    recRef.current?.stream.getTracks().forEach((t) => t.stop());
    recRef.current = null;
    setIsRecording(false);
  }, []);

  return { isRecording, start, stop };
}
