// app/page.tsx
"use client";
import { useState } from "react";
import { useRecorder } from "@/lib/useRecorder";

export default function Home() {
  const [urls, setUrls] = useState<string[]>([]);
  const consultId = "consult-" + Date.now(); // gerar ID simples

  const { start, stop, isRecording } = useRecorder(
    consultId,
    (url) => setUrls((u) => [...u, url]) // salva ordem natural
  );

  return (
    <main className="p-6 space-y-4">
      <button
        onClick={isRecording ? stop : start}
        className="px-4 py-2 rounded text-white
          transition bg-emerald-600 hover:bg-emerald-700"
      >
        {isRecording ? "Parar gravação" : "Iniciar gravação"}
      </button>

      <h2 className="font-medium">Blocos enviados:</h2>
      <ul className="space-y-2">
        {urls.map((u, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-12">#{i}</span>
            <audio controls src={u} className="w-full" />
          </li>
        ))}
      </ul>
    </main>
  );
}
