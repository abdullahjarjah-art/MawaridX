/**
 * File content validation — verifies the actual bytes match the claimed MIME type.
 * Prevents attackers from uploading executables disguised as images/PDFs.
 *
 * Magic-byte signatures: https://en.wikipedia.org/wiki/List_of_file_signatures
 */

type Signature = {
  mime: string;
  exts: string[];
  /** Bytes that must appear at offset 0 (or `offset` if specified) */
  bytes: number[];
  offset?: number;
};

const SIGNATURES: Signature[] = [
  // ── Images ──
  { mime: "image/jpeg", exts: [".jpg", ".jpeg"], bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png",  exts: [".png"],          bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: "image/gif",  exts: [".gif"],          bytes: [0x47, 0x49, 0x46, 0x38] }, // GIF8
  { mime: "image/webp", exts: [".webp"],         bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF (WebP container)

  // ── Documents ──
  { mime: "application/pdf", exts: [".pdf"], bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF

  // ── Office (xlsx/docx are zip-based) ──
  { mime: "application/zip", exts: [".xlsx", ".docx", ".pptx", ".zip"], bytes: [0x50, 0x4b, 0x03, 0x04] },
  { mime: "application/zip", exts: [".xlsx", ".docx", ".pptx", ".zip"], bytes: [0x50, 0x4b, 0x05, 0x06] },
];

/** Verify file bytes match its claimed MIME type. Returns true if valid. */
export function verifyFileSignature(buffer: Buffer, claimedMime: string, fileName: string): boolean {
  const ext = "." + (fileName.split(".").pop() ?? "").toLowerCase();

  // Find signatures matching the claimed mime OR extension
  const candidates = SIGNATURES.filter(s => s.mime === claimedMime || s.exts.includes(ext));

  if (candidates.length === 0) {
    // Unknown type — reject by default (allowlist policy)
    return false;
  }

  for (const sig of candidates) {
    const offset = sig.offset ?? 0;
    if (buffer.length < offset + sig.bytes.length) continue;
    let match = true;
    for (let i = 0; i < sig.bytes.length; i++) {
      if (buffer[offset + i] !== sig.bytes[i]) { match = false; break; }
    }
    if (match) return true;
  }
  return false;
}

/** Sanitize a user-supplied filename for safe storage. */
export function sanitizeFileName(name: string): string {
  // Keep alphanumerics, dash, underscore, dot. Drop everything else.
  const base = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
  // Prevent leading dots (hidden files) and double extensions
  return base.replace(/^\.+/, "").replace(/\.{2,}/g, ".");
}
