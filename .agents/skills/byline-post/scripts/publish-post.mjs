#!/usr/bin/env node
import { readFileSync, existsSync, statSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { parseArgs } from "node:util";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const SKILL_ENV_FILE = join(SCRIPT_DIR, "..", ".env");
const USER_ENV_FILE = join(homedir(), ".config", "nlog-blog", "credentials.env");

const DEFAULT_API_URL = "https://nlog-blog.onrender.com";
const DEFAULT_SITE_URL = "https://nlog-blog.netlify.app";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const MIME_BY_EXT = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function printUsage() {
  console.log(`Usage: publish-post.mjs --title <title> (--content <text> | --content-file <path>) [options]

Options:
  -t, --title <string>         Post title (1-200 characters, required)
  -c, --content <string>       Post body (plain text or HTML)
  -f, --content-file <path>    Read post body from a file
  -i, --image <path>           Optional cover image (JPG, PNG, WebP, GIF, max 5 MB)
      --tags <a,b,c>           Optional comma-separated tags (max 10, [A-Za-z0-9_-]{1,30})
      --api <url>              Backend API URL (default: ${DEFAULT_API_URL})
      --site <url>             Frontend site URL (default: ${DEFAULT_SITE_URL})
      --env-file <path>        Explicit credentials .env file
  -u, --username <string>      Username (or NLOG_USERNAME env var)
  -p, --password <string>      Password (or NLOG_PASSWORD env var)
      --dry-run                Validate inputs and show request summary without publishing
      --json                   Print machine-readable JSON output
  -h, --help                   Show this help message
`);
}

function loadEnvFile(filePath) {
  if (!filePath || !existsSync(filePath)) return {};
  const result = {};
  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    result[key] = val;
  }
  return result;
}

function escapeHtml(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function normalizeContent(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^<(p|h[1-3]|ul|ol|blockquote|pre)\b/i.test(trimmed)) {
    return trimmed;
  }
  return trimmed
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function collectCookies(cookieJar, response) {
  const setCookies = response.headers.getSetCookie?.() ?? [];
  for (const header of setCookies) {
    const pair = header.split(";")[0];
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (name) cookieJar.set(name, value);
  }
}

function cookieHeader(cookieJar) {
  return [...cookieJar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function parseJsonSafe(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      title: { type: "string", short: "t" },
      content: { type: "string", short: "c" },
      "content-file": { type: "string", short: "f" },
      image: { type: "string", short: "i" },
      tags: { type: "string" },
      api: { type: "string" },
      site: { type: "string" },
      "env-file": { type: "string" },
      username: { type: "string", short: "u" },
      password: { type: "string", short: "p" },
      "dry-run": { type: "boolean", default: false },
      json: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
    strict: true,
  });

  if (values.help) {
    printUsage();
    process.exit(0);
  }

  const envFile = values["env-file"]
    ? loadEnvFile(values["env-file"])
    : { ...loadEnvFile(USER_ENV_FILE), ...loadEnvFile(SKILL_ENV_FILE) };

  const apiUrl = (values.api || process.env.NLOG_API_URL || envFile.NLOG_API_URL || DEFAULT_API_URL).replace(/\/+$/, "");
  const siteUrl = (values.site || process.env.NLOG_SITE_URL || envFile.NLOG_SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, "");
  const username = values.username || process.env.NLOG_USERNAME || envFile.NLOG_USERNAME;
  const password = values.password || process.env.NLOG_PASSWORD || envFile.NLOG_PASSWORD;

  const title = (values.title || "").trim();
  if (!title || title.length > 200) {
    console.error("Error: --title is required (1-200 characters).");
    process.exit(1);
  }

  let rawContent = values.content ?? "";
  if (values["content-file"]) {
    if (!existsSync(values["content-file"])) {
      console.error(`Error: content file not found: ${values["content-file"]}`);
      process.exit(1);
    }
    rawContent = readFileSync(values["content-file"], "utf8");
  }
  const content = normalizeContent(rawContent);
  if (!content) {
    console.error("Error: --content or --content-file is required and must contain text.");
    process.exit(1);
  }

  const tags = values.tags
    ? values.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];
  if (tags.length > 10 || tags.some((t) => !/^[A-Za-z0-9_-]{1,30}$/.test(t))) {
    console.error("Error: up to 10 tags allowed, each 1-30 chars [A-Za-z0-9_-].");
    process.exit(1);
  }

  let imageInfo = null;
  if (values.image) {
    if (!existsSync(values.image)) {
      console.error(`Error: image file not found: ${values.image}`);
      process.exit(1);
    }
    const stat = statSync(values.image);
    if (stat.size > MAX_IMAGE_BYTES) {
      console.error(`Error: image exceeds 5 MB limit (${stat.size} bytes).`);
      process.exit(1);
    }
    const ext = extname(values.image).toLowerCase();
    const mime = MIME_BY_EXT[ext];
    if (!mime) {
      console.error(`Error: unsupported image extension "${ext}". Use JPG, PNG, WebP, or GIF.`);
      process.exit(1);
    }
    imageInfo = {
      path: values.image,
      name: basename(values.image),
      mime,
      size: stat.size,
    };
  }

  if (values["dry-run"]) {
    const summary = {
      dryRun: true,
      apiUrl,
      siteUrl,
      username: username || "(missing)",
      hasPassword: Boolean(password),
      title,
      content,
      tags,
      image: imageInfo,
    };
    console.log(JSON.stringify(summary, null, 2));
    process.exit(0);
  }

  if (!username || !password) {
    console.error(
      `Error: missing credentials. Set NLOG_USERNAME and NLOG_PASSWORD (or add them to ${SKILL_ENV_FILE} or ${USER_ENV_FILE}).`
    );
    process.exit(1);
  }

  const cookieJar = new Map();

  // 1. Fetch CSRF token
  const csrfRes = await fetch(`${apiUrl}/auth/csrf`, { method: "GET" });
  collectCookies(cookieJar, csrfRes);
  const csrfBody = await parseJsonSafe(csrfRes);
  if (!csrfRes.ok || !csrfBody.csrfToken) {
    console.error("Error: failed to fetch CSRF token:", csrfRes.status, csrfBody);
    process.exit(1);
  }
  const csrfToken = csrfBody.csrfToken;

  // 2. Login
  const loginRes = await fetch(`${apiUrl}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
      Cookie: cookieHeader(cookieJar),
    },
    body: JSON.stringify({ username, password }),
  });
  collectCookies(cookieJar, loginRes);
  const loginBody = await parseJsonSafe(loginRes);
  if (!loginRes.ok) {
    console.error("Error: login failed:", loginRes.status, loginBody);
    process.exit(1);
  }

  // 3. Create post
  let postRes;
  if (imageInfo) {
    const form = new FormData();
    form.append("title", title);
    form.append("content", content);
    if (tags.length > 0) {
      form.append("tags", JSON.stringify(tags));
    }
    const bytes = readFileSync(imageInfo.path);
    form.append("image", new Blob([bytes], { type: imageInfo.mime }), imageInfo.name);

    postRes = await fetch(`${apiUrl}/posts`, {
      method: "POST",
      headers: {
        "x-csrf-token": csrfToken,
        Cookie: cookieHeader(cookieJar),
      },
      body: form,
    });
  } else {
    postRes = await fetch(`${apiUrl}/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
        Cookie: cookieHeader(cookieJar),
      },
      body: JSON.stringify({ title, content, tags }),
    });
  }

  const postBody = await parseJsonSafe(postRes);
  if (!postRes.ok) {
    console.error("Error: failed to create post:", postRes.status, postBody);
    process.exit(1);
  }

  const postUrl = `${siteUrl}/post/${postBody.id}`;
  if (values.json) {
    console.log(
      JSON.stringify({
        id: postBody.id,
        url: postUrl,
        title,
        image_url: postBody.image_url ?? null,
        message: postBody.message,
      })
    );
  } else {
    console.log(`Published: ${postUrl}`);
    console.log(`Post ID:   ${postBody.id}`);
    console.log(`Title:     ${title}`);
    if (postBody.image_url) {
      console.log(`Cover URL: ${postBody.image_url}`);
    }
  }
}

main().catch((err) => {
  console.error("Error:", err.message || err);
  process.exit(1);
});
