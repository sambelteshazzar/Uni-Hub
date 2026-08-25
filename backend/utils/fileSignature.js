// ============================================
// FILE SIGNATURE - Magic-byte type sniffing
// ============================================
// Never trust extensions or declared MIME types. Returns the sniffed MIME
// type from leading bytes, or null when the buffer matches no allowlisted
// document format. Hand-rolled on purpose: three signatures don't justify
// a dependency (AGENTS.md supply-chain rule).

const SIGNATURES = [
  { mime: 'image/jpeg', bytes: Buffer.from([0xFF, 0xD8, 0xFF]) },
  { mime: 'image/png', bytes: Buffer.from([0x89, 0x50, 0x4E, 0x47]) },
  { mime: 'application/pdf', bytes: Buffer.from('%PDF') },
];

function sniffDocumentType (buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    return null;
  }
  for (const sig of SIGNATURES) {
    if (buffer.subarray(0, sig.bytes.length).equals(sig.bytes)) {
      return sig.mime;
    }
  }
  return null;
}

module.exports = { sniffDocumentType };
