// lib/uploadHelpers.ts
import { supabase } from "./supa";

/** Faz upload de um blob WebM e devolve a URL pública. */
export async function uploadWebm(
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
