// 食糊記錄:每鋪記一條,完鋪或者有人要先送,新一場清空
import {createEngine} from '../src/engine.gen.js';
import assert from 'node:assert';
const st=globalThis.setTimeout;globalThis.setTimeout=(f,ms,...a)=>st(f,(ms||0)/200,...a);
const eng=createEngine();eng.setCode('HIST1');
const sleep=ms=>new Promise(r=>st(r,ms));
function mk(name,pid){const c={view:null};c.conn=eng.makeConn(d=>{if(d.t==='view')c.view=d.v;},()=>{});eng.accept(c.conn);c.send=d=>c.conn.emit('data',d);c.send({t:'hello',name,pid});return c;}
eng.create({n:4,minFan:1,level:2});
const A=mk('甲','pa'),B=mk('乙','pb');
await sleep(50);eng.start(A.conn);
const S=eng._S;
let seen=-1,sums=null;
for(let i=0;i<6000&&S.hist.length<3;i++){
  await sleep(5);
  for(const x of [A,B]){const v=x.view;if(!v)continue;
    if(!v.over){if(!v.proxy)x.send({t:'proxy',on:true});}
    else x.send({t:'ready'});}
}
assert(S.hist.length>=3,'打咗三鋪');
const sc0=1000;
const tot=S.players.map((p,i)=>S.hist.reduce((a,r)=>a+r.deltas[i],0));
S.players.forEach((p,i)=>assert.strictEqual(p.score-tot[i],S.players[0].score-tot[0],'各家輸贏總和同分數一致'));
for(const r of S.hist){
  assert.strictEqual(r.names.length,4);
  if(r.type==='win'){for(const w of r.wins){assert.strictEqual(w.hand.length+w.melds.length*3-w.melds.filter(m=>m.length===4).length*0>=14||w.melds.some(m=>m.length===4),true);assert(w.hand.includes(r.tile),'手牌有食糊嗰隻');assert(w.gain>0);assert(w.items.length>0);}
    assert.strictEqual(r.deltas.reduce((a,b)=>a+b,0),0);}
}
// 打緊嗰陣 view 唔帶記錄,要咗先有
for(let i=0;i<2000&&S.over;i++){await sleep(5);for(const x of [A,B])if(x.view&&x.view.over)x.send({t:'ready'});}
await sleep(30);
assert(!S.over);assert.strictEqual(B.view.hist,undefined,'打緊唔送記錄');assert.strictEqual(B.view.histN,S.hist.length);
B.send({t:'hist'});await sleep(30);
assert(Array.isArray(B.view.hist)&&B.view.hist.length===S.hist.length,'要咗就送');
assert.strictEqual(A.view.hist,undefined,'冇要嗰個唔送');
console.log('hist OK',S.hist.map(r=>r.type==='win'?r.wins.map(w=>r.names[w.seat]+'+'+w.gain).join('/'):'流局').join(' '));
process.exit(0);
