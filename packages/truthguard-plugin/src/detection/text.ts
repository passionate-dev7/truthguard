import { runPythonScript } from "../utils/python-runner";
import type { DetectionResult } from "../types";

export interface TextAnalysisInput {
  text: string;
  context?: string;
  language?: string;
}

export interface TextAnalysisOutput {
  isSynthetic: boolean;
  confidence: number;
  patterns: Array<{
    type: string;
    description: string;
    confidence: number;
    spans: Array<{ start: number; end: number }>;
  }>;
  linguisticAnalysis: {
    perplexity: number;
    coherenceScore: number;
    humanLikelihood: number;
  };
  claims?: Array<{
    text: string;
    needsFactChecking: boolean;
    confidence: number;
  }>;
  metadata: Record<string, unknown>;
}

/**
 * Analyze text for AI-generated content using RoBERTa
 */
export async function analyzeTextContent(
  input: TextAnalysisInput,
): Promise<DetectionResult> {
  const result = await runPythonScript<TextAnalysisOutput>(
    "text_detection.py",
    [],
    input,
  );

  if (!result.success || !result.data) {
    throw new Error(`Text analysis failed: ${result.error || "Unknown error"}`);
  }

  const { isSynthetic, confidence, patterns, linguisticAnalysis, claims, metadata } =
    result.data;

  const evidence = [
    ...patterns.map((pattern) => ({
      type: `text_pattern_${pattern.type}`,
      description: pattern.description,
      confidence: pattern.confidence,
      metadata: { spans: pattern.spans },
    })),
    {
      type: "linguistic_analysis",
      description: `Perplexity: ${linguisticAnalysis.perplexity.toFixed(2)}, Coherence: ${linguisticAnalysis.coherenceScore.toFixed(2)}, Human likelihood: ${linguisticAnalysis.humanLikelihood.toFixed(2)}`,
      confidence: linguisticAnalysis.humanLikelihood,
      metadata: linguisticAnalysis,
    },
  ];

  if (claims && claims.length > 0) {
    evidence.push({
      type: "factual_claims",
      description: `Found ${claims.length} claim(s) requiring fact-checking`,
      confidence: 0.9,
      metadata: { claims },
    });
  }

  return {
    modality: "text",
    confidence,
    isSynthetic,
    evidence,
    modelVersion: "roberta-large-v1.0",
    timestamp: Date.now(),
  };
}

/**
 * Extract claims for fact-checking
 */
export async function extractClaims(text: string): Promise<
  Array<{
    claim: string;
    confidence: number;
    spans: Array<{ start: number; end: number }>;
  }>
> {
  const result = await analyzeTextContent({ text });

  const claimsEvidence = result.evidence.find((e) =>
    e.type.includes("factual_claims"),
  );

  if (!claimsEvidence?.metadata?.claims) {
    return [];
  }

  return (claimsEvidence.metadata.claims as Array<{
    text: string;
    needsFactChecking: boolean;
    confidence: number;
  }>)
    .filter((c) => c.needsFactChecking)
    .map((c) => ({
      claim: c.text,
      confidence: c.confidence,
      spans: [{ start: 0, end: c.text.length }],
    }));
}
