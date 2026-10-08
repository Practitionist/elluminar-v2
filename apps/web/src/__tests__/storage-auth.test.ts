import { describe, expect, it } from "vitest";
import {
  MB_IN_BYTES,
  validateR2ArtifactUploadGuardrail,
} from "../server/storage/r2-presigner";
import { storageRouter } from "../server/routes/storage";
import { assertEnterpriseSsoDomainAllowed, auth } from "../lib/auth";
import { GET as authGetHandler, POST as authPostHandler } from "../app/api/auth/[...all]/route";

describe("Cloudflare R2 Storage Presigner & Hono storageRouter", () => {
  it("enforces exact MIME and byte-size ceilings across all three artifact classes", () => {
    // 1. Voice-over-Canvas Opus stream <= 2 MB
    expect(
      validateR2ArtifactUploadGuardrail({
        contentType: "audio/ogg; codecs=opus",
        contentLengthBytes: 2 * MB_IN_BYTES,
      })
    ).toEqual({
      valid: true,
      contentType: "audio/ogg; codecs=opus",
      category: "VOICE_OVER_CANVAS_REPLAY",
      maxSizeBytes: 2 * MB_IN_BYTES,
    });

    expect(
      validateR2ArtifactUploadGuardrail({
        contentType: "audio/ogg; codecs=opus",
        contentLengthBytes: 2 * MB_IN_BYTES + 1,
      }).valid
    ).toBe(false);

    // 2. Excalidraw PNG snapshot <= 5 MB
    expect(
      validateR2ArtifactUploadGuardrail({
        contentType: "image/png",
        contentLengthBytes: 5 * MB_IN_BYTES,
      })
    ).toEqual({
      valid: true,
      contentType: "image/png",
      category: "EXCALIDRAW_SNAPSHOT",
      maxSizeBytes: 5 * MB_IN_BYTES,
    });

    expect(
      validateR2ArtifactUploadGuardrail({
        contentType: "image/png",
        contentLengthBytes: 5 * MB_IN_BYTES + 1,
      }).valid
    ).toBe(false);

    // 3. Excalidraw JSON scene graph <= 1 MB
    expect(
      validateR2ArtifactUploadGuardrail({
        contentType: "application/json",
        contentLengthBytes: 1 * MB_IN_BYTES,
      })
    ).toEqual({
      valid: true,
      contentType: "application/json",
      category: "EXCALIDRAW_SCENE_GRAPH",
      maxSizeBytes: 1 * MB_IN_BYTES,
    });

    expect(
      validateR2ArtifactUploadGuardrail({
        contentType: "application/json",
        contentLengthBytes: 1 * MB_IN_BYTES + 1,
      }).valid
    ).toBe(false);

    // 4. Unsupported MIME type
    expect(
      validateR2ArtifactUploadGuardrail({
        contentType: "video/mp4",
        contentLengthBytes: 1024,
      })
    ).toMatchObject({
      valid: false,
      code: "UNSUPPORTED_MIME_TYPE",
    });
  });

  it("signs upload and replay URLs via storageRouter (/presign-upload & /presign-replay)", async () => {
    const uploadRes = await storageRouter.request("/presign-upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        objectKey: "submissions/sub_001/voice-critique.ogg",
        contentType: "audio/ogg; codecs=opus",
        contentLengthBytes: 512 * 1024,
      }),
    });

    expect(uploadRes.status).toBe(200);
    const uploadPayload = await uploadRes.json();
    expect(uploadPayload.status).toBe("PRESIGNED");
    expect(uploadPayload.uploadUrl).toContain(".r2.cloudflarestorage.com/");
    expect(uploadPayload.category).toBe("VOICE_OVER_CANVAS_REPLAY");

    // Oversized JSON upload rejected with HTTP 422
    const rejectedRes = await storageRouter.request("/presign-upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        objectKey: "submissions/sub_001/scene.json",
        contentType: "application/json",
        contentLengthBytes: 2 * MB_IN_BYTES,
      }),
    });
    expect(rejectedRes.status).toBe(422);

    // Presign zero-egress replay URL
    const replayRes = await storageRouter.request("/presign-replay", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        objectKey: "submissions/sub_001/voice-critique.ogg",
        responseContentType: "audio/ogg; codecs=opus",
      }),
    });

    expect(replayRes.status).toBe(200);
    const replayPayload = await replayRes.json();
    expect(replayPayload.replayUrl).toContain(".r2.cloudflarestorage.com/");
    expect(replayPayload.objectKey).toBe("submissions/sub_001/voice-critique.ogg");
  });
});

describe("Better-Auth + @better-auth/sso Enterprise Domain Guard & App Router Handlers", () => {
  it("blocks personal consumer domains from Enterprise OIDC/SAML registration while allowing B2B/University domains", () => {
    for (const personalDomain of [
      "gmail.com",
      "GMAIL.COM",
      "outlook.com",
      "yahoo.com",
      "icloud.com",
      "proton.me",
    ]) {
      expect(() => assertEnterpriseSsoDomainAllowed(personalDomain)).toThrow(
        /prohibited from Enterprise OIDC\/SAML SSO/
      );
    }

    expect(assertEnterpriseSsoDomainAllowed("Acme-Corp.com")).toBe("acme-corp.com");
    expect(assertEnterpriseSsoDomainAllowed("iitb.ac.in")).toBe("iitb.ac.in");
  });

  it("exposes configured Better-Auth instance and Next.js App Router GET/POST handlers", () => {
    expect(auth).toBeDefined();
    expect(typeof auth.handler).toBe("function");
    expect(typeof authGetHandler).toBe("function");
    expect(typeof authPostHandler).toBe("function");
  });
});
