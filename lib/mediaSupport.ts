export const MIMES = {
  webm: "audio/webm;codecs=opus",
  mp4: "audio/mp4", // AAC LC
};

export function pickMime(): "webm" | "mp4" | null {
  if (typeof MediaRecorder === "undefined") return null;
  if (MediaRecorder.isTypeSupported(MIMES.webm)) return "webm";
  if (MediaRecorder.isTypeSupported(MIMES.mp4)) return "mp4";
  return null; // navegador não suporta gravação
}
