import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';

// Generated using bcrypt 5.1.1 with a test-only password, never a user account.
const legacyHash = "$2b$10$WByET8N.7JcFCshYN8G2PO/7hr6K4yWlIjfS015.410bn7PPpnq1C";
test('bcrypt upgrade preserves old hashes and verifies newly generated hashes', async () => {
  assert.equal(await bcrypt.compare('compatibility-check-only', legacyHash), true);
  const hash = await bcrypt.hash('new-password-check', 10);
  assert.equal(await bcrypt.compare('new-password-check', hash), true);
  assert.equal(await bcrypt.compare('wrong-password', hash), false);
});
