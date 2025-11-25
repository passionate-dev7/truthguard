# TruthGuard Architecture Documentation

## Executive Summary

TruthGuard is a **multi-modal deepfake detection and verification system** built as a plugin architecture on the OriginTrail Decentralized Knowledge Graph (DKG). It leverages the existing dkg-node infrastructure to provide cryptographic proof of content authenticity through AI-powered detection, decentralized consensus, and blockchain-anchored evidence graphs.

**Core Innovation**: Combining multi-modal AI detection (vision + language) with decentralized verification swarms and DKG's cryptographic proof system to create tamper-proof authenticity records.

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        TruthGuard System                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐      │
│  │  Detection  │  │ Verification │  │   Evidence Graph   │      │
│  │   Pipeline  │─▶│   Swarm      │─▶│   & DKG Storage    │      │
│  └─────────────┘  └──────────────┘  └────────────────────┘      │
│        │                  │                     │               │
│        ▼                  ▼                     ▼               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              DKG Node Runtime (MCP Server)              │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │    │
│  │  │   Plugin:    │  │   Plugin:    │  │   Plugin:    │   │    │
│  │  │  Detection   │  │ Verification │  │   Evidence   │   │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            │                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │           OriginTrail DKG Engine (Protocol Layer)       │    │
│  │  - Blockchain Interactions  - Knowledge Asset Storage   │    │
│  │  - Network Communication    - Cryptographic Proofs      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  OriginTrail DKG Network (Blockchain) │
        │  - Base / Gnosis / NeuroWeb           │
        └───────────────────────────────────────┘
```

### 1.2 Component Interaction Flow

```
User Upload (Image/Video/Audio)
        │
        ▼
┌───────────────────────┐
│  1. Detection Plugin  │
│  - Multi-Modal AI     │
│  - EfficientNet-B4    │
│  - RoBERTa            │
│  - Whisper ASR        │
└───────────────────────┘
        │
        │ Detection Results
        ▼
┌───────────────────────┐
│ 2. Verification       │
│    Plugin (Swarm)     │
│  - Coordinator Agent  │
│  - Validator Agents   │
│  - Consensus Builder  │
└───────────────────────┘
        │
        │ Consensus + Evidence
        ▼
┌───────────────────────┐
│ 3. Evidence Plugin    │
│  - Graph Builder      │
│  - DKG Publisher      │
│  - Proof Generator    │
└───────────────────────┘
        │
        │ UAL + Blockchain TX
        ▼
┌───────────────────────┐
│  DKG Network Storage  │
│  - Immutable Record   │
│  - Cryptographic Hash │
│  - Timestamped        │
└───────────────────────┘
```

---

## 2. Existing dkg-node Infrastructure Analysis

### 2.1 Monorepo Structure

```
truthguard/
├── apps/
│   └── agent/                    # Main DKG Node AI Agent
│       ├── src/
│       │   ├── server/          # MCP Server + Express API
│       │   ├── client/          # Frontend (Expo/React)
│       │   ├── shared/          # Shared types
│       │   └── polyfills.ts
│       └── package.json
├── packages/
│   ├── plugin-dkg-essentials/   # Core DKG tools (publish/query)
│   ├── plugin-dkg-publisher/    # Asset publishing queue system
│   ├── plugin-oauth/            # Authentication
│   ├── plugin-swagger/          # API documentation
│   ├── plugin-example/          # Plugin template
│   └── plugins/                 # Plugin framework
└── docs/                        # Documentation
```

### 2.2 Plugin Architecture Pattern

**Key Discovery**: Plugins use `defineDkgPlugin` with three injection points:

```typescript
import { defineDkgPlugin } from "@dkg/plugins";

export default defineDkgPlugin((ctx, mcp, api) => {
  // ctx  - DKG context (logger, DKG client, config)
  // mcp  - MCP Server (register tools/resources)
  // api  - Express router (HTTP endpoints)

  // Register MCP tools for AI agents
  mcp.registerTool("tool-name", schema, handler);

  // Register API endpoints
  api.post("/endpoint", handler);
});
```

**Benefits for TruthGuard**:
- Modular design (each detection/verification component = separate plugin)
- Shared access to DKG client
- Built-in MCP integration for AI coordination
- Express API for external integrations

### 2.3 Database & Storage Patterns

**Current Implementation**:
- **Drizzle ORM** with SQLite (lightweight) or MySQL (production)
- **Schema-first** design with migrations
- **Relationships** between tables
- **Indexes** for performance

**Example from `plugin-dkg-publisher`**:
```typescript
// packages/plugin-dkg-publisher/src/database/schema.ts
export const assets = mysqlTable("assets", {
  id: serial("id").primaryKey(),
  contentUrl: text("content_url").notNull(),
  status: mysqlEnum("status", ["pending", "publishing", "published"]),
  ual: varchar("ual", { length: 255 }).unique(),
  // ... timestamps, retries, etc.
});
```

**Key Insights**:
- Status tracking for async operations
- Content stored separately (URLs, not blobs)
- UAL (Universal Asset Locator) for DKG references
- Metrics tables for monitoring

### 2.4 DKG Publishing Workflow

**From `plugin-dkg-publisher`**:

1. **Asset Registration** → Database (pending)
2. **Queue System** → BullMQ + Redis (async processing)
3. **Wallet Management** → Locked wallets prevent conflicts
4. **DKG Publishing** → dkg.js SDK to OriginTrail network
5. **Result Storage** → UAL + blockchain TX hash

**Critical for TruthGuard**:
- We can reuse this queue system for batch detection
- Wallet management ensures atomic operations
- Built-in retry logic and error handling

---

## 3. TruthGuard Plugin Design

### 3.1 Plugin 1: Detection Pipeline (`plugin-truthguard-detection`)

**Purpose**: Multi-modal AI analysis of uploaded content

**Directory Structure**:
```
packages/plugin-truthguard-detection/
├── src/
│   ├── index.ts                    # Plugin entry point
│   ├── models/
│   │   ├── vision.ts               # EfficientNet-B4 (Python bridge)
│   │   ├── language.ts             # RoBERTa (Python bridge)
│   │   └── audio.ts                # Whisper ASR (Python bridge)
│   ├── controllers/
│   │   ├── DetectionController.ts  # Handles detection requests
│   │   └── BatchController.ts      # Batch processing
│   ├── services/
│   │   ├── ModelService.ts         # AI model management
│   │   ├── PreprocessingService.ts # Image/video preprocessing
│   │   └── PythonBridge.ts         # Node.js ↔ Python communication
│   ├── database/
│   │   └── schema.ts               # Detection results schema
│   └── types.ts
├── python/
│   ├── models/
│   │   ├── efficientnet_detector.py
│   │   ├── roberta_detector.py
│   │   └── whisper_detector.py
│   ├── server.py                   # FastAPI/Flask bridge
│   └── requirements.txt
└── package.json
```

**Database Schema**:
```typescript
// Detection results table
export const detections = mysqlTable("truthguard_detections", {
  id: serial("id").primaryKey(),
  contentHash: varchar("content_hash", { length: 64 }).notNull().unique(),
  contentType: mysqlEnum("content_type", ["image", "video", "audio"]).notNull(),
  contentUrl: text("content_url").notNull(),

  // Multi-modal scores (0-1, where 1 = authentic)
  visionScore: decimal("vision_score", { precision: 5, scale: 4 }),
  languageScore: decimal("language_score", { precision: 5, scale: 4 }),
  audioScore: decimal("audio_score", { precision: 5, scale: 4 }),
  compositeScore: decimal("composite_score", { precision: 5, scale: 4 }).notNull(),

  // Model metadata
  modelVersions: json("model_versions"), // { vision: "v1.2", language: "v2.0" }
  detectionMetadata: json("detection_metadata"), // Heatmaps, confidence intervals

  // Processing status
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]),
  processingTimeMs: int("processing_time_ms"),
  errorMessage: text("error_message"),

  // Verification tracking
  verificationId: int("verification_id"), // Links to verification swarm

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => ({
  statusIdx: index("idx_status").on(table.status),
  hashIdx: index("idx_hash").on(table.contentHash),
}));
```

**MCP Tools**:
```typescript
// Register detection tool
mcp.registerTool("truthguard-detect", {
  title: "Deepfake Detection",
  description: "Analyze media for deepfake manipulation using multi-modal AI",
  inputSchema: {
    contentUrl: z.string().url(),
    contentType: z.enum(["image", "video", "audio"]),
    enableVision: z.boolean().default(true),
    enableLanguage: z.boolean().default(true),
    enableAudio: z.boolean().default(true),
  }
}, async (input) => {
  // 1. Download/cache content
  // 2. Compute SHA-256 hash
  // 3. Check cache (avoid reprocessing)
  // 4. Call Python bridge for AI inference
  // 5. Store results in database
  // 6. Return detection scores
});
```

**API Endpoints**:
```typescript
// POST /api/truthguard/detect
api.post("/api/truthguard/detect", async (req, res) => {
  const { contentUrl, contentType } = req.body;

  // Queue detection job
  const detection = await detectionService.queueDetection({
    contentUrl,
    contentType,
  });

  res.json({ detectionId: detection.id, status: "queued" });
});

// GET /api/truthguard/detect/:id
api.get("/api/truthguard/detect/:id", async (req, res) => {
  const detection = await detectionService.getDetection(req.params.id);
  res.json(detection);
});
```

**Python Bridge Strategy**:

**Option 1: HTTP Bridge (Recommended)**
- Python FastAPI server running alongside Node.js
- Node.js makes HTTP requests to localhost
- Scales independently
- Easy to containerize

**Option 2: Child Process**
- Node.js spawns Python scripts via `child_process`
- Communicate via stdin/stdout JSON
- Simpler deployment (single container)
- Limited to synchronous processing

**Recommended Architecture**:
```
┌─────────────────────────┐
│   Node.js (Port 9200)   │
│   - Express API         │
│   - MCP Server          │
│   - Database            │
└──────────┬──────────────┘
           │ HTTP (localhost:8000)
           ▼
┌─────────────────────────┐
│  Python (Port 8000)     │
│  - FastAPI              │
│  - EfficientNet-B4      │
│  - RoBERTa              │
│  - Whisper              │
│  - GPU acceleration     │
└─────────────────────────┘
```

**Python API Example**:
```python
# python/server.py
from fastapi import FastAPI, UploadFile
from models.efficientnet_detector import EfficientNetDetector
from models.roberta_detector import RoBERTaDetector

app = FastAPI()
vision_model = EfficientNetDetector()
language_model = RoBERTaDetector()

@app.post("/detect/image")
async def detect_image(file: UploadFile):
    image_data = await file.read()
    score = vision_model.predict(image_data)
    return {"visionScore": score, "metadata": {...}}

@app.post("/detect/text")
async def detect_text(text: str):
    score = language_model.predict(text)
    return {"languageScore": score}
```

---

### 3.2 Plugin 2: Verification Swarm (`plugin-truthguard-verification`)

**Purpose**: Multi-agent consensus validation using Claude Flow

**Directory Structure**:
```
packages/plugin-truthguard-verification/
├── src/
│   ├── index.ts
│   ├── swarm/
│   │   ├── CoordinatorAgent.ts    # Orchestrates verification
│   │   ├── ValidatorAgent.ts      # Independent validation
│   │   └── ConsensusBuilder.ts    # Aggregates results
│   ├── services/
│   │   ├── SwarmService.ts        # Manages agent lifecycle
│   │   └── VotingService.ts       # Consensus mechanisms
│   ├── database/
│   │   └── schema.ts
│   └── types.ts
└── package.json
```

**Database Schema**:
```typescript
// Verification sessions
export const verifications = mysqlTable("truthguard_verifications", {
  id: serial("id").primaryKey(),
  detectionId: int("detection_id")
    .notNull()
    .references(() => detections.id, { onDelete: "cascade" }),

  // Swarm configuration
  swarmId: varchar("swarm_id", { length: 100 }),
  topology: mysqlEnum("topology", ["hierarchical", "mesh"]).default("mesh"),
  validatorCount: int("validator_count").default(5),

  // Consensus results
  consensusScore: decimal("consensus_score", { precision: 5, scale: 4 }),
  consensusReached: boolean("consensus_reached").default(false),
  consensusThreshold: decimal("consensus_threshold", { precision: 3, scale: 2 }).default(0.75),

  // Voting breakdown
  votesAuthentic: int("votes_authentic").default(0),
  votesDeepfake: int("votes_deepfake").default(0),
  votesUncertain: int("votes_uncertain").default(0),

  status: mysqlEnum("status", ["pending", "running", "completed", "failed"]),
  errorMessage: text("error_message"),

  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  detectionIdx: index("idx_detection").on(table.detectionId),
}));

// Individual validator votes
export const validatorVotes = mysqlTable("truthguard_validator_votes", {
  id: serial("id").primaryKey(),
  verificationId: int("verification_id")
    .notNull()
    .references(() => verifications.id, { onDelete: "cascade" }),

  agentId: varchar("agent_id", { length: 100 }).notNull(),
  agentType: varchar("agent_type", { length: 50 }),

  verdict: mysqlEnum("verdict", ["authentic", "deepfake", "uncertain"]).notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 4 }).notNull(),
  reasoning: text("reasoning"), // Natural language explanation

  votedAt: timestamp("voted_at").defaultNow(),
}, (table) => ({
  verificationIdx: index("idx_verification").on(table.verificationId),
}));
```

**MCP Tools**:
```typescript
// Initiate verification swarm
mcp.registerTool("truthguard-verify", {
  title: "Verification Swarm",
  description: "Launch multi-agent verification swarm for consensus validation",
  inputSchema: {
    detectionId: z.number(),
    validatorCount: z.number().min(3).max(10).default(5),
    consensusThreshold: z.number().min(0.5).max(1.0).default(0.75),
  }
}, async (input) => {
  const { detectionId, validatorCount, consensusThreshold } = input;

  // 1. Initialize Claude Flow swarm
  const swarm = await initializeSwarm({
    topology: "mesh",
    maxAgents: validatorCount,
  });

  // 2. Spawn validator agents
  const validators = await Promise.all(
    Array.from({ length: validatorCount }, (_, i) =>
      spawnValidatorAgent(swarm.id, i, detectionId)
    )
  );

  // 3. Wait for consensus
  const consensus = await waitForConsensus(
    verification.id,
    consensusThreshold
  );

  return { verificationId: verification.id, consensus };
});
```

**Swarm Architecture**:
```typescript
// Coordinator Agent (Claude Flow)
class CoordinatorAgent {
  async orchestrate(detectionId: number) {
    // 1. Fetch detection results
    const detection = await getDetection(detectionId);

    // 2. Distribute to validators
    const tasks = validators.map(validator => ({
      agentId: validator.id,
      task: `Analyze deepfake detection results and provide verdict`,
      context: {
        visionScore: detection.visionScore,
        languageScore: detection.languageScore,
        metadata: detection.detectionMetadata,
      }
    }));

    // 3. Orchestrate via Claude Flow
    await taskOrchestrate({
      task: "Deepfake verification consensus",
      strategy: "parallel",
      tasks,
    });

    // 4. Aggregate results
    return await buildConsensus(detectionId);
  }
}

// Validator Agent (Independent AI analysis)
class ValidatorAgent {
  async validate(detection: Detection): Promise<Vote> {
    // Use Claude/GPT to analyze detection results
    const analysis = await this.llm.analyze({
      prompt: `You are an expert deepfake analyst. Analyze these detection scores:
        - Vision AI: ${detection.visionScore}
        - Language AI: ${detection.languageScore}
        - Metadata: ${JSON.stringify(detection.metadata)}

        Provide:
        1. Verdict: authentic, deepfake, or uncertain
        2. Confidence: 0-1
        3. Reasoning: Brief explanation
      `,
    });

    return {
      verdict: analysis.verdict,
      confidence: analysis.confidence,
      reasoning: analysis.reasoning,
    };
  }
}
```

**Consensus Mechanism**:
```typescript
class ConsensusBuilder {
  async buildConsensus(verificationId: number): Promise<Consensus> {
    const votes = await getValidatorVotes(verificationId);

    // Weighted voting (confidence-weighted)
    const weightedVotes = votes.reduce((acc, vote) => {
      acc[vote.verdict] = (acc[vote.verdict] || 0) + vote.confidence;
      return acc;
    }, {} as Record<string, number>);

    const totalWeight = Object.values(weightedVotes).reduce((a, b) => a + b, 0);
    const consensusScore = Math.max(...Object.values(weightedVotes)) / totalWeight;

    const verdict = Object.entries(weightedVotes)
      .sort(([, a], [, b]) => b - a)[0][0];

    return {
      verdict,
      consensusScore,
      votesBreakdown: {
        authentic: votes.filter(v => v.verdict === "authentic").length,
        deepfake: votes.filter(v => v.verdict === "deepfake").length,
        uncertain: votes.filter(v => v.verdict === "uncertain").length,
      }
    };
  }
}
```

---

### 3.3 Plugin 3: Evidence Graph (`plugin-truthguard-evidence`)

**Purpose**: Build and publish cryptographic proof to DKG

**Directory Structure**:
```
packages/plugin-truthguard-evidence/
├── src/
│   ├── index.ts
│   ├── services/
│   │   ├── GraphBuilder.ts        # Construct knowledge graph
│   │   ├── ProofGenerator.ts      # Cryptographic proofs
│   │   └── DkgPublisher.ts        # Publish to DKG network
│   ├── templates/
│   │   └── evidenceJsonLd.ts      # JSON-LD schemas
│   ├── database/
│   │   └── schema.ts
│   └── types.ts
└── package.json
```

**Evidence Graph Structure (JSON-LD)**:
```json
{
  "@context": {
    "@vocab": "https://schema.org/",
    "truthguard": "https://truthguard.ai/ontology/",
    "dkg": "https://ontology.origintrail.io/"
  },
  "@type": "truthguard:DeepfakeAnalysisReport",
  "@id": "did:dkg:otp:2043/0x.../12345",

  "dkg:issuedBy": "did:dkg:truthguard/validator-node-1",
  "dkg:issuanceTimestamp": "2025-11-26T05:45:00Z",

  "truthguard:analyzedContent": {
    "@type": "MediaObject",
    "contentUrl": "ipfs://Qm...",
    "encodingFormat": "image/jpeg",
    "sha256": "abc123...",
    "uploadDate": "2025-11-26T05:30:00Z"
  },

  "truthguard:detectionResults": {
    "@type": "truthguard:DetectionScore",
    "visionScore": 0.87,
    "languageScore": 0.92,
    "audioScore": null,
    "compositeScore": 0.895,
    "modelVersions": {
      "vision": "efficientnet-b4-v1.2",
      "language": "roberta-large-v2.0"
    }
  },

  "truthguard:verificationConsensus": {
    "@type": "truthguard:ConsensusReport",
    "swarmTopology": "mesh",
    "validatorCount": 5,
    "consensusScore": 0.94,
    "consensusReached": true,
    "votes": [
      {
        "agentId": "validator-1",
        "verdict": "authentic",
        "confidence": 0.95,
        "timestamp": "2025-11-26T05:44:00Z"
      }
    ]
  },

  "truthguard:finalVerdict": {
    "@type": "truthguard:Verdict",
    "classification": "authentic",
    "confidence": 0.94,
    "riskLevel": "low",
    "explanation": "Multi-modal analysis and validator consensus indicate authentic content"
  },

  "truthguard:cryptographicProof": {
    "@type": "dkg:Proof",
    "merkleRoot": "0xabc123...",
    "blockchainAnchor": {
      "network": "base",
      "transactionHash": "0x456def...",
      "blockNumber": 12345678,
      "timestamp": "2025-11-26T05:45:00Z"
    },
    "signedBy": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }
}
```

**Database Schema**:
```typescript
export const evidenceGraphs = mysqlTable("truthguard_evidence_graphs", {
  id: serial("id").primaryKey(),
  detectionId: int("detection_id")
    .notNull()
    .references(() => detections.id),
  verificationId: int("verification_id")
    .notNull()
    .references(() => verifications.id),

  // DKG publishing
  graphJson: json("graph_json").notNull(), // Full JSON-LD
  ual: varchar("ual", { length: 255 }).unique(), // DKG Universal Asset Locator
  transactionHash: varchar("transaction_hash", { length: 66 }),
  blockchain: varchar("blockchain", { length: 50 }).default("base"),

  // Cryptographic proof
  merkleRoot: varchar("merkle_root", { length: 66 }),
  contentHash: varchar("content_hash", { length: 64 }).notNull(),

  status: mysqlEnum("status", ["building", "publishing", "published", "failed"]),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

**MCP Tool**:
```typescript
mcp.registerTool("truthguard-publish-evidence", {
  title: "Publish Evidence to DKG",
  description: "Create and publish cryptographic proof of detection results to DKG",
  inputSchema: {
    detectionId: z.number(),
    verificationId: z.number(),
  }
}, async (input) => {
  // 1. Fetch detection + verification data
  const detection = await getDetection(input.detectionId);
  const verification = await getVerification(input.verificationId);

  // 2. Build JSON-LD graph
  const graph = buildEvidenceGraph(detection, verification);

  // 3. Generate cryptographic proof
  const proof = await generateProof(graph);

  // 4. Publish to DKG network
  const ual = await publishToDkg(graph, proof);

  // 5. Store evidence record
  await storeEvidence({
    detectionId: input.detectionId,
    verificationId: input.verificationId,
    graphJson: graph,
    ual,
    merkleRoot: proof.merkleRoot,
  });

  return { ual, transactionHash: proof.txHash };
});
```

**DKG Publishing Strategy**:
```typescript
class DkgPublisher {
  async publish(graph: JsonLd): Promise<string> {
    // Reuse existing dkg-publisher plugin infrastructure
    const assetService = serviceContainer.get<AssetService>("assetService");

    const result = await assetService.registerAsset({
      content: graph,
      metadata: {
        source: "truthguard",
        sourceId: `detection-${detectionId}`,
      },
      publishOptions: {
        privacy: "public", // Public verification
        epochs: 5,         // Store for 5 epochs
      }
    });

    // Wait for publishing to complete
    const asset = await waitForPublishing(result.id);

    return asset.ual; // Universal Asset Locator
  }
}
```

---

### 3.4 Plugin 4: Community Validation (`plugin-truthguard-community`)

**Purpose**: Enable human validators to review and challenge results

**Key Features**:
- Stake-based validation (validators stake tokens to participate)
- Challenge mechanism (dispute AI verdicts)
- Reputation system (track validator accuracy)
- Rewards distribution (earn tokens for accurate validations)

**Database Schema**:
```typescript
export const validators = mysqlTable("truthguard_validators", {
  id: serial("id").primaryKey(),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull().unique(),
  stakedAmount: decimal("staked_amount", { precision: 18, scale: 8 }).default(0),
  reputation: int("reputation").default(1000), // ELO-style score
  totalValidations: int("total_validations").default(0),
  accurateValidations: int("accurate_validations").default(0),
  isActive: boolean("is_active").default(true),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const challenges = mysqlTable("truthguard_challenges", {
  id: serial("id").primaryKey(),
  evidenceGraphId: int("evidence_graph_id")
    .notNull()
    .references(() => evidenceGraphs.id),
  challengerAddress: varchar("challenger_address", { length: 42 }).notNull(),

  challengeType: mysqlEnum("challenge_type", [
    "false_positive", // AI said deepfake, human says authentic
    "false_negative", // AI said authentic, human says deepfake
    "low_confidence"  // AI uncertain, human provides clarity
  ]).notNull(),

  evidence: text("evidence"), // Human-provided reasoning/proof
  stakedAmount: decimal("staked_amount", { precision: 18, scale: 8 }).notNull(),

  status: mysqlEnum("status", ["pending", "voting", "accepted", "rejected"]),
  votesFor: int("votes_for").default(0),
  votesAgainst: int("votes_against").default(0),

  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});
```

---

## 4. Technology Stack Integration

### 4.1 Node.js + Python Integration

**Architecture**:
```
┌───────────────────────────────────────────────────────────┐
│                    Docker Compose Stack                   │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  ┌───────────────────┐        ┌───────────────────┐       │
│  │  Node.js Container│◄──────►│ Python Container  │       │
│  │  - DKG Node       │  HTTP  │ - FastAPI         │       │
│  │  - Express        │        │ - EfficientNet    │       │
│  │  - MCP Server     │        │ - RoBERTa         │       │
│  │  Port: 9200       │        │ Port: 8000        │       │
│  └───────────────────┘        └───────────────────┘       │
│           │                            │                  │
│           │                            │                  │
│  ┌────────▼───────────┐      ┌────────▼───────────┐       │
│  │  MySQL Container   │      │  Redis Container   │       │
│  │  Port: 3306        │      │  Port: 6379        │       │
│  └────────────────────┘      └────────────────────┘       │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

**docker-compose.yml**:
```yaml
version: '3.8'
services:
  truthguard-node:
    build: ./apps/agent
    ports:
      - "9200:9200"
    environment:
      - DATABASE_URL=mysql://user:pass@mysql:3306/truthguard
      - REDIS_HOST=redis
      - PYTHON_BRIDGE_URL=http://truthguard-python:8000
    depends_on:
      - mysql
      - redis
      - truthguard-python

  truthguard-python:
    build: ./packages/plugin-truthguard-detection/python
    ports:
      - "8000:8000"
    environment:
      - MODEL_CACHE_DIR=/models
    volumes:
      - ./models:/models
    deploy:
      resources:
        reservations:
          devices:
            - capabilities: [gpu] # GPU acceleration

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: truthguard
    volumes:
      - mysql_data:/var/lib/mysql

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  mysql_data:
  redis_data:
```

### 4.2 Multi-Modal AI Models

**Model Selection**:

| Modality | Model | Purpose | Size | Inference |
|----------|-------|---------|------|-----------|
| **Vision** | EfficientNet-B4 | Image/video deepfake detection | ~19M params | ~50ms/image |
| **Language** | RoBERTa-large | Text/caption analysis | ~355M params | ~100ms/text |
| **Audio** | Whisper-small | Audio deepfake detection | ~244M params | ~1s/30s audio |

**Python Requirements**:
```python
# requirements.txt
torch>=2.0.0
transformers>=4.30.0
efficientnet-pytorch>=0.7.1
whisper>=1.0.0
fastapi>=0.100.0
uvicorn>=0.23.0
pillow>=10.0.0
librosa>=0.10.0  # Audio processing
```

**Model Loading Strategy**:
```python
# python/models/efficientnet_detector.py
import torch
from efficientnet_pytorch import EfficientNet

class EfficientNetDetector:
    def __init__(self, model_path: str = None):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        # Load pre-trained model
        if model_path:
            self.model = torch.load(model_path)
        else:
            self.model = EfficientNet.from_pretrained('efficientnet-b4')
            # Fine-tune on deepfake dataset

        self.model.to(self.device)
        self.model.eval()

    def predict(self, image_bytes: bytes) -> dict:
        # Preprocess image
        image = self.preprocess(image_bytes)

        # Run inference
        with torch.no_grad():
            logits = self.model(image)
            prob = torch.sigmoid(logits).item()

        return {
            "score": prob,
            "confidence": abs(prob - 0.5) * 2,
            "heatmap": self.generate_gradcam(image),
        }
```

### 4.3 MCP Tool Coordination

**TruthGuard MCP Tool Suite**:
```typescript
// Complete detection + verification + publishing pipeline
mcp.registerTool("truthguard-analyze-complete", {
  title: "Complete TruthGuard Analysis",
  description: "End-to-end deepfake detection, verification, and DKG publishing",
  inputSchema: {
    contentUrl: z.string().url(),
    contentType: z.enum(["image", "video", "audio"]),
    validatorCount: z.number().default(5),
    publishToDkg: z.boolean().default(true),
  }
}, async (input) => {
  // Step 1: Detection
  const detection = await mcpCall("truthguard-detect", {
    contentUrl: input.contentUrl,
    contentType: input.contentType,
  });

  // Step 2: Verification Swarm
  const verification = await mcpCall("truthguard-verify", {
    detectionId: detection.id,
    validatorCount: input.validatorCount,
  });

  // Step 3: Publish Evidence (if requested)
  let evidence = null;
  if (input.publishToDkg) {
    evidence = await mcpCall("truthguard-publish-evidence", {
      detectionId: detection.id,
      verificationId: verification.id,
    });
  }

  return {
    detection,
    verification,
    evidence,
    summary: {
      verdict: verification.consensus.verdict,
      confidence: verification.consensus.consensusScore,
      ual: evidence?.ual,
    }
  };
});
```

---

## 5. Deployment Architecture

### 5.1 Development Environment

```bash
# Clone repository
git clone https://github.com/yourorg/truthguard
cd truthguard

# Install dependencies
npm install

# Build all packages
npm run build

# Setup Python models
cd packages/plugin-truthguard-detection/python
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Download pre-trained models
python scripts/download_models.py

# Start development servers
npm run dev              # Node.js + Expo
python python/server.py  # Python bridge
```

### 5.2 Production Deployment

**Option 1: Docker Compose (Recommended)**
```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Monitor logs
docker-compose logs -f
```

**Option 2: Kubernetes**
```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: truthguard-node
spec:
  replicas: 3
  selector:
    matchLabels:
      app: truthguard-node
  template:
    spec:
      containers:
      - name: node
        image: truthguard/node:latest
        ports:
        - containerPort: 9200
      - name: python
        image: truthguard/python:latest
        ports:
        - containerPort: 8000
        resources:
          limits:
            nvidia.com/gpu: 1 # GPU for AI models
```

### 5.3 Blockchain Configuration

**Supported Networks**:
- **Base** (Mainnet): Low fees, fast finality
- **Gnosis Chain**: Decentralized, DAO-governed
- **NeuroWeb**: OriginTrail native chain

**Environment Variables**:
```bash
# .env
DKG_BLOCKCHAIN=otp:2043              # Base mainnet
DKG_OTNODE_URL=https://positron.origin-trail.network
DKG_PUBLISH_WALLET=0x...             # Publishing wallet private key
```

---

## 6. Data Flow & State Management

### 6.1 Complete Analysis Pipeline

```
┌──────────────────────────────────────────────────────────────┐
│ 1. Content Upload                                            │
│    - User uploads image/video/audio                          │
│    - Store in blob storage (filesystem/S3)                   │
│    - Compute SHA-256 hash                                    │
│    - Create detection record (status: pending)               │
└────────────┬─────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. AI Detection (Python Bridge)                              │
│    - Queue detection job in Redis                            │
│    - Python worker picks up job                              │
│    - Run multi-modal inference:                              │
│      • EfficientNet → vision score                           │
│      • RoBERTa → language score                              │
│      • Whisper → audio score (if applicable)                 │
│    - Store results in database (status: completed)           │
└────────────┬─────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. Verification Swarm (Claude Flow)                          │
│    - Initialize mesh topology swarm                          │
│    - Spawn N validator agents (Claude/GPT)                   │
│    - Each agent analyzes detection independently             │
│    - Store votes in database                                 │
│    - Calculate weighted consensus                            │
│    - Update verification record (status: completed)          │
└────────────┬─────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────┐
│ 4. Evidence Graph Construction                               │
│    - Fetch detection + verification data                     │
│    - Build JSON-LD graph (schema.org + custom ontology)      │
│    - Generate Merkle proof of content hash                   │
│    - Sign with node wallet                                   │
└────────────┬─────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────┐
│ 5. DKG Publishing                                            │
│    - Queue asset for publishing (reuse dkg-publisher plugin) │
│    - Wallet manager locks available wallet                   │
│    - Publish to OriginTrail DKG via dkg.js SDK               │
│    - Blockchain transaction anchoring                        │
│    - Store UAL + transaction hash                            │
│    - Release wallet lock                                     │
└────────────┬─────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────┐
│ 6. Result Delivery                                           │
│    - Return UAL to user                                      │
│    - Shareable verification link                             │
│    - Embeddable badge/widget                                 │
│    - API response with full chain of proof                   │
└──────────────────────────────────────────────────────────────┘
```

### 6.2 Database Relationships

```
truthguard_detections (1) ──┬─→ (M) truthguard_verifications
                             │
                             └─→ (M) truthguard_evidence_graphs
                             │
                             └─→ (M) truthguard_challenges

truthguard_verifications (1) ─→ (M) truthguard_validator_votes
                             │
                             └─→ (1) truthguard_evidence_graphs

truthguard_evidence_graphs (1) ─→ (M) truthguard_challenges

truthguard_validators (1) ───→ (M) truthguard_validator_votes
                             │
                             └─→ (M) truthguard_challenges
```

---

## 7. API Reference

### 7.1 REST API Endpoints

**Detection API**:
```
POST   /api/truthguard/detect
GET    /api/truthguard/detect/:id
GET    /api/truthguard/detect/:id/status
DELETE /api/truthguard/detect/:id
```

**Verification API**:
```
POST   /api/truthguard/verify
GET    /api/truthguard/verify/:id
GET    /api/truthguard/verify/:id/votes
POST   /api/truthguard/verify/:id/rerun
```

**Evidence API**:
```
POST   /api/truthguard/evidence/publish
GET    /api/truthguard/evidence/:id
GET    /api/truthguard/evidence/ual/:ual
GET    /api/truthguard/evidence/:id/proof
```

**Community API**:
```
POST   /api/truthguard/validators/register
POST   /api/truthguard/challenges/create
GET    /api/truthguard/challenges/:id
POST   /api/truthguard/challenges/:id/vote
```

### 7.2 MCP Tools

```typescript
// Detection
truthguard-detect                 // Single detection
truthguard-detect-batch           // Batch detection

// Verification
truthguard-verify                 // Swarm verification
truthguard-verify-status          // Check verification status

// Evidence
truthguard-publish-evidence       // Publish to DKG
truthguard-query-evidence         // Query by UAL

// Complete Pipeline
truthguard-analyze-complete       // End-to-end analysis
```

---

## 8. Security Considerations

### 8.1 Content Security
- **Input Validation**: Sanitize all uploaded content
- **File Type Verification**: MIME type + magic bytes checking
- **Size Limits**: Max 100MB per file
- **Virus Scanning**: ClamAV integration

### 8.2 Wallet Security
- **Private Key Encryption**: AES-256-GCM encryption at rest
- **Wallet Locking**: Prevent concurrent use
- **Transaction Signing**: Hardware wallet support (future)

### 8.3 API Security
- **Rate Limiting**: 100 requests/hour per IP
- **OAuth 2.1**: Existing dkg-node auth system
- **API Keys**: Service-to-service authentication
- **CORS**: Whitelist trusted domains

### 8.4 Data Privacy
- **GDPR Compliance**: Right to deletion (challenge: immutable blockchain)
- **Content Hashing**: Only hashes on-chain, not actual content
- **Opt-in Publishing**: Users choose public vs. private verification

---

## 9. Performance Optimization

### 9.1 AI Model Optimization
- **Model Quantization**: INT8 quantization (2-4x speedup)
- **Batch Inference**: Process multiple images in parallel
- **Model Caching**: Keep models in GPU memory
- **ONNX Runtime**: Cross-platform acceleration

### 9.2 Database Optimization
- **Indexes**: Strategic indexes on frequently queried columns
- **Connection Pooling**: Drizzle ORM pooling
- **Query Optimization**: EXPLAIN ANALYZE for slow queries
- **Caching**: Redis for hot data (detection results)

### 9.3 Queue Processing
- **Concurrency**: BullMQ concurrent workers
- **Prioritization**: High-priority detections first
- **Dead Letter Queue**: Failed jobs for manual review
- **Rate Limiting**: Respect DKG network limits

---

## 10. Monitoring & Observability

### 10.1 Metrics
```typescript
// Key metrics to track
- Detections per hour
- Average detection time (P50, P95, P99)
- Verification consensus rate
- DKG publishing success rate
- Validator accuracy
- Challenge resolution time
```

### 10.2 Logging
```typescript
// Structured logging with Winston
logger.info("Detection completed", {
  detectionId: 123,
  contentType: "image",
  visionScore: 0.87,
  processingTimeMs: 523,
});
```

### 10.3 Alerting
- Detection failures > 5%
- DKG publishing errors
- Consensus not reached
- Database connection issues

---

## 11. Development Roadmap

### Phase 1: Core Detection (Month 1-2)
- [ ] Setup plugin structure
- [ ] Python bridge implementation
- [ ] EfficientNet integration
- [ ] Basic API endpoints
- [ ] Database schema

### Phase 2: Verification Swarm (Month 3)
- [ ] Claude Flow integration
- [ ] Validator agent implementation
- [ ] Consensus mechanism
- [ ] MCP tools registration

### Phase 3: Evidence Graph (Month 4)
- [ ] JSON-LD schema design
- [ ] DKG publishing integration
- [ ] Cryptographic proof generation
- [ ] UAL resolver

### Phase 4: Community Features (Month 5-6)
- [ ] Validator registration
- [ ] Challenge mechanism
- [ ] Reputation system
- [ ] Token rewards

### Phase 5: Production (Month 7+)
- [ ] Performance optimization
- [ ] Security audit
- [ ] Documentation
- [ ] Mainnet deployment

---

## 12. Conclusion

TruthGuard leverages the robust dkg-node infrastructure to create a production-ready deepfake detection system with:

** Strengths**:
- **Modular Architecture**: Plugin-based design enables independent development
- **Existing Infrastructure**: Reuse database, queue, and DKG publishing systems
- **Multi-Modal AI**: Comprehensive detection across vision, language, and audio
- **Decentralized Consensus**: Swarm verification prevents single points of failure
- **Cryptographic Proof**: Blockchain-anchored evidence graphs
- **Extensible**: Easy to add new detection models or verification strategies

**🎯 Next Steps**:
1. Create plugin scaffolding (`packages/plugin-truthguard-*`)
2. Setup Python FastAPI bridge
3. Implement detection pipeline MVP
4. Integrate Claude Flow for verification
5. Test end-to-end workflow

**📝 Key Files to Create**:
```
packages/
├── plugin-truthguard-detection/
│   ├── src/index.ts
│   ├── python/server.py
│   └── package.json
├── plugin-truthguard-verification/
│   ├── src/index.ts
│   └── package.json
├── plugin-truthguard-evidence/
│   ├── src/index.ts
│   └── package.json
└── plugin-truthguard-community/
    ├── src/index.ts
    └── package.json
```

---
