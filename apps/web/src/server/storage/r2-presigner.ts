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
      code:
        | "INVALID_OBJECT_KEY"
        | "UNSUPPORTED_MIME_TYPE"
        | "INVALID_CONTENT_LENGTH"
        | "FILE_SIZE_EXCEEDS_LIMIT";
      message: string;
    };

/**
 * Strictly validates an R2 object key to prevent directory traversal (`..`, `.`),
 * encoded dot/slash tricks (`%2e`, `%2f`, `%5c`), leading/trailing/empty slashes,
 * null bytes, and non-printable control characters.
 */
export function validateR2ObjectKey(
  rawKey: string
): { valid: true; normalizedKey: string } | { valid: false; message: string } {
  const trimmed = rawKey.trim();
  if (trimmed.length < 3 || trimmed.length > 512) {
    return {
      valid: false,
      message: `R2 objectKey length must be between 3 and 512 characters (got ${trimmed.length}).`,
    };
  }

  if (
    trimmed.startsWith("/") ||
    trimmed.endsWith("/") ||
    trimmed.includes("\\") ||
    /[\x00-\x1f\x7f\s]/.test(trimmed) ||
    /%2e|%2f|%5c/i.test(trimmed)
  ) {
    return {
      valid: false,
      message: `Unsafe or malformed R2 objectKey "${rawKey}".`,
    };
  }

  const segments = trimmed.split("/");
  for (const segment of segments) {
    if (
      !segment ||
      segment === "." ||
      segment === ".." ||
      !/^[a-zA-Z0-9._-]+$/.test(segment)
    ) {
      return {
        valid: false,
        message: `Path traversal or unsafe segment "${segment}" is prohibited in R2 objectKey "${rawKey}".`,
      };
    }
  }

  return { valid: true, normalizedKey: trimmed };
}

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
      code:
        | "INVALID_OBJECT_KEY"
        | "UNSUPPORTED_MIME_TYPE"
        | "INVALID_CONTENT_LENGTH"
        | "FILE_SIZE_EXCEEDS_LIMIT";
      message: string;
    };

/**
 * Enforces objectKey path safety + MIME/size guardrails and generates a short-lived signed `PutObjectCommand` URL for Cloudflare R2.
 */
export async function generateR2PresignedUploadUrl(
  input: PresignUploadRequest
): Promise<PresignUploadResult> {
  const keyCheck = validateR2ObjectKey(input.objectKey);
  if (!keyCheck.valid) {
    return {
      status: "REJECTED",
      code: "INVALID_OBJECT_KEY",
      message: keyCheck.message,
    };
  }

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
    Key: keyCheck.normalizedKey,
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
    objectKey: keyCheck.normalizedKey,
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
  const keyCheck = validateR2ObjectKey(input.objectKey);
  if (!keyCheck.valid) {
    throw new Error(`INVALID_OBJECT_KEY: ${keyCheck.message}`);
  }

  const expiresInSeconds = input.expiresInSeconds ?? 3600; // Default 60 minutes
  const { client, bucketName } = createR2S3Client(input.r2Config);

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: keyCheck.normalizedKey,
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
    objectKey: keyCheck.normalizedKey,
    expiresInSeconds,
  };
}

