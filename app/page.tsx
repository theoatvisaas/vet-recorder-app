"use client";
import { useRef, useState } from "react";
import { useUniversalRecorder } from "@/lib/useUniversalRecorder";

export default function Page() {
  const consultId = useRef(`consult-${crypto.randomUUID()}`);
  const [urls, setUrls] = useState<string[]>([]);
  const { isRecording, start, stop } = useUniversalRecorder(
    consultId.current,
    (u) => setUrls((p) => [...p, u])
  );

  return (
    <main className="p-6 space-y-4">
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
          <li key={i}>
            <audio src={u} controls className="w-full" />
          </li>
        ))}
      </ul>
    </main>
  );
}
