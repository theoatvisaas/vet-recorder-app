"use client";
import { useRef, useState } from "react";
import { useWebmRecorder } from "@/lib/useWebmRecorder";

export default function Home() {
  const consultId = useRef(`consult-${crypto.randomUUID()}`);
  const [urls, setUrls] = useState<string[]>([]);

  const { start, stop, isRecording } = useWebmRecorder(consultId.current, (u) =>
    setUrls((prev) => [...prev, u])
  );

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Recorder fixado (WebM)</h1>

      <button
        onClick={isRecording ? stop : start}
        className={`px-6 py-3 rounded text-white ${
          isRecording ? "bg-red-600" : "bg-emerald-600"
        }`}
      >
        {isRecording ? "Parar" : "Gravar"}
      </button>

      <ul className="space-y-2">
        {urls.map((u, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="text-xs w-8 text-gray-500">#{i}</span>
            <audio controls src={u} className="w-full" />
          </li>
        ))}
      </ul>
    </main>
  );
}
