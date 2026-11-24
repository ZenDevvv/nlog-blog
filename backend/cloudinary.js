import { randomUUID } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const ALLOWED_FORMATS = ["jpg", "png", "webp", "gif"];
const ROOT_FOLDER_PATTERN = /^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/;

let configuredKey = null;

export function parseCloudinaryUrl(rawUrl) {
  if (typeof rawUrl !== "string" || !rawUrl.trim() || /[<>]/.test(rawUrl)) {
    return null;
  }
  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return null;
  }
  if (
    parsed.protocol !== "cloudinary:" ||
    !parsed.hostname ||
    !parsed.username ||
    !parsed.password
  ) {
    return null;
  }
  return {
    cloud_name: decodeURIComponent(parsed.hostname),
    api_key: decodeURIComponent(parsed.username),
    api_secret: decodeURIComponent(parsed.password),
  };
}

function resolveCloudinaryCredentials(env = process.env) {
  const fromUrl = parseCloudinaryUrl(env.CLOUDINARY_URL);
  if (fromUrl) return fromUrl;
  if (
    env.CLOUDINARY_CLOUD_NAME &&
    env.CLOUDINARY_API_KEY &&
    env.CLOUDINARY_API_SECRET
  ) {
    return {
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
    };
  }
  return null;
}

export function isCloudinaryConfigured(env = process.env) {
  return Boolean(resolveCloudinaryCredentials(env));
}

function ensureConfigured(env = process.env) {
  const creds = resolveCloudinaryCredentials(env);
  if (!creds) {
    const err = new Error("Cloudinary is not configured");
    err.code = "CLOUDINARY_NOT_CONFIGURED";
    throw err;
  }
  const cacheKey = `${creds.cloud_name}:${creds.api_key}`;
  if (configuredKey === cacheKey) return;
  cloudinary.config({
    ...creds,
    secure: true,
  });
  configuredKey = cacheKey;
}

/**
 * Inspects leading magic bytes so spoofed Content-Type headers or file
 * extensions (such as SVGs or scripts renamed to .jpg) are rejected before upload.
 */
export function detectImageMime(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // GIF87a / GIF89a
  const gifHeader = buffer.subarray(0, 6).toString("ascii");
  if (gifHeader === "GIF87a" || gifHeader === "GIF89a") {
    return "image/gif";
  }

  // WebP: RIFF....WEBP
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

export function validateImageFile(file) {
  if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    return { error: "Image file is empty or invalid" };
  }
  if (file.buffer.length > MAX_IMAGE_BYTES) {
    return { error: "Image must be 5 MB or smaller" };
  }
  const detectedMime = detectImageMime(file.buffer);
  if (!detectedMime || !ALLOWED_IMAGE_MIMES.has(detectedMime)) {
    return { error: "Only JPEG, PNG, WebP, and GIF images are allowed" };
  }
  return { value: { buffer: file.buffer, mime: detectedMime } };
}

/**
 * Organizes Cloudinary assets into:
 *   <rootFolder>/<env>/posts/user-<userId>/<YYYY>/<MM>
 * Example:
 *   nlog-blog/prod/posts/user-42/2026/11
 */
export function buildPostImageFolder({
  rootFolder = process.env.CLOUDINARY_ROOT_FOLDER || "nlog-blog",
  env = process.env.NODE_ENV,
  userId,
  date = new Date(),
}) {
  if (!Number.isInteger(userId) || userId < 1) {
    throw new Error("userId must be a positive integer");
  }
  const trimmedRoot =
    typeof rootFolder === "string"
      ? rootFolder.trim().replace(/^\/+|\/+$/g, "")
      : "";
  const safeRoot = ROOT_FOLDER_PATTERN.test(trimmedRoot)
    ? trimmedRoot
    : "nlog-blog";

  const envSegment =
    env === "production" || env === "prod"
      ? "prod"
      : env === "staging"
        ? "staging"
        : "dev";

  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");

  return `${safeRoot}/${envSegment}/posts/user-${userId}/${year}/${month}`;
}

export async function uploadPostCoverImage({
  buffer,
  mime,
  userId,
  date = new Date(),
  uploader,
}) {
  const activeUploader = uploader ?? (() => {
    ensureConfigured();
    return cloudinary.uploader;
  })();

  const folder = buildPostImageFolder({ userId, date });
  const publicId = randomUUID();
  const detectedMime = mime || detectImageMime(buffer);
  const incomingTransform = {
    width: 1200,
    height: 1200,
    crop: "limit",
    quality: "auto:good",
  };
  const uploadOptions = {
    folder,
    public_id: publicId,
    unique_filename: false,
    overwrite: false,
    resource_type: "image",
    allowed_formats: ALLOWED_FORMATS,
    transformation: [incomingTransform],
  };
  if (detectedMime !== "image/gif") {
    incomingTransform.fetch_format = "webp";
    uploadOptions.format = "webp";
  }

  const result = await new Promise((resolve, reject) => {
    const stream = activeUploader.upload_stream(
      uploadOptions,
      (err, uploadResult) => {
        if (err) return reject(err);
        if (!uploadResult?.secure_url || !uploadResult?.public_id) {
          return reject(new Error("Cloudinary upload returned an incomplete response"));
        }
        return resolve(uploadResult);
      }
    );
    stream.end(buffer);
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    folder,
  };
}

export async function deletePostCoverImage(publicId, { uploader } = {}) {
  if (!publicId || typeof publicId !== "string") return;
  if (!uploader && !isCloudinaryConfigured()) return;

  const activeUploader = uploader ?? (() => {
    ensureConfigured();
    return cloudinary.uploader;
  })();

  await activeUploader.destroy(publicId, {
    resource_type: "image",
    invalidate: true,
  });
}
