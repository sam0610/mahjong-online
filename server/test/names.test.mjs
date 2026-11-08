import {Names} from '../src/names.js';
import assert from 'node:assert';
const store=new Map();
const state={storage:{get:async k=>store.get(k),put:async(k,v)=>store.set(k,JSON.parse(JSON.stringify(v))),delete:async k=>store.delete(k)}};
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
// 金手指密碼(Worker secret)
{
  const c0=new Names(state);   // 冇設 secret = 未啟用
  const q=async(nn,pw,ip='3.3.3.3')=>{const r=await nn.fetch(new Request('https://x/names',{method:'POST',body:JSON.stringify({op:'cheat',pw}),headers:{'CF-Connecting-IP':ip}}));return {s:r.status,j:await r.json()};};
  assert.strictEqual((await q(c0,'8964')).s,403);
  const c1=new Names(state,{CHEAT_PW:'8964'});
  assert.strictEqual((await q(c1,'0000')).s,403);
  const ok=await q(c1,'8964');assert.strictEqual(ok.s,200);assert.strictEqual(ok.j.ok,true);
  let last;for(let i=0;i<8;i++)last=await q(c1,'1111','4.4.4.4');assert.strictEqual(last.s,429);   // 試太多次
}
// 開新局密碼(Worker secret GAME_PW)
{
  const q=async(nn,pw,ip='5.5.5.5')=>{const r=await nn.fetch(new Request('https://x/names',{method:'POST',body:JSON.stringify({op:'gate',pw}),headers:{'CF-Connecting-IP':ip}}));return {s:r.status,j:await r.json()};};
  assert.strictEqual((await q(new Names(state),'1234')).s,403);   // 冇設 secret = 全部拒絕
  const g=new Names(state,{GAME_PW:'1234',DEBUG_PW:'9999'});
  assert.strictEqual((await q(g,'0000')).s,403);
  let ok=await q(g,'1234');assert.strictEqual(ok.s,200);assert.strictEqual(ok.j.debug,false);
  ok=await q(g,' 9999 ');assert.strictEqual(ok.j.debug,true);
  let last;for(let i=0;i<10;i++)last=await q(g,'1111','6.6.6.6');assert.strictEqual(last.s,429);
}
console.log('names OK');

// 共用快捷語(8 句,每句 1–12 字)
{
  const ip='7.7.7.7';
  let r=await call();
  assert.deepStrictEqual(r.j.phrases,['快啲啦!','等我諗諗','好牌!','嘩,咁都食得','唔該曬','又係你','手風順喎','玩得開心']);
  const mine=['一','二','三','四','五','六','七','八九十一二三四五六七八'];
  r=await call({op:'phSet',list:mine},ip);assert.strictEqual(r.s,200);assert.deepStrictEqual(r.j.phrases,mine);
  r=await call(null,ip);assert.deepStrictEqual(r.j.phrases,mine);
  r=await call({op:'phSet',list:mine.slice(0,7)},ip);assert.strictEqual(r.s,400);   // 唔夠 8 句
  r=await call({op:'phSet',list:mine.slice(0,7).concat(['一二三四五六七八九十一二三'])},ip);assert.strictEqual(r.s,400);   // 13 字
  r=await call({op:'phSet',list:mine.slice(0,7).concat(['  '])},ip);assert.strictEqual(r.s,400);   // 空白
  r=await call(null,ip);assert.deepStrictEqual(r.j.phrases,mine);   // 失敗唔會改到
  r=await call({op:'phReset',pw:'0000'},ip);assert.strictEqual(r.s,403);
  r=await call({op:'phReset',pw:'8964'},ip);assert.strictEqual(r.s,200);assert.strictEqual(r.j.phrases[0],'快啲啦!');
  r=await call(null,ip);assert.strictEqual(r.j.phrases[0],'快啲啦!');
}
console.log('phrases ok');
