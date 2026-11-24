// Route state is untrusted: only allow internal paths after authentication.
export function safeReturnPath(value, fallback = "/") {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") &&
    !/[\\\u0000-\u0020]/.test(value) && !/^\/(?:login|register)(?:[/?#]|$)/.test(value)
    ? value : fallback;
}
