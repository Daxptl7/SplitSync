import CryptoJS from "crypto-js";

const ENCRYPTION_KEY =
  process.env.NEXT_PUBLIC_ENCRYPTION_KEY || "default-dev-key-change-me";

/**
 * Encrypt a string using AES-256.
 * Used for sensitive fields before sending to the API.
 */
export function encrypt(plainText) {
  if (!plainText) return "";
  return CryptoJS.AES.encrypt(plainText, ENCRYPTION_KEY).toString();
}

/**
 * Decrypt an AES-256 encrypted string.
 */
export function decrypt(cipherText) {
  if (!cipherText) return "";
  const bytes = CryptoJS.AES.decrypt(cipherText, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

/**
 * Encrypt an object — encrypts specified fields only.
 * @param {Object} data - The data object
 * @param {string[]} sensitiveFields - Field names to encrypt
 */
export function encryptFields(data, sensitiveFields = []) {
  const encrypted = { ...data };
  for (const field of sensitiveFields) {
    if (encrypted[field]) {
      encrypted[field] = encrypt(String(encrypted[field]));
    }
  }
  return encrypted;
}
