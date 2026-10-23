import {createEngine} from '../src/engine.gen.js';
const log=(...a)=>console.log(...a);
const eng=createEngine();
let snaps=0,lastP=null;
eng.onPersist((s,now)=>{snaps++;lastP=s;});
eng.setCode('TEST1');
function mkClient(name,pid){
  const c={name,pid,msgs:[],view:null,lobby:null,closed:false};
  c.conn=eng.makeConn(d=>{c.msgs.push(d);if(d.t==='view')c.view=d.v;if(d.t==='lobby')c.lobby=d;},()=>{c.closed=true;});
  eng.accept(c.conn);
  c.send=(d)=>c.conn.emit('data',d);
  c.hello=()=>c.send({t:'hello',name,pid});
  return c;
}
console.assert(eng.create({n:3,minFan:1,level:2}),'create');
const A=mkClient('甲','pa'),B=mkClient('乙','pb');
A.hello();B.hello();
await new Promise(r=>setTimeout(r,100));
log('lobby A',A.lobby&&A.lobby.players,A.lobby&&A.lobby.owner,'B owner',B.lobby&&B.lobby.owner);
log('start by B (should be false)',eng.start(B.conn));
log('start by A',eng.start(A.conn));
// both humans go full auto proxy
A.send({t:'proxy',on:true});B.send({t:'proxy',on:true});
for(let i=0;i<10;i++){
  await new Promise(r=>setTimeout(r,500));
  if(i%3===0)log(i,JSON.stringify(eng.info()),'A seat',A.view&&A.view.me,'cur',A.view&&A.view.cur,'discards',A.view&&A.view.players.map(p=>p.discards.length));
}
// everyone leaves -> pause
A.conn.remoteClose();B.conn.remoteClose();
await new Promise(r=>setTimeout(r,300));
log('after leave',JSON.stringify(eng.info()),'snaps',snaps);
const h1=eng.info().hand;
await new Promise(r=>setTimeout(r,1500));
log('still paused (no progress)',JSON.stringify(eng.info()),'hand same?',h1===eng.info().hand);
// A returns
const A2=mkClient('甲','pa');A2.hello();
await new Promise(r=>setTimeout(r,200));
log('A2 view me',A2.view&&A2.view.me,'name',A2.view&&A2.view.players[A2.view.me].name);
A2.send({t:'proxy',on:true});
await new Promise(r=>setTimeout(r,2500));
log('after return',JSON.stringify(eng.info()));
// stranger
const X=mkClient('丙','px');X.hello();await new Promise(r=>setTimeout(r,100));
log('stranger msgs',X.msgs.map(m=>m.t+(m.msg?':'+m.msg:'')));
process.exit(0);
