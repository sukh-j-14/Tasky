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

const attachmentContents = `%PDF-1.4\n% Tasky production attachment ${runId}\n%%EOF`;
const attachmentForm = new FormData();
attachmentForm.append(
  'taskFile',
  new Blob([attachmentContents], { type: 'application/pdf' }),
  `${runId}.pdf`
);
const attachmentResponse = await fetch(`${baseUrl}/api/tasks/attachments`, {
  method: 'POST',
  headers: { authorization: `Bearer ${owner.token}` },
  body: attachmentForm
});
const attachmentPayload = await attachmentResponse.json().catch(() => ({}));
assert.equal(attachmentResponse.status, 201, `Attachment upload failed: ${attachmentResponse.status} ${JSON.stringify(attachmentPayload)}`);
assert.equal(attachmentPayload.attachment.originalName, `${runId}.pdf`);

const task = await request('/api/tasks', {
  token: owner.token,
  method: 'POST',
  expected: 201,
  body: {
    title: `${runId} production task`, description: 'Disposable production smoke test task.',
    category: 'coding', budget: 0, contactMethod: 'email', isPublic: true,
    deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
    attachments: [attachmentPayload.attachment]
  }
});
assert.equal(task.attachments.length, 1, 'The uploaded document was not linked to the task');
assert.equal(task.attachments[0].originalName, `${runId}.pdf`);

await request(task.attachments[0].url, { expected: 401 });

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

const bidderDownload = await fetch(`${baseUrl}${task.attachments[0].url}`, {
  headers: { authorization: `Bearer ${freelancer.token}` }
});
assert.equal(bidderDownload.status, 200, `Bidder could not download task document: ${bidderDownload.status}`);
assert.equal(await bidderDownload.text(), attachmentContents, 'Downloaded task document contents changed');

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

const ownerOfferResult = await request(`/api/bids/${bidResult.bid._id}/counter-offers`, {
  token: owner.token,
  method: 'POST',
  expected: 201,
  body: { amount: 80 }
});
const ownerOffer = ownerOfferResult.bid.counterOffers.at(-1);
assert.equal(ownerOffer.amount, 80, 'Owner counter-offer was not recorded');
await request(`/api/bids/${bidResult.bid._id}/counter-offers`, {
  token: owner.token,
  method: 'POST',
  expected: 400,
  body: { amount: 75 }
});
await request(`/api/bids/${bidResult.bid._id}/counter-offers`, {
  token: outsider.token,
  method: 'POST',
  expected: 403,
  body: { amount: 70 }
});
await request(`/api/bids/${bidResult.bid._id}/accept`, {
  token: owner.token,
  method: 'POST',
  expected: 400,
  body: { platformFee: 1, totalAmount: 91 }
});

const bidderCounterResult = await request(`/api/bids/${bidResult.bid._id}/counter-offers`, {
  token: freelancer.token,
  method: 'POST',
  expected: 201,
  body: { amount: 85 }
});
const bidderOffer = bidderCounterResult.bid.counterOffers.at(-1);
assert.equal(bidderOffer.amount, 85, 'Bidder counter-offer was not recorded');
await request(`/api/bids/${bidResult.bid._id}/counter-offers/${bidderOffer._id}/accept`, {
  token: freelancer.token,
  method: 'POST',
  expected: 400
});
const agreement = await request(`/api/bids/${bidResult.bid._id}/counter-offers/${bidderOffer._id}/accept`, {
  token: owner.token,
  method: 'POST'
});
assert.equal(agreement.bid.amount, 85, 'Agreed offer did not become the bid amount');
assert.equal(agreement.bid.negotiationStatus, 'agreed', 'Negotiation was not marked agreed');

const acceptance = await request(`/api/bids/${bidResult.bid._id}/accept`, {
  token: owner.token,
  method: 'POST',
  body: { platformFee: 1, totalAmount: 86 }
});
assert.equal(acceptance.bid.amount, 85, 'Final accepted bid did not use the bargained amount');

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
assert.ok(freelancerMessages.messages.some(item => item.systemMessageType === 'counter_offer'), 'Counter-offer was not recorded in chat');
assert.ok(freelancerMessages.messages.some(item => item.systemMessageType === 'offer_accepted'), 'Offer agreement was not recorded in chat');

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
