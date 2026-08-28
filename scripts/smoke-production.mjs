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

const outsider = await request('/api/auth/signup', {
  method: 'POST',
  expected: 201,
  body: {
    username: `${runId}_outsider`, email: `${runId}_outsider@example.com`, password,
    firstName: 'Smoke', lastName: 'Outsider'
  }
});

await request('/api/auth/login', {
  method: 'POST',
  body: { email: `${runId}_owner@example.com`, password }
});
await request('/api/auth/profile', { token: owner.token });
const updatedProfile = await request('/api/auth/profile', {
  token: freelancer.token,
  method: 'PUT',
  body: { firstName: 'Smoke', lastName: 'Freelancer', bio: 'Production verification profile' }
});
assert.equal(updatedProfile.user.bio, 'Production verification profile', 'Profile update was not persisted');

const task = await request('/api/tasks', {
  token: owner.token,
  method: 'POST',
  expected: 201,
  body: {
    title: `${runId} production task`, description: 'Disposable production smoke test task.',
    category: 'coding', budget: 0, contactMethod: 'email', isPublic: true,
    deadline: new Date(Date.now() + 7 * 86400000).toISOString()
  }
});

await request('/api/bids', {
  token: owner.token,
  method: 'POST',
  expected: 400,
  body: { taskId: task._id, amount: 50, message: 'Invalid owner bid', proposedTimeline: 2 }
});

const bidResult = await request('/api/bids', {
  token: freelancer.token,
  method: 'POST',
  expected: 201,
  body: { taskId: task._id, amount: 90, message: 'Smoke-test bid', proposedTimeline: 3 }
});

await request('/api/bids', {
  token: freelancer.token,
  method: 'POST',
  expected: 400,
  body: { taskId: task._id, amount: 80, message: 'Duplicate bid', proposedTimeline: 2 }
});
await request(`/api/bids/task/${task._id}`, { token: outsider.token, expected: 403 });
await request(`/api/bids/${bidResult.bid._id}`, {
  token: owner.token,
  method: 'PUT',
  expected: 403,
  body: { amount: 95 }
});

const bids = await request(`/api/bids/task/${task._id}`, { token: owner.token });
assert.equal(bids.bids.length, 1);

const acceptance = await request(`/api/bids/${bidResult.bid._id}/accept`, {
  token: owner.token,
  method: 'POST',
  body: { platformFee: 1, totalAmount: 91 }
});

const conversations = await request('/api/messages/conversations', { token: owner.token });
const conversation = conversations.conversations.find(item => item.taskId?._id === task._id || item.taskId === task._id);
assert.ok(conversation, 'Bid conversation was not created');
assert.equal(acceptance.conversationId, conversation._id, 'Acceptance did not return its conversation');

const sentMessage = await request(`/api/messages/conversations/${conversation._id}/messages`, {
  token: owner.token,
  method: 'POST',
  expected: 201,
  body: { message: 'Production smoke-test message' }
});

await request(`/api/messages/conversations/${conversation._id}/messages`, { token: outsider.token, expected: 403 });
await request(`/api/messages/conversations/${conversation._id}/read`, { token: outsider.token, method: 'POST', expected: 403 });
await request(`/api/messages/messages/${sentMessage.newMessage._id}`, {
  token: freelancer.token,
  method: 'PUT',
  expected: 403,
  body: { message: 'Unauthorized edit' }
});

const freelancerMessages = await request(`/api/messages/conversations/${conversation._id}/messages`, { token: freelancer.token });
assert.ok(freelancerMessages.messages.some(item => item.message === 'Production smoke-test message'), 'Freelancer could not receive the message');

await request(`/api/tasks/${task._id}/complete`, { token: freelancer.token, method: 'POST', expected: 403 });
const completion = await request(`/api/tasks/${task._id}/complete`, { token: owner.token, method: 'POST' });
assert.equal(completion.task.status, 'completed', 'Task was not marked completed');

const completedMessages = await request(`/api/messages/conversations/${conversation._id}/messages`, { token: freelancer.token });
assert.ok(completedMessages.messages.some(item => item.systemMessageType === 'task_completed'), 'Freelancer did not receive task completion notice');
await request(`/api/tasks/${task._id}/complete`, { token: owner.token, method: 'POST', expected: 400 });

const disposableTask = await request('/api/tasks', {
  token: owner.token,
  method: 'POST',
  expected: 201,
  body: {
    title: `${runId} disposable delete task`, description: 'Task used to verify owner deletion.',
    category: 'coding', budget: 25, contactMethod: 'email', isPublic: true,
    deadline: new Date(Date.now() + 7 * 86400000).toISOString()
  }
});
await request(`/api/tasks/${disposableTask._id}`, { token: outsider.token, method: 'DELETE', expected: 404 });
await request(`/api/tasks/${disposableTask._id}`, { token: owner.token, method: 'DELETE' });
await request(`/api/tasks/${disposableTask._id}`, { expected: 404 });
await request('/api/payments/history', { token: owner.token, expected: 503 });

console.log(JSON.stringify({
  ok: true,
  runId,
  userIds: [owner.user.id, freelancer.user.id, outsider.user.id],
  taskId: task._id,
  bidId: bidResult.bid._id,
  conversationId: conversation._id
}));
