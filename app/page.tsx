"use client";
import { useRecorder } from "@/lib/useRecorder";
import { useRef, useState } from "react";

export default function Home() {
  const logRef = useRef<HTMLDivElement>(null);
  const [chunks, setChunks] = useState<number>(0);

  const { isRecording, start, stop } = useRecorder((blob, seq) => {
    // Simula envio
    console.log(`Enviando blob #${seq}`, blob);
    setChunks((c) => c + 1);
    // Mostra no log visual
    logRef.current?.insertAdjacentHTML(
      "afterbegin",
      `<div class="text-sm text-gray-600">blob #${seq} — ${(
        blob.size / 1024
      ).toFixed(1)} KB</div>`
    );
  });

  return (
    <main className="flex flex-col items-center gap-6 py-12">
      <h1 className="text-2xl font-semibold">Vet Recorder (demo)</h1>

      <button
        onClick={isRecording ? stop : start}
        className={`rounded px-6 py-3 text-white transition-colors ${
          isRecording
            ? "bg-red-600 hover:bg-red-700"
            : "bg-emerald-600 hover:bg-emerald-700"
        }`}
      >
        {isRecording ? "Parar gravação" : "Iniciar gravação"}
      </button>

      <p className="text-sm text-gray-500">
        Blocos gravados: <span className="font-medium">{chunks}</span>
      </p>

      <div ref={logRef} className="w-full max-w-md space-y-1" />
    </main>
  );
}
