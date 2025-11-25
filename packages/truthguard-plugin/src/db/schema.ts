import {
  mysqlTable,
  varchar,
  text,
  timestamp,
  decimal,
  int,
  boolean,
  json,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

/**
 * Content table - stores all content submitted for verification
 */
export const content = mysqlTable(
  "truthguard_content",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    url: text("url").notNull(),
    type: varchar("type", { length: 20 }).notNull(), // image, video, audio, text, mixed
    hash: varchar("hash", { length: 64 }).notNull(),
    status: varchar("status", { length: 20 }).notNull(), // pending, analyzing, verified, flagged, disputed, consensus_reached
    submittedBy: varchar("submitted_by", { length: 255 }),
    metadata: json("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    hashIdx: uniqueIndex("hash_idx").on(table.hash),
    statusIdx: index("status_idx").on(table.status),
    typeIdx: index("type_idx").on(table.type),
  }),
);

/**
 * Detections table - stores individual modality detection results
 */
export const detections = mysqlTable(
  "truthguard_detections",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    contentId: varchar("content_id", { length: 36 })
      .notNull()
      .references(() => content.id, { onDelete: "cascade" }),
    modality: varchar("modality", { length: 20 }).notNull(), // visual, audio, text, metadata, fusion
    confidence: decimal("confidence", { precision: 5, scale: 4 }).notNull(),
    isSynthetic: boolean("is_synthetic").notNull(),
    evidence: json("evidence").notNull(),
    modelVersion: varchar("model_version", { length: 50 }).notNull(),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
  },
  (table) => ({
    contentIdx: index("content_idx").on(table.contentId),
    modalityIdx: index("modality_idx").on(table.modality),
  }),
);

/**
 * Validators table - community validators
 */
export const validators = mysqlTable(
  "truthguard_validators",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    address: varchar("address", { length: 42 }).notNull().unique(),
    reputation: int("reputation").notNull().default(50), // 0-100
    stake: decimal("stake", { precision: 20, scale: 8 }).notNull().default("0"),
    totalValidations: int("total_validations").notNull().default(0),
    accuracyRate: decimal("accuracy_rate", { precision: 5, scale: 4 })
      .notNull()
      .default("0.8"),
    specializations: json("specializations").notNull(), // array of modalities
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    addressIdx: uniqueIndex("address_idx").on(table.address),
    reputationIdx: index("reputation_idx").on(table.reputation),
    activeIdx: index("active_idx").on(table.isActive),
  }),
);

/**
 * Validation votes table
 */
export const validationVotes = mysqlTable(
  "truthguard_validation_votes",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    validatorId: varchar("validator_id", { length: 36 })
      .notNull()
      .references(() => validators.id, { onDelete: "cascade" }),
    contentId: varchar("content_id", { length: 36 })
      .notNull()
      .references(() => content.id, { onDelete: "cascade" }),
    vote: varchar("vote", { length: 20 }).notNull(), // authentic, synthetic, uncertain
    confidence: decimal("confidence", { precision: 5, scale: 4 }).notNull(),
    reasoning: text("reasoning").notNull(),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
  },
  (table) => ({
    validatorIdx: index("validator_idx").on(table.validatorId),
    contentIdx: index("content_idx").on(table.contentId),
    voteIdx: index("vote_idx").on(table.vote),
  }),
);

/**
 * Evidence table - cryptographic proofs and artifacts
 */
export const evidence = mysqlTable(
  "truthguard_evidence",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    detectionId: varchar("detection_id", { length: 36 })
      .notNull()
      .references(() => detections.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 50 }).notNull(), // visual_artifact, audio_anomaly, text_pattern, metadata_inconsistency, blockchain_proof
    proof: text("proof").notNull(),
    dkgUal: varchar("dkg_ual", { length: 255 }),
    confidence: decimal("confidence", { precision: 5, scale: 4 }).notNull(),
    validatedBy: json("validated_by").notNull(), // array of validator IDs
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    detectionIdx: index("detection_idx").on(table.detectionId),
    typeIdx: index("type_idx").on(table.type),
    dkgUalIdx: index("dkg_ual_idx").on(table.dkgUal),
  }),
);

/**
 * Creator protections - attribution and ownership records
 */
export const creatorProtections = mysqlTable(
  "truthguard_creator_protections",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    contentHash: varchar("content_hash", { length: 64 }).notNull().unique(),
    creatorDid: varchar("creator_did", { length: 255 }).notNull(),
    dkgUal: varchar("dkg_ual", { length: 255 }).notNull(),
    attestations: json("attestations").notNull(),
    licenseTerms: text("license_terms"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    contentHashIdx: uniqueIndex("content_hash_idx").on(table.contentHash),
    creatorDidIdx: index("creator_did_idx").on(table.creatorDid),
    dkgUalIdx: index("dkg_ual_idx").on(table.dkgUal),
  }),
);

/**
 * Fact checks - claim verification results
 */
export const factChecks = mysqlTable(
  "truthguard_fact_checks",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    claim: text("claim").notNull(),
    verdict: varchar("verdict", { length: 20 }).notNull(), // true, mostly_true, mixed, mostly_false, false, unverified
    confidence: decimal("confidence", { precision: 5, scale: 4 }).notNull(),
    sources: json("sources").notNull(),
    explanation: text("explanation").notNull(),
    dkgUal: varchar("dkg_ual", { length: 255 }),
    checkedAt: timestamp("checked_at").defaultNow().notNull(),
  },
  (table) => ({
    verdictIdx: index("verdict_idx").on(table.verdict),
    dkgUalIdx: index("dkg_ual_idx").on(table.dkgUal),
  }),
);

/**
 * Content monitoring - real-time ingestion tracking
 */
export const contentMonitoring = mysqlTable(
  "truthguard_content_monitoring",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    source: varchar("source", { length: 100 }).notNull(), // platform name
    sourceId: varchar("source_id", { length: 255 }).notNull(),
    contentId: varchar("content_id", { length: 36 }).references(() => content.id, {
      onDelete: "set null",
    }),
    status: varchar("status", { length: 20 }).notNull(), // monitoring, flagged, cleared, escalated
    firstSeenAt: timestamp("first_seen_at").defaultNow().notNull(),
    lastCheckedAt: timestamp("last_checked_at").defaultNow().onUpdateNow().notNull(),
    checkCount: int("check_count").notNull().default(1),
  },
  (table) => ({
    sourceIdx: index("source_idx").on(table.source),
    statusIdx: index("status_idx").on(table.status),
    sourceIdIdx: uniqueIndex("source_id_idx").on(table.source, table.sourceId),
  }),
);

// Export types
export type Content = typeof content.$inferSelect;
export type NewContent = typeof content.$inferInsert;

export type Detection = typeof detections.$inferSelect;
export type NewDetection = typeof detections.$inferInsert;

export type Validator = typeof validators.$inferSelect;
export type NewValidator = typeof validators.$inferInsert;

export type ValidationVote = typeof validationVotes.$inferSelect;
export type NewValidationVote = typeof validationVotes.$inferInsert;

export type Evidence = typeof evidence.$inferSelect;
export type NewEvidence = typeof evidence.$inferInsert;

export type CreatorProtection = typeof creatorProtections.$inferSelect;
export type NewCreatorProtection = typeof creatorProtections.$inferInsert;

export type FactCheck = typeof factChecks.$inferSelect;
export type NewFactCheck = typeof factChecks.$inferInsert;

export type ContentMonitoring = typeof contentMonitoring.$inferSelect;
export type NewContentMonitoring = typeof contentMonitoring.$inferInsert;
