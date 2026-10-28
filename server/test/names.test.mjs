import {Names} from '../src/names.js';
import assert from 'node:assert';
const store=new Map();
const state={storage:{get:async k=>store.get(k),put:async(k,v)=>store.set(k,JSON.parse(JSON.stringify(v)))}};
const n=new Names(state);
const call=async(body,ip='1.1.1.1')=>{const r=await n.fetch(new Request('https://x/names',body?{method:'POST',body:JSON.stringify(body),headers:{'CF-Connecting-IP':ip}}:{method:'GET'}));return {s:r.status,j:await r.json()};};
let r=await call();assert.strictEqual(r.j.names.length,38);
r=await call({op:'add',name:'新名字'});assert.strictEqual(r.j.names.length,39);
r=await call({op:'add',name:'新名字'});assert.strictEqual(r.s,400);
r=await call({op:'add',name:'一二三四五六七八九'});assert.strictEqual(r.s,400);
r=await call({op:'rename',from:'新名字',to:'改咗'});assert(r.j.names.includes('改咗'));
r=await call({op:'del',name:'改咗'});assert.strictEqual(r.j.names.length,38);
r=await call({op:'undo',pw:'0000'});assert.strictEqual(r.s,403);
r=await call({op:'undo',pw:'8964'});assert(r.j.names.includes('改咗'));
r=await call({op:'reset',pw:'8964'});assert.strictEqual(r.j.names.length,38);
for(let i=0;i<30;i++)r=await call({op:'add',name:'x'+i},'9.9.9.9');
assert.strictEqual(r.s,200);r=await call({op:'add',name:'y'},'9.9.9.9');assert.strictEqual(r.s,429);
// 刪到最少 10
const m=new Names({storage:{get:async k=>k==='names'?Array.from({length:10},(_,i)=>'n'+i):undefined,put:async()=>{}}});
const rr=await m.fetch(new Request('https://x/names',{method:'POST',body:JSON.stringify({op:'del',name:'n1'})}));assert.strictEqual(rr.status,400);
// 使用次數
r=await call();assert.deepStrictEqual(r.j.uses,{});
r=await call({op:'use',names:['雀神','雀神','唔存在']},'2.2.2.2');assert.strictEqual(r.j.uses['雀神'],2);assert(!('唔存在' in r.j.uses));
r=await call({op:'rename',from:'雀神',to:'雀聖'});assert.strictEqual(r.j.uses['雀聖'],2);assert(!('雀神' in r.j.uses));
r=await call({op:'del',name:'雀聖'});assert(!('雀聖' in r.j.uses));
console.log('names OK');
