// 封頂選項同無上限:計番、賠率延伸、滿貫牌底番
import {createEngine} from '../src/engine.gen.js';
import assert from 'node:assert';
const eng=createEngine();const S=eng._S;
// 牌 id:萬0-8 筒9-17 索18-26 東27 南28 西29 北30 中31 發32 白33 花34-41
const P=(hand,o={})=>({hand,melds:o.melds||[],flowers:o.flowers||[],wind:o.wind??0,drawn:null,name:'x'});
const pung=(t,concealed=true)=>({type:'pung',tiles:[t,t,t],concealed});
const ev=(p,ctx={})=>eng._eval(p,Object.assign({self:false,round:0,last:false},ctx));
const items=e=>e.items.map(x=>x[0]+x[1]).join(' ');

// 賠率
assert.deepStrictEqual([8,9,10,11,12,13,14].map(f=>eng._pay(f,false)),[128,192,256,384,512,768,1024]);
assert.deepStrictEqual([7,8,9,10,13].map(f=>eng._pay(f,true)),[48,64,96,128,384]);
assert.strictEqual(eng._pay(3,false),16);assert.strictEqual(eng._pay(3,true),8);

// 清一色 + 對對糊(萬子),自摸、門前清、無花
const qing=()=>P([0,0,0,1,1,1,2,2,2,3,3,3,4,4]);
for(const [cap,want] of [[8,8],[10,10],[13,13],[0,13]]){
  S.cap=cap;const e=ev(qing(),{self:true});
  assert.strictEqual(e.fan,want,'清一色對對糊自摸門前清無花 cap='+cap+' '+items(e));
}
S.cap=0;assert.strictEqual(ev(qing(),{self:false}).fan,12);   // 食糊:冇自摸 → 7+3+1+1=12

// 滿貫牌:封頂模式等於封頂數;無上限有底番加疊
const zi=()=>P([27,27,27,28,28,28,29,29,29,31,31,31,33,33]);   // 字一色
S.cap=8;let e=ev(zi(),{self:true});assert(e.limit&&e.fan===8);
S.cap=13;e=ev(zi(),{self:true});assert(e.limit&&e.fan===13);
S.cap=0;e=ev(zi(),{self:true});
assert(!e.limit&&e.fan===15,'字一色10+自摸+門前+圈風+門風+無花 '+items(e));

// 大三元 + 對對糊 + 混一色 + 自摸 + 門前清 + 無花 = 17(大三元唔係滿貫牌,照疊)
const dsy=()=>P([31,31,31,32,32,32,33,33,33,0,0,0,1,1]);
S.cap=0;e=ev(dsy(),{self:true});assert.strictEqual(e.fan,17,items(e));assert.strictEqual(eng._pay(e.fan,false),3072);
S.cap=8;assert.strictEqual(ev(dsy(),{self:true}).fan,8);
// 十三么
const sss=()=>P([0,8,9,17,18,26,27,28,29,30,31,32,33,0]);
S.cap=0;e=ev(sss(),{self:true});assert.strictEqual(e.fan,15,items(e));
e=ev(sss(),{self:false});assert.strictEqual(e.fan,14,items(e));
S.cap=10;e=ev(sss(),{self:true});assert(e.limit&&e.fan===10);
// 天糊:唔疊自摸、門前清
S.cap=0;e=ev(qing(),{self:true,heaven:true});assert.strictEqual(e.fan,14,items(e));assert(!/自摸|門前清/.test(items(e)));
// 大四喜:13 + 自摸 + 門前清 + 無花,唔疊風牌番,字一色唔疊
const dsx=()=>P([27,27,27,28,28,28,29,29,29,30,30,30,0,0]);
S.cap=0;e=ev(dsx(),{self:true});assert.strictEqual(e.fan,16,items(e));assert(!/圈風|門風/.test(items(e)));
const dsx2=()=>P([27,27,27,28,28,28,29,29,29,30,30,30,31,31]);
e=ev(dsx2(),{self:true});assert.strictEqual(e.fan,16,items(e));assert(/大四喜/.test(items(e))&&!/字一色/.test(items(e)),'同時成立只取最高');
// 十八羅漢
const kong=t=>({type:'kong',tiles:[t,t,t,t],concealed:true});
const lh=()=>P([5,5],{melds:[kong(0),kong(1),kong(2),kong(3)]});
S.cap=0;e=ev(lh(),{self:true});assert.strictEqual(e.fan,16,items(e));
S.cap=13;assert.strictEqual(ev(lh(),{self:true}).fan,13);
// 八仙過海:牌型照疊,唔計花番
const all8=[34,35,36,37,38,39,40,41];
S.cap=0;e=ev(P([0,0,0,1,1,1,2,2,2,3,3,3,4,4],{flowers:all8}),{self:false});
assert.strictEqual(e.fan,10+1+3+7,items(e));assert(!/花/.test(items(e)));
S.cap=8;e=ev(P([0,0,0,1,1,1,2,2,2,3,3,3,4,4],{flowers:all8}),{self:false});assert(e.limit&&e.fan===8);
// 普通牌:封頂之下唔變,無上限唔封
S.cap=8;e=ev(P([0,1,2,3,4,5,6,7,8,9,10,11,12,12]),{self:true});assert(e.fan<=8);

// 房間設定:cap 經 create → 開局 → view 同存檔
const st=globalThis.setTimeout;globalThis.setTimeout=(f,ms,...a)=>st(f,(ms||0)/200,...a);
const sleep=ms=>new Promise(r=>st(r,ms));
for(const [cfg,want] of [[0,0],[13,13],[undefined,8],[7,8]]){
  const e2=createEngine();e2.setCode('CAP'+want);
  assert(e2.create({n:4,minFan:1,cap:cfg,level:2}),'create');
  const c={view:null};c.conn=e2.makeConn(d=>{if(d.t==='view')c.view=d.v;},()=>{});e2.accept(c.conn);c.conn.emit('data',{t:'hello',name:'甲',pid:'pa'});
  await sleep(30);e2.start(c.conn);await sleep(80);
  assert.strictEqual(e2._S.cap,want,'S.cap '+cfg);assert.strictEqual(c.view.cap,want,'view.cap '+cfg);
}
console.log('cap OK');process.exit(0);
