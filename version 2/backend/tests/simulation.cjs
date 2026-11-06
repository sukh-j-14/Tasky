const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createServer } = require('node:http');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { simulationEnabled } = require('../paymentMode');

test('payment simulation is never enabled in production', () => {
 const previous = { ...process.env };
 try {
  process.env.PAYMENT_SIMULATION = 'true'; process.env.NODE_ENV = 'production'; process.env.VERCEL = '1'; process.env.VERCEL_ENV = 'production';
  assert.equal(simulationEnabled(), false);
  process.env.VERCEL_ENV = 'preview'; assert.equal(simulationEnabled(), true);
  delete process.env.VERCEL; delete process.env.VERCEL_ENV; assert.equal(simulationEnabled(), false);
  process.env.NODE_ENV = 'test'; assert.equal(simulationEnabled(), true);
  delete process.env.PAYMENT_SIMULATION; assert.equal(simulationEnabled(), false);
 } finally {
  for (const key of ['PAYMENT_SIMULATION','NODE_ENV','VERCEL','VERCEL_ENV']) {
   if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
  }
 }
});

test('simulated funding, delivery and release are authorized, durable and idempotent', { timeout: 180000 }, async () => {
 process.env.JWT_SECRET = 'isolated-simulation-test-secret-at-least-32-characters';
 process.env.PAYMENT_SIMULATION = 'true'; process.env.ENABLE_PAYMENTS = 'false';
 const database = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
 let server;
 try {
  await mongoose.connect(database.getUri(), { dbName: 'tasky_simulation_test' });
  const User = require('../models/User'), Bid = require('../models/Bid'), Task = require('../models/Task');
  const Payment = require('../models/SimulatedPayment'), { Message } = require('../models/Message');
  await Promise.all([User.init(), Bid.init(), Payment.init(), Message.init()]);
  server = createServer(require('../app').createApp()); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}/api`;
  async function request(path, { method = 'GET', cookie, body, status = 200 } = {}) {
   const response = await fetch(base + path, { method, headers: { ...(body ? { 'Content-Type':'application/json' } : {}), ...(cookie ? { Cookie:cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
   const data = await response.json(); assert.equal(response.status, status, JSON.stringify(data));
   return { data, cookie:response.headers.get('set-cookie')?.split(';')[0] };
  }
  async function account(name) { return request('/auth/signup', { method:'POST',status:201,body:{username:name,firstName:name,lastName:'Simulation',email:`${name}@example.test`,password:'test-password-123'} }); }
  const client = await account('simclient'), worker = await account('simworker'), outsider = await account('simoutsider');
  const task = (await request('/tasks', { method:'POST',cookie:client.cookie,status:201,body:{title:'Simulation test project',description:'A test-only delivery.',category:'coding',budget:5000,contactMethod:'email',deadline:new Date(Date.now()+10*86400000).toISOString()} })).data;
  const bid = (await request('/bids', {method:'POST',cookie:worker.cookie,status:201,body:{taskId:task._id,amount:4200.5,proposedTimeline:2,message:'Test proposal'}})).data.bid;
  const path = `/payments/simulation/tasks/${task._id}`;
  await request(path,{cookie:client.cookie,status:409});
  await request(`/bids/${bid._id}/accept`,{method:'POST',cookie:client.cookie});
  const initial = await request(path,{cookie:worker.cookie}); assert.equal(initial.data.payment.amountMinor,420050);
  await request(path,{status:401}); await request(path,{cookie:outsider.cookie,status:403});
  await request(`${path}/fund`,{method:'POST',cookie:worker.cookie,body:{operationId:'worker-denied-001'},status:403});
  await request(`/tasks/${task._id}/complete`,{method:'POST',cookie:client.cookie,status:409});
  await request(`/tasks/${task._id}/deliver`,{method:'POST',cookie:worker.cookie,body:{message:'Too early'},status:409});
  const decline = { operationId:'decline-test-001',outcome:'declined' };
  const declined = await request(`${path}/fund`,{method:'POST',cookie:client.cookie,body:decline}); assert.equal(declined.data.declined,true);
  await request(`${path}/fund`,{method:'POST',cookie:client.cookie,body:decline});
  assert.equal((await Payment.findOne({taskId:task._id})).events.length,1);
  await request(`${path}/fund`,{method:'POST',cookie:client.cookie,body:{...decline,outcome:'success'},status:409});
  const funding = { operationId:'success-test-001',outcome:'success',amountMinor:1 };
  await Promise.all([request(`${path}/fund`,{method:'POST',cookie:client.cookie,body:funding}),request(`${path}/fund`,{method:'POST',cookie:client.cookie,body:funding})]);
  const funded = await Payment.findOne({taskId:task._id}); assert.equal(funded.status,'funded'); assert.equal(funded.amountMinor,420050);
  assert.equal(funded.events.filter(e=>e.type==='funded').length,1);
  await request(`/tasks/${task._id}`,{method:'PUT',cookie:client.cookie,body:{budget:1},status:404});
  await request(`/tasks/${task._id}/deliver`,{method:'POST',cookie:client.cookie,body:{message:'Not the worker'},status:403});
  await request(`/tasks/${task._id}/deliver`,{method:'POST',cookie:worker.cookie,body:{message:'Completed test handoff.'}});
  await request(`/tasks/${task._id}/deliver`,{method:'POST',cookie:worker.cookie,body:{message:'Retry'}});
  assert.equal((await Task.findById(task._id)).deliveryNote,'Completed test handoff.');
  await request(`/tasks/${task._id}/complete`,{method:'POST',cookie:worker.cookie,status:403});
  await Promise.all([request(`/tasks/${task._id}/complete`,{method:'POST',cookie:client.cookie}),request(`/tasks/${task._id}/complete`,{method:'POST',cookie:client.cookie})]);
  assert.equal((await Task.findById(task._id)).status,'completed');
  const released = await Payment.findOne({taskId:task._id}); assert.equal(released.status,'released'); assert.equal(released.events.filter(e=>e.type==='released').length,1);
  const freelancer = await User.findById(worker.data.user.id); assert.equal(freelancer.tasksCompleted,1); assert.equal(freelancer.walletBalance,0);
  assert.equal(await Payment.countDocuments({taskId:task._id}),1);
  await request('/payments/create-order',{method:'POST',cookie:client.cookie,body:{amount:1},status:503});
  process.env.VERCEL='1'; process.env.VERCEL_ENV='production';
  assert.equal((await request('/payments/config')).data.mode,'disabled');
  await request(path,{cookie:client.cookie,status:404});
 } finally {
  delete process.env.PAYMENT_SIMULATION; delete process.env.VERCEL; delete process.env.VERCEL_ENV;
  if (server) await new Promise(resolve=>server.close(resolve));
  await mongoose.disconnect(); await database.stop();
 }
});
