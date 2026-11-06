// Exercises the deployed API and Ably using synthetic preview accounts only.
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { promisify } = require('node:util');
const execFile = promisify(require('node:child_process').execFile);
const assert = require('node:assert/strict');
const Ably = require('ably');
const [origin, cliPath, conversationId] = process.argv.slice(2);
if (origin !== 'https://tasky-v2-testing.vercel.app' || !cliPath || !/^[a-f0-9]{24}$/.test(conversationId || '')) throw new Error('Supply the stable v2 preview origin, installed Vercel CLI entrypoint, and synthetic test conversation ID.');
const testPassword = process.env.TASKY_PREVIEW_TEST_PASSWORD;
if (!testPassword) throw new Error('Set TASKY_PREVIEW_TEST_PASSWORD for the synthetic preview accounts.');
const team = 'team_J6J3SqArlAbzFUDLGHH8yi2K';
const clients = [];
let directory, sequence = 0;
async function request(route, jar, body) {
 const number = sequence++, output = path.join(directory, `response-${number}.json`);
 const args = [cliPath, 'curl', origin + '/api' + route, '--scope', team, '--', '--silent', '--show-error', '--cookie', jar, '--cookie-jar', jar, '--output', output, '--write-out', '%{http_code}'];
 if (body) {
  const input = path.join(directory, `body-${number}.json`);
  await fs.writeFile(input, JSON.stringify(body), { mode: 0o600 });
  args.push('--header', 'Content-Type: application/json', '--header', `Origin: ${origin}`, '--request', 'POST', '--data-binary', '@' + input);
 }
 const result = await execFile(process.execPath, args, { timeout: 45000, windowsHide: true, maxBuffer: 1024 * 1024 });
 if (!/^2\d\d$/.test(result.stdout.trim())) throw new Error(`Preview request failed (${route}, status ${result.stdout.trim().slice(-3)}).`);
 return JSON.parse(await fs.readFile(output, 'utf8'));
}
function state(connection, expected) {
 if (connection.state === expected) return Promise.resolve();
 return new Promise((resolve, reject) => {
  const timer = setTimeout(() => { connection.off(expected, listener); reject(new Error(`Timed out waiting for ${expected}.`)); }, 25000);
  function listener() { clearTimeout(timer); connection.off(expected, listener); resolve(); }
  connection.on(expected, listener);
 });
}
function received(channel, id) {
 return new Promise((resolve, reject) => {
  const timer = setTimeout(() => { channel.unsubscribe('tasky-event', listener); reject(new Error('Live message was not received.')); }, 20000);
  function listener(event) { if (event.data?.message?.clientMessageId === id) { clearTimeout(timer); channel.unsubscribe('tasky-event', listener); resolve(event.data.message); } }
  channel.subscribe('tasky-event', listener).catch(reject);
 });
}
(async () => {
 directory = await fs.mkdtemp(path.join(os.tmpdir(), 'tasky-v2-realtime-'));
 const sessions = [];
 for (const role of ['client','worker']) {
  const jar = path.join(directory, `${role}.cookies`);
  const login = await request('/auth/login', jar, { email:`v2-preview-${role}-nov5@example.test`, password:testPassword });
  const realtime = new Ably.Realtime({ autoConnect:false, transports:['web_socket'], authCallback:(_params, done) => request('/realtime/token', jar, {}).then(token => done(null, token), error => done(error, null)) });
  clients.push(realtime); realtime.connect(); await state(realtime.connection, 'connected');
  const channel = realtime.channels.get(`tasky-v2:user:${login.user.id}`); await channel.attach();
  sessions.push({ jar, realtime, channel });
 }
 const [client, worker] = sessions;
 const first = `hosted-before-${Date.now()}`, firstEvent = received(client.channel, first);
 await request(`/messages/conversations/${conversationId}/messages`, worker.jar, { message:'Hosted reconnect verification: initial delivery.', clientMessageId:first });
 assert.equal((await firstEvent).clientMessageId, first);
 client.realtime.close(); await state(client.realtime.connection, 'closed');
 const offline = `hosted-offline-${Date.now()}`;
 await request(`/messages/conversations/${conversationId}/messages`, worker.jar, { message:'Hosted reconnect verification: persisted while recipient disconnected.', clientMessageId:offline });
 client.realtime.connect(); await state(client.realtime.connection, 'connected'); await client.channel.attach();
 const history = await request(`/messages/conversations/${conversationId}/messages`, client.jar);
 assert.ok(history.messages.some(message => message.clientMessageId === offline));
 await client.realtime.auth.authorize();
 const after = `hosted-after-${Date.now()}`, afterEvent = received(client.channel, after);
 const payload = { message:'Hosted reconnect verification: live delivery after reconnect and renewed authentication.', clientMessageId:after };
 await request(`/messages/conversations/${conversationId}/messages`, worker.jar, payload); await afterEvent;
 await request(`/messages/conversations/${conversationId}/messages`, worker.jar, payload);
 const finalHistory = await request(`/messages/conversations/${conversationId}/messages`, client.jar);
 assert.equal(finalHistory.messages.filter(message => message.clientMessageId === after).length, 1);
 console.log(JSON.stringify({ status:'passed', transport:'Ably WebSocket', checks:['two independent hosted sessions','live delivery','explicit disconnect and reconnect','history catch-up','renewed authentication','post-reconnect live delivery','idempotent message retry'] }));
})().catch(() => { console.error('Hosted realtime verification failed. No credentials or response tokens were printed.'); process.exitCode = 1; }).finally(async () => {
 for (const client of clients) client.close();
 if (directory) {
  const target = path.resolve(directory), root = path.resolve(os.tmpdir()) + path.sep;
  if (target.startsWith(root) && path.basename(target).startsWith('tasky-v2-realtime-')) await fs.rm(target, { recursive:true, force:true });
 }
});
