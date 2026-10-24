import test from 'node:test';
import assert from 'node:assert/strict';
import { authenticated, validateImage, consumeDailyAttempt, limit } from './security.mjs';
import { validateAnalysis } from './analysisValidation.mjs';

const fixture = () => ({ dishSummary:'Two rotis',mealType:'Lunch',overallConfidence:'medium',caution:'Estimate only',questions:[],assumptions:[],items:[{id:'roti',name:'Roti',regionalName:'',portion:'1 roti',quantity:2,calories:100,caloriesLow:80,caloriesHigh:120,proteinG:3,carbsG:20,fatG:1,fibreG:2,confidence:'medium',notes:''}] });
const mockResponse = () => ({ statusCode:200,status(n){this.statusCode=n;return this;},json(value){this.body=value;return this;},set(){return this;} });
test('private service fails closed and rejects wrong codes', () => {
  process.env.PRIVATE_CLIENT_KEY = 'a'.repeat(64);
  for (const key of [undefined, 'b'.repeat(64), 'short']) { const res=mockResponse(); authenticated({headers:{'x-client-key':key}},res,()=>assert.fail('unexpected access')); assert.equal(res.statusCode,401); }
  let called=false; authenticated({headers:{'x-client-key':'a'.repeat(64)}},mockResponse(),()=>called=true); assert.equal(called,true);
  process.env.PRIVATE_CLIENT_KEY = 'c'.repeat(32);
  called=false; authenticated({headers:{'x-client-key':'c'.repeat(32)}},mockResponse(),()=>called=true); assert.equal(called,true);
  const wrong=mockResponse(); authenticated({headers:{'x-client-key':'d'.repeat(32)}},wrong,()=>assert.fail()); assert.equal(wrong.statusCode,401);
  process.env.PRIVATE_CLIENT_KEY=''; const res=mockResponse(); authenticated({headers:{}},res,()=>assert.fail()); assert.equal(res.statusCode,503);
});
test('image signatures reject forged MIME and accept supported formats', () => {
  assert.equal(validateImage(Buffer.from('<script>not a photo</script>')),null);
  assert.equal(validateImage(Buffer.concat([Buffer.from([255,216,255]),Buffer.alloc(20)])),'image/jpeg');
  assert.equal(validateImage(Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),Buffer.alloc(20)])),'image/png');
});
test('per-serving nutrients and quantity are retained, bad ranges/macros rejected', () => {
  assert.equal(validateAnalysis(fixture()).items[0].calories * 2,200);
  const bad=fixture(); bad.items[0].caloriesLow=150; assert.throws(()=>validateAnalysis(bad));
  const macros=fixture(); macros.items[0].fatG=100; assert.throws(()=>validateAnalysis(macros));
  const nan=fixture(); nan.items[0].quantity=NaN; assert.throws(()=>validateAnalysis(nan));
});
test('daily attempts stop at the configured cap', () => { process.env.MAX_DAILY_ANALYSES='2'; assert.equal(consumeDailyAttempt(),true);assert.equal(consumeDailyAttempt(),true);assert.equal(consumeDailyAttempt(),false); });
test('rate limit cannot be bypassed using client-provided identifiers', () => {
  const middleware=limit('account',1,60000); const req={user:{id:'private-client'},headers:{}};
  middleware(req,mockResponse(),()=>{}); const res=mockResponse(); middleware(req,res,()=>assert.fail());assert.equal(res.statusCode,429);
});
