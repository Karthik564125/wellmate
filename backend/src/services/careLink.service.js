// Invite code helpers for CareLink. No Express types here.

import crypto from "node:crypto";

export const INVITE_TTL_DAYS = 7;

// 32 symbols: A-Z without I and O, plus 2-9 (no 0, 1). 256 is divisible by 32,
// but the code uses 5-bit chunks, so there is no modulo bias.
const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const INVITE_LENGTH = 8;

// Returns a plain 8-character code. Shown to the inviter once; only the hash is stored.
export function generateInviteCode() {
  const bytes = crypto.randomBytes(6); // 48 bits; 8 chunks of 5 bits use the top 40
  let bits = 0n;
  for (const byte of bytes) {
    bits = (bits << 8n) | BigInt(byte);
  }

  let code = "";
  for (let i = 0; i < INVITE_LENGTH; i += 1) {
    const shift = BigInt(48 - 5 * (i + 1));
    const index = Number((bits >> shift) & 31n);
    code += INVITE_ALPHABET[index];
  }
  return code;
}

// SHA-256 hex of the normalized code. Accept uses the same normalization.
export function hashInviteCode(code) {
  return crypto
    .createHash("sha256")
    .update(String(code).toUpperCase().trim())
    .digest("hex");
}
