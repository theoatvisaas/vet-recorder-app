import { uploadWebm } from "./uploadHelpers";

/* remove elemento Duration (ID 44 89) do header */
function stripDuration(header: Uint8Array) {
  for (let i = 0; i < header.length - 1; i++) {
    if (header[i] === 0x44 && header[i + 1] === 0x89) {
      const sizeFirst = header[i + 2];
      const sizeLen = 1;
      const dataLen = sizeFirst & 0b0111_1111; // limpa bit marcador
      const end = i + 2 + sizeLen + dataLen;

      const out = new Uint8Array(header.length - (end - i));
      out.set(header.slice(0, i), 0);
      out.set(header.slice(end), i);
      return out;
    }
  }
  return header; // Duration não encontrado
}

/* divide header e clusters */
function splitWebM(raw: Uint8Array) {
  for (let i = 0; i < raw.length - 3; i++) {
    if (
      raw[i] === 0x1f &&
      raw[i + 1] === 0x43 &&
      raw[i + 2] === 0xb6 &&
      raw[i + 3] === 0x75
    ) {
      return { header: raw.slice(0, i), clusters: raw.slice(i) };
    }
  }
  return { header: new Uint8Array(), clusters: raw };
}

export function startWebmRecorder(
  stream: MediaStream,
  consultId: string,
  onUrl: (url: string, seq: number) => void,
  sliceMs: number
) {
  let seq = 0;
  let header: Uint8Array | null = null;

  const handle = async (ev: BlobEvent) => {
    const raw = new Uint8Array(await ev.data.arrayBuffer());
    const { header: hdr, clusters } = splitWebM(raw);

    if (!header) {
      header = stripDuration(hdr);
      await uploadWebm(ev.data, consultId, seq++, onUrl);
      return;
    }
    const combo = new Uint8Array(header.length + clusters.length);
    combo.set(header, 0);
    combo.set(clusters, header.length);
    await uploadWebm(
      new Blob([combo], { type: "audio/webm" }),
      consultId,
      seq++,
      onUrl
    );
  };

  const rec = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
  rec.addEventListener("dataavailable", handle);
  rec.start(sliceMs);
  return rec; // devolve MediaRecorder para parar depois
}
