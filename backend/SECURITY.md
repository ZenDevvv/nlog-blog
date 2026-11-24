# Application security

The API requires `JWT_KEY` and, in production, `CLIENT_SERVER` set to the exact
frontend origin without a trailing slash. Render proxy trust is enabled only when
`RENDER=true`. Local requests do not trust forwarded IP headers.

## Request limits

- General API: 300 requests per IP per 15 minutes; GET `/` health checks are exempt.
- Login: 10 failed requests per IP and per normalized username per 15 minutes.
  Successful logins do not consume that allowance.
- Registration: 5 requests per IP per hour.
- Post creation, editing and deletion: 30 requests per account per 15 minutes.
- View updates: 60 requests per IP per minute.

Limits return HTTP 429, a JSON message and `Retry-After`/`RateLimit` headers.
Counters are in memory, reset on process restart, and are independent per
instance. A shared store is required before scaling the API to multiple instances.

## Cookie and CSRF protection

Fetch GET `/auth/csrf` with credentials before POST/PUT/DELETE requests. Send the
returned `csrfToken` in `X-CSRF-Token`, with cookies enabled. Tokens expire after
one hour. The frontend handles issuance and a single retry when the API rejects an
expired/missing token. Mutations reject mismatched, invalid and expired tokens,
and reject supplied origins other than `CLIENT_SERVER`. CORS allows only that
frontend origin. Cross-site cookies require browser support for third-party
cookies when the frontend and backend are on different sites.

Production CSRF cookies use the `__Host-` prefix, HttpOnly, Secure and SameSite=None.
The signing secret is `JWT_KEY`; changing it also invalidates login sessions.
Helmet sets API security headers, and `netlify.toml` sets frontend headers/CSP.

## Views

Apply `migrations/002_post_views.sql` before deploying the view-count changes.
A keyed hash of the IP identifies a viewer; no raw IP is stored in this table.
Transactions and locking reads allow one counted view per post/IP per rolling
24 hours, including simultaneous requests. Shared-IP visitors count together;
different IPs can still count separately. This deters simple view inflation,
not distributed bots. Deduplication records are deleted with their post.

## Verification

Run `npm test` in backend and client separately. To run the real TiDB concurrency
check, run `RUN_TIDB_INTEGRATION=1 node --env-file=.env --test test/views.test.js`
from backend. It creates and removes a random scratch database and never inserts
fixture records into the app database. The database user needs permission to
create/drop that scratch database. Never run this test using an untrusted URL.

## Guest access

Guests may browse the public feed, trending posts, search, public posts and public
profiles without creating a temporary account. All feed/search/trending queries
filter to `privacy = 'public'`. Individual private posts and private profile posts
are only returned to their authenticated owner. Missing and inaccessible posts
both return 404. Invalid/expired cookies fall back to guest access on reads; all
create/edit/delete operations still require a valid session and CSRF token.
Private-post view increments require the owner too. API responses use no-store
to avoid caching owner-specific responses for other visitors.

The optional guest integration check is
`RUN_TIDB_INTEGRATION=1 node --env-file=.env --test test/guests.test.js` from backend;
it creates and removes its own scratch database like the view concurrency test.
