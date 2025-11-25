-- TruthGuard Database Tables
USE truthguard;

-- Drop existing tables if any
DROP TABLE IF EXISTS truthguard_content_monitoring;
DROP TABLE IF EXISTS truthguard_fact_checks;
DROP TABLE IF EXISTS truthguard_creator_protections;
DROP TABLE IF EXISTS truthguard_evidence;
DROP TABLE IF EXISTS truthguard_validation_votes;
DROP TABLE IF EXISTS truthguard_validators;
DROP TABLE IF EXISTS truthguard_detections;
DROP TABLE IF EXISTS truthguard_content;

-- Content table
CREATE TABLE truthguard_content (
  id VARCHAR(36) PRIMARY KEY,
  url TEXT NOT NULL,
  type VARCHAR(20) NOT NULL,
  hash VARCHAR(64) NOT NULL,
  status VARCHAR(20) NOT NULL,
  submitted_by VARCHAR(255),
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  UNIQUE INDEX hash_idx (hash),
  INDEX status_idx (status),
  INDEX type_idx (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Detections table
CREATE TABLE truthguard_detections (
  id VARCHAR(36) PRIMARY KEY,
  content_id VARCHAR(36) NOT NULL,
  modality VARCHAR(20) NOT NULL,
  confidence DECIMAL(5,4) NOT NULL,
  is_synthetic BOOLEAN NOT NULL,
  evidence JSON NOT NULL,
  model_version VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  INDEX content_idx (content_id),
  INDEX modality_idx (modality),
  FOREIGN KEY (content_id) REFERENCES truthguard_content(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Validators table
CREATE TABLE truthguard_validators (
  id VARCHAR(36) PRIMARY KEY,
  address VARCHAR(42) NOT NULL UNIQUE,
  reputation INT NOT NULL DEFAULT 50,
  stake DECIMAL(20,8) NOT NULL DEFAULT 0,
  total_validations INT NOT NULL DEFAULT 0,
  accuracy_rate DECIMAL(5,4) NOT NULL DEFAULT 0.8,
  specializations JSON NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  UNIQUE INDEX address_idx (address),
  INDEX reputation_idx (reputation),
  INDEX active_idx (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Validation votes table
CREATE TABLE truthguard_validation_votes (
  id VARCHAR(36) PRIMARY KEY,
  validator_id VARCHAR(36) NOT NULL,
  content_id VARCHAR(36) NOT NULL,
  vote VARCHAR(20) NOT NULL,
  confidence DECIMAL(5,4) NOT NULL,
  reasoning TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  INDEX validator_idx (validator_id),
  INDEX content_idx (content_id),
  INDEX vote_idx (vote),
  FOREIGN KEY (validator_id) REFERENCES truthguard_validators(id) ON DELETE CASCADE,
  FOREIGN KEY (content_id) REFERENCES truthguard_content(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Evidence table
CREATE TABLE truthguard_evidence (
  id VARCHAR(36) PRIMARY KEY,
  detection_id VARCHAR(36) NOT NULL,
  type VARCHAR(50) NOT NULL,
  proof TEXT NOT NULL,
  dkg_ual VARCHAR(255),
  confidence DECIMAL(5,4) NOT NULL,
  validated_by JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  INDEX detection_idx (detection_id),
  INDEX type_idx (type),
  INDEX dkg_ual_idx (dkg_ual),
  FOREIGN KEY (detection_id) REFERENCES truthguard_detections(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Creator protections table
CREATE TABLE truthguard_creator_protections (
  id VARCHAR(36) PRIMARY KEY,
  content_hash VARCHAR(64) NOT NULL UNIQUE,
  creator_did VARCHAR(255) NOT NULL,
  dkg_ual VARCHAR(255) NOT NULL,
  attestations JSON NOT NULL,
  license_terms TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE INDEX content_hash_idx (content_hash),
  INDEX creator_did_idx (creator_did),
  INDEX dkg_ual_idx (dkg_ual)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fact checks table
CREATE TABLE truthguard_fact_checks (
  id VARCHAR(36) PRIMARY KEY,
  claim TEXT NOT NULL,
  verdict VARCHAR(20) NOT NULL,
  confidence DECIMAL(5,4) NOT NULL,
  sources JSON NOT NULL,
  explanation TEXT NOT NULL,
  dkg_ual VARCHAR(255),
  checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  INDEX verdict_idx (verdict),
  INDEX dkg_ual_idx (dkg_ual)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Content monitoring table
CREATE TABLE truthguard_content_monitoring (
  id VARCHAR(36) PRIMARY KEY,
  source VARCHAR(100) NOT NULL,
  source_id VARCHAR(255) NOT NULL,
  content_id VARCHAR(36),
  status VARCHAR(20) NOT NULL,
  first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  last_checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  check_count INT NOT NULL DEFAULT 1,
  INDEX source_idx (source),
  INDEX status_idx (status),
  UNIQUE INDEX source_id_idx (source, source_id),
  FOREIGN KEY (content_id) REFERENCES truthguard_content(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
