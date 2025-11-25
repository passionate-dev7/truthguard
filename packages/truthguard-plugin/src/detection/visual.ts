import { runPythonScript } from "../utils/python-runner";
import type { DetectionResult } from "../types";

export interface VisualAnalysisInput {
  imagePath?: string;
  imageUrl?: string;
  imageBase64?: string;
}

export interface VisualAnalysisOutput {
  isSynthetic: boolean;
  confidence: number;
  artifacts: Array<{
    type: string;
    location: { x: number; y: number; width: number; height: number };
    confidence: number;
  }>;
  faceAnalysis?: {
    facesDetected: number;
    deepfakeScore: number;
    landmarks: Array<{ x: number; y: number }>;
  };
  metadata: Record<string, unknown>;
}

/**
 * Analyze visual content for deepfake artifacts using EfficientNet-B7
 */
export async function analyzeVisualContent(
  input: VisualAnalysisInput,
): Promise<DetectionResult> {
  const result = await runPythonScript<VisualAnalysisOutput>(
    "visual_detection.py",
    [],
    input,
  );

  if (!result.success || !result.data) {
    throw new Error(`Visual analysis failed: ${result.error || "Unknown error"}`);
  }

  const { isSynthetic, confidence, artifacts, faceAnalysis, metadata } =
    result.data;

  const evidence = [
    ...artifacts.map((artifact) => ({
      type: `visual_artifact_${artifact.type}`,
      description: `Detected ${artifact.type} artifact at (${artifact.location.x}, ${artifact.location.y})`,
      confidence: artifact.confidence,
      metadata: { location: artifact.location },
    })),
  ];

  if (faceAnalysis && faceAnalysis.facesDetected > 0) {
    evidence.push({
      type: "face_deepfake_score",
      description: `Face analysis detected ${faceAnalysis.facesDetected} face(s) with deepfake score ${faceAnalysis.deepfakeScore.toFixed(3)}`,
      confidence: faceAnalysis.deepfakeScore,
      metadata: {
        facesDetected: faceAnalysis.facesDetected,
        landmarks: faceAnalysis.landmarks,
      },
    });
  }

  return {
    modality: "visual",
    confidence,
    isSynthetic,
    evidence,
    modelVersion: "efficientnet-b7-v1.0",
    timestamp: Date.now(),
  };
}

/**
 * Detect face manipulation
 */
export async function detectFaceManipulation(
  input: VisualAnalysisInput,
): Promise<{
  isManipulated: boolean;
  confidence: number;
  manipulationType?: string;
}> {
  const result = await analyzeVisualContent(input);

  const faceEvidence = result.evidence.find((e) =>
    e.type.includes("face_deepfake"),
  );

  return {
    isManipulated: result.isSynthetic,
    confidence: result.confidence,
    manipulationType: faceEvidence?.type,
  };
}
