import { runPythonScript } from "../utils/python-runner";
import type { DetectionResult } from "../types";

export interface AudioAnalysisInput {
  audioPath?: string;
  audioUrl?: string;
  audioBase64?: string;
}

export interface AudioAnalysisOutput {
  isSynthetic: boolean;
  confidence: number;
  anomalies: Array<{
    type: string;
    timestamp: number;
    duration: number;
    confidence: number;
  }>;
  spectralAnalysis: {
    hasArtificialPatterns: boolean;
    frequencyAnomalies: number[];
  };
  voiceAnalysis?: {
    isSyntheticVoice: boolean;
    confidence: number;
    prosodyScore: number;
  };
  metadata: Record<string, unknown>;
}

/**
 * Analyze audio content for synthetic voice and deepfake audio
 */
export async function analyzeAudioContent(
  input: AudioAnalysisInput,
): Promise<DetectionResult> {
  const result = await runPythonScript<AudioAnalysisOutput>(
    "audio_detection.py",
    [],
    input,
  );

  if (!result.success || !result.data) {
    throw new Error(`Audio analysis failed: ${result.error || "Unknown error"}`);
  }

  const { isSynthetic, confidence, anomalies, spectralAnalysis, voiceAnalysis, metadata } =
    result.data;

  const evidence = [
    ...anomalies.map((anomaly) => ({
      type: `audio_anomaly_${anomaly.type}`,
      description: `Detected ${anomaly.type} at ${anomaly.timestamp.toFixed(2)}s (duration: ${anomaly.duration.toFixed(2)}s)`,
      confidence: anomaly.confidence,
      metadata: {
        timestamp: anomaly.timestamp,
        duration: anomaly.duration,
      },
    })),
  ];

  if (spectralAnalysis.hasArtificialPatterns) {
    evidence.push({
      type: "spectral_artifacts",
      description: `Detected artificial patterns in frequency spectrum`,
      confidence: 0.8,
      metadata: {
        frequencyAnomalies: spectralAnalysis.frequencyAnomalies,
      },
    });
  }

  if (voiceAnalysis) {
    evidence.push({
      type: "synthetic_voice",
      description: `Voice analysis indicates ${voiceAnalysis.isSyntheticVoice ? "synthetic" : "natural"} voice with prosody score ${voiceAnalysis.prosodyScore.toFixed(3)}`,
      confidence: voiceAnalysis.confidence,
      metadata: {
        prosodyScore: voiceAnalysis.prosodyScore,
      },
    });
  }

  return {
    modality: "audio",
    confidence,
    isSynthetic,
    evidence,
    modelVersion: "audio-deepfake-detector-v1.0",
    timestamp: Date.now(),
  };
}

/**
 * Detect voice cloning
 */
export async function detectVoiceCloning(
  input: AudioAnalysisInput,
): Promise<{
  isCloned: boolean;
  confidence: number;
  cloningMethod?: string;
}> {
  const result = await analyzeAudioContent(input);

  const voiceEvidence = result.evidence.find((e) =>
    e.type.includes("synthetic_voice"),
  );

  return {
    isCloned: result.isSynthetic,
    confidence: result.confidence,
    cloningMethod: voiceEvidence?.type,
  };
}
