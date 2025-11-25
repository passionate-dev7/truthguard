import type { ValidationVote, Validator } from "../types";

export interface ConsensusResult {
  verdict: "authentic" | "synthetic" | "disputed";
  confidence: number;
  votes: {
    authentic: number;
    synthetic: number;
    uncertain: number;
  };
  weightedScore: number;
  participatingValidators: number;
  consensusReached: boolean;
}

export class ConsensusEngine {
  private readonly consensusThreshold = 0.67; // 67% agreement required
  private readonly minimumValidators = 3;

  /**
   * Build consensus from validator votes
   */
  public buildConsensus(
    votes: ValidationVote[],
    validators: Map<string, Validator>,
  ): ConsensusResult {
    if (votes.length < this.minimumValidators) {
      throw new Error(
        `Insufficient validators. Need at least ${this.minimumValidators}, got ${votes.length}`,
      );
    }

    // Count votes
    const voteCounts = {
      authentic: 0,
      synthetic: 0,
      uncertain: 0,
    };

    let totalWeight = 0;
    let weightedSyntheticScore = 0;

    for (const vote of votes) {
      const validator = validators.get(vote.validatorId);
      if (!validator || !validator.isActive) {
        continue;
      }

      // Weight based on validator reputation and accuracy
      const weight = this.calculateValidatorWeight(validator);

      voteCounts[vote.vote]++;
      totalWeight += weight;

      // Calculate weighted score (1 = synthetic, 0 = authentic)
      if (vote.vote === "synthetic") {
        weightedSyntheticScore += weight * vote.confidence;
      } else if (vote.vote === "authentic") {
        weightedSyntheticScore += weight * (1 - vote.confidence);
      } else {
        weightedSyntheticScore += weight * 0.5;
      }
    }

    const weightedScore = weightedSyntheticScore / totalWeight;
    const totalVotes = votes.length;

    // Determine verdict
    let verdict: "authentic" | "synthetic" | "disputed";
    let consensusReached = false;

    const syntheticRatio = voteCounts.synthetic / totalVotes;
    const authenticRatio = voteCounts.authentic / totalVotes;

    if (syntheticRatio >= this.consensusThreshold) {
      verdict = "synthetic";
      consensusReached = true;
    } else if (authenticRatio >= this.consensusThreshold) {
      verdict = "authentic";
      consensusReached = true;
    } else {
      verdict = "disputed";
      consensusReached = false;
    }

    // Calculate confidence based on agreement and weighted score
    const confidence = this.calculateConfidence(
      voteCounts,
      totalVotes,
      weightedScore,
      consensusReached,
    );

    return {
      verdict,
      confidence,
      votes: voteCounts,
      weightedScore,
      participatingValidators: votes.length,
      consensusReached,
    };
  }

  /**
   * Calculate validator weight based on reputation and accuracy
   */
  private calculateValidatorWeight(validator: Validator): number {
    // Base weight from reputation (0-100 scale)
    const reputationWeight = validator.reputation / 100;

    // Accuracy weight (0-1 scale)
    const accuracyWeight = validator.accuracyRate;

    // Stake weight (logarithmic scaling)
    const stakeWeight = Math.log10(validator.stake + 1) / 10;

    // Combined weight (normalized)
    return (reputationWeight * 0.4 + accuracyWeight * 0.4 + stakeWeight * 0.2);
  }

  /**
   * Calculate consensus confidence
   */
  private calculateConfidence(
    votes: { authentic: number; synthetic: number; uncertain: number },
    totalVotes: number,
    weightedScore: number,
    consensusReached: boolean,
  ): number {
    // Base confidence from majority
    const maxVotes = Math.max(votes.authentic, votes.synthetic, votes.uncertain);
    const majorityRatio = maxVotes / totalVotes;

    // Agreement factor (how much validators agree)
    const agreementFactor = consensusReached ? 1.0 : 0.5;

    // Weighted score confidence (distance from 0.5)
    const scoreFactor = Math.abs(weightedScore - 0.5) * 2;

    // Combined confidence
    return majorityRatio * 0.5 + scoreFactor * 0.3 + agreementFactor * 0.2;
  }

  /**
   * Determine if validator is eligible to vote
   */
  public isValidatorEligible(
    validator: Validator,
    contentType: string,
  ): boolean {
    if (!validator.isActive) {
      return false;
    }

    if (validator.reputation < 50) {
      return false;
    }

    if (validator.accuracyRate < 0.7) {
      return false;
    }

    // Check if validator has required specialization
    const requiredModality = this.getModalityFromContentType(contentType);
    if (
      requiredModality &&
      !validator.specializations.includes(requiredModality)
    ) {
      return false;
    }

    return true;
  }

  /**
   * Get modality from content type
   */
  private getModalityFromContentType(
    contentType: string,
  ): "visual" | "audio" | "text" | undefined {
    if (contentType.includes("image") || contentType.includes("video")) {
      return "visual";
    }
    if (contentType.includes("audio")) {
      return "audio";
    }
    if (contentType.includes("text")) {
      return "text";
    }
    return undefined;
  }

  /**
   * Update validator reputation based on vote accuracy
   */
  public updateValidatorReputation(
    validator: Validator,
    wasCorrect: boolean,
    confidence: number,
  ): Validator {
    const reputationChange = wasCorrect
      ? confidence * 5
      : -confidence * 10;

    const newReputation = Math.max(
      0,
      Math.min(100, validator.reputation + reputationChange),
    );

    const newAccuracyRate =
      (validator.accuracyRate * validator.totalValidations +
        (wasCorrect ? 1 : 0)) /
      (validator.totalValidations + 1);

    return {
      ...validator,
      reputation: newReputation,
      totalValidations: validator.totalValidations + 1,
      accuracyRate: newAccuracyRate,
    };
  }
}
