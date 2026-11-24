import sanitizeHtml from "sanitize-html";

const bodyObject = (body) => body !== null && typeof body === "object" && !Array.isArray(body);
const text = (value) => typeof value === "string" ? value.trim() : "";
export const validTag = (value) => typeof value === "string" && /^[A-Za-z0-9_-]{1,30}$/.test(value);
export const validId = (value) => typeof value === "string" && /^[1-9]\d{0,9}$/.test(value) && Number(value) <= 2147483647;
export const validateId = (req, res, next) => validId(req.params.id)
  ? next() : res.status(400).json({ message: "ID must be a positive integer" });

export function validateAuth(body, registering = false) {
  if (!bodyObject(body)) return { error: "Expected a JSON object" };
  const username = text(body.username);
  const password = body.password;
  // Login permits existing usernames/passwords; registration enforces the new policy.
  if (!username || username.length > (registering ? 30 : 255) ||
      (registering && !/^[A-Za-z0-9_]{3,30}$/.test(username))) {
    return { error: registering ? "Username must be 3–30 letters, numbers or underscores" : "Username is required (maximum 255 characters)" };
  }
  if (typeof password !== "string" || !password.length || Buffer.byteLength(password, "utf8") > 72 ||
      (registering && (password.length < 8 || !password.trim()))) {
    return { error: registering ? "Password must be at least 8 characters and at most 72 UTF-8 bytes" : "Password is required (maximum 72 UTF-8 bytes)" };
  }
  const email = text(body.email).toLowerCase();
  if (registering && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return { error: "Enter a valid email address (maximum 254 characters)" };
  }
  return { value: { username, password, email } };
}

export function validatePost(body) {
  if (!bodyObject(body)) return { error: "Expected a JSON object" };
  const title = text(body.title);
  if (!title || title.length > 200) return { error: "Title must be 1–200 characters" };
  if (typeof body.content !== "string" || body.content.length > 50000) {
    return { error: "Post content is required (maximum 50,000 HTML characters)" };
  }
  let plain = "";
  const content = sanitizeHtml(body.content, {
    allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "s", "blockquote", "pre", "code", "ol", "ul", "li", "h1", "h2", "h3"],
    allowedAttributes: {},
    textFilter: (escapedText) => { plain += escapedText; return escapedText; },
  });
  if (!plain.replace(/&(?:nbsp|#160|#x0*a0);|[\s\u200B-\u200D\uFEFF]/gi, "")) {
    return { error: "Post content must contain visible text" };
  }
  if (!Array.isArray(body.tags ?? []) || (body.tags ?? []).length > 10 ||
      !(body.tags ?? []).every(validTag)) {
    return { error: "Use at most 10 tags, each 1–30 letters, numbers, underscores or hyphens" };
  }
  if (body.tags === null) return { error: "Tags must be an array" };
  return { value: { title, content, tags: [...new Set(body.tags ?? [])] } };
}
