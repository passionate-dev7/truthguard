import type { Evidence, DetectionResult } from "../types";
import { generateContentHash } from "../utils/hash";

export interface EvidenceChain {
  evidenceId: string;
  detectionId: string;
  chainHash: string;
  previousHash?: string;
  blockNumber: number;
  timestamp: number;
}

export class EvidenceCollector {
  private evidenceChain: EvidenceChain[] = [];

  /**
   * Collect evidence from detection results
   */
  public collectFromDetection(
    detectionId: string,
    result: DetectionResult,
  ): Evidence[] {
    const evidence: Evidence[] = [];

    for (const item of result.evidence) {
      const ev: Evidence = {
        id: crypto.randomUUID(),
        detectionId,
        type: this.mapEvidenceType(item.type),
        proof: JSON.stringify({
          description: item.description,
          confidence: item.confidence,
          metadata: item.metadata,
          modelVersion: result.modelVersion,
        }),
        confidence: item.confidence,
        validatedBy: [],
        createdAt: Date.now(),
      };

      evidence.push(ev);
    }

    return evidence;
  }

  /**
   * Map evidence type string to Evidence type
   */
  private mapEvidenceType(
    type: string,
  ): Evidence["type"] {
    if (type.includes("visual") || type.includes("face")) {
      return "visual_artifact";
    }
    if (type.includes("audio") || type.includes("voice")) {
      return "audio_anomaly";
    }
    if (type.includes("text") || type.includes("pattern")) {
      return "text_pattern";
    }
    if (type.includes("metadata")) {
      return "metadata_inconsistency";
    }
    return "blockchain_proof";
  }

  /**
   * Store evidence on blockchain (DKG)
   */
  public async storeOnDKG(
    evidence: Evidence,
    dkgClient: { publish: (data: unknown) => Promise<string> },
  ): Promise<string> {
    const knowledgeAsset = {
      "@context": "https://schema.org",
      "@type": "ClaimReview",
      claimReviewed: evidence.proof,
      reviewRating: {
        "@type": "Rating",
        ratingValue: evidence.confidence,
        bestRating: 1,
        worstRating: 0,
      },
      author: {
        "@type": "Organization",
        name: "TruthGuard",
      },
      datePublished: new Date(evidence.createdAt).toISOString(),
      itemReviewed: {
        "@type": "MediaObject",
        identifier: evidence.detectionId,
      },
    };

    // Store on DKG
    const ual = await dkgClient.publish(knowledgeAsset);

    return ual;
  }

  /**
   * Create evidence chain (blockchain-style)
   */
  public addToChain(evidenceId: string, detectionId: string): EvidenceChain {
    const previousBlock =
      this.evidenceChain.length > 0
        ? this.evidenceChain[this.evidenceChain.length - 1]
        : undefined;

    const blockData = JSON.stringify({
      evidenceId,
      detectionId,
      previousHash: previousBlock?.chainHash,
      blockNumber: this.evidenceChain.length,
      timestamp: Date.now(),
    });

    const chainHash = generateContentHash(blockData);

    const block: EvidenceChain = {
      evidenceId,
      detectionId,
      chainHash,
      previousHash: previousBlock?.chainHash,
      blockNumber: this.evidenceChain.length,
      timestamp: Date.now(),
    };

    this.evidenceChain.push(block);

    return block;
  }

  /**
   * Verify evidence chain integrity
   */
  public verifyChain(): boolean {
    for (let i = 1; i < this.evidenceChain.length; i++) {
      const currentBlock = this.evidenceChain[i];
      const previousBlock = this.evidenceChain[i - 1];

      // Check if previous hash matches
      if (currentBlock.previousHash !== previousBlock.chainHash) {
        return false;
      }

      // Verify current block hash
      const blockData = JSON.stringify({
        evidenceId: currentBlock.evidenceId,
        detectionId: currentBlock.detectionId,
        previousHash: currentBlock.previousHash,
        blockNumber: currentBlock.blockNumber,
        timestamp: currentBlock.timestamp,
      });

      const calculatedHash = generateContentHash(blockData);
      if (calculatedHash !== currentBlock.chainHash) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get evidence by detection ID
   */
  public getEvidenceForDetection(detectionId: string): EvidenceChain[] {
    return this.evidenceChain.filter((e) => e.detectionId === detectionId);
  }

  /**
   * Validate evidence with validators
   */
  public async validateEvidence(
    evidence: Evidence,
    validatorId: string,
  ): Promise<Evidence> {
    if (!evidence.validatedBy.includes(validatorId)) {
      evidence.validatedBy.push(validatorId);
    }

    return evidence;
  }

  /**
   * Calculate evidence trust score
   */
  public calculateTrustScore(evidence: Evidence): number {
    // Base score from confidence
    let score = evidence.confidence * 0.6;

    // Bonus for multiple validators
    const validatorBonus = Math.min(evidence.validatedBy.length * 0.1, 0.3);
    score += validatorBonus;

    // Bonus for blockchain proof
    if (evidence.dkgUal) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }
}
