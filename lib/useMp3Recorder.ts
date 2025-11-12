"use client";

import { useState, useRef, useCallback } from "react";
import MicRecorder from "mic-recorder-to-mp3";
import { supabase } from "./supa"; // já criado antes

type UseRec = {
  isRecording: boolean;
  start: () => Promise<void>;
  stop: () => void;
};

/** Grava em blocos MP3 de `sliceMs` (padrão 10 s) e sobe p/ Supabase. */
export function useMp3Recorder(
  consultId: string,
  onUploaded: (url: string, seq: number) => void,
  sliceMs = 10_000
): UseRec {
  const [isRecording, setIsRecording] = useState(false);
  const mp3Ref = useRef<MicRecorder | null>(null);
  const seqRef = useRef(0);
  const timer = useRef<NodeJS.Timeout>();

  const recordChunk = async () => {
    if (!mp3Ref.current) return;

    // Para → pega blob → reinicia imediatamente
    const [__, blob] = await mp3Ref.current.stop().getMp3();
    const seq = seqRef.current++;
    await uploadBlob(blob, seq);

    await mp3Ref.current.start();
  };

  async function uploadBlob(blob: Blob, seq: number) {
    const filePath = `${consultId}/${seq.toString().padStart(4, "0")}.mp3`;

    const { error } = await supabase.storage
      .from("consult-audio")
      .upload(filePath, blob, { contentType: "audio/mpeg" });

    if (error) {
      console.error("upload failed", error);
      return;
    }
    const { data } = supabase.storage
      .from("consult-audio")
      .getPublicUrl(filePath);

    onUploaded(data.publicUrl, seq);
  }

  const start = useCallback(async () => {
    if (isRecording) return;

    const recorder = new MicRecorder({ bitRate: 128, sampleRate: 16000 });
    mp3Ref.current = recorder;
    seqRef.current = 0;

    await recorder.start();
    timer.current = setInterval(recordChunk, sliceMs);
    setIsRecording(true);
  }, [isRecording, sliceMs]);

  const stop = useCallback(async () => {
    clearInterval(timer.current);
    if (mp3Ref.current && isRecording) {
      // garante que o último pedaço seja salvo.
      await recordChunk();
    }
    mp3Ref.current = null;
    setIsRecording(false);
  }, [isRecording]);

  return { isRecording, start, stop };
}
