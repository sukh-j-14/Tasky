import assert from 'node:assert/strict';

const baseUrl = process.env.TASKY_BASE_URL || 'https://tasky-nine-gamma.vercel.app';
const runId = `codex_smoke_${Date.now()}`;
const password = 'SmokeTest!2026';

async function request(path, { token, method = 'GET', body, expected = 200 } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const payload = await response.json().catch(() => ({}));
  assert.equal(response.status, expected, `${method} ${path}: ${response.status} ${JSON.stringify(payload)}`);
  return payload;
}

const health = await request('/api/health');
assert.equal(health.database, 'connected');

const owner = await request('/api/auth/signup', {
  method: 'POST',
  expected: 201,
  body: {
    username: `${runId}_owner`, email: `${runId}_owner@example.com`, password,
    firstName: 'Smoke', lastName: 'Owner'
  }
});

const freelancer = await request('/api/auth/signup', {
  method: 'POST',
  expected: 201,
  body: {
    username: `${runId}_freelancer`, email: `${runId}_freelancer@example.com`, password,
    firstName: 'Smoke', lastName: 'Freelancer'
  }
});

await request('/api/auth/login', {
  method: 'POST',
  body: { email: `${runId}_owner@example.com`, password }
});
await request('/api/auth/profile', { token: owner.token });

const task = await request('/api/tasks', {
  token: owner.token,
  method: 'POST',
  expected: 201,
  body: {
    title: `${runId} production task`, description: 'Disposable production smoke test task.',
    category: 'coding', budget: 100, contactMethod: 'email', isPublic: true,
    deadline: new Date(Date.now() + 7 * 86400000).toISOString()
  }
});

const bidResult = await request('/api/bids', {
  token: freelancer.token,
  method: 'POST',
  expected: 201,
  body: { taskId: task._id, amount: 90, message: 'Smoke-test bid', proposedTimeline: 3 }
});

const bids = await request(`/api/bids/task/${task._id}`, { token: owner.token });
assert.equal(bids.bids.length, 1);

await request(`/api/bids/${bidResult.bid._id}/accept`, {
  token: owner.token,
  method: 'POST',
  body: { platformFee: 1, totalAmount: 91 }
});

const conversations = await request('/api/messages/conversations', { token: owner.token });
const conversation = conversations.conversations.find(item => item.taskId?._id === task._id || item.taskId === task._id);
assert.ok(conversation, 'Bid conversation was not created');

await request(`/api/messages/conversations/${conversation._id}/messages`, {
  token: owner.token,
  method: 'POST',
  expected: 201,
  body: { message: 'Production smoke-test message' }
});

await request(`/api/tasks/${task._id}/complete`, { token: owner.token, method: 'POST' });
await request('/api/payments/history', { token: owner.token, expected: 503 });

console.log(JSON.stringify({
  ok: true,
  runId,
  userIds: [owner.user.id, freelancer.user.id],
  taskId: task._id,
  bidId: bidResult.bid._id,
  conversationId: conversation._id
}));

