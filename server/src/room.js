import {createEngine} from './engine.gen.js';
const TTL=12*3600*1000;           // 牌局存檔保留 12 小時
const SAVE_MS=3000;               // 存檔最多每 3 秒寫一次(免費額度友善)

export class Room{
  constructor(state,env){
    this.state=state;this.env=env;
    this.eng=createEngine();
    this.socks=new Map();          // ws -> {conn,last}
    this.pending=null;this.saveT=null;this.pingT=null;
    this.eng.onPersist((snap,now)=>this.persist(snap,now));
    state.blockConcurrencyWhile(async()=>{
      const snap=await state.storage.get('snap');
      if(snap&&Date.now()-snap.ts<TTL)this.eng.restore(snap);
    });
  }
  persist(snap,now){
    this.pending=snap;
    if(now){this.flush();return;}
    if(!this.saveT)this.saveT=setTimeout(()=>this.flush(),SAVE_MS);
  }
  async flush(){
    clearTimeout(this.saveT);this.saveT=null;
    const s=this.pending;if(!s)return;this.pending=null;
    try{await this.state.storage.put('snap',s);await this.state.storage.setAlarm(Date.now()+TTL);}catch(e){console.error('save',e);}
  }
  async alarm(){
    if(this.socks.size)return;
    await this.state.storage.deleteAll();
    this.eng=createEngine();
    this.eng.onPersist((snap,now)=>this.persist(snap,now));
  }
  ensurePing(){
    if(this.pingT)return;
    this.pingT=setInterval(()=>{
      const now=Date.now();
      for(const [ws,o] of this.socks){
        if(now-o.last>60000){o.conn.remoteClose();try{ws.close(1001,'timeout');}catch(e){}this.socks.delete(ws);continue;}
        try{ws.send('{"t":"ping"}');}catch(e){}
      }
      if(!this.socks.size){clearInterval(this.pingT);this.pingT=null;}
    },10000);
  }
  async fetch(req){
    if(req.headers.get('Upgrade')!=='websocket')return new Response('websocket only',{status:426});
    const code=new URL(req.url).pathname.split('/').pop().toUpperCase();
    this.eng.setCode(code);
    const pair=new WebSocketPair();
    const client=pair[0],server=pair[1];
    server.accept();
    this.attach(server);
    return new Response(null,{status:101,webSocket:client});
  }
  attach(ws){
    const eng=this.eng;
    const sendRaw=d=>{try{ws.send(JSON.stringify(d));}catch(e){}};
    const conn=eng.makeConn(sendRaw,()=>{try{ws.close(1000,'bye');}catch(e){}});
    const rec={conn,last:Date.now()};
    this.socks.set(ws,rec);this.ensurePing();
    let accepted=false;
    ws.addEventListener('message',ev=>{
      let d;try{d=JSON.parse(ev.data);}catch(e){return;}
      if(!d||typeof d.t!=='string')return;
      rec.last=Date.now();
      if(!accepted){
        if(d.t!=='hello')return;
        const pid=String(d.pid||'').slice(0,24);
        if(d.create){
          if(!eng.create(d.cfg)&&!eng.hasPid(pid)){sendRaw({t:'taken'});try{ws.close(1000,'taken');}catch(e){}return;}
        }else if(!eng.exists()){sendRaw({t:'none'});try{ws.close(1000,'none');}catch(e){}return;}
        eng.accept(conn);accepted=true;
      }
      if(d.t==='start'){
        const ns=this.env.NAMES;
        (ns?ns.get(ns.idFromName('global')).fetch('https://names/names').then(x=>x.json()).then(j=>j.names):Promise.resolve(null))
          .catch(()=>null).then(names=>{eng.start(conn,names);});
        return;
      }
      if(d.t==='ping'||d.t==='pong'){return;}
      conn.emit('data',d);
    });
    const gone=()=>{this.socks.delete(ws);conn.remoteClose();};
    ws.addEventListener('close',gone);
    ws.addEventListener('error',gone);
  }
}
