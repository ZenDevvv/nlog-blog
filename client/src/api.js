import axios from "axios";

// Only our API gets credentials and CSRF headers. Refresh tokens lazily and share
// the request between concurrent mutations (including React StrictMode effects).
export function configureApi(client, baseUrl) {
  const apiOrigin = new URL(baseUrl).origin;
  let pendingToken;
  let tokenExpiresAt = 0;
  const isApi = config => new URL(config.url, config.baseURL || baseUrl).origin === apiOrigin;
  const token = () => {
    if (!pendingToken || Date.now() >= tokenExpiresAt) {
      tokenExpiresAt = Date.now() + 50 * 60 * 1000;
      pendingToken = client.get(`${baseUrl}/auth/csrf`, { withCredentials: true })
        .then(response => response.data.csrfToken)
        .catch(error => { pendingToken = undefined; throw error; });
    }
    return pendingToken;
  };
  client.interceptors.request.use(async config => {
    if (!isApi(config)) return config;
    config.withCredentials = true;
    if (!["get", "head", "options"].includes((config.method || "get").toLowerCase())) {
      config.headers["X-CSRF-Token"] = await token();
    }
    return config;
  });
  client.interceptors.response.use(response => response, async error => {
    const config = error.config;
    if (config && isApi(config) && error.response?.status === 403 && error.response?.data?.code === "CSRF_INVALID" && !config.csrfRetried) {
      config.csrfRetried = true;
      pendingToken = undefined;
      return client.request(config);
    }
    throw error;
  });
}

if (import.meta.env?.VITE_DEV_SERVER) configureApi(axios, import.meta.env?.VITE_DEV_SERVER);
