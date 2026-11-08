import {createEngine} from '../src/engine.gen.js';
import assert from 'node:assert';
const eng=createEngine();eng.setCode('TGT1');
const S=eng._S;
function mk(name,pid){const c={view:null};c.conn=eng.makeConn(d=>{if(d.t==='view')c.view=d.v;},()=>{});eng.accept(c.conn);c.send=d=>c.conn.emit('data',d);c.send({t:'hello',name,pid});return c;}
eng.create({n:3,minFan:1,level:2});
const A=mk('甲','pa'),B=mk('乙','pb');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
await wait(100);eng.start(A.conn);
for(let i=0;i<40&&!(A.view&&A.view.players[A.view.me].hand);i++)await wait(100);
const g=eng._g;   // 引擎內部函數(測試用)
assert(g,'engine should expose _g for tests');
const T=(o)=>g.fixTarget(o,[]);
const suitOf=t=>t<27?Math.floor(t/9):3;
// --- tgtLocks / fixTarget
let L=g.tgtLocks([{type:'chow',tiles:[10,11,12]},{type:'pung',tiles:[32,32,32]}]);
assert.deepStrictEqual([L.noPairs,L.suit,L.noAny,L.noPure,L.noHalf],[true,1,true,true,false]);
let f=g.fixTarget({shape:'pairs',color:'any',suit:0},[{type:'chow',tiles:[10,11,12]}]);
assert.deepStrictEqual([f.shape,f.color,f.suit],['free','half',1],'上過牌:冇對對糊,任色→混一色,跟返筒');
f=g.fixTarget({shape:'free',color:'pure',suit:2},[{type:'pung',tiles:[32,32,32]},{type:'pung',tiles:[9,9,9]}]);
assert.deepStrictEqual([f.color,f.suit],['half',1],'碰過字:清一色→混一色,花色跟返筒');
f=g.fixTarget({shape:'pairs',color:'pure',suit:2},[{type:'pung',tiles:[1,1,1]},{type:'pung',tiles:[10,10,10]}]);
assert.deepStrictEqual([f.shape,f.color],['pairs','any'],'碰咗兩種花色:只剩任色');
f=g.fixTarget({shape:'pairs',color:'pure',suit:0},[]);assert.deepStrictEqual([f.shape,f.color,f.suit],['pairs','pure',0],'對對糊 + 清一色·萬 可以');
// --- 打牌:所有範圍外嘅牌先打走;唔碰唔上
const mkP=(hand,melds=[])=>({hand:hand.slice(),melds,flowers:[],discards:[],level:2,human:true,wind:0,drawn:null});
let tg=T({shape:'free',color:'pure',suit:1});   // 清一色·筒
let p=mkP([0,1,2,9,10,11,12,13,14,15,27,28,29,30]);
for(let i=0;i<12;i++){const d=g.tgtDiscard(p,tg);assert(!(d>=9&&d<=17),'範圍外先打('+d+')');p.hand.splice(p.hand.indexOf(d),1);if(p.hand.filter(t=>t<9||t>17).length===0)break;}
assert.strictEqual(p.hand.filter(t=>t<9||t>17).length,0,'清一色·筒:萬同字全部打走');
// 混一色·筒:字牌留低
tg=T({shape:'free',color:'half',suit:1});
p=mkP([0,1,2,9,10,11,12,13,27,27,31,31,5,20]);
let d=g.tgtDiscard(p,tg);assert([0,1,2,5,20].includes(d),'混一色·筒:先打萬/索,唔打字牌');
// 碰 / 上 規則
const ask=(o)=>({kind:'claim',opts:Object.assign({chows:[],pung:false,kong:false,ev:null},o)});
tg=T({shape:'free',color:'pure',suit:1});
p=mkP([9,9,12,13,14,2,2,3,4,5,6,7,8]);
assert.strictEqual(g.tgtAnswer(p,ask({tile:2,pung:true}),tg).a,'pass','清一色·筒:唔碰萬子');
assert.strictEqual(g.tgtAnswer(p,ask({tile:9,pung:true}),tg).a,'pung','碰筒子');
assert.strictEqual(g.tgtAnswer(p,ask({tile:27,pung:true}),tg).a,'pass','清一色:唔碰字');
tg=T({shape:'free',color:'half',suit:1});
assert.strictEqual(g.tgtAnswer(mkP([27,27,9,10,12,13]),ask({tile:27,pung:true}),tg).a,'pung','混一色:碰字');
assert.strictEqual(g.tgtAnswer(mkP([27,27,9,10,12,13]),ask({tile:27,pung:true,kong:true}),tg).a,'kong');
// 對對糊:永遠唔上,碰任何色
tg=T({shape:'pairs',color:'any'});
p=mkP([1,2,10,10,11,11,20,20,21,22,5,5,30]);
assert.strictEqual(g.tgtAnswer(p,ask({tile:3,chows:[[1,2]]}),tg).a,'pass','對對糊:唔上');
assert.strictEqual(g.tgtAnswer(p,ask({tile:10,pung:true}),tg).a,'pung','對對糊:碰');
// 對對糊 + 清一色·萬:只碰萬
tg=T({shape:'pairs',color:'pure',suit:0});
assert.strictEqual(g.tgtAnswer(mkP([0,0,9,9,20,20,3,3,4]),ask({tile:9,pung:true}),tg).a,'pass');
assert.strictEqual(g.tgtAnswer(mkP([0,0,9,9,20,20,3,3,4]),ask({tile:0,pung:true}),tg).a,'pung');
// 上牌:要全部喺範圍入面,而且令向聽數下降
tg=T({shape:'free',color:'half',suit:1});
p=mkP([9,10,13,14,15,16,0,1,2,3,4,5,6]);
assert.strictEqual(g.tgtAnswer(p,ask({tile:11,chows:[[9,10]]}),tg).a,'chow','混一色·筒:上筒子');
assert.strictEqual(g.tgtAnswer(mkP([0,1,13,14,15,16,9,9,10,11,12,5,6]),ask({tile:2,chows:[[0,1]]}),tg).a,'pass','混一色·筒:唔上萬');
// 進階微調:留 off → 上/碰自動唔得;唔留嘅牌優先打走
tg=g.fixTarget({shape:'free',color:'half',suit:1,adv:{31:{k:false},27:{p:false}}},[]);
assert.strictEqual(g.tgtKeep(tg,31),false);assert.strictEqual(g.tgtPung(tg,31),false,'留 off → 碰 off');
assert.strictEqual(g.tgtPung(tg,27),false);assert.strictEqual(g.tgtKeep(tg,27),true);assert.strictEqual(g.tgtPung(tg,28),true);
assert.strictEqual(g.tgtDiscard(mkP([31,9,10,11,12,13,14,15,16,17,27,28,29,30]),tg),31,'唔留中 → 先打中');
// 糊牌:只食符合目標嘅牌型
const ev=(...names)=>({fan:5,items:names.map(n=>[n,3])});
tg=T({shape:'free',color:'half',suit:1,strict:true});
const hu=mkP([9,10,11,12,13,14,15,16,17,27,27,27,31],[]);
assert.strictEqual(g.tgtWinOK(hu,tg,ev('混一色'),31),true);
assert.strictEqual(g.tgtWinOK(mkP([0,1,2,3,4,5,6,7,8,9,10,11,12]),tg,ev('清一色'),12),false,'目標筒,糊萬子清一色 → 唔食');
tg=T({shape:'pairs',color:'any',strict:true});
assert.strictEqual(g.tgtWinOK(hu,tg,ev('混一色'),31),false,'目標對對糊,糊平糊/混一色 → 唔食');
assert.strictEqual(g.tgtWinOK(hu,tg,ev('對對糊'),31),true);
tg=T({shape:'pairs',color:'any',strict:false});
assert.strictEqual(g.tgtWinOK(hu,tg,ev('混一色'),31),true,'strict 關咗 → 乜都食');
// --- 實戰:甲 開代打(混一色·筒):每手牌入面,範圍外嘅牌只減唔加;上碰全部喺範圍入面
const tgt={shape:'free',color:'half',suit:1,strict:true,warn:true};
A.send({t:'proxy',on:true,tgt});B.send({t:'proxy',on:true});
const seatA=A.view.me;
const oor=pl=>pl.hand.concat(...pl.melds.map(m=>m.tiles)).filter(t=>t<34&&suitOf(t)!==1&&t<27).length;
let hn=-1,last=99,seen=0;
for(let i=0;i<180;i++){
  await wait(100);
  const me=S.players[seatA];if(!me||!S.running)continue;
  if(S.handNo!==hn){hn=S.handNo;last=99;}
  const a=S.asks[seatA];
  if(S.over)continue;
  const o=oor(me);
  if(me.hand.length%3===1||me.hand.length%3===2){assert(o<=last+1,'範圍外嘅牌唔會愈打愈多('+o+' vs '+last+')');last=Math.min(last,o);seen++;}
  me.melds.forEach(m=>assert(m.type!=='chow'||m.tiles.every(t=>t>=9&&t<18),'上牌都係筒子'));
  me.melds.forEach(m=>assert(m.tiles.every(t=>t>=27||(t>=9&&t<18)),'碰上只限筒子同字牌'));
}
assert(S.players[seatA].proxy&&S.players[seatA].tgt.color==='half','目標有存低');
assert(seen>10,'有跑');
console.log('target OK');
process.exit(0);
