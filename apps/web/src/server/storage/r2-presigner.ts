import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const MB_IN_BYTES = 1024 * 1024;

export const ALLOWED_R2_ARTIFACT_GUARDRAILS = {
  "audio/ogg; codecs=opus": {
    category: "VOICE_OVER_CANVAS_REPLAY",
    maxSizeBytes: 2 * MB_IN_BYTES, // Max 2 MB for 24kbps Opus Voice-over-Canvas replays
  },
  "image/png": {
    category: "EXCALIDRAW_SNAPSHOT",
    maxSizeBytes: 5 * MB_IN_BYTES, // Max 5 MB for Excalidraw PNG snapshots
  },
  "application/json": {
    category: "EXCALIDRAW_SCENE_GRAPH",
    maxSizeBytes: 1 * MB_IN_BYTES, // Max 1 MB for Excalidraw scene graphs
  },
} as const;

export type AllowedR2MimeType = keyof typeof ALLOWED_R2_ARTIFACT_GUARDRAILS;
export type AllowedR2ArtifactCategory =
  (typeof ALLOWED_R2_ARTIFACT_GUARDRAILS)[AllowedR2MimeType]["category"];

export interface R2StorageConfig {
  accountId?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  bucketName?: string;
}

export type R2GuardrailValidationResult =
  | {
      valid: true;
      contentType: AllowedR2MimeType;
      category: AllowedR2ArtifactCategory;
      maxSizeBytes: number;
    }
  | {
      valid: false;
      code: "UNSUPPORTED_MIME_TYPE" | "INVALID_CONTENT_LENGTH" | "FILE_SIZE_EXCEEDS_LIMIT";
      message: string;
    };

/**
 * Validates strict artifact MIME type & byte-size guardrails before issuing a Cloudflare R2 upload presign URL:
 * - `audio/ogg; codecs=opus` <= 2 MB (Voice-over-Canvas 24kbps replay stream)
 * - `image/png` <= 5 MB (Excalidraw visual snapshot)
 * - `application/json` <= 1 MB (Excalidraw JSON scene graph)
 */
export function validateR2ArtifactUploadGuardrail(params: {
  contentType: string;
  contentLengthBytes: number;
}): R2GuardrailValidationResult {
  const normalizedMime = params.contentType.trim().toLowerCase() as AllowedR2MimeType;
  const spec = ALLOWED_R2_ARTIFACT_GUARDRAILS[normalizedMime];

  if (!spec) {
    return {
      valid: false,
      code: "UNSUPPORTED_MIME_TYPE",
      message: `Unsupported artifact MIME type "${params.contentType}". Allowed types: ${Object.keys(
        ALLOWED_R2_ARTIFACT_GUARDRAILS
      ).join(", ")}.`,
    };
  }

  if (
    !Number.isInteger(params.contentLengthBytes) ||
    params.contentLengthBytes <= 0
  ) {
    return {
      valid: false,
      code: "INVALID_CONTENT_LENGTH",
      message: `contentLengthBytes must be a positive integer, got ${params.contentLengthBytes}.`,
    };
  }

  if (params.contentLengthBytes > spec.maxSizeBytes) {
    return {
      valid: false,
      code: "FILE_SIZE_EXCEEDS_LIMIT",
      message: `Artifact size ${params.contentLengthBytes} bytes exceeds maximum allowed ${spec.maxSizeBytes} bytes for ${normalizedMime} (${spec.category}).`,
    };
  }

  return {
    valid: true,
    contentType: normalizedMime,
    category: spec.category,
    maxSizeBytes: spec.maxSizeBytes,
  };
}

/**
 * Instantiates a zero-egress Cloudflare R2 S3-compatible client (`region: "auto"`).
 */
export function createR2S3Client(config: R2StorageConfig = {}): {
  client: S3Client;
  bucketName: string;
  endpoint: string;
} {
  const accountId =
    config.accountId ??
    process.env["R2_ACCOUNT_ID"] ??
    "00000000000000000000000000000000";
  const accessKeyId =
    config.accessKeyId ??
    process.env["R2_ACCESS_KEY_ID"] ??
    "r2-dev-access-key-id";
  const secretAccessKey =
    config.secretAccessKey ??
    process.env["R2_SECRET_ACCESS_KEY"] ??
    "r2-dev-secret-access-key-for-local-signing";
  const bucketName =
    config.bucketName ??
    process.env["R2_BUCKET_NAME"] ??
    "elluminar-v2-artifacts";

  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

  const client = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return { client, bucketName, endpoint };
}

export interface PresignUploadRequest {
  objectKey: string;
  contentType: string;
  contentLengthBytes: number;
  expiresInSeconds?: number;
  r2Config?: R2StorageConfig;
}

export type PresignUploadResult =
  | {
      status: "PRESIGNED";
      uploadUrl: string;
      bucketName: string;
      objectKey: string;
      contentType: AllowedR2MimeType;
      category: AllowedR2ArtifactCategory;
      maxSizeBytes: number;
      expiresInSeconds: number;
    }
  | {
      status: "REJECTED";
      code: "UNSUPPORTED_MIME_TYPE" | "INVALID_CONTENT_LENGTH" | "FILE_SIZE_EXCEEDS_LIMIT";
      message: string;
    };

/**
 * Enforces MIME/size guardrails and generates a short-lived signed `PutObjectCommand` URL for Cloudflare R2.
 */
export async function generateR2PresignedUploadUrl(
  input: PresignUploadRequest
): Promise<PresignUploadResult> {
  const guardrail = validateR2ArtifactUploadGuardrail({
    contentType: input.contentType,
    contentLengthBytes: input.contentLengthBytes,
  });

  if (!guardrail.valid) {
    return {
      status: "REJECTED",
      code: guardrail.code,
      message: guardrail.message,
    };
  }

  const expiresInSeconds = input.expiresInSeconds ?? 900; // Default 15 minutes
  const { client, bucketName } = createR2S3Client(input.r2Config);

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: input.objectKey,
    ContentType: guardrail.contentType,
    ContentLength: input.contentLengthBytes,
  });

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: expiresInSeconds,
  });

  return {
    status: "PRESIGNED",
    uploadUrl,
    bucketName,
    objectKey: input.objectKey,
    contentType: guardrail.contentType,
    category: guardrail.category,
    maxSizeBytes: guardrail.maxSizeBytes,
    expiresInSeconds,
  };
}

export interface PresignReplayRequest {
  objectKey: string;
  responseContentType?: AllowedR2MimeType;
  expiresInSeconds?: number;
  r2Config?: R2StorageConfig;
}

export interface PresignReplayResult {
  replayUrl: string;
  bucketName: string;
  objectKey: string;
  expiresInSeconds: number;
}

/**
 * Generates a zero-egress signed `GetObjectCommand` URL for replaying Voice-over-Canvas audio or scene snapshots from Cloudflare R2.
 */
export async function generateR2PresignedReplayUrl(
  input: PresignReplayRequest
): Promise<PresignReplayResult> {
  const expiresInSeconds = input.expiresInSeconds ?? 3600; // Default 60 minutes
  const { client, bucketName } = createR2S3Client(input.r2Config);

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: input.objectKey,
    ...(input.responseContentType
      ? { ResponseContentType: input.responseContentType }
      : {}),
  });

  const replayUrl = await getSignedUrl(client, command, {
    expiresIn: expiresInSeconds,
  });

  return {
    replayUrl,
    bucketName,
    objectKey: input.objectKey,
    expiresInSeconds,
  };
}
