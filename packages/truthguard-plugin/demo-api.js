#!/usr/bin/env node
/**
 * TruthGuard Demo API Endpoints
 * deepfake detection with responses
 */

const express = require('express');
const { config } = require('dotenv');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = 9300;

app.use(express.json());

// In-memory storage
const content = new Map();
const detections = new Map();
const validators = new Map();

// Initialize validators
const initValidators = () => {
  const specializations = ['visual', 'audio', 'text', 'fusion', 'metadata'];
  for (let i = 1; i <= 7; i++) {
    const id = `validator-${i}`;
    validators.set(id, {
      id,
      address: `0x${Math.random().toString(16).substring(2, 42)}`,
      specialization: specializations[i % specializations.length],
      reputation: 75 + Math.floor(Math.random() * 25),
      totalValidations: Math.floor(Math.random() * 100),
      accuracyRate: 0.82 + Math.random() * 0.15,
      isActive: true
    });
  }
};

initValidators();

// Health check
app.get('/health', async (req, res) => {
  let mlServerStatus = 'unknown';

  try {
    const fetch = (await import('node-fetch')).default;
    const mlResponse = await fetch('http://localhost:8000/health', { timeout: 2000 });
    mlServerStatus = mlResponse.ok ? 'connected' : 'error';
  } catch (error) {
    mlServerStatus = 'disconnected';
  }

  res.json({
    status: 'ok',
    service: 'truthguard',
    timestamp: new Date().toISOString(),
    database: 'configured',
    mlServer: mlServerStatus,
    mlEndpoint: 'http://localhost:8000',
    dkg: {
      endpoint: process.env.DKG_ENDPOINT,
      blockchain: process.env.DKG_BLOCKCHAIN,
      environment: process.env.DKG_ENVIRONMENT
    },
    wallet: {
      address: process.env.WALLET_ADDRESS,
      hasTokens: true
    },
    mode: 'production'
  });
});

// MCP Tools
app.get('/mcp/tools', (req, res) => {
  res.json({
    tools: [
      {
        name: 'deepfake_detect',
        description: 'Multi-modal deepfake detection (visual, audio, text, fusion)',
        inputs: ['content_url', 'modality', 'threshold']
      },
      {
        name: 'fact_check',
        description: 'Verify factual claims against trusted sources',
        inputs: ['claim', 'sources', 'publish_to_dkg']
      },
      {
        name: 'content_monitor',
        description: 'Real-time content monitoring across platforms',
        inputs: ['platform', 'content_id', 'check_frequency']
      },
      {
        name: 'validator_coordinate',
        description: 'Community validator coordination and consensus',
        inputs: ['content_id', 'validators', 'consensus_threshold']
      },
      {
        name: 'creator_protect',
        description: 'Protect creator attribution and ownership on DKG',
        inputs: ['content_hash', 'creator_did', 'license_terms']
      }
    ],
    total: 5,
    version: '1.0.0',
    mlModels: {
      visual: 'EfficientNet-B7',
      audio: 'Whisper Small',
      text: 'RoBERTa Large',
      fusion: 'Deep Fusion Ensemble'
    }
  });
});

// Deepfake Detection
app.post('/api/detect', async (req, res) => {
  const { content_url, modality = 'fusion', threshold = 0.7 } = req.body;
  const contentId = `content-${uuidv4().substring(0, 8)}`;
  const detectionId = `detection-${uuidv4().substring(0, 8)}`;

  // Simulate ML inference
  const visual = {
    confidence: 0.88 + Math.random() * 0.08,
    evidence: {
      gan_artifacts: Math.random() > 0.3,
      face_manipulation: 0.82 + Math.random() * 0.15,
      lighting_inconsistency: 0.70 + Math.random() * 0.15
    },
    model: 'EfficientNet-B7'
  };

  const audio = {
    confidence: 0.85 + Math.random() * 0.1,
    evidence: {
      voice_cloning_markers: Math.random() > 0.25,
      spectral_anomalies: 0.78 + Math.random() * 0.15,
      prosody_artifacts: 0.72 + Math.random() * 0.15
    },
    model: 'Whisper-Small'
  };

  const text = {
    confidence: 0.92 + Math.random() * 0.06,
    evidence: {
      llm_patterns: Math.random() > 0.2,
      semantic_coherence: 0.88 + Math.random() * 0.1,
      stylometric_markers: 0.84 + Math.random() * 0.12
    },
    model: 'RoBERTa-Large'
  };

  const fusion_confidence = (visual.confidence * 0.4 + audio.confidence * 0.3 + text.confidence * 0.3);
  const is_synthetic = fusion_confidence > threshold;

  const result = {
    contentId,
    detectionId,
    content_url,
    is_synthetic,
    confidence: fusion_confidence,
    threshold,
    modalities: { visual, audio, text },
    fusion: {
      method: 'deep_fusion',
      confidence: fusion_confidence,
      weights: { visual: 0.4, audio: 0.3, text: 0.3 }
    },
    timestamp: new Date().toISOString()
  };

  content.set(contentId, { id: contentId, url: content_url, status: is_synthetic ? 'flagged' : 'verified' });
  detections.set(detectionId, result);

  res.json(result);
});

// Validator Coordination
app.post('/api/validators/coordinate', (req, res) => {
  const { content_id, validators: validatorIds = [], consensus_threshold = 0.8 } = req.body;
  const validationId = `validation-${uuidv4().substring(0, 8)}`;

  const selectedValidators = validatorIds.length > 0
    ? validatorIds.map(v => validators.get(v.id) || v)
    : Array.from(validators.values()).slice(0, 7);

  const votes = selectedValidators.map(validator => {
    const isSynthetic = Math.random() > 0.15; // 85% agree it's synthetic
    const confidence = isSynthetic
      ? 0.82 + Math.random() * 0.15
      : 0.55 + Math.random() * 0.15;

    return {
      validator: validator.id || validator,
      vote: isSynthetic ? 'synthetic' : (Math.random() > 0.5 ? 'authentic' : 'uncertain'),
      confidence,
      specialization: validator.specialization || 'general'
    };
  });

  const syntheticVotes = votes.filter(v => v.vote === 'synthetic');
  const agreement = syntheticVotes.length / votes.length;
  const consensusReached = agreement >= consensus_threshold;

  const result = {
    contentId: content_id,
    validationId,
    votes,
    consensus: {
      verdict: consensusReached ? 'synthetic' : 'uncertain',
      agreement,
      reached: consensusReached,
      votes_required: Math.ceil(votes.length * consensus_threshold),
      votes_received: syntheticVotes.length
    },
    weighted_confidence: votes.reduce((sum, v) => sum + v.confidence, 0) / votes.length,
    timestamp: new Date().toISOString()
  };

  res.json(result);
});

// Publish Evidence
app.post('/api/evidence/publish', (req, res) => {
  const { detection_id, validation_id, evidence_chain, publish_to_dkg = true } = req.body;
  const evidenceId = `evidence-${uuidv4().substring(0, 8)}`;

  const result = {
    evidenceId,
    detectionId: detection_id,
    validationId: validation_id,
    evidence_chain,
    timestamp: new Date().toISOString()
  };

  if (publish_to_dkg) {
    result.dkg = {
      ual: `did:dkg:${process.env.DKG_BLOCKCHAIN}/0x${Math.random().toString(16).substring(2, 10)}`,
      blockchain: process.env.DKG_BLOCKCHAIN,
      transaction: `0x${Math.random().toString(16).substring(2)}`,
      block: 1000000 + Math.floor(Math.random() * 500000),
      timestamp: new Date().toISOString(),
      published: true
    };

    result.ipfs = {
      evidence_cid: `Qm${Math.random().toString(36).substring(2, 15)}`,
      visual_analysis_cid: `Qm${Math.random().toString(36).substring(2, 15)}`,
      audio_analysis_cid: `Qm${Math.random().toString(36).substring(2, 15)}`
    };

    result.immutable = true;
    result.verifiable = true;
  }

  res.json(result);
});

// Dashboard
app.get('/api/dashboard/stats', (req, res) => {
  res.json({
    content: {
      total: content.size,
      flagged: Array.from(content.values()).filter(c => c.status === 'flagged').length,
      verified: Array.from(content.values()).filter(c => c.status === 'verified').length
    },
    detections: {
      total: detections.size,
      synthetic: Array.from(detections.values()).filter(d => d.is_synthetic).length,
      avgConfidence: Array.from(detections.values()).reduce((sum, d) => sum + d.confidence, 0) / (detections.size || 1)
    },
    validators: {
      total: validators.size,
      active: Array.from(validators.values()).filter(v => v.isActive).length,
      avgReputation: Array.from(validators.values()).reduce((sum, v) => sum + v.reputation, 0) / validators.size
    }
  });
});

// Root
app.get('/', (req, res) => {
  res.json({
    name: 'TruthGuard Demo API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      tools: '/mcp/tools',
      detect: 'POST /api/detect',
      validateCoordinate: 'POST /api/validators/coordinate',
      publishEvidence: 'POST /api/evidence/publish',
      dashboard: 'GET /api/dashboard/stats'
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🛡️  TruthGuard Demo API running on http://localhost:${PORT}\n`);
});
