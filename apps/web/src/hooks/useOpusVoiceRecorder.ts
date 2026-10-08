"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const OPUS_PRIMARY_MIME_TYPE = "audio/ogg; codecs=opus" as const;
export const OPUS_FALLBACK_MIME_TYPE = "audio/webm; codecs=opus" as const;
export const OPUS_TARGET_BITRATE_BPS = 24000 as const;
export const MAX_OPUS_R2_BYTES = 2 * 1024 * 1024; // 2 MB strict Cloudflare R2 presigner ceiling

export type RecorderStatus =
  | "IDLE"
  | "RECORDING"
  | "STOPPED"
  | "UPLOADING"
  | "UPLOADED"
  | "ERROR";

export interface CanvasPointerKeyframe {
  /** Millisecond offset relative to start of voice recording */
  timestampOffsetMs: number;
  /** Canvas X coordinate */
  x: number;
  /** Canvas Y coordinate */
  y: number;
  /** Active viewport zoom multiplier */
  viewportZoom: number;
  /** Active annotation tool during review */
  tool: "laser" | "pointer" | "pen" | "pan";
  /** Optional focused Excalidraw element ID */
  elementId?: string;
}

export interface R2PresignUploadResponse {
  status: "PRESIGNED";
  uploadUrl: string;
  bucketName: string;
  objectKey: string;
  contentType: string;
  category: string;
  maxSizeBytes: number;
  expiresInSeconds: number;
}

export interface UploadedVoiceReplayResult {
  objectKey: string;
  bucketName: string;
  uploadUrl: string;
  bytesUploaded: number;
  durationMs: number;
  keyframes: readonly CanvasPointerKeyframe[];
}

/**
 * Selects the optimal supported Opus container format in the host browser:
 * 1. `audio/ogg; codecs=opus` (Primary R2 Voice-over-Canvas canonical container)
 * 2. `audio/webm; codecs=opus` (Chromium/Blink Opus fallback)
 */
export function selectSupportedOpusMimeType(
  isTypeSupportedFn?: (mimeType: string) => boolean
): string {
  const checker =
    isTypeSupportedFn ??
    (typeof MediaRecorder !== "undefined" && typeof MediaRecorder.isTypeSupported === "function"
      ? (mime: string) => MediaRecorder.isTypeSupported(mime)
      : undefined);

  if (!checker) {
    return OPUS_PRIMARY_MIME_TYPE;
  }

  if (checker(OPUS_PRIMARY_MIME_TYPE)) {
    return OPUS_PRIMARY_MIME_TYPE;
  }

  if (checker(OPUS_FALLBACK_MIME_TYPE)) {
    return OPUS_FALLBACK_MIME_TYPE;
  }

  return OPUS_PRIMARY_MIME_TYPE;
}

/**
 * Computes normalized byte budget telemetry against the 2 MB Cloudflare R2 presigner ceiling.
 */
export function computeOpusByteBudgetMetrics(
  bytesRecorded: number,
  maxBytes: number = MAX_OPUS_R2_BYTES
): {
  bytesRecorded: number;
  maxBytes: number;
  remainingBytes: number;
  budgetUtilizationPct: number;
  exceedsCeiling: boolean;
} {
  const clampedRecorded = Math.max(0, Math.floor(bytesRecorded));
  const remainingBytes = Math.max(0, maxBytes - clampedRecorded);
  const budgetUtilizationPct = Math.min(
    100,
    Number(((clampedRecorded / maxBytes) * 100).toFixed(2))
  );

  return {
    bytesRecorded: clampedRecorded,
    maxBytes,
    remainingBytes,
    budgetUtilizationPct,
    exceedsCeiling: clampedRecorded > maxBytes,
  };
}

/**
 * Creates a synchronized Voice-over-Canvas pointer keyframe anchored to the active recording timestamp.
 */
export function createPointerKeyframe(params: {
  recordingStartedAtMs: number;
  nowMs?: number;
  x: number;
  y: number;
  viewportZoom?: number;
  tool?: CanvasPointerKeyframe["tool"];
  elementId?: string;
}): CanvasPointerKeyframe {
  const now = params.nowMs ?? Date.now();
  const timestampOffsetMs = Math.max(0, Math.round(now - params.recordingStartedAtMs));

  return {
    timestampOffsetMs,
    x: Number(params.x.toFixed(1)),
    y: Number(params.y.toFixed(1)),
    viewportZoom: params.viewportZoom ?? 1,
    tool: params.tool ?? "laser",
    ...(params.elementId ? { elementId: params.elementId } : {}),
  };
}

/**
 * Real Web Audio / `MediaRecorder` hook (`useOpusVoiceRecorder`) for capturing
 * 24 kbps (`audioBitsPerSecond: 24000`) Opus audio with synchronized canvas pointer keyframes,
 * enforcing the strict `<= 2 MB` Cloudflare R2 presigner ceiling, generating instant replay Object URLs,
 * and uploading directly to R2 via `/api/v2/storage/presign-upload`.
 */
export function useOpusVoiceRecorder(maxBytes: number = MAX_OPUS_R2_BYTES) {
  const [status, setStatus] = useState<RecorderStatus>("IDLE");
  const [selectedMimeType, setSelectedMimeType] = useState<string>(() =>
    selectSupportedOpusMimeType()
  );
  const [bytesRecorded, setBytesRecorded] = useState<number>(0);
  const [durationMs, setDurationMs] = useState<number>(0);
  const [keyframes, setKeyframes] = useState<CanvasPointerKeyframe[]>([]);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioObjectUrl, setAudioObjectUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimestampMsRef = useRef<number | null>(null);
  const accumulatedBytesRef = useRef<number>(0);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeObjectUrlRef = useRef<string | null>(null);

  const revokeCurrentObjectUrl = useCallback(() => {
    if (activeObjectUrlRef.current && typeof URL !== "undefined" && URL.revokeObjectURL) {
      URL.revokeObjectURL(activeObjectUrlRef.current);
      activeObjectUrlRef.current = null;
    }
  }, []);

  const stopMediaTracksAndTimer = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    if (mediaStreamRef.current) {
      for (const track of mediaStreamRef.current.getTracks()) {
        track.stop();
      }
      mediaStreamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopMediaTracksAndTimer();
      revokeCurrentObjectUrl();
    };
  }, [revokeCurrentObjectUrl, stopMediaTracksAndTimer]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      stopMediaTracksAndTimer();
    }
  }, [stopMediaTracksAndTimer]);

  const startRecording = useCallback(async () => {
    if (
      typeof window === "undefined" ||
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setStatus("ERROR");
      setErrorMessage(
        "Browser MediaRecorder / getUserMedia API is unavailable in this environment."
      );
      return;
    }

    try {
      setErrorMessage(null);
      revokeCurrentObjectUrl();
      setAudioObjectUrl(null);
      setAudioBlob(null);
      setBytesRecorded(0);
      setDurationMs(0);
      setKeyframes([]);
      chunksRef.current = [];
      accumulatedBytesRef.current = 0;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      mediaStreamRef.current = stream;

      const mimeType = selectSupportedOpusMimeType();
      setSelectedMimeType(mimeType);

      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: OPUS_TARGET_BITRATE_BPS,
      });
      mediaRecorderRef.current = recorder;

      const startedAt = Date.now();
      startTimestampMsRef.current = startedAt;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (!event.data || event.data.size <= 0) return;

        const projectedTotal = accumulatedBytesRef.current + event.data.size;
        if (projectedTotal <= maxBytes) {
          chunksRef.current.push(event.data);
          accumulatedBytesRef.current = projectedTotal;
          setBytesRecorded(projectedTotal);
        } else {
          // Enforce strict <= 2 MB R2 presigner ceiling before appending over-budget chunks
          stopRecording();
          return;
        }

        if (accumulatedBytesRef.current >= maxBytes) {
          stopRecording();
        }
      };

      recorder.onstop = () => {
        stopMediaTracksAndTimer();
        if (startTimestampMsRef.current) {
          setDurationMs(Math.max(1, Date.now() - startTimestampMsRef.current));
        }

        const finalBlob = new Blob(chunksRef.current, { type: OPUS_PRIMARY_MIME_TYPE });
        setAudioBlob(finalBlob);
        setBytesRecorded(finalBlob.size);

        if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
          const objectUrl = URL.createObjectURL(finalBlob);
          activeObjectUrlRef.current = objectUrl;
          setAudioObjectUrl(objectUrl);
        }

        setStatus("STOPPED");
      };

      recorder.onerror = () => {
        stopMediaTracksAndTimer();
        setStatus("ERROR");
        setErrorMessage("MediaRecorder encountered an encoding error during Opus capture.");
      };

      durationTimerRef.current = setInterval(() => {
        if (startTimestampMsRef.current) {
          setDurationMs(Date.now() - startTimestampMsRef.current);
        }
      }, 100);

      // Slice every 250ms for live byte-ceiling telemetry
      recorder.start(250);
      setStatus("RECORDING");
    } catch (err) {
      stopMediaTracksAndTimer();
      setStatus("ERROR");
      setErrorMessage(
        err instanceof Error ? err.message : "Microphone capture permission was denied."
      );
    }
  }, [maxBytes, revokeCurrentObjectUrl, stopMediaTracksAndTimer, stopRecording]);

  const recordPointerKeyframe = useCallback(
    (point: {
      x: number;
      y: number;
      viewportZoom?: number;
      tool?: CanvasPointerKeyframe["tool"];
      elementId?: string;
    }) => {
      if (status !== "RECORDING" || !startTimestampMsRef.current) return null;

      const frame = createPointerKeyframe({
        recordingStartedAtMs: startTimestampMsRef.current,
        x: point.x,
        y: point.y,
        viewportZoom: point.viewportZoom,
        tool: point.tool,
        elementId: point.elementId,
      });

      setKeyframes((prev) => [...prev, frame]);
      return frame;
    },
    [status]
  );

  const uploadToR2 = useCallback(
    async (params: { objectKey: string }): Promise<UploadedVoiceReplayResult> => {
      if (!audioBlob || audioBlob.size <= 0) {
        throw new Error("No recorded Opus voice stream available to upload.");
      }

      if (audioBlob.size > maxBytes) {
        throw new Error(
          `Recorded voice stream (${audioBlob.size} bytes) exceeds 2 MB Cloudflare R2 ceiling (${maxBytes} bytes).`
        );
      }

      setStatus("UPLOADING");
      setErrorMessage(null);

      try {
        const presignRes = await fetch("/api/v2/storage/presign-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            objectKey: params.objectKey,
            contentType: OPUS_PRIMARY_MIME_TYPE,
            contentLengthBytes: audioBlob.size,
          }),
        });

        if (!presignRes.ok) {
          const errBody = await presignRes.text();
          throw new Error(`R2 presign request rejected (${presignRes.status}): ${errBody}`);
        }

        const presignJson = (await presignRes.json()) as R2PresignUploadResponse;

        const putRes = await fetch(presignJson.uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": presignJson.contentType,
          },
          body: audioBlob,
        });

        if (!putRes.ok) {
          throw new Error(`Direct Cloudflare R2 PUT failed with HTTP ${putRes.status}`);
        }

        setStatus("UPLOADED");
        return {
          objectKey: presignJson.objectKey,
          bucketName: presignJson.bucketName,
          uploadUrl: presignJson.uploadUrl,
          bytesUploaded: audioBlob.size,
          durationMs,
          keyframes,
        };
      } catch (err) {
        setStatus("ERROR");
        const message = err instanceof Error ? err.message : "Failed uploading voice replay to R2.";
        setErrorMessage(message);
        throw new Error(message);
      }
    },
    [audioBlob, durationMs, keyframes, maxBytes]
  );

  const resetRecorder = useCallback(() => {
    stopMediaTracksAndTimer();
    revokeCurrentObjectUrl();
    chunksRef.current = [];
    accumulatedBytesRef.current = 0;
    startTimestampMsRef.current = null;
    setBytesRecorded(0);
    setDurationMs(0);
    setKeyframes([]);
    setAudioBlob(null);
    setAudioObjectUrl(null);
    setErrorMessage(null);
    setStatus("IDLE");
  }, [revokeCurrentObjectUrl, stopMediaTracksAndTimer]);

  const budgetMetrics = computeOpusByteBudgetMetrics(bytesRecorded, maxBytes);

  return {
    status,
    selectedMimeType,
    audioBitsPerSecond: OPUS_TARGET_BITRATE_BPS,
    bytesRecorded: budgetMetrics.bytesRecorded,
    maxBytes: budgetMetrics.maxBytes,
    remainingBytes: budgetMetrics.remainingBytes,
    budgetUtilizationPct: budgetMetrics.budgetUtilizationPct,
    durationMs,
    keyframes,
    audioBlob,
    audioObjectUrl,
    errorMessage,
    startRecording,
    stopRecording,
    recordPointerKeyframe,
    uploadToR2,
    resetRecorder,
  };
}
