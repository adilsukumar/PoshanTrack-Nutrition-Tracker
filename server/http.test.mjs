import test from 'node:test';
import assert from 'node:assert/strict';
process.env.PORT='0'; process.env.PRIVATE_CLIENT_KEY='a'.repeat(64); process.env.GEMINI_API_KEY='';
const { server } = await import('./index.mjs');
await new Promise(resolve => server.listening ? resolve() : server.once('listening',resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
test.after(() => new Promise(resolve=>server.close(resolve)));
test('HTTP service protects uploads, reports missing provider setup, and hides internals', async () => {
  const health=await fetch(origin+'/health'); assert.equal(health.status,200);assert.equal(health.headers.get('x-powered-by'),null);
  const denied=await fetch(origin+'/api/analyse-meal',{method:'POST'});assert.equal(denied.status,401);
  const statusDenied=await fetch(origin+'/api/status');assert.equal(statusDenied.status,401);
  const status=await fetch(origin+'/api/status',{headers:{'X-Client-Key':'a'.repeat(64)}});assert.equal(status.status,200);assert.deepEqual(await status.json(),{ready:false});
  const authorised=await fetch(origin+'/api/analyse-meal',{method:'POST',headers:{'X-Client-Key':'a'.repeat(64)}});assert.equal(authorised.status,503);
  const account=await fetch(origin+'/api/account',{method:'DELETE',headers:{'X-Client-Key':'a'.repeat(64)}});assert.equal(account.status,404);
});
