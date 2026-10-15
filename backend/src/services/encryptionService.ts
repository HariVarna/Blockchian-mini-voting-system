import * as crypto from "crypto";
import { ethers } from "ethers";
import { config } from "../config";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/**
 * Derives a 32-byte key from master secret using SHA-256
 */
function getKey(): Buffer {
  return crypto.createHash("sha256").update(config.encryptionSecret).digest();
}

export const encryptionService = {
  /**
   * Encrypts plaintext ballot payload (e.g. JSON string with candidateId and voter nonce)
   */
  encryptBallot(plaintext: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getKey();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");
    const tag = cipher.getAuthTag();

    // Payload: iv + tag + encrypted ciphertext
    return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
  },

  /**
   * Decrypts encrypted ballot payload using AES-256-GCM
   */
  decryptBallot(encryptedPayload: string): string {
    const parts = encryptedPayload.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid encrypted ballot format");
    }

    const iv = Buffer.from(parts[0], "hex");
    const tag = Buffer.from(parts[1], "hex");
    const ciphertext = parts[2];
    const key = getKey();

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(ciphertext, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  },

  /**
   * Computes the cryptographic keccak256 commitment of the ballot payload
   */
  computeBallotCommitment(payload: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(payload));
  },

  /**
   * Computes deterministic on-chain result hash for audit verification
   */
  computeResultHash(electionId: number, tallies: { candidateId: number; votes: number }[]): string {
    // Sort tallies by candidateId ascending for canonical deterministic hash
    const sorted = [...tallies].sort((a, b) => a.candidateId - b.candidateId);
    const serialized = `election:${electionId}|${sorted.map(t => `${t.candidateId}:${t.votes}`).join(";")}`;
    return ethers.keccak256(ethers.toUtf8Bytes(serialized));
  }
};
