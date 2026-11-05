(function(root){'use strict';
const A=root.AR;
function workbook(buffer){return XLSX.read(buffer,{type:'array',cellDates:false});}
function rows(w,name){if(!w.Sheets[name])throw Error(`Falta la hoja «${name}»`);return XLSX.utils.sheet_to_json(w.Sheets[name],{header:1,defval:null,raw:true});}
function csv(text){const p=Papa.parse(text.replace(/^\uFEFF/,''),{header:true,skipEmptyLines:'greedy',transformHeader:h=>h.trim()});if(p.errors.length)throw Error('CSV: '+p.errors.slice(0,3).map(e=>`fila ${e.row??'?'}: ${e.message}`).join('; '));return {rows:p.data,fields:p.meta.fields||[]};}
async function readText(file){let buf=await file.arrayBuffer(),s=new TextDecoder('utf-8').decode(buf);if(s.includes('\ufffd'))s=new TextDecoder('windows-1252').decode(buf);return s;}
async function gtfs(buffer){const z=await JSZip.loadAsync(buffer);const read=async name=>{const f=Object.values(z.files).find(f=>f.name.split('/').pop()===name);if(!f)throw Error('GTFS: falta '+name);return csv(await f.async('string')).rows;};
 const [shapes,trips,routes]=await Promise.all([read('shapes.txt'),read('trips.txt'),read('routes.txt')]);const shapeMap=new Map();
 for(const r of shapes){const lat=A.number(r.shape_pt_lat),lon=A.number(r.shape_pt_lon);if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)continue;const id=r.shape_id;if(!shapeMap.has(id))shapeMap.set(id,[]);shapeMap.get(id).push({lat,lon,seq:A.number(r.shape_pt_sequence)});}
 for(const l of shapeMap.values())l.sort((a,b)=>a.seq-b.seq);
 const rm=new Map(routes.map(r=>[r.route_id,r]));const options=[],seen=new Set();
 for(const t of trips){const rt=rm.get(t.route_id),line=shapeMap.get(t.shape_id);if(!rt||!line||line.length<2)continue;const id=[t.route_id,t.direction_id,t.shape_id].join('|');if(seen.has(id))continue;seen.add(id);options.push({id,route:t.route_id,short:rt.route_short_name||t.route_id,direction:t.direction_id,shape:t.shape_id,headsign:t.trip_headsign||'',line});}
 if(!options.length)throw Error('GTFS sin trazados utilizables');
 let stops=[];try{stops=(await read('stops.txt')).map(s=>({lat:A.number(s.stop_lat),lon:A.number(s.stop_lon)})).filter(s=>Number.isFinite(s.lat)&&Number.isFinite(s.lon));}catch{}
 return {options,stops};
}
function refs(data,m){const out=[],errors=[];for(let i=0;i<data.length;i++){const r=data[i];let day=A.date(r[m.day]),period=A.number(r[m.period]),po=A.number(r[m.po]);const c={day,unit:A.norm(r[m.unit]),service:A.service(r[m.service]),dir:A.norm(r[m.dir]),period,po};if(!Number.isFinite(day)||!['U8','U9'].includes(c.unit)||!['IDA','REGRESO'].includes(c.dir)||!Number.isInteger(period)||period<1||period>24||!(po>0)){errors.push(i+2);continue;}c.key=A.key(c);if(out.some(x=>x.key===c.key))throw Error('Anexo 3: referencias duplicadas para una misma clave; filtra el archivo antes de cargarlo');out.push(c);}if(!out.length)throw Error('Anexo 3 sin referencias válidas');return {refs:out,errors};}
async function exportExcel(buffer,cases,map){
 const z=await JSZip.loadAsync(buffer);const parse=s=>new DOMParser().parseFromString(s,'application/xml');const w=parse(await z.file('xl/workbook.xml').async('string')),rel=parse(await z.file('xl/_rels/workbook.xml.rels').async('string'));
 const sheet=Array.from(w.getElementsByTagNameNS('*','sheet')).find(n=>n.getAttribute('name')==='SSPD');if(!sheet)throw Error('No existe SSPD');const id=sheet.getAttribute('r:id')||sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');const target=Array.from(rel.getElementsByTagNameNS('*','Relationship')).find(n=>n.getAttribute('Id')===id)?.getAttribute('Target');if(!target)throw Error('Relación SSPD no encontrada');const path=target.startsWith('/')?target.slice(1):'xl/'+target.replace(/^\.\//,'');const doc=parse(await z.file(path).async('string')),ns=doc.documentElement.namespaceURI;
 if(doc.getElementsByTagName('parsererror').length)throw Error('XML SSPD inválido');
 for(const c of cases){const vals=A.result(c);if(!vals)continue;let row=Array.from(doc.getElementsByTagNameNS('*','row')).find(n=>+n.getAttribute('r')===c.row);if(!row)throw Error('Fila SSPD no encontrada: '+c.row);
 A.OUTPUT.forEach((h,j)=>{const col=map[A.norm(h)],addr=XLSX.utils.encode_cell({r:c.row-1,c:col});let cell=Array.from(row.children).find(n=>n.localName==='c'&&n.getAttribute('r')===addr);if(!cell){cell=doc.createElementNS(ns,'c');cell.setAttribute('r',addr);const next=Array.from(row.children).find(n=>n.localName==='c'&&XLSX.utils.decode_cell(n.getAttribute('r')).c>col);row.insertBefore(cell,next||null);}while(cell.firstChild)cell.removeChild(cell.firstChild);cell.setAttribute('t','inlineStr');const is=doc.createElementNS(ns,'is'),t=doc.createElementNS(ns,'t');t.textContent=vals[j];t.setAttributeNS('http://www.w3.org/XML/1998/namespace','xml:space','preserve');is.append(t);cell.append(is);});
 }
 z.file(path,new XMLSerializer().serializeToString(doc),{createFolders:false});return z.generateAsync({type:'blob',compression:'DEFLATE'});
}
function download(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),10000);}
root.IO={workbook,rows,csv,readText,gtfs,refs,exportExcel,download};
})(window);
