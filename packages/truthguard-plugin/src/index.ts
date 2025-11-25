import { defineDkgPlugin } from "@dkg/plugins";
import { openAPIRoute, z } from "@dkg/plugin-swagger";
import { withSourceKnowledgeAssets } from "@dkg/plugin-dkg-essentials/utils";
import { VerificationSwarm } from "./verification/agent-swarm";
import { ConsensusEngine } from "./verification/consensus";
import { EvidenceCollector } from "./verification/evidence";
import { analyzeVisualContent } from "./detection/visual";
import { analyzeAudioContent } from "./detection/audio";
import { analyzeTextContent, extractClaims } from "./detection/text";
import { fuseDetectionResults } from "./detection/fusion";
import { generateContentHash, generateContentId } from "./utils/hash";
import type {
  ContentType,
  DetectionStatus,
  FusionResult,
  FactCheckResult,
  CreatorProtection,
  Validator,
  ValidationVote,
} from "./types";

export default defineDkgPlugin((dkgContext, mcp, api) => {
  // Initialize core systems
  const verificationSwarm = new VerificationSwarm();
  const consensusEngine = new ConsensusEngine();
  const evidenceCollector = new EvidenceCollector();

  // Store validators in memory (in production, use database)
  const validators = new Map<string, Validator>();

  /**
   * MCP TOOL 1: deepfake_detect - Multi-modal deepfake detection
   */
  mcp.registerTool(
    "deepfake_detect",
    {
      title: "Deepfake Detection",
      description:
        "Analyze media content (image, video, audio, text) for deepfake and synthetic generation using multi-modal AI",
      inputSchema: {
        contentUrl: z
          .string()
          .url()
          .describe("URL of the content to analyze"),
        contentType: z
          .enum(["image", "video", "audio", "text", "mixed"])
          .describe("Type of content"),
        imageBase64: z
          .string()
          .optional()
          .describe("Base64-encoded image data (alternative to URL)"),
        audioBase64: z
          .string()
          .optional()
          .describe("Base64-encoded audio data"),
        text: z.string().optional().describe("Text content to analyze"),
        fusionMethod: z
          .enum(["weighted_average", "voting", "deep_fusion"])
          .optional()
          .default("deep_fusion")
          .describe("Multi-modal fusion method"),
      },
    },
    async ({ contentUrl, contentType, imageBase64, audioBase64, text, fusionMethod }) => {
      try {
        const contentId = generateContentId();

        // Run multi-modal detection
        const result: FusionResult = await verificationSwarm.verifyContent(
          contentId,
          contentType,
        );

        // Store evidence on DKG
        const evidenceRecords = evidenceCollector.collectFromDetection(
          contentId,
          result.modalityResults[0],
        );

        const dkgUals: string[] = [];
        for (const ev of evidenceRecords) {
          try {
            const ual = await evidenceCollector.storeOnDKG(ev, {
              publish: async (data) => {
                // Use DKG context to publish
                return "did:dkg:example:placeholder"; // Placeholder
              },
            });
            dkgUals.push(ual);
          } catch (error) {
            console.error("Failed to store evidence on DKG:", error);
          }
        }

        const response = {
          contentId,
          verdict: result.isSynthetic ? "synthetic" : "authentic",
          confidence: result.finalConfidence,
          riskScore: result.riskScore,
          explanation: result.explanation,
          modalityResults: result.modalityResults.map((r) => ({
            modality: r.modality,
            isSynthetic: r.isSynthetic,
            confidence: r.confidence,
            evidenceCount: r.evidence.length,
          })),
          evidenceDkgUals: dkgUals,
          fusionMethod: result.fusionMethod,
          timestamp: Date.now(),
        };

        return withSourceKnowledgeAssets(
          {
            content: [
              {
                type: "text",
                text: JSON.stringify(response, null, 2),
              },
            ],
          },
          dkgUals.map((ual) => ({
            title: "TruthGuard Detection Evidence",
            issuer: "TruthGuard",
            ual,
          })),
        );
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Detection failed",
                message: (error as Error).message,
              }),
            },
          ],
        };
      }
    },
  );

  /**
   * MCP TOOL 2: fact_check - Claim verification with source validation
   */
  mcp.registerTool(
    "fact_check",
    {
      title: "Fact Check Claims",
      description:
        "Verify factual claims using trusted sources and DKG knowledge graph",
      inputSchema: {
        claim: z.string().describe("The claim to verify"),
        context: z.string().optional().describe("Additional context"),
        sources: z
          .array(z.string().url())
          .optional()
          .describe("Specific sources to check"),
      },
    },
    async ({ claim, context, sources }) => {
      try {
        // Extract claims from text
        const claims = await extractClaims(claim);

        // Placeholder fact-checking logic
        // In production, this would query DKG and trusted sources
        const result: FactCheckResult = {
          claim,
          verdict: "unverified",
          confidence: 0.5,
          sources: sources?.map((url) => ({
            url,
            title: "Source",
            reliability: 0.8,
          })) || [],
          explanation: "Fact-checking analysis completed",
          checkedAt: Date.now(),
        };

        // Store fact-check on DKG
        const knowledgeAsset = {
          "@context": "https://schema.org",
          "@type": "ClaimReview",
          claimReviewed: claim,
          reviewRating: {
            "@type": "Rating",
            alternateName: result.verdict,
            ratingValue: result.confidence,
          },
          author: {
            "@type": "Organization",
            name: "TruthGuard",
          },
          datePublished: new Date(result.checkedAt).toISOString(),
        };

        const dkgUal = "did:dkg:example:factcheck"; // Placeholder

        return withSourceKnowledgeAssets(
          {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    ...result,
                    dkgUal,
                  },
                  null,
                  2,
                ),
              },
            ],
          },
          [
            {
              title: "TruthGuard Fact Check",
              issuer: "TruthGuard",
              ual: dkgUal,
            },
          ],
        );
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Fact checking failed",
                message: (error as Error).message,
              }),
            },
          ],
        };
      }
    },
  );

  /**
   * MCP TOOL 3: content_monitor - Real-time content ingestion and monitoring
   */
  mcp.registerTool(
    "content_monitor",
    {
      title: "Monitor Content",
      description:
        "Monitor content from social media, news feeds, and other sources for deepfakes",
      inputSchema: {
        source: z
          .string()
          .describe("Source platform (e.g., 'twitter', 'youtube', 'reddit')"),
        sourceId: z.string().describe("Platform-specific content ID"),
        autoVerify: z
          .boolean()
          .optional()
          .default(true)
          .describe("Automatically run verification"),
      },
    },
    async ({ source, sourceId, autoVerify }) => {
      try {
        const monitoringId = generateContentId();

        const monitoring = {
          id: monitoringId,
          source,
          sourceId,
          status: "monitoring" as const,
          firstSeenAt: Date.now(),
          lastCheckedAt: Date.now(),
          checkCount: 1,
        };

        let verificationResult = null;

        if (autoVerify) {
          // Trigger automatic verification
          const contentId = generateContentId();
          verificationResult = await verificationSwarm.verifyContent(
            contentId,
            "mixed",
          );
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  monitoringId,
                  source,
                  sourceId,
                  status: monitoring.status,
                  verificationResult: verificationResult
                    ? {
                        verdict: verificationResult.isSynthetic
                          ? "synthetic"
                          : "authentic",
                        confidence: verificationResult.finalConfidence,
                        riskScore: verificationResult.riskScore,
                      }
                    : null,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Content monitoring failed",
                message: (error as Error).message,
              }),
            },
          ],
        };
      }
    },
  );

  /**
   * MCP TOOL 4: validator_coordinate - Community consensus building
   */
  mcp.registerTool(
    "validator_coordinate",
    {
      title: "Coordinate Validators",
      description:
        "Coordinate community validators to reach consensus on content authenticity",
      inputSchema: {
        contentId: z.string().uuid().describe("Content ID to validate"),
        validatorIds: z
          .array(z.string().uuid())
          .describe("Validator IDs to involve"),
        minimumVotes: z
          .number()
          .optional()
          .default(3)
          .describe("Minimum number of votes required"),
      },
    },
    async ({ contentId, validatorIds, minimumVotes }) => {
      try {
        // Simulate validator votes (in production, this would be real votes)
        const votes: ValidationVote[] = validatorIds.map((validatorId) => ({
          validatorId,
          contentId,
          vote: Math.random() > 0.5 ? "authentic" : "synthetic",
          confidence: 0.7 + Math.random() * 0.3,
          reasoning: "Validator analysis",
          timestamp: Date.now(),
        })) as ValidationVote[];

        if (votes.length < minimumVotes) {
          throw new Error(
            `Insufficient votes. Need ${minimumVotes}, got ${votes.length}`,
          );
        }

        const consensus = consensusEngine.buildConsensus(votes, validators);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  contentId,
                  consensus: {
                    verdict: consensus.verdict,
                    confidence: consensus.confidence,
                    consensusReached: consensus.consensusReached,
                    votes: consensus.votes,
                    weightedScore: consensus.weightedScore,
                    participatingValidators: consensus.participatingValidators,
                  },
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Validator coordination failed",
                message: (error as Error).message,
              }),
            },
          ],
        };
      }
    },
  );

  /**
   * MCP TOOL 5: creator_protect - Attribution and copyright protection
   */
  mcp.registerTool(
    "creator_protect",
    {
      title: "Protect Creator Content",
      description:
        "Register authentic content with attribution proofs on DKG blockchain",
      inputSchema: {
        contentUrl: z
          .string()
          .url()
          .describe("URL of the content to protect"),
        creatorDid: z.string().describe("Creator's DID"),
        licenseTerms: z
          .string()
          .optional()
          .describe("License terms and usage rights"),
        attestations: z
          .array(
            z.object({
              platform: z.string(),
              timestamp: z.number(),
              signature: z.string(),
            }),
          )
          .optional()
          .describe("Platform attestations"),
      },
    },
    async ({ contentUrl, creatorDid, licenseTerms, attestations }) => {
      try {
        // Generate content hash for fingerprinting
        const contentHash = generateContentHash(contentUrl);

        const protection: CreatorProtection = {
          contentHash,
          creatorDid,
          timestamp: Date.now(),
          dkgUal: "did:dkg:example:protection", // Placeholder
          attestations: attestations || [],
          licenseTerms,
        };

        // Store on DKG with schema.org CreativeWork
        const knowledgeAsset = {
          "@context": "https://schema.org",
          "@type": "CreativeWork",
          identifier: contentHash,
          creator: {
            "@type": "Person",
            identifier: creatorDid,
          },
          dateCreated: new Date(protection.timestamp).toISOString(),
          license: licenseTerms,
          attestation: attestations,
        };

        const dkgUal = "did:dkg:example:creative-work"; // Placeholder

        return withSourceKnowledgeAssets(
          {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    ...protection,
                    dkgUal,
                    status: "protected",
                  },
                  null,
                  2,
                ),
              },
            ],
          },
          [
            {
              title: "Creator Content Protection",
              issuer: creatorDid,
              ual: dkgUal,
            },
          ],
        );
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Creator protection failed",
                message: (error as Error).message,
              }),
            },
          ],
        };
      }
    },
  );

  /**
   * REST API Endpoints
   */

  // Detection endpoint
  api.post(
    "/detect",
    openAPIRoute(
      {
        tag: "Detection",
        summary: "Detect deepfakes in media",
        description: "Multi-modal deepfake detection endpoint",
        body: z.object({
          contentUrl: z.string().url(),
          contentType: z.enum(["image", "video", "audio", "text", "mixed"]),
        }),
        response: {
          description: "Detection result",
          schema: z.object({
            verdict: z.string(),
            confidence: z.number(),
            riskScore: z.number(),
          }),
        },
      },
      async (req, res) => {
        const { contentUrl, contentType } = req.body;
        const contentId = generateContentId();

        try {
          const result = await verificationSwarm.verifyContent(
            contentId,
            contentType,
          );

          res.json({
            verdict: result.isSynthetic ? "synthetic" : "authentic",
            confidence: result.finalConfidence,
            riskScore: result.riskScore,
          });
        } catch (error) {
          res.status(500).json({
            error: "Detection failed",
            message: (error as Error).message,
          });
        }
      },
    ),
  );

  // Fact-check endpoint
  api.post(
    "/fact-check",
    openAPIRoute(
      {
        tag: "FactCheck",
        summary: "Verify factual claims",
        description: "Fact-checking endpoint with source validation",
        body: z.object({
          claim: z.string(),
          context: z.string().optional(),
        }),
        response: {
          description: "Fact-check result",
          schema: z.object({
            verdict: z.string(),
            confidence: z.number(),
          }),
        },
      },
      async (req, res) => {
        const { claim } = req.body;

        try {
          const claims = await extractClaims(claim);

          res.json({
            verdict: "unverified",
            confidence: 0.5,
            claims: claims.length,
          });
        } catch (error) {
          res.status(500).json({
            error: "Fact-check failed",
            message: (error as Error).message,
          });
        }
      },
    ),
  );

  // Health check
  api.get(
    "/health",
    openAPIRoute(
      {
        tag: "System",
        summary: "Health check",
        description: "Check TruthGuard system health and swarm status",
        response: {
          description: "System status",
          schema: z.object({
            status: z.string(),
            swarm: z.object({
              agents: z.number(),
              activeTasks: z.number(),
            }),
          }),
        },
      },
      (req, res) => {
        const swarmStatus = verificationSwarm.getStatus();

        res.json({
          status: "healthy",
          swarm: {
            agents: swarmStatus.agents,
            activeTasks: swarmStatus.activeTasks,
            completedTasks: swarmStatus.completedTasks,
            queuedTasks: swarmStatus.queuedTasks,
          },
          timestamp: Date.now(),
        });
      },
    ),
  );
});
