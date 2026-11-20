// 事件圖:開局、食糊/自摸/出銃、流局、睇住呀等會發出事件,編號遞增,key 係列表入面嘅
import {createEngine} from '../src/engine.gen.js';
import assert from 'node:assert';
const st=globalThis.setTimeout;globalThis.setTimeout=(f,ms,...a)=>st(f,(ms||0)/200,...a);
const eng=createEngine();eng.setCode('EVT1');
const sleep=ms=>new Promise(r=>st(r,ms));
function mk(name,pid){const c={view:null,seen:new Map()};c.conn=eng.makeConn(d=>{if(d.t==='view'){c.view=d.v;(d.v.evts||[]).forEach(e=>c.seen.set(e.id,e));}},()=>{});eng.accept(c.conn);c.send=d=>c.conn.emit('data',d);c.send({t:'hello',name,pid});return c;}
eng.create({n:4,minFan:1,level:2});
const A=mk('甲','pa'),B=mk('乙','pb');
await sleep(50);eng.start(A.conn);
const S=eng._S;
for(let i=0;i<8000&&S.hist.length<4;i++){
  await sleep(5);
  for(const x of [A,B]){const v=x.view;if(!v)continue;
    if(!v.over){if(!v.proxy)x.send({t:'proxy',on:true});}
    else x.send({t:'ready'});}
}
assert(S.hist.length>=4,'打咗四鋪');
const keys=new Set(['opening','zimo','hu','bian','peng','kong','lanpai','kanzhu','fang','shang','draw']);
const all=[...A.seen.values()].sort((a,b)=>a.id-b.id);
assert(all.length>0,'有事件');
assert(all[0].key==='opening'&&all[0].id===1,'第一個係開檯囉');
for(const e of all){assert(keys.has(e.key),'key 合法 '+e.key);assert.strictEqual(e.ch,'salt');}
const ids=all.map(e=>e.id);assert.deepStrictEqual(ids,[...ids].sort((a,b)=>a-b));
const kinds=new Set(all.map(e=>e.key));
const hasResult=S.hist.some(r=>r.type==='draw')?kinds.has('draw'):(kinds.has('hu')||kinds.has('zimo'));
assert(hasResult,'結局有對應事件 '+[...kinds].join(','));
console.log('evt OK',all.map(e=>e.key).join(' '));
process.exit(0);
