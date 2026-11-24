---
name: byline-post
description: >-
  Draft and publish blog posts to Byline (https://nlog-blog.netlify.app) using
  the repo's API publishing script. Use whenever the user asks to write, draft,
  or publish a post on Byline / nlog-blog, with or without a cover image or tags.
---

# Byline Post Publisher

Draft posts for user approval and publish them directly to the Byline backend API using [publish-post.mjs](./scripts/publish-post.mjs) (no browser automation needed).

## Workflow

1. **Draft first and wait for approval**
   - Always open the post with a **hook or catch** to grab the reader's attention right away.
   - Prepare a concise draft showing:
     - **Title** (1–200 characters)
     - **Description / Content** (plain text or basic HTML)
     - **Cover photo** (note the attached/referenced image path, if any)
     - **Tags** (optional; max 10, each `1–30` chars matching `[A-Za-z0-9_-]`)
   - Present the draft to the user and **wait for explicit approval** before publishing.

2. **Publish via script**
   - Once approved, run [publish-post.mjs](./scripts/publish-post.mjs):
     ```bash
     node .agents/skills/byline-post/scripts/publish-post.mjs \
       --title "<title>" \
       --content "<content>" \
       --image "<absolute-image-path>" \
       --tags "<tag1,tag2>" \
       --json
     ```
   - Omit `--image` or `--tags` when not used.
   - For long or multi-paragraph posts, pass `--content-file <path>` instead of `--content`.
   - Plain text is automatically wrapped in `<p>` tags; HTML using `<p>`, `<h1>`–`<h3>`, `<ul>`, `<ol>`, `<blockquote>`, or `<pre>` is passed through as-is.
   - Use `--dry-run` to validate inputs and credentials without publishing.

3. **Verify and report**
   - Confirm the script exits with code `0` and returns the created post `id` and `url`.
   - Reply with the live post link (`https://nlog-blog.netlify.app/post/<id>`), title, and cover image status.

## Credentials

- The script reads `NLOG_USERNAME` and `NLOG_PASSWORD` in this order:
  1. CLI flags (`--username`, `--password`)
  2. Environment variables (`NLOG_USERNAME`, `NLOG_PASSWORD`)
  3. Repo-local gitignored `.agents/skills/byline-post/.env`
  4. User-local `~/.config/nlog-blog/credentials.env`
- Never hardcode or commit credentials in tracked files. If credentials are missing, ask the user for them before running the publish command.
