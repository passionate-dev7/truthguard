import type { DetectionResult, FusionResult } from "../types";

export type FusionMethod = "weighted_average" | "voting" | "deep_fusion";

export interface FusionConfig {
  method: FusionMethod;
  weights?: {
    visual?: number;
    audio?: number;
    text?: number;
    metadata?: number;
  };
  threshold?: number;
}

/**
 * Default weights for different modalities
 */
const DEFAULT_WEIGHTS = {
  visual: 0.35,
  audio: 0.35,
  text: 0.20,
  metadata: 0.10,
};

/**
 * Fuse multi-modal detection results
 */
export function fuseDetectionResults(
  results: DetectionResult[],
  config: FusionConfig = { method: "weighted_average" },
): FusionResult {
  if (results.length === 0) {
    throw new Error("Cannot fuse empty detection results");
  }

  const weights = config.weights || DEFAULT_WEIGHTS;
  const threshold = config.threshold || 0.5;

  let finalConfidence: number;
  let isSynthetic: boolean;
  let fusionMethod: FusionMethod;

  switch (config.method) {
    case "weighted_average":
      ({ finalConfidence, isSynthetic } = weightedAverageFusion(
        results,
        weights,
        threshold,
      ));
      fusionMethod = "weighted_average";
      break;

    case "voting":
      ({ finalConfidence, isSynthetic } = votingFusion(results, threshold));
      fusionMethod = "voting";
      break;

    case "deep_fusion":
      ({ finalConfidence, isSynthetic } = deepFusion(results, weights, threshold));
      fusionMethod = "deep_fusion";
      break;

    default:
      throw new Error(`Unknown fusion method: ${config.method}`);
  }

  const riskScore = calculateRiskScore(finalConfidence, isSynthetic, results);

  const explanation = generateExplanation(
    results,
    finalConfidence,
    isSynthetic,
    fusionMethod,
  );

  return {
    finalConfidence,
    isSynthetic,
    modalityResults: results,
    fusionMethod,
    explanation,
    riskScore,
  };
}

/**
 * Weighted average fusion
 */
function weightedAverageFusion(
  results: DetectionResult[],
  weights: Record<string, number>,
  threshold: number,
): { finalConfidence: number; isSynthetic: boolean } {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const result of results) {
    const weight = weights[result.modality] || 0.25;
    totalWeight += weight;
    weightedSum += result.confidence * weight * (result.isSynthetic ? 1 : -1);
  }

  const normalizedConfidence = Math.abs(weightedSum / totalWeight);
  const isSynthetic = weightedSum > 0;

  return {
    finalConfidence: normalizedConfidence,
    isSynthetic: normalizedConfidence >= threshold ? isSynthetic : false,
  };
}

/**
 * Majority voting fusion
 */
function votingFusion(
  results: DetectionResult[],
  threshold: number,
): { finalConfidence: number; isSynthetic: boolean } {
  const votes = results.map((r) => ({
    isSynthetic: r.isSynthetic,
    confidence: r.confidence,
  }));

  const syntheticVotes = votes.filter((v) => v.isSynthetic).length;
  const authenticVotes = votes.length - syntheticVotes;

  const isSynthetic = syntheticVotes > authenticVotes;
  const avgConfidence =
    votes.reduce((sum, v) => sum + v.confidence, 0) / votes.length;

  return {
    finalConfidence: avgConfidence,
    isSynthetic: avgConfidence >= threshold && isSynthetic,
  };
}

/**
 * Deep fusion with cross-modal correlation
 */
function deepFusion(
  results: DetectionResult[],
  weights: Record<string, number>,
  threshold: number,
): { finalConfidence: number; isSynthetic: boolean } {
  // Calculate base weighted average
  const { finalConfidence: baseConfidence, isSynthetic: baseSynthetic } =
    weightedAverageFusion(results, weights, threshold);

  // Calculate cross-modal agreement
  const agreement = calculateCrossModalAgreement(results);

  // Adjust confidence based on agreement
  const adjustedConfidence = baseConfidence * (0.7 + 0.3 * agreement);

  return {
    finalConfidence: adjustedConfidence,
    isSynthetic: adjustedConfidence >= threshold && baseSynthetic,
  };
}

/**
 * Calculate cross-modal agreement score
 */
function calculateCrossModalAgreement(results: DetectionResult[]): number {
  if (results.length < 2) return 1.0;

  let agreementSum = 0;
  let comparisons = 0;

  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      const r1 = results[i];
      const r2 = results[j];

      // Check if both agree on synthetic/authentic
      const agree = r1.isSynthetic === r2.isSynthetic;

      // Weight by confidence
      const weight = (r1.confidence + r2.confidence) / 2;

      agreementSum += agree ? weight : 0;
      comparisons++;
    }
  }

  return comparisons > 0 ? agreementSum / comparisons : 1.0;
}

/**
 * Calculate risk score (0-10 scale)
 */
function calculateRiskScore(
  confidence: number,
  isSynthetic: boolean,
  results: DetectionResult[],
): number {
  if (!isSynthetic) return 0;

  // Base risk from confidence
  let risk = confidence * 10;

  // Increase risk if multiple modalities agree
  const syntheticCount = results.filter((r) => r.isSynthetic).length;
  const modalityMultiplier = 1 + (syntheticCount - 1) * 0.2;

  risk *= modalityMultiplier;

  // Cap at 10
  return Math.min(risk, 10);
}

/**
 * Generate human-readable explanation
 */
function generateExplanation(
  results: DetectionResult[],
  finalConfidence: number,
  isSynthetic: boolean,
  method: FusionMethod,
): string {
  const modalities = results.map((r) => r.modality).join(", ");
  const verdict = isSynthetic ? "synthetic" : "authentic";

  let explanation = `Multi-modal analysis (${modalities}) using ${method} fusion indicates content is ${verdict} with ${(finalConfidence * 100).toFixed(1)}% confidence.\n\n`;

  explanation += "Modality findings:\n";
  for (const result of results) {
    explanation += `- ${result.modality}: ${result.isSynthetic ? "synthetic" : "authentic"} (${(result.confidence * 100).toFixed(1)}% confidence)\n`;
    if (result.evidence.length > 0) {
      explanation += `  Evidence: ${result.evidence[0].description}\n`;
    }
  }

  return explanation;
}
