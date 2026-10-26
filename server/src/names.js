const DEFAULTS=["食糊黃", "鄧俄林壯", "戴對對", "詐糊查", "街市阿岑", "放槍大王", "麻雀龔", "偷雞盧", "牌神EASON", "十三IU", "三番市", "四筒發達", "大牌檔", "拆牌專家", "SMALL黃", "一索得藍", "青衣色", "字魔是我", "大山園", "山缺一哥", "食葫蘆", "最愛碰碰車", "洗白白", "一世書家", "營家之主", "雀神", "麻雀公爵", "雞鴨湖", "門前青草地", "親一色", "亂打一TONE", "三番都唔夠", "無PIE用", "運財童子", "九萬李", "清一色雞糊", "紅鍾", "成地雀仔"];
const PW_HASH='3dae35a974004d9515fef8861fab0acb4d8774bfdf5b1fa29e9f0e27c0ed4b23';   // 還原用密碼嘅 SHA-256
const MAX=100,MIN=10,KEEP=100;
const J=(o,st)=>new Response(JSON.stringify(o),{status:st||200,headers:{'content-type':'application/json'}});
async function sha(s){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(s)));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');}
function clean(x){x=String(x==null?'':x).replace(/[\u0000-\u001f<>]/g,'').trim();return [...x].length>=1&&[...x].length<=8?x:'';}

/* 全站共用嘅電腦玩家名單(單一個 Durable Object) */
export class Names{
  constructor(state){this.state=state;this.rate=new Map();}
  async load(){let n=await this.state.storage.get('names');if(!n){n=DEFAULTS.slice();await this.state.storage.put('names',n);}return n;}
  limited(ip,key,max){
    const now=Date.now(),k=ip+key,a=(this.rate.get(k)||[]).filter(t=>now-t<60000);
    if(a.length>=max){this.rate.set(k,a);return true;}
    a.push(now);this.rate.set(k,a);
    if(this.rate.size>2000)this.rate.clear();
    return false;
  }
  async fetch(req){
    const ip=req.headers.get('CF-Connecting-IP')||'';
    let names=await this.load();
    if(req.method==='GET')return J({names,canUndo:((await this.state.storage.get('log'))||[]).length>0});
    let d;try{d=await req.json();}catch(e){return J({err:'格式錯'},400);}
    const op=d&&d.op;
    if(op==='undo'||op==='reset'){
      if(this.limited(ip,'pw',6))return J({err:'試太多次,等一分鐘'},429);
      if(await sha(d.pw)!==PW_HASH)return J({err:'密碼錯'},403);
    }else if(this.limited(ip,'op',30))return J({err:'改得太密,等一陣'},429);
    let log=(await this.state.storage.get('log'))||[];
    const before=names.slice();
    let err='';
    if(op==='add'){
      const n=clean(d.name);
      if(!n)err='名要 1–8 個字';else if(names.includes(n))err='已經有呢個名';else if(names.length>=MAX)err='名單滿咗(最多 '+MAX+' 個)';else names.push(n);
    }else if(op==='rename'){
      const i=names.indexOf(d.from),n=clean(d.to);
      if(i<0)err='搵唔到原本個名';else if(!n)err='名要 1–8 個字';else if(n!==d.from&&names.includes(n))err='已經有呢個名';else names[i]=n;
    }else if(op==='del'){
      const i=names.indexOf(d.name);
      if(i<0)err='搵唔到個名';else if(names.length<=MIN)err='名單最少要保留 '+MIN+' 個';else names.splice(i,1);
    }else if(op==='undo'){
      const e=log.pop();if(!e)err='冇可以撤銷嘅改動';else{names=e.before;await this.state.storage.put('log',log);await this.state.storage.put('names',names);return J({names,canUndo:log.length>0});}
    }else if(op==='reset'){names=DEFAULTS.slice();}
    else err='未支援';
    if(err)return J({err,names:before},400);
    log.push({t:Date.now(),op,name:d.name||d.from||'',to:d.to||'',before});
    if(log.length>KEEP)log=log.slice(-KEEP);
    await this.state.storage.put('names',names);await this.state.storage.put('log',log);
    return J({names,canUndo:true});
  }
}
