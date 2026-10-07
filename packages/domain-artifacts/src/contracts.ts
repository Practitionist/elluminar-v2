/**
 * Pluggable Work Artifact Contracts (`ArtifactPlugin`)
 * Supports Cloudflare R2 zero-egress storage payloads + deterministic AST/Topology extraction
 * for multimodal AI critique and human mentor review.
 */

export type ArtifactKind =
  | "SYSTEM_CANVAS"
  | "CODE_SANDBOX"
  | "DOCUMENT_REDLINE"
  | "SPREADSHEET_GRID"
  | "MEDIA_CRITIQUE";

export interface StoredArtifactDescriptor {
  id: string;
  kind: ArtifactKind;
  r2ObjectKey: string;
  pngSnapshotR2Key?: string;
  mimeType: string;
  byteSize: bigint;
}

export interface ArtifactPlugin<TRawPayload, TExtractedTopology> {
  readonly kind: ArtifactKind;
  validateRawPayload(raw: unknown): TRawPayload;
  extractTopology(payload: TRawPayload): TExtractedTopology;
  summarizeForMultimodalPrompt(topology: TExtractedTopology): string;
}
