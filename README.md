# TruthGuard Project built with DKG Node

Multi-modal deepfake detection and content verification platform for the Decentralized Knowledge Graph (DKG).

## Features

### 🔍 Multi-Modal Detection
- **Visual Analysis**: EfficientNet-B7 based deepfake detection for images and videos
- **Audio Analysis**: Voice cloning and synthetic speech detection
- **Text Analysis**: AI-generated text detection using RoBERTa
- **Multi-Modal Fusion**: Combine evidence from multiple modalities for higher accuracy

### 🤖 Verification Swarm
- Specialized AI agents for each modality
- Distributed verification with consensus building
- Community validator coordination
- Evidence collection and blockchain storage

### 🔗 DKG Integration
- Store detection results as Knowledge Assets
- ClaimReview schema for fact-checks
- CreativeWork schema for creator protection
- Cryptographic proof chains

## Installation

```bash
npm install @dkg/truthguard-plugin
```

### Python ML Dependencies

```bash
cd python
pip install -r requirements.txt
```

## MCP Tools

### 1. deepfake_detect
Multi-modal deepfake detection for images, videos, audio, and text.

```typescript
const result = await mcp.callTool({
  name: "deepfake_detect",
  arguments: {
    contentUrl: "https://example.com/video.mp4",
    contentType: "video",
    fusionMethod: "deep_fusion"
  }
});
```

### 2. fact_check
Verify factual claims with trusted sources.

```typescript
const result = await mcp.callTool({
  name: "fact_check",
  arguments: {
    claim: "The Earth is flat",
    context: "Scientific claim"
  }
});
```

### 3. content_monitor
Real-time content monitoring for social media and news feeds.

```typescript
const result = await mcp.callTool({
  name: "content_monitor",
  arguments: {
    source: "twitter",
    sourceId: "tweet_12345",
    autoVerify: true
  }
});
```

### 4. validator_coordinate
Coordinate community validators for consensus building.

```typescript
const result = await mcp.callTool({
  name: "validator_coordinate",
  arguments: {
    contentId: "content-uuid",
    validatorIds: ["val1", "val2", "val3"],
    minimumVotes: 3
  }
});
```

### 5. creator_protect
Register authentic content with attribution proofs.

```typescript
const result = await mcp.callTool({
  name: "creator_protect",
  arguments: {
    contentUrl: "https://example.com/original.jpg",
    creatorDid: "did:example:creator123",
    licenseTerms: "CC-BY-4.0"
  }
});
```

## API Endpoints

### POST /detect
Deepfake detection endpoint.

```bash
curl -X POST http://localhost:3000/detect \
  -H "Content-Type: application/json" \
  -d '{
    "contentUrl": "https://example.com/image.jpg",
    "contentType": "image"
  }'
```

### POST /fact-check
Fact-checking endpoint.

```bash
curl -X POST http://localhost:3000/fact-check \
  -H "Content-Type: application/json" \
  -d '{
    "claim": "The Earth is round"
  }'
```

### GET /health
System health check.

```bash
curl http://localhost:3000/health
```

## Database Schema

The plugin uses MySQL with the following tables:
- `truthguard_content` - Content submissions
- `truthguard_detections` - Detection results
- `truthguard_validators` - Community validators
- `truthguard_validation_votes` - Validator votes
- `truthguard_evidence` - Cryptographic evidence
- `truthguard_creator_protections` - Creator attribution
- `truthguard_fact_checks` - Fact-check results
- `truthguard_content_monitoring` - Content monitoring

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     MCP Tools Layer                     │
├─────────────────────────────────────────────────────────┤
│  deepfake_detect │ fact_check │ content_monitor │ ...   │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                  Verification Swarm                     │
├─────────────────────────────────────────────────────────┤
│  Visual │ Audio │ Text │ Fusion │ Consensus │ Evidence  │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                  ML Detection Layer                      │
├─────────────────────────────────────────────────────────┤
│  EfficientNet-B7 │ Audio Models │ RoBERTa │ Fusion      │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                   Python ML Scripts                     │
├─────────────────────────────────────────────────────────┤
│  visual_detection.py │ audio_detection.py │ text_...    │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                    DKG Storage                          │
└─────────────────────────────────────────────────────────┘
```

## Development

```bash
# Build TypeScript
npm run build

# Run tests
npm test

# Development mode
npm run dev

# Type checking
npm run check-types

# Linting
npm run lint

# Install Python dependencies
npm run ml:install

# Test Python scripts
npm run ml:test
```

## Testing

The plugin includes comprehensive tests:
- Plugin configuration tests
- MCP tool registration tests
- Core functionality tests
- Error handling tests
- API endpoint tests
- Integration tests

```bash
npm test
```

## Performance

- **Multi-Modal Fusion**: 85-95% accuracy
- **Visual Detection**: 90-95% accuracy (EfficientNet-B7)
- **Audio Detection**: 85-90% accuracy
- **Text Detection**: 80-90% accuracy (RoBERTa)
- **Processing Time**: 1-5 seconds per content item

## Security

- All content hashes are cryptographically verified
- Evidence chains use blockchain-style integrity verification
- Validator reputation system prevents gaming
- DKG storage provides immutable audit trail

## License

MIT
