// 由 ../index.html 抽出牌局引擎(標記 /*@engine:begin ...*/ 到 /*@engine:end*/),加上伺服器接口,生成 src/engine.gen.js
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const html=fs.readFileSync(path.join(here,'..','index.html'),'utf8');
const re=/\/\*@engine:begin[^*]*\*\/([\s\S]*?)\/\*@engine:end\*\//g;
let m,blocks=[];
while((m=re.exec(html)))blocks.push(m[1]);
if(blocks.length<6)throw new Error('抽出嘅引擎區塊太少:'+blocks.length);
const glue=fs.readFileSync(path.join(here,'src','glue.js'),'utf8');
const out='// 自動生成,唔好手改:node build.mjs\n'+
'export function createEngine(){\n"use strict";\nvar window,document,localStorage,navigator,location;\n'+
blocks.join('\n')+'\n/* ---- server glue ---- */\n'+glue+'\n}\n';
fs.writeFileSync(path.join(here,'src','engine.gen.js'),out);
console.log('engine.gen.js',out.length,'bytes from',blocks.length,'blocks');
