import crypto from 'crypto';
import { logger } from '../config/index.js';

/**
 * ----------------------------------
 * KEY MANAGEMENT & VERSION CONTROL
 * ----------------------------------
 * Encryption keys (and their salts) are stored by version.
 * - v1: Old key (deprecated)
 * - v2: Current key used for all new encryptions
 *
 * In production, these MUST come from environment variables.
 * Each version allows us to:
 *   • Rotate keys without breaking old encrypted data
 *   • Decrypt legacy records using their original key
 */
const RAW_KEYS = {
  v1: {
    key: process.env.ENCRYPTION_KEY_V1,
    salt: process.env.ENCRYPTION_SALT_V1,
  },
  v2: {
    key: process.env.ENCRYPTION_KEY_V2,
    salt: process.env.ENCRYPTION_SALT_V2,
  }
};

/**
 * The version that will be used for ALL new encryptions.
 * Updating this is how you rotate keys system-wide.
 */
const CURRENT_VERSION = 'v1';

/**
 * ----------------------------------
 * ALGORITHM SETTINGS (AES-256-GCM)
 * ----------------------------------
 * AES-256-GCM provides:
 *   • Strong encryption (256-bit key)
 *   • Built-in integrity check via authentication tag (authTag)
 *
 * IV length (12 bytes) and auth tag length (16 bytes) follow GCM best practices.
 */
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * ----------------------------------
 * KEY DERIVATION (PBKDF2)
 * ----------------------------------
 * Keys are derived once at startup using PBKDF2.
 * This prevents expensive PBKDF2 operations on each request.
 *
 * Output:
 *   DERIVED_KEYS = {
 *     v1: <Buffer>,
 *     v2: <Buffer>
 *   }
 */
const DERIVED_KEYS = {};
Object.keys(RAW_KEYS).forEach((version) => {
  DERIVED_KEYS[version] = crypto.pbkdf2Sync(
    RAW_KEYS[version].key,
    RAW_KEYS[version].salt,
    100000,
    32,
    'sha256'
  );
});

/**
 * -----------------------------------------------------------
 * ENCRYPT TEXT (AES-256-GCM)
 * -----------------------------------------------------------
 * Encrypts a UTF-8 string using the CURRENT_VERSION key.
 *
 * Output format:
 *    version:iv:authTag:encryptedData
 *
 * All pieces are Base64-encoded for safe storage in text fields.
 */
export const encryptText = (text) => {
  if (typeof text !== 'string' || !text) return '';

  const key = DERIVED_KEYS[CURRENT_VERSION];
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  console.log(cipher);

  const encryptedBuffer = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final()
  ]);

  const authTag = cipher.getAuthTag();

  return `${CURRENT_VERSION}:${iv.toString('base64')}:${authTag.toString('base64')}:${encryptedBuffer.toString('base64')}`;
};

/**
 * -----------------------------------------------------------
 * DECRYPT TEXT (AES-256-GCM)
 * -----------------------------------------------------------
 * Decrypts a string by:
 *   1) Parsing version + encrypted parts
 *   2) Selecting the correct key for that version
 *   3) Reconstructing IV, AuthTag, and ciphertext
 *   4) Performing AES-GCM decryption
 *
 * If decryption fails (wrong version, corrupted data, etc.),
 * we return an empty string and log the error for debugging.
 */
export const decryptText = (encryptedString, context = {}) => {
  if (!encryptedString || typeof encryptedString !== 'string') return '';

  try {
    // Expected format: version:iv:authTag:data
    const parts = encryptedString.split(':');

    if (parts.length !== 4) {
      // Could handle legacy formats here (e.g., old CBC mode)
      throw new Error('Invalid encrypted string format');
    }

    const [version, ivBase64, tagBase64, dataBase64] = parts;

    // Look up derived key by version
    const key = DERIVED_KEYS[version];
    if (!key) throw new Error(`Unknown encryption key version: ${version}`);

    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(tagBase64, 'base64');
    const encrypted = Buffer.from(dataBase64, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);

    return decrypted.toString('utf8');

  } catch (err) {
    logger.error('Decryption failed', { error: err.message, context });
    return '';
  }
};
