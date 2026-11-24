export function accountError({ username, email, password }, registering = false) {
  if (!username?.trim() || username.trim().length > (registering ? 30 : 255) ||
      (registering && !/^[A-Za-z0-9_]{3,30}$/.test(username.trim()))) {
    return registering ? "Username must be 3–30 letters, numbers or underscores" : "Enter your username (maximum 255 characters)";
  }
  if (!password || new TextEncoder().encode(password).length > 72 ||
      (registering && (password.length < 8 || !password.trim()))) {
    return registering ? "Password must be at least 8 characters and at most 72 UTF-8 bytes" : "Enter your password (maximum 72 UTF-8 bytes)";
  }
  if (registering && (!email || email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))) return "Enter a valid email address";
  return null;
}

export function postError(title, content, tags) {
  if (!title.trim() || title.trim().length > 200) return "Title must be 1–200 characters";
  const plain = new DOMParser().parseFromString(content, "text/html").body.textContent;
  if (content.length > 50000 || !plain.replace(/[\s\u200B-\u200D\uFEFF]/g, "")) return "Post content must contain text and be at most 50,000 HTML characters";
  if (tags.length > 10 || !tags.every(tag => /^[A-Za-z0-9_-]{1,30}$/.test(tag))) return "Use at most 10 tags, each 1–30 letters, numbers, underscores or hyphens";
  return null;
}
