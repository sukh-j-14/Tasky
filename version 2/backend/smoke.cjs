const assert = require('node:assert/strict');
const { createApp } = require('./app');

const server = createApp().listen(0, '127.0.0.1', async () => {
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const health = await fetch(`${base}/api/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).database, 'disconnected');
    const tasks = await fetch(`${base}/api/tasks`);
    assert.equal(tasks.status, 503);
    assert.match((await tasks.json()).message, /Database unavailable/);
    const page = await fetch(`${base}/tasks`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /id="root"/);
    console.log('PASS: health, unavailable database, and React deep-link serving');
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
