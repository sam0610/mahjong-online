const URL_='ws://127.0.0.1:8787/room/';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function cli(code,name,pid,create){
  const c={name,pid,view:null,lobby:null,msgs:[],closed:false};
  c.ws=new WebSocket(URL_+code,{headers:{Origin:'http://localhost:8787'}});
  c.ws.onopen=()=>c.send({t:'hello',name,pid,create:!!create,cfg:create?{n:3,minFan:1,level:2}:undefined});
  c.ws.onmessage=e=>{const d=JSON.parse(e.data);c.msgs.push(d.t);if(d.t==='view')c.view=d.v;if(d.t==='lobby')c.lobby=d;};
  c.ws.onclose=()=>{c.closed=true;};
  c.send=d=>c.ws.send(JSON.stringify(d));
  return c;
}
const code='T'+Math.random().toString(36).slice(2,6).toUpperCase();
const A=cli(code,'甲','pa',true); await sleep(500);
const B=cli(code,'乙','pb'); await sleep(500);
console.log('lobby',A.lobby&&A.lobby.players,'ownerA',A.lobby.owner,'ownerB',B.lobby.owner);
const X=cli(code,'丙','px',true); await sleep(400);
console.log('create dup ->',X.msgs,'closed',X.closed);
const N=cli('ZZZZZ','路','pn'); await sleep(400);
console.log('no such room ->',N.msgs,'closed',N.closed);
B.send({t:'start'}); await sleep(300); console.log('B start -> view?',!!B.view);
A.send({t:'start'}); await sleep(500); console.log('A start -> view me',A.view&&A.view.me,'B me',B.view&&B.view.me);
A.send({t:'proxy',on:true});B.send({t:'proxy',on:true});
await sleep(8000);
console.log('playing: discards',A.view.players.map(p=>p.discards.length),'cur',A.view.cur);
// A drops, B drops -> paused; A returns
A.ws.close();B.ws.close(); await sleep(1500);
const A2=cli(code,'甲','pa'); await sleep(1500);
console.log('A2 back, seat',A2.view&&A2.view.me,'msgs',A2.msgs.slice(0,3),'players',A2.view&&A2.view.players.map(p=>p.name));
A2.send({t:'proxy',on:true}); await sleep(4000);
console.log('after return progress cur',A2.view.cur,'discards',A2.view.players.map(p=>p.discards.length));
process.exit(0);
