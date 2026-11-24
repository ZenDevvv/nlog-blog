import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import { MAX_IMAGE_BYTES, imageError, postError } from "../src/validation.js";

test("imageError and postError validate cover image type and size limits", () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  const prevDOMParser = globalThis.DOMParser;
  globalThis.DOMParser = dom.window.DOMParser;
  try {
    assert.equal(imageError(null), null);
    assert.equal(imageError({ type: "image/jpeg", size: 1024 }), null);
    assert.equal(imageError({ type: "image/png", size: MAX_IMAGE_BYTES }), null);
    assert.ok(imageError({ type: "image/svg+xml", size: 200 }));
    assert.ok(imageError({ type: "application/pdf", size: 200 }));
    assert.ok(imageError({ type: "image/webp", size: MAX_IMAGE_BYTES + 1 }));

    assert.equal(
      postError("Title", "<p>Description</p>", ["tag"], { type: "image/webp", size: 1024 }),
      null
    );
    assert.ok(
      postError("Title", "<p>Description</p>", ["tag"], { type: "image/svg+xml", size: 100 })
    );
  } finally {
    globalThis.DOMParser = prevDOMParser;
    dom.window.close();
  }
});

test("Posts feed and Single page render cover images when image_url is present", async () => {
  const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
    url: "http://localhost",
    pretendToBeVisual: true,
  });
  for (const key of [
    "window", "document", "navigator", "Node", "Element", "HTMLElement",
    "SVGElement", "Text", "MutationObserver", "DOMParser", "Range",
  ]) {
    Object.defineProperty(globalThis, key, { value: dom.window[key], configurable: true });
  }
  globalThis.getComputedStyle = dom.window.getComputedStyle;
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
  globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom" });
  const React = await import("react");
  const h = React.createElement;
  const { createRoot } = await import("react-dom/client");
  const { MemoryRouter, Routes, Route } = await import("react-router-dom");
  const { default: axios } = await import("axios");
  const originalAdapter = axios.defaults.adapter;

  const coverUrl = "https://res.cloudinary.com/demo/image/upload/nlog-blog/prod/posts/user-1/2026/11/abc.jpg";
  axios.defaults.adapter = async (config) => {
    if (config.url.endsWith("/posts/7")) {
      return {
        status: 200,
        data: [{
          id: 7,
          user_id: 1,
          title: "Photo post",
          content: "<p>My photo caption</p>",
          image_url: coverUrl,
          username: "writer",
          updated_at: "2026-11-25",
          tags: "travel",
        }],
        config,
      };
    }
    return { status: 200, data: { counted: true }, config };
  };

  const Posts = (await server.ssrLoadModule("/src/components/Posts.jsx")).default;
  const Single = (await server.ssrLoadModule("/src/pages/Single.jsx")).default;
  const { AuthContext } = await server.ssrLoadModule("/src/context/AuthContext.jsx");
  const { NotifProvider } = await server.ssrLoadModule("/src/context/NotifContext.jsx");
  const root = createRoot(document.getElementById("root"));

  try {
    await React.act(async () => {
      root.render(
        h(
          MemoryRouter,
          null,
          h(Posts, {
            posts: [
              { post_id: 7, user_id: 1, title: "Photo post", content: "<p>Caption</p>", image_url: coverUrl, username: "writer", updated_at: "2026-11-25", tags: "travel" },
              { post_id: 8, user_id: 1, title: "Text only", content: "<p>No photo</p>", image_url: null, username: "writer", updated_at: "2026-11-25", tags: null },
            ],
          })
        )
      );
    });
    const feedImgs = [...document.querySelectorAll("img")];
    assert.equal(feedImgs.length, 1);
    assert.equal(feedImgs[0].getAttribute("src"), coverUrl);
    assert.equal(feedImgs[0].getAttribute("alt"), "Photo post");

    await React.act(async () => {
      root.render(
        h(
          MemoryRouter,
          { key: "single", initialEntries: ["/post/7"] },
          h(
            AuthContext.Provider,
            { value: { currentUser: null, setCurrentUser: () => {} } },
            h(
              NotifProvider,
              null,
              h(Routes, null, h(Route, { path: "/post/:id", element: h(Single) }))
            )
          )
        )
      );
    });
    await React.act(async () => { await new Promise((r) => setTimeout(r, 40)); });
    const singleImg = document.querySelector("img");
    assert.ok(singleImg);
    assert.equal(singleImg.getAttribute("src"), coverUrl);
    assert.match(document.body.textContent, /My photo caption/);
  } finally {
    await React.act(async () => root.unmount());
    await server.close();
    axios.defaults.adapter = originalAdapter;
    dom.window.close();
  }
});
