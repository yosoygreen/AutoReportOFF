const fs=require('fs'),path=require('path'),Z=require('jszip'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist');fs.mkdirSync(out,{recursive:true});const z=new Z(),prefix='Autoreporte Offline/';
function add(rel){const p=path.join(root,rel);if(fs.statSync(p).isDirectory()){for(const name of fs.readdirSync(p))add(path.join(rel,name));}else z.file(prefix+rel.replaceAll('\\','/'),fs.readFileSync(p));}
for(const rel of ['index.html','ABRIR Autoreporte Offline.bat','README.md','LICENSE','package.json','package-lock.json','src','vendor','docs','tests','tools','examples'])add(rel);
(async()=>{const buf=await z.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:9}});const name='Autoreporte_Offline_1.0.zip';fs.writeFileSync(path.join(out,name),buf);fs.writeFileSync(path.join(out,'SHA256SUMS.txt'),crypto.createHash('sha256').update(buf).digest('hex')+'  '+name+'\n');console.log(name,buf.length,'bytes');})();
