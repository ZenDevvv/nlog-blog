import test from "node:test";
import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import express from "express";
import {
  MAX_IMAGE_BYTES,
  buildPostImageFolder,
  detectImageMime,
  isCloudinaryConfigured,
  parseCloudinaryUrl,
  validateImageFile,
  uploadPostCoverImage,
  deletePostCoverImage,
} from "../cloudinary.js";
import { uploadCoverImage } from "../middleware/upload.js";

const PNG_BYTES = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);
const JPEG_BYTES = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
]);
const GIF_BYTES = Buffer.from("GIF89a\x01\x00\x01\x00\x00\x00", "binary");
const WEBP_BYTES = Buffer.from("RIFF\x24\x00\x00\x00WEBPVP8 ", "binary");
const SVG_BYTES = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

test("parseCloudinaryUrl extracts single-line CLOUDINARY_URL and rejects placeholders or invalid URLs", () => {
  assert.deepEqual(
    parseCloudinaryUrl("cloudinary://12345:my_secret@my_cloud"),
    { cloud_name: "my_cloud", api_key: "12345", api_secret: "my_secret" }
  );
  assert.equal(parseCloudinaryUrl("cloudinary://<your_api_key>:<your_api_secret>@<cloud_name>"), null);
  assert.equal(parseCloudinaryUrl("https://12345:secret@cloud"), null);
  assert.equal(parseCloudinaryUrl("cloudinary://only_cloud"), null);
  assert.equal(parseCloudinaryUrl(""), null);

  assert.equal(isCloudinaryConfigured({ CLOUDINARY_URL: "cloudinary://123:sec@cloud" }), true);
  assert.equal(isCloudinaryConfigured({ CLOUDINARY_URL: "cloudinary://<your_api_key>:<your_api_secret>@<cloud_name>" }), false);
});

test("detectImageMime identifies supported image signatures and rejects non-images and SVGs", () => {
  assert.equal(detectImageMime(PNG_BYTES), "image/png");
  assert.equal(detectImageMime(JPEG_BYTES), "image/jpeg");
  assert.equal(detectImageMime(GIF_BYTES), "image/gif");
  assert.equal(detectImageMime(WEBP_BYTES), "image/webp");
  assert.equal(detectImageMime(SVG_BYTES), null);
  assert.equal(detectImageMime(Buffer.from("plain text file content")), null);
  assert.equal(detectImageMime(Buffer.alloc(4)), null);
});

test("validateImageFile enforces size and magic bytes regardless of declared MIME", () => {
  assert.equal(validateImageFile({ buffer: PNG_BYTES, mimetype: "image/png" }).value.mime, "image/png");
  assert.ok(validateImageFile({ buffer: SVG_BYTES, mimetype: "image/jpeg" }).error);
  assert.ok(validateImageFile({ buffer: Buffer.alloc(0), mimetype: "image/png" }).error);
  assert.ok(validateImageFile({ buffer: Buffer.concat([PNG_BYTES, Buffer.alloc(MAX_IMAGE_BYTES)]), mimetype: "image/png" }).error);
});

test("buildPostImageFolder organizes uploads by root, environment, author and UTC year/month", () => {
  const date = new Date("2026-03-09T12:00:00Z");
  assert.equal(
    buildPostImageFolder({ rootFolder: "nlog-blog", env: "production", userId: 42, date }),
    "nlog-blog/prod/posts/user-42/2026/03"
  );
  assert.equal(
    buildPostImageFolder({ rootFolder: "/custom-root/media/", env: "development", userId: 7, date }),
    "custom-root/media/dev/posts/user-7/2026/03"
  );
  assert.equal(
    buildPostImageFolder({ rootFolder: "../evil", env: "staging", userId: 3, date }),
    "nlog-blog/staging/posts/user-3/2026/03"
  );
  assert.throws(() => buildPostImageFolder({ userId: 0, date }));
  assert.throws(() => buildPostImageFolder({ userId: "1", date }));
});

test("uploadPostCoverImage streams buffer into the organized folder and deletePostCoverImage invalidates it", async () => {
  const calls = [];
  const fakeUploader = {
    upload_stream(options, cb) {
      const stream = new PassThrough();
      const chunks = [];
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("end", () => {
        calls.push({ type: "upload", options, bytes: Buffer.concat(chunks) });
        cb(null, {
          secure_url: `https://res.cloudinary.com/demo/image/upload/${options.folder}/${options.public_id}.png`,
          public_id: `${options.folder}/${options.public_id}`,
        });
      });
      return stream;
    },
    async destroy(publicId, options) {
      calls.push({ type: "destroy", publicId, options });
      return { result: "ok" };
    },
  };

  const uploaded = await uploadPostCoverImage({
    buffer: PNG_BYTES,
    userId: 9,
    date: new Date("2026-11-25T00:00:00Z"),
    uploader: fakeUploader,
  });

  assert.match(uploaded.folder, /^nlog-blog\/(dev|prod|staging)\/posts\/user-9\/2026\/11$/);
  assert.ok(uploaded.publicId.startsWith(`${uploaded.folder}/`));
  assert.ok(uploaded.url.startsWith("https://res.cloudinary.com/"));
  assert.equal(calls[0].options.resource_type, "image");
  assert.equal(calls[0].options.format, "webp");
  assert.deepEqual(calls[0].options.transformation, [
    { width: 1200, height: 1200, crop: "limit", quality: "auto:good", fetch_format: "webp" },
  ]);
  assert.deepEqual(calls[0].options.allowed_formats, ["jpg", "png", "webp", "gif"]);
  assert.deepEqual(calls[0].bytes, PNG_BYTES);

  await uploadPostCoverImage({
    buffer: GIF_BYTES,
    mime: "image/gif",
    userId: 9,
    date: new Date("2026-11-25T00:00:00Z"),
    uploader: fakeUploader,
  });
  assert.equal(calls[1].options.format, undefined);
  assert.deepEqual(calls[1].options.transformation, [
    { width: 1200, height: 1200, crop: "limit", quality: "auto:good" },
  ]);

  await deletePostCoverImage(uploaded.publicId, { uploader: fakeUploader });
  assert.equal(calls[2].type, "destroy");
  assert.equal(calls[2].publicId, uploaded.publicId);
  assert.deepEqual(calls[2].options, { resource_type: "image", invalidate: true });
});

test("uploadCoverImage handles JSON pass-through, valid multipart uploads, and invalid/oversized files", async (t) => {
  const app = express();
  app.use(express.json());
  app.post("/posts", uploadCoverImage, (req, res) => {
    res.json({
      title: req.body.title,
      tags: req.body.tags,
      mime: req.validatedImage?.mime ?? null,
    });
  });

  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;

  // JSON pass-through still works untouched
  const jsonRes = await fetch(`${base}/posts`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "Text only", tags: ["news"] }),
  });
  assert.equal(jsonRes.status, 200);
  assert.deepEqual(await jsonRes.json(), { title: "Text only", tags: ["news"], mime: null });

  // Valid multipart upload with PNG + JSON tags
  const validForm = new FormData();
  validForm.append("title", "With cover");
  validForm.append("tags", JSON.stringify(["photo", "blog"]));
  validForm.append("image", new Blob([PNG_BYTES], { type: "image/png" }), "cover.png");
  const okRes = await fetch(`${base}/posts`, { method: "POST", body: validForm });
  assert.equal(okRes.status, 200);
  assert.deepEqual(await okRes.json(), { title: "With cover", tags: ["photo", "blog"], mime: "image/png" });

  // Spoofed SVG disguised as JPEG is rejected
  const svgForm = new FormData();
  svgForm.append("title", "Bad cover");
  svgForm.append("image", new Blob([SVG_BYTES], { type: "image/jpeg" }), "evil.jpg");
  const svgRes = await fetch(`${base}/posts`, { method: "POST", body: svgForm });
  assert.equal(svgRes.status, 400);

  // Oversized image (> 5 MB) is rejected with 413
  const bigForm = new FormData();
  bigForm.append("title", "Huge cover");
  bigForm.append("image", new Blob([PNG_BYTES, new Uint8Array(MAX_IMAGE_BYTES)], { type: "image/png" }), "huge.png");
  const bigRes = await fetch(`${base}/posts`, { method: "POST", body: bigForm });
  assert.equal(bigRes.status, 413);

  // Invalid tags JSON is rejected with 400
  const badTagsForm = new FormData();
  badTagsForm.append("title", "Bad tags");
  badTagsForm.append("tags", "{not-json");
  const badTagsRes = await fetch(`${base}/posts`, { method: "POST", body: badTagsForm });
  assert.equal(badTagsRes.status, 400);
});
