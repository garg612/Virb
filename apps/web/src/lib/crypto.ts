"use client";

import { api } from "./api";

// Cache derived AES-GCM shared keys in memory: Map<"userIdA_userIdB", CryptoKey>
const sharedKeyCache = new Map<string, CryptoKey>();

// Helper: Convert ArrayBuffer to Base64
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper: Convert Base64 to ArrayBuffer
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Ensures the logged-in user has an ECDH P-256 keypair.
 * If not present in localStorage, generates a new one,
 * saves private key locally, and registers the public key with the server.
 */
export async function ensureUserE2EE(userId: number, serverPublicKey?: string | null): Promise<string | null> {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    return null;
  }

  const privStorageKey = `e2ee_priv_${userId}`;
  const pubStorageKey = `e2ee_pub_${userId}`;

  const storedPriv = localStorage.getItem(privStorageKey);
  const storedPub = localStorage.getItem(pubStorageKey);

  if (storedPriv && storedPub) {
    // If server does not have the public key yet, upload it
    if (!serverPublicKey || serverPublicKey !== storedPub) {
      try {
        await api.updatePublicKey(storedPub);
      } catch (err) {
        console.warn("Failed to sync public key to server", err);
      }
    }
    return storedPub;
  }

  try {
    // Generate new ECDH P-256 key pair
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "ECDH",
        namedCurve: "P-256",
      },
      true, // extractable
      ["deriveKey", "deriveBits"]
    );

    // Export keys to JWK format
    const exportedPriv = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);
    const exportedPub = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);

    const privString = JSON.stringify(exportedPriv);
    const pubString = JSON.stringify(exportedPub);

    localStorage.setItem(privStorageKey, privString);
    localStorage.setItem(pubStorageKey, pubString);

    // Upload public key to backend
    await api.updatePublicKey(pubString);

    return pubString;
  } catch (err) {
    console.error("Error initializing E2EE keypair:", err);
    return null;
  }
}

/**
 * Derives an AES-GCM shared encryption key between current user and the other participant.
 */
async function getSharedKey(
  currentUserId: number,
  otherUserPublicKeyJWK: string
): Promise<CryptoKey | null> {
  if (typeof window === "undefined" || !window.crypto?.subtle) return null;

  const privStorageKey = `e2ee_priv_${currentUserId}`;
  const myPrivJWKString = localStorage.getItem(privStorageKey);
  if (!myPrivJWKString) return null;

  const cacheKey = `${currentUserId}_${otherUserPublicKeyJWK}`;
  if (sharedKeyCache.has(cacheKey)) {
    return sharedKeyCache.get(cacheKey)!;
  }

  try {
    const myPrivJWK = JSON.parse(myPrivJWKString);
    const otherPubJWK = JSON.parse(otherUserPublicKeyJWK);

    // Import my private key
    const myPrivateKey = await window.crypto.subtle.importKey(
      "jwk",
      myPrivJWK,
      { name: "ECDH", namedCurve: "P-256" },
      false,
      ["deriveKey"]
    );

    // Import other user's public key
    const otherPublicKey = await window.crypto.subtle.importKey(
      "jwk",
      otherPubJWK,
      { name: "ECDH", namedCurve: "P-256" },
      false,
      []
    );

    // Derive 256-bit AES-GCM shared key
    const sharedKey = await window.crypto.subtle.deriveKey(
      {
        name: "ECDH",
        public: otherPublicKey,
      },
      myPrivateKey,
      {
        name: "AES-GCM",
        length: 256,
      },
      false,
      ["encrypt", "decrypt"]
    );

    sharedKeyCache.set(cacheKey, sharedKey);
    return sharedKey;
  } catch (err) {
    console.error("Failed to derive shared ECDH key:", err);
    return null;
  }
}

/**
 * Encrypts a message using AES-GCM with a random 12-byte IV.
 * Returns formatted ciphertext string: `e2ee:v1:<base64_iv>:<base64_cipher>`
 */
export async function encryptDirectMessage(
  plainText: string,
  currentUserId: number,
  recipientPublicKeyJWK?: string | null
): Promise<string> {
  if (!recipientPublicKeyJWK) {
    // If recipient has no public key yet, send unencrypted
    return plainText;
  }

  try {
    const sharedKey = await getSharedKey(currentUserId, recipientPublicKeyJWK);
    if (!sharedKey) return plainText;

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(plainText);

    const cipherBuffer = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      sharedKey,
      encodedData
    );

    const base64Iv = bufferToBase64(iv.buffer);
    const base64Cipher = bufferToBase64(cipherBuffer);

    return `e2ee:v1:${base64Iv}:${base64Cipher}`;
  } catch (err) {
    console.error("Encryption failed, falling back to plaintext:", err);
    return plainText;
  }
}

/**
 * Decrypts an encrypted message `e2ee:v1:<iv>:<cipher>` using the sender or other user's public key.
 * If the message is not encrypted, returns the original text untouched.
 */
export async function decryptDirectMessage(
  content: string | null,
  currentUserId: number,
  otherUserPublicKeyJWK?: string | null
): Promise<string> {
  if (!content) return "";
  if (!content.startsWith("e2ee:v1:")) {
    // Legacy or unencrypted message
    return content;
  }

  if (!otherUserPublicKeyJWK) {
    return "🔒 [Encrypted message - Waiting for public key]";
  }

  try {
    const parts = content.split(":");
    if (parts.length !== 4) return content;

    const [, , base64Iv, base64Cipher] = parts;
    const iv = new Uint8Array(base64ToBuffer(base64Iv));
    const cipherBuffer = base64ToBuffer(base64Cipher);

    const sharedKey = await getSharedKey(currentUserId, otherUserPublicKeyJWK);
    if (!sharedKey) {
      return "🔒 [Encrypted message - Key not found on this device]";
    }

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      sharedKey,
      cipherBuffer
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch (err) {
    console.warn("Failed to decrypt message:", err);
    return "🔒 [Encrypted message - Unable to decrypt]";
  }
}

/**
 * Checks if a message is end-to-end encrypted.
 */
export function isEncryptedMessage(content: string | null): boolean {
  return typeof content === "string" && content.startsWith("e2ee:v1:");
}
