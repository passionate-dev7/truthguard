import crypto from "crypto";

/**
 * Generate SHA-256 hash of content
 */
export function generateContentHash(data: string | Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Generate perceptual hash for images (simplified)
 */
export function generatePerceptualHash(imageData: Buffer): string {
  // This would typically use a perceptual hashing algorithm
  // For now, using SHA-256 as placeholder
  return generateContentHash(imageData);
}

/**
 * Verify content integrity
 */
export function verifyContentIntegrity(
  content: Buffer,
  expectedHash: string,
): boolean {
  const actualHash = generateContentHash(content);
  return actualHash === expectedHash;
}

/**
 * Generate unique content ID
 */
export function generateContentId(): string {
  return crypto.randomUUID();
}
