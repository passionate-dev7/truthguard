import { z } from "zod";

// Content Types
export const ContentTypeEnum = z.enum([
  "image",
  "video",
  "audio",
  "text",
  "mixed",
]);
export type ContentType = z.infer<typeof ContentTypeEnum>;

// Detection Status
export const DetectionStatusEnum = z.enum([
  "pending",
  "analyzing",
  "verified",
  "flagged",
  "disputed",
  "consensus_reached",
]);
export type DetectionStatus = z.infer<typeof DetectionStatusEnum>;

// Modality Types
export const ModalityEnum = z.enum([
  "visual",
  "audio",
  "text",
  "metadata",
  "fusion",
]);
export type Modality = z.infer<typeof ModalityEnum>;

// Detection Result Schema
export const DetectionResultSchema = z.object({
  modality: ModalityEnum,
  confidence: z.number().min(0).max(1),
  isSynthetic: z.boolean(),
  evidence: z.array(
    z.object({
      type: z.string(),
      description: z.string(),
      confidence: z.number(),
      metadata: z.record(z.unknown()).optional(),
    }),
  ),
  modelVersion: z.string(),
  timestamp: z.number(),
});
export type DetectionResult = z.infer<typeof DetectionResultSchema>;

// Multi-Modal Fusion Result
export const FusionResultSchema = z.object({
  finalConfidence: z.number().min(0).max(1),
  isSynthetic: z.boolean(),
  modalityResults: z.array(DetectionResultSchema),
  fusionMethod: z.enum(["weighted_average", "voting", "deep_fusion"]),
  explanation: z.string(),
  riskScore: z.number().min(0).max(10),
});
export type FusionResult = z.infer<typeof FusionResultSchema>;

// Content Schema
export const ContentSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
  type: ContentTypeEnum,
  hash: z.string(),
  status: DetectionStatusEnum,
  submittedBy: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type Content = z.infer<typeof ContentSchema>;

// Validator Schema
export const ValidatorSchema = z.object({
  id: z.string().uuid(),
  address: z.string(),
  reputation: z.number().min(0).max(100),
  stake: z.number().min(0),
  totalValidations: z.number(),
  accuracyRate: z.number().min(0).max(1),
  specializations: z.array(ModalityEnum),
  isActive: z.boolean(),
});
export type Validator = z.infer<typeof ValidatorSchema>;

// Validation Vote
export const ValidationVoteSchema = z.object({
  validatorId: z.string().uuid(),
  contentId: z.string().uuid(),
  vote: z.enum(["authentic", "synthetic", "uncertain"]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  timestamp: z.number(),
});
export type ValidationVote = z.infer<typeof ValidationVoteSchema>;

// Evidence Schema
export const EvidenceSchema = z.object({
  id: z.string().uuid(),
  detectionId: z.string().uuid(),
  type: z.enum([
    "visual_artifact",
    "audio_anomaly",
    "text_pattern",
    "metadata_inconsistency",
    "blockchain_proof",
  ]),
  proof: z.string(),
  dkgUal: z.string().optional(),
  confidence: z.number().min(0).max(1),
  validatedBy: z.array(z.string()),
  createdAt: z.number(),
});
export type Evidence = z.infer<typeof EvidenceSchema>;

// Creator Protection Schema
export const CreatorProtectionSchema = z.object({
  contentHash: z.string(),
  creatorDid: z.string(),
  timestamp: z.number(),
  dkgUal: z.string(),
  attestations: z.array(
    z.object({
      platform: z.string(),
      timestamp: z.number(),
      signature: z.string(),
    }),
  ),
  licenseTerms: z.string().optional(),
});
export type CreatorProtection = z.infer<typeof CreatorProtectionSchema>;

// Fact Check Result
export const FactCheckResultSchema = z.object({
  claim: z.string(),
  verdict: z.enum([
    "true",
    "mostly_true",
    "mixed",
    "mostly_false",
    "false",
    "unverified",
  ]),
  confidence: z.number().min(0).max(1),
  sources: z.array(
    z.object({
      url: z.string().url(),
      title: z.string(),
      reliability: z.number(),
      dkgUal: z.string().optional(),
    }),
  ),
  explanation: z.string(),
  checkedAt: z.number(),
});
export type FactCheckResult = z.infer<typeof FactCheckResultSchema>;

// ML Model Info
export interface MLModelInfo {
  name: string;
  version: string;
  architecture: string;
  trainingDataset: string;
  accuracy: number;
  lastUpdated: number;
}

// Swarm Agent Types
export type SwarmAgentType =
  | "visual_specialist"
  | "audio_specialist"
  | "text_specialist"
  | "metadata_analyst"
  | "fusion_coordinator"
  | "consensus_builder"
  | "evidence_collector";

// Swarm Task
export interface SwarmTask {
  id: string;
  type: SwarmAgentType;
  contentId: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "pending" | "assigned" | "processing" | "completed" | "failed";
  assignedTo?: string;
  result?: DetectionResult | FusionResult;
  createdAt: number;
  completedAt?: number;
}
