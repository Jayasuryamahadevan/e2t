import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/index.js';

const BASE='https://e2t-translate-api.example.workers.dev/translate';
const ORIGIN='https://jayasuryamahadevan.github.io';
const env={GOOGLE_API_KEY:'server-only-test-key',ALLOWED_ORIGIN:ORIGIN,TRANSLATE_RATE_LIMIT:{limit:async()=>({success:true})}};
function req(body,origin=ORIGIN){return new Request(BASE,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});}

test('worker translates Google Cloud Translation API result and returns CORS-safe JSON',async()=>{
  const saved=globalThis.fetch;
  let upstream;
  globalThis.fetch=async (url,options)=>{
    upstream={url,options};
    return Response.json({data:{translations:[{translatedText:'வணக்கம் &amp; நன்றி',detectedSourceLanguage:'en'}]}});
  };
  try{
    const response=await worker.fetch(req({kind:'text',source:'auto',target:'ta',text:'Hello and thanks'}),env);
    const data=await response.json();
    assert.equal(response.status,200);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'),ORIGIN);
    assert.equal(data.translatedText,'வணக்கம் & நன்றி');
    assert.equal(data.detectedSourceLanguage,'en');
    assert.equal(upstream.url,'https://translation.googleapis.com/language/translate/v2');
    assert.equal(upstream.options.headers['X-goog-api-key'],'server-only-test-key');
    assert.deepEqual(JSON.parse(upstream.options.body),{q:'Hello and thanks',target:'ta',format:'text'});
  }finally{globalThis.fetch=saved;}
});

test('image translates recognized text and does not echo image data',async()=>{
  const saved=globalThis.fetch;
  const calls=[];
  globalThis.fetch=async(url,opts)=>{
    calls.push({url,opts});
    return url.includes('vision.googleapis.com')?Response.json({responses:[{fullTextAnnotation:{text:'Hello'}}]}):Response.json({data:{translations:[{translatedText:'வணக்கம்'}]}});
  };
  try{
    const response=await worker.fetch(req({kind:'image',source:'en',target:'ta',imageBase64:'AQID'}),env);
    const data=await response.json();
    assert.equal(data.sourceText,'Hello');
    assert.equal(data.translatedText,'வணக்கம்');
    assert.equal(calls.length,2);
    assert.match(calls[0].url,/vision.googleapis.com/);
    assert.equal(JSON.parse(calls[0].opts.body).requests[0].features[0].type,'DOCUMENT_TEXT_DETECTION');
  }finally{globalThis.fetch=saved;}
});

test('worker rejects wrong origin, missing key, invalid input, and throttling',async()=>{
  const body={kind:'text',source:'en',target:'ta',text:'Hello'};
  assert.equal((await worker.fetch(req(body,'https://evil.example'),env)).status,403);
  assert.equal((await worker.fetch(req(body),{...env,GOOGLE_API_KEY:undefined})).status,503);
  assert.equal((await worker.fetch(req({...body,target:'bad'}),env)).status,400);
  assert.equal((await worker.fetch(req(body),{...env,TRANSLATE_RATE_LIMIT:{limit:async()=>({success:false})}})).status,429);
  const preflight=await worker.fetch(new Request(BASE,{method:'OPTIONS',headers:{Origin:ORIGIN,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'Content-Type'}}),env);
  assert.equal(preflight.status,204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Headers'),'Content-Type');
});
