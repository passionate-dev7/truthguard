# TruthGuard System Diagrams

## 1. High-Level System Architecture

```
┌───────────────────────────────────────────────────────────────────────────┐
│                           TruthGuard Platform                             │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌────────────────────┐ │
│  │   User Interface    │  │    External Apps    │  │   API Consumers    │ │
│  │  - Web Dashboard    │  │  - Mobile Apps      │  │  - Third-party     │ │
│  │  - Upload Widget    │  │  - Browser Ext      │  │  - Integrations    │ │
│  └──────────┬──────────┘  └──────────┬──────────┘  └─────────┬──────────┘ │
│             │                        │                       │            │
│             └────────────────────────┼───────────────────────┘            │
│                                      │                                    │
│======================================|==============================      │
│                                      │                                    │
│  ┌──────────────────────────────────▼───────────────────────────────────┐ │
│  │               DKG Node Runtime (Port 9200)                           │ │
│  │  ┌────────────────────────────────────────────────────────────────┐  │ │
│  │  │  Express API Server + MCP Server                               │  │ │
│  │  │  - REST endpoints (/api/truthguard/*)                          │  │ │
│  │  │  - MCP tools (truthguard-detect, truthguard-verify, etc.)      │  │ │
│  │  │  - OAuth 2.1 authentication                                    │  │ │
│  │  │  - Swagger documentation                                       │  │ │
│  │  └────────────────────────────────────────────────────────────────┘  │ │
│  │                                                                      │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────────┐  │ │
│  │  │ Plugin:         │  │ Plugin:         │  │ Plugin:              │  │ │
│  │  │ Detection       │  │ Verification    │  │ Evidence             │  │ │
│  │  │                 │  │                 │  │                      │  │ │
│  │  │ - AI Models     │  │ - Agent Swarm   │  │ - Graph Builder      │  │ │
│  │  │ - Preprocessing │  │ - Consensus     │  │ - DKG Publisher      │  │ │
│  │  │ - Queue Jobs    │  │ - Voting        │  │ - Proof Generator    │  │ │
│  │  └────────┬────────┘  └────────┬────────┘  └──────────┬───────────┘  │ │
│  │           │                    │                      │              │ │
│  └───────────┼────────────────────┼──────────────────────┼──────────────┘ │
│              │                    │                      │                │
│  ============|====================|======================|==============  │
│              │                    │                      │                │
│  ┌───────────▼──────────┐  ┌──────▼─────────┐  ┌─────────▼─────────────┐  │
│  │ Python AI Bridge     │  │ Claude Flow    │  │ DKG Client (dkg.js)   │  │
│  │ (Port 8000)          │  │ MCP Tools      │  │                       │  │
│  │                      │  │                │  │ - Asset Publishing    │  │
│  │ - EfficientNet-B4    │  │ - Swarm Init   │  │ - SPARQL Queries      │  │
│  │ - RoBERTa-large      │  │ - Agent Spawn  │  │ - UAL Resolution      │  │
│  │ - Whisper-small      │  │ - Orchestrate  │  │                       │  │
│  │ - FastAPI Server     │  │                │  │                       │  │
│  └──────────────────────┘  └────────────────┘  └───────────┬───────────┘  │
│                                                            │              │
│  ┌──────────────────────┐  ┌──────────────────┐            │              │
│  │ MySQL Database       │  │ Redis Queue      │            │              │
│  │                      │  │                  │            │              │
│  │ - Detections         │  │ - BullMQ Jobs    │            │              │
│  │ - Verifications      │  │ - Worker Pool    │            │              │
│  │ - Evidence Graphs    │  │ - Caching        │            │              │
│  │ - Validators         │  │                  │            │              │
│  └──────────────────────┘  └──────────────────┘            │              │
│                                                            │              │
└────────────────────────────────────────────────────────────┼──────────────┘
                                                             │
                                                             ▼
                            ┌────────────────────────────────────────────┐
                            │   OriginTrail DKG Network                  │
                            │                                            │
                            │  ┌──────────────┐  ┌──────────────────┐    │
                            │  │ Base Chain   │  │ Gnosis Chain     │    │
                            │  │ (Mainnet)    │  │ (Alternative)    │    │
                            │  └──────────────┘  └──────────────────┘    │
                            │                                            │
                            │  - Blockchain Anchoring                    │
                            │  - UAL Resolution                          │
                            │  - Cryptographic Proofs                    │
                            │  - Decentralized Storage                   │
                            └────────────────────────────────────────────┘
```

---

## 2. Data Flow: Complete Detection Pipeline

```
┌────────────┐
│   User     │
│  Uploads   │
│  Content   │
└─────┬──────┘
      │
      │ POST /api/truthguard/detect
      ▼
┌──────────────────────────────────────────────────────────────┐
│ STEP 1: Content Ingestion                                    │
├──────────────────────────────────────────────────────────────┤
│ - Validate file type, size                                   │
│ - Upload to blob storage                                     │
│ - Compute SHA-256 hash                                       │
│ - Create DB record (status: pending)                         │
└─────┬────────────────────────────────────────────────────────┘
      │
      │ Queue job in Redis
      ▼
┌───────────────────────────────────────────────────────────────┐
│ STEP 2: AI Detection (Python Bridge)                          │
├───────────────────────────────────────────────────────────────┤
│ BullMQ Worker picks up job                                    │
│                                                               │
│ ┌─────────────────┐    HTTP POST    ┌──────────────────┐      │
│ │ Node.js Worker  │───────────────▶│ Python FastAPI    │      │
│ │                 │  image/video    │                  │      │
│ │ - Fetch content │                 │ - EfficientNet   │      │
│ │ - Send to Python│                 │ - RoBERTa        │      │
│ │ - Store results │◀────────────────│ - Whisper        │      │
│ └─────────────────┘    JSON scores  └──────────────────┘      │
│                                                               │
│ Update DB: status = completed                                 │
│            visionScore = 0.87                                 │
│            languageScore = 0.92                               │
│            compositeScore = 0.895                             │
└─────┬─────────────────────────────────────────────────────────┘
      │
      │ Trigger verification (if score < threshold)
      ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Verification Swarm (Claude Flow)                    │
├─────────────────────────────────────────────────────────────┤
│ Initialize mesh topology swarm                              │
│                                                             │
│ ┌─────────────┐                                             │
│ │ Coordinator │                                             │
│ │   Agent     │                                             │
│ └──────┬──────┘                                             │
│        │                                                    │
│        │ Distribute tasks                                   │
│        ├─────────┬─────────┬─────────┬─────────┬            │
│        ▼         ▼         ▼         ▼         ▼            │
│   ┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐        │
│   │Validator│Validator│Validator│Validator│Validator│       │
│   │   1    ││   2    ││   3    ││   4    ││   5    │        │
│   └────┬───┘└────┬───┘└────┬───┘└────┬───┘└────┬───┘        │
│        │         │         │         │         │            │
│        │ Vote    │ Vote    │ Vote    │ Vote    │ Vote       │
│        ▼         ▼         ▼         ▼         ▼            │
│   ┌─────────────────────────────────────────────────────┐   │
│   │           Consensus Builder                         │   │
│   │                                                     │   │
│   │  Authentic: 4 votes (0.95, 0.88, 0.91, 0.87)        │   │
│   │  Deepfake:  1 vote  (0.65)                          │   │
│   │                                                     │   │
│   │  Weighted Consensus: 0.94 → AUTHENTIC               │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│ Store in DB:                                                │
│   - verification.consensusScore = 0.94                      │
│   - verification.consensusReached = true                    │
│   - 5 validator_votes records                               │
└─────┬───────────────────────────────────────────────────────┘
      │
      │ Build evidence graph
      ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Evidence Graph Construction                         │
├─────────────────────────────────────────────────────────────┤
│ GraphBuilder fetches:                                       │
│   - Detection results (scores, metadata)                    │
│   - Verification consensus (votes, agents)                  │
│   - Content hash (SHA-256)                                  │
│                                                             │
│ ┌────────────────────────────────────────────────────────┐  │
│ │           JSON-LD Evidence Graph                       │  │
│ │ {                                                      │  │
│ │   "@context": "https://schema.org/",                   │  │
│ │   "@type": "truthguard:DeepfakeAnalysisReport",        │  │
│ │   "detectionResults": {                                │  │
│ │     "visionScore": 0.87,                               │  │
│ │     "compositeScore": 0.895                            │  │
│ │   },                                                   │  │
│ │   "verificationConsensus": {                           │  │
│ │     "consensusScore": 0.94,                            │  │
│ │     "votes": [...]                                     │  │
│ │   },                                                   │  │
│ │   "finalVerdict": {                                    │  │
│ │     "classification": "authentic",                     │  │
│ │     "confidence": 0.94                                 │  │
│ │   },                                                   │  │
│ │   "cryptographicProof": {                              │  │
│ │     "merkleRoot": "0xabc123..."                        │  │
│ │   }                                                    │  │
│ │ }                                                      │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                             │
│ ProofGenerator:                                             │
│   - Build Merkle tree of content hash                       │
│   - Sign with node wallet                                   │
│   - Generate proof JSON                                     │
└─────┬───────────────────────────────────────────────────────┘
      │
      │ Publish to DKG
      ▼
┌──────────────────────────────────────────────────────────────┐
│ STEP 5: DKG Publishing (Blockchain Anchoring)                │
├──────────────────────────────────────────────────────────────┤
│ DkgPublisher:                                                │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ 1. WalletService.lock() → Get available wallet          │  │
│ │ 2. dkg.asset.create(evidenceGraph)                      │  │
│ │ 3. Wait for blockchain confirmation                     │  │
│ │ 4. Receive UAL + Transaction Hash                       │  │
│ │ 5. WalletService.unlock() → Release wallet              │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                              │
│ Blockchain Transaction:                                      │
│   Network: base (Chain ID: 8453)                             │
│   From: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb            │
│   Gas: ~0.0001 ETH (~$0.01)                                  │
│   Status: Confirmed (Block #12345678)                      │
│                                                              │
│ DKG Response:                                                │
│   UAL: did:dkg:otp:2043/0x.../269088/1                       │
│   TX Hash: 0x456def789...                                    │
│   Finalized: true                                            │
│                                                              │
│ Store in DB:                                                 │
│   evidence_graphs.ual = "did:dkg:..."                        │
│   evidence_graphs.transactionHash = "0x456def..."            │
│   evidence_graphs.status = published                         │
└─────┬────────────────────────────────────────────────────────┘
      │
      │ Return to user
      ▼
┌──────────────────────────────────────────────────────────────┐
│ STEP 6: Result Delivery                                      │
├──────────────────────────────────────────────────────────────┤
│ API Response:                                                │
│ {                                                            │
│   "verdict": "authentic",                                    │
│   "confidence": 0.94,                                        │
│   "ual": "did:dkg:otp:2043/0x.../269088/1",                  │
│   "explorerUrl": "https://dkg.origintrail.io/...",           │
│   "transactionHash": "0x456def789...",                       │
│   "blockchain": "base",                                      │
│   "timestamp": "2025-11-26T05:45:00Z"                        │
│ }                                                            │
│                                                              │
│ User receives:                                               │
│   ✅ Shareable verification link                             │
│   ✅ Embeddable badge/widget                                 │
│   ✅ Downloadable proof certificate                          │
│   ✅ Blockchain explorer link                                │
└──────────────────────────────────────────────────────────────┘

Total Time: ~45 seconds (Detection: 5s, Verification: 3s, Publishing: 30s)
```

---

## 3. Plugin Architecture Detail

```
┌──────────────────────────────────────────────────────────────────┐
│                  TruthGuard Plugin Ecosystem                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ Plugin 1: truthguard-detection                           │    │
│  ├──────────────────────────────────────────────────────────┤    │
│  │                                                          │    │
│  │  MCP Tools:                                              │    │
│  │  ├─ truthguard-detect                                    │    │
│  │  └─ truthguard-detect-batch                              │    │
│  │                                                          │    │
│  │  API Endpoints:                                          │    │
│  │  ├─ POST /api/truthguard/detect                          │    │
│  │  ├─ GET  /api/truthguard/detect/:id                      │    │
│  │  └─ GET  /api/truthguard/detect/:id/status               │    │
│  │                                                          │    │
│  │  Database Tables:                                        │    │
│  │  └─ truthguard_detections                                │    │
│  │                                                          │    │
│  │  Services:                                               │    │
│  │  ├─ DetectionService (queue management)                  │    │
│  │  ├─ PythonBridge (HTTP client)                           │    │
│  │  └─ PreprocessingService (image/video prep)              │    │
│  │                                                          │    │
│  │  External Dependency:                                    │    │
│  │  └─ Python FastAPI Server (Port 8000)                    │    │
│  │     ├─ EfficientNet-B4 (vision)                          │    │
│  │     ├─ RoBERTa-large (language)                          │    │
│  │     └─ Whisper-small (audio)                             │    │
│  │                                                          │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ Plugin 2: truthguard-verification                        │    │
│  ├──────────────────────────────────────────────────────────┤    │
│  │                                                          │    │
│  │  MCP Tools:                                              │    │
│  │  ├─ truthguard-verify                                    │    │
│  │  └─ truthguard-verify-status                             │    │
│  │                                                          │    │
│  │  API Endpoints:                                          │    │
│  │  ├─ POST /api/truthguard/verify                          │    │
│  │  ├─ GET  /api/truthguard/verify/:id                      │    │
│  │  └─ GET  /api/truthguard/verify/:id/votes                │    │
│  │                                                          │    │
│  │  Database Tables:                                        │    │
│  │  ├─ truthguard_verifications                             │    │
│  │  └─ truthguard_validator_votes                           │    │
│  │                                                          │    │
│  │  Services:                                               │    │
│  │  ├─ SwarmService (agent lifecycle)                       │    │
│  │  ├─ VotingService (consensus building)                   │    │
│  │  └─ AgentFactory (spawn validators)                      │    │
│  │                                                          │    │
│  │  Agents:                                                 │    │
│  │  ├─ CoordinatorAgent (orchestrates voting)               │    │
│  │  ├─ ValidatorAgent (independent analysis)                │    │
│  │  └─ ConsensusBuilder (aggregates votes)                  │    │
│  │                                                          │    │
│  │  External Dependency:                                    │    │
│  │  └─ Claude Flow MCP Tools                                │    │
│  │     ├─ swarm_init                                        │    │
│  │     ├─ agent_spawn                                       │    │
│  │     └─ task_orchestrate                                  │    │
│  │                                                          │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ Plugin 3: truthguard-evidence                            │    │
│  ├──────────────────────────────────────────────────────────┤    │
│  │                                                          │    │
│  │  MCP Tools:                                              │    │
│  │  ├─ truthguard-publish-evidence                          │    │
│  │  └─ truthguard-query-evidence                            │    │
│  │                                                          │    │
│  │  API Endpoints:                                          │    │
│  │  ├─ POST /api/truthguard/evidence/publish                │    │
│  │  ├─ GET  /api/truthguard/evidence/:id                    │    │
│  │  └─ GET  /api/truthguard/evidence/ual/:ual               │    │
│  │                                                          │    │
│  │  Database Tables:                                        │    │
│  │  └─ truthguard_evidence_graphs                           │    │
│  │                                                          │    │
│  │  Services:                                               │    │
│  │  ├─ GraphBuilder (JSON-LD construction)                  │    │
│  │  ├─ ProofGenerator (Merkle trees, signing)               │    │
│  │  └─ DkgPublisher (blockchain publishing)                 │    │
│  │                                                          │    │
│  │  External Dependency:                                    │    │
│  │  └─ dkg.js SDK + OriginTrail DKG Network                 │    │
│  │     ├─ dkg.asset.create()                                │    │
│  │     ├─ dkg.asset.get()                                   │    │
│  │     └─ Blockchain: Base/Gnosis/NeuroWeb                  │    │
│  │                                                          │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ Plugin 4: truthguard-community                           │    │
│  ├──────────────────────────────────────────────────────────┤    │
│  │                                                          │    │
│  │  MCP Tools:                                              │    │
│  │  ├─ truthguard-validator-register                        │    │
│  │  └─ truthguard-challenge-create                          │    │
│  │                                                          │    │
│  │  API Endpoints:                                          │    │
│  │  ├─ POST /api/truthguard/validators/register             │    │
│  │  ├─ POST /api/truthguard/challenges/create               │    │
│  │  ├─ GET  /api/truthguard/challenges/:id                  │    │
│  │  └─ POST /api/truthguard/challenges/:id/vote             │    │
│  │                                                          │    │
│  │  Database Tables:                                        │    │
│  │  ├─ truthguard_validators                                │    │
│  │  └─ truthguard_challenges                                │    │
│  │                                                          │    │
│  │  Services:                                               │    │
│  │  ├─ ValidatorService (registration, staking)             │    │
│  │  ├─ ChallengeService (dispute management)                │    │
│  │  ├─ ReputationService (ELO scoring)                      │    │
│  │  └─ RewardService (token distribution)                   │    │
│  │                                                          │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│                       Shared Infrastructure                      │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ - Database: Drizzle ORM + MySQL                          │    │
│  │ - Queue: BullMQ + Redis                                  │    │
│  │ - Storage: Filesystem / S3                               │    │
│  │ - Auth: OAuth 2.1 (@dkg/plugin-oauth)                    │    │
│  │ - Docs: Swagger (@dkg/plugin-swagger)                    │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. Database Schema Relationships

```
┌────────────────────────────────────────────────────────────────────┐
│                    TruthGuard Database Schema                      │
└────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────┐
│ truthguard_detections       │
├─────────────────────────────┤
│ • id (PK)                   │
│ • contentHash (UNIQUE)      │───────┐
│ • contentType               │       │
│ • contentUrl                │       │ 1:M
│ • visionScore               │       │
│ • languageScore             │       ▼
│ • audioScore                │  ┌─────────────────────────────┐
│ • compositeScore            │  │ truthguard_verifications    │
│ • status                    │  ├─────────────────────────────┤
│ • processingTimeMs          │  │ • id (PK)                   │
│ • verificationId (FK)       │──│ • detectionId (FK)          │
│ • createdAt                 │  │ • swarmId                   │
│ • updatedAt                 │  │ • topology                  │
└─────────────────────────────┘  │ • validatorCount            │
                                 │ • consensusScore            │
                                 │ • consensusReached          │
                                 │ • votesAuthentic            │
                                 │ • votesDeepfake             │
                                 │ • status                    │
                                 │ • createdAt                 │
                                 │ • completedAt               │
                                 └──────────┬──────────────────┘
                                            │
                                            │ 1:M
                                            │
        ┌───────────────────────────────────┼────────────────────┐
        │                                   │                    │
        ▼                                   ▼                    ▼
┌──────────────────────────┐  ┌─────────────────────────────────────┐
│truthguard_validator_votes│  │ truthguard_evidence_graphs         │
├──────────────────────────┤  ├─────────────────────────────────────┤
│ • id (PK)                │  │ • id (PK)                           │
│ • verificationId (FK)    │  │ • detectionId (FK)                  │
│ • agentId                │  │ • verificationId (FK)               │
│ • agentType              │  │ • graphJson (JSON)                  │
│ • verdict                │  │ • ual (UNIQUE)                      │
│ • confidence             │  │ • transactionHash                   │
│ • reasoning              │  │ • blockchain                        │
│ • votedAt                │  │ • merkleRoot                        │
└──────────────────────────┘  │ • contentHash                       │
                              │ • status                            │
                              │ • publishedAt                       │
                              │ • createdAt                         │
                              └──────────┬──────────────────────────┘
                                         │
                                         │ 1:M
                                         │
                                         ▼
                              ┌──────────────────────────────────┐
                              │ truthguard_challenges            │
                              ├──────────────────────────────────┤
                              │ • id (PK)                        │
                              │ • evidenceGraphId (FK)           │
                              │ • challengerAddress              │
                              │ • challengeType                  │
                              │ • evidence (TEXT)                │
                              │ • stakedAmount                   │
                              │ • status                         │
                              │ • votesFor                       │
                              │ • votesAgainst                   │
                              │ • createdAt                      │
                              │ • resolvedAt                     │
                              └──────────────────────────────────┘

┌─────────────────────────────┐
│ truthguard_validators       │
├─────────────────────────────┤
│ • id (PK)                   │
│ • walletAddress (UNIQUE)    │
│ • stakedAmount              │
│ • reputation                │
│ • totalValidations          │
│ • accurateValidations       │
│ • isActive                  │
│ • joinedAt                  │
└─────────────────────────────┘

Legend:
────────  One-to-Many Relationship
(PK)      Primary Key
(FK)      Foreign Key
(UNIQUE)  Unique Constraint
```

---

## 5. Multi-Modal Detection Flow

```
                        User Upload (Image/Video/Audio)
                                      │
                                      ▼
                        ┌──────────────────────────────┐
                        │  Content Router              │
                        │  (Determine modality)        │
                        └──────┬───────────────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
         ▼                     ▼                     ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  Image Pipeline  │  │  Video Pipeline  │  │  Audio Pipeline  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
         │                     │                     │
         │ Extract             │ Extract             │ Extract
         │ features            │ frames              │ waveform
         ▼                     ▼                     ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ EfficientNet-B4  │  │ EfficientNet-B4  │  │ Whisper-small    │
│ (Vision AI)      │  │ (per frame)      │  │ (Audio AI)       │
│                  │  │                  │  │                  │
│ Input: 380x380   │  │ Input: 380x380   │  │ Input: 16kHz     │
│ Output: Score    │  │ Output: Scores[] │  │ Output: Score    │
└────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
         │                     │                     │
         │ Vision: 0.87        │ Vision: [0.85,      │ Audio: 0.91
         │                     │  0.88, 0.89]        │
         │                     │ Avg: 0.87           │
         ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Score Fusion Engine                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  If (has_text_in_image):                                       │
│    Extract text → RoBERTa-large                                │
│    Language Score: 0.92                                        │
│                                                                 │
│  Weighted Average:                                             │
│    compositeScore = (vision * 0.5) + (language * 0.3) +       │
│                     (audio * 0.2)                              │
│                   = (0.87 * 0.5) + (0.92 * 0.3) + (0.91 * 0.2)│
│                   = 0.435 + 0.276 + 0.182                      │
│                   = 0.893                                      │
│                                                                 │
│  Confidence Interval: [0.85, 0.94] (95% CI)                   │
│                                                                 │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          │ compositeScore: 0.893
                          ▼
                  ┌────────────────────┐
                  │ Classification:    │
                  │   - Score >= 0.85  │
                  │   → AUTHENTIC      │
                  │   - Score <= 0.65  │
                  │   → DEEPFAKE       │
                  │   - 0.65 < x < 0.85│
                  │   → UNCERTAIN      │
                  └────────────────────┘
```

---

## 6. Deployment Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│              Production Deployment (Docker Compose)              │
└──────────────────────────────────────────────────────────────────┘

                           ┌──────────────────┐
                           │  Load Balancer   │
                           │  (nginx/Traefik) │
                           └────────┬─────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
         ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
         │ Node.js      │ │ Node.js      │ │ Node.js      │
         │ Instance 1   │ │ Instance 2   │ │ Instance 3   │
         │ (Port 9200)  │ │ (Port 9201)  │ │ (Port 9202)  │
         └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
                │                │                │
                └────────────────┼────────────────┘
                                 │
           ┌─────────────────────┼─────────────────────┐
           │                     │                     │
           ▼                     ▼                     ▼
┌─────────────────────┐ ┌─────────────────┐ ┌─────────────────────┐
│ MySQL (Primary)     │ │ Redis Cluster   │ │ Python Workers      │
│ Port: 3306          │ │ Port: 6379      │ │ (GPU Instances)     │
│                     │ │                 │ │                     │
│ - Detections        │ │ - BullMQ Jobs   │ │ ┌─────────────────┐ │
│ - Verifications     │ │ - Session Cache │ │ │ Worker 1        │ │
│ - Evidence Graphs   │ │ - Rate Limiting │ │ │ (RTX 3090)      │ │
│                     │ │                 │ │ └─────────────────┘ │
├─────────────────────┤ │                 │ │ ┌─────────────────┐ │
│ MySQL (Replica 1)   │ │                 │ │ │ Worker 2        │ │
│ Read-only queries   │ │                 │ │ │ (RTX 3090)      │ │
├─────────────────────┤ │                 │ │ └─────────────────┘ │
│ MySQL (Replica 2)   │ │                 │ │ ┌─────────────────┐ │
│ Read-only queries   │ │                 │ │ │ Worker 3        │ │
└─────────────────────┘ └─────────────────┘ │ │ (RTX 3090)      │ │
                                            │ └─────────────────┘ │
                                            └─────────────────────┘

┌─────────────────────┐ ┌─────────────────┐ ┌─────────────────────┐
│ Blob Storage        │ │ Monitoring      │ │ Blockchain RPCs     │
│ (S3/MinIO)          │ │                 │ │                     │
│                     │ │ - Prometheus    │ │ - Base RPC          │
│ - Uploaded content  │ │ - Grafana       │ │ - Gnosis RPC        │
│ - AI model cache    │ │ - Alertmanager  │ │ - Fallback RPCs     │
└─────────────────────┘ └─────────────────┘ └─────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                External Services                                 │
├──────────────────────────────────────────────────────────────────┤
│ - OriginTrail DKG Network (blockchain anchoring)                 │
│ - Claude Flow MCP Server (agent coordination)                    │
│ - OpenAI/Anthropic APIs (LLM inference for validators)           │
│ - IPFS/Arweave (decentralized content storage)                   │
└──────────────────────────────────────────────────────────────────┘

Scaling Strategies:
- Horizontal: Add more Node.js/Python workers
- Vertical: Upgrade GPU (RTX 4090), increase CPU/RAM
- Database: Read replicas, connection pooling
- Queue: Redis Cluster with sharding
```

---

## 7. Security Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                   Security Layers & Controls                     │
└──────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Layer 1: Network Security                                       │
├─────────────────────────────────────────────────────────────────┤
│ • DDoS Protection (Cloudflare)                                  │
│ • WAF (Web Application Firewall)                                │
│ • Rate Limiting (100 req/hour per IP)                           │
│ • HTTPS/TLS 1.3 only                                            │
│ • CORS (whitelist trusted domains)                              │
└─────────────────────────────────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 2: Authentication & Authorization                         │
├─────────────────────────────────────────────────────────────────┤
│ • OAuth 2.1 (existing @dkg/plugin-oauth)                        │
│ • API Keys for service-to-service                               │
│ • JWT tokens (short-lived, 15 min)                              │
│ • Role-Based Access Control (RBAC)                              │
│   - Admin: Full access                                          │
│   - Validator: Challenge creation                               │
│   - User: Detection submission                                  │
└─────────────────────────────────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 3: Input Validation                                       │
├─────────────────────────────────────────────────────────────────┤
│ • File Type Validation (MIME + magic bytes)                     │
│ • Size Limits (max 100MB)                                       │
│ • Content Scanning (ClamAV for malware)                         │
│ • SQL Injection Prevention (Drizzle ORM)                        │
│ • XSS Prevention (sanitize HTML)                                │
└─────────────────────────────────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 4: Data Protection                                        │
├─────────────────────────────────────────────────────────────────┤
│ Wallet Private Keys:                                            │
│   • AES-256-GCM encryption at rest                              │
│   • Environment variable for encryption key                     │
│   • Never logged or exposed in APIs                             │
│                                                                 │
│ User Content:                                                   │
│   • SHA-256 hashing (content addressing)                        │
│   • Only hashes on blockchain, not raw data                     │
│   • Opt-in public vs. private verification                      │
│                                                                 │
│ Database:                                                       │
│   • Encrypted connections (TLS)                                 │
│   • Encrypted backups                                           │
│   • GDPR compliance (right to deletion)                         │
└─────────────────────────────────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 5: Operational Security                                   │
├─────────────────────────────────────────────────────────────────┤
│ • Audit Logging (all actions logged)                            │
│ • Intrusion Detection (fail2ban)                                │
│ • Secrets Management (Vault/env vars)                           │
│ • Container Isolation (Docker)                                  │
│ • Dependency Scanning (npm audit, Snyk)                         │
│ • Regular Security Audits                                       │
└─────────────────────────────────────────────────────────────────┘

Attack Vector Mitigation:
┌────────────────────┬──────────────────┬────────────────────────┐
│ Attack             │ Probability      │ Mitigation             │
├────────────────────┼──────────────────┼────────────────────────┤
│ Wallet theft       │ Low              │ Encryption + HSM       │
│ Malicious upload   │ High             │ Scanning + validation  │
│ Sybil validators   │ Medium           │ Stake + reputation     │
│ DoS                │ Medium           │ Rate limit + WAF       │
│ SQL injection      │ Low              │ ORM + input sanitize   │
│ XSS                │ Low              │ CSP + HTML sanitize    │
│ API abuse          │ High             │ JWT + API keys         │
└────────────────────┴──────────────────┴────────────────────────┘
```

---

**End of Diagrams**

These visual representations complement the detailed architecture documentation and provide quick reference for developers implementing TruthGuard plugins.
