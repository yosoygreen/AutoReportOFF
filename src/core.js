/* Autoreporte Offline — lógica compartida navegador / pruebas Node. */
(function(root){
'use strict';
const DAY=86400, norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase().replace(/\s+/g,' ');
const plate=v=>norm(v).replace(/[^A-Z0-9]/g,''), service=v=>norm(v).replace(/\.0$/,'');
function number(v){if(v===null||v===undefined||String(v).trim()==='')return NaN;return Number(String(v).replace(',','.'));}
function date(v){
 if(typeof v==='number')return Math.floor(v-25569)*DAY;
 if(v instanceof Date)return Date.UTC(v.getUTCFullYear(),v.getUTCMonth(),v.getUTCDate())/1000;
 let s=String(v??'').trim(),m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return validDate(+m[1],+m[2],+m[3]);
 m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);return m?validDate(+m[3],+m[2],+m[1]):NaN;
}
function validDate(y,m,d){let t=Date.UTC(y,m-1,d)/1000,x=new Date(t*1000);return x.getUTCMonth()===m-1&&x.getUTCDate()===d?t:NaN;}
function clock(v){if(typeof v==='number')return Math.round((v%1)*DAY);let m=String(v??'').match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);return m&&+m[1]<24&&+m[2]<60&&+(m[3]||0)<60?+m[1]*3600 + +m[2]*60 + +(m[3]||0):NaN;}
function stamp(t){if(!Number.isFinite(t))return '—';return new Date(t*1000).toISOString().slice(0,19).replace('T',' ');}
function hms(t){return stamp(t).slice(-8);}
function timestamp(v,day,mode='local'){
 const s=String(v??'').trim();
 if(/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)){
  const t=Date.parse(s);if(!Number.isFinite(t))return NaN;
  const parts=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date(t));
  return date(parts)+clock(parts.slice(-8));
 }
 if(mode==='utc'){
  const d=Number.isFinite(date(s))?date(s):day, tm=s.includes(' ')?s.split(' ').pop():s.includes('T')?s.split('T').pop():s;
  return timestamp(stamp(d+clock(tm)).replace(' ','T')+'Z',day);
 }
 const d=Number.isFinite(date(s))?date(s):day,tm=s.includes('T')?s.split('T').pop():s.includes(' ')?s.split(' ').pop():s;
 return d+clock(tm);
}
function headers(rows,required){let i=rows.findIndex(r=>required.every(h=>r.some(c=>norm(c)===norm(h))));if(i<0)throw Error('No se encuentran columnas: '+required.join(', '));return {index:i,map:Object.fromEntries(rows[i].map((h,j)=>[norm(h),j]))};}
function offline(rows,source){
 const {index,map}=headers(rows,['UN','Servicio','Patente','Sentido','Inicio','Fin','Estado','Fecha','Velocidad (Km/hr)']);
 const trips=[],issues=[],stats={ok:0,nok:0,otherState:0,otherUnit:0,invalid:0};
 for(let i=index+1;i<rows.length;i++){
  const r=rows[i];if(!r.some(v=>v!==null&&v!==''&&v!==undefined))continue;
  const get=h=>r[map[norm(h)]],unit=norm(get('UN')),state=norm(get('Estado'));
  if(!['U8','U9'].includes(unit)){stats.otherUnit++;continue;}
  if(state!=='OK'){state==='NOK'?stats.nok++:stats.otherState++;continue;}
  const day=date(get('Fecha')),start=day+clock(get('Inicio'));let end=day+clock(get('Fin'));if(end<start)end+=DAY;
  const speed=number(get('Velocidad (Km/hr)')),ppu=plate(get('Patente')),svc=service(get('Servicio')),dir=norm(get('Sentido'));
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||!Number.isFinite(speed)||speed<=0||!ppu||!svc||!['IDA','REGRESO'].includes(dir)){
   stats.invalid++;issues.push({row:i+1,reason:'Fecha, horario, sentido, patente o velocidad inválidos'});continue;
  }
  const t={day,unit,service:svc,dir,start,end,speed,ppu,plate:String(get('Patente')),period:Math.floor((start-day)/3600)+1,source,row:i+1};
  t.key=key(t);t.id=[t.key,ppu,start,end,speed].join('|');trips.push(t);stats.ok++;
 }
 return {trips,issues,stats};
}
const key=t=>[t.day,t.unit,t.service,t.dir,t.period].join('|');
const OUTPUT=['¿Buses desvían? (Si / No)','PPU','Calle o Intersección con reducción de velocidad','Observación y hora de reducción de velocidad'];
function sspd(rows){const {index,map}=headers(rows,['Fecha','UN','Servicio A4','Sentido','Periodo',...OUTPUT]);const cases=[];
 for(let i=index+1;i<rows.length;i++){const r=rows[i],get=h=>r[map[norm(h)]],unit=norm(get('UN'));if(!['U8','U9'].includes(unit))continue;
 const c={row:i+1,day:date(get('Fecha')),unit,service:service(get('Servicio A4')),dir:norm(get('Sentido')),period:number(get('Periodo')),po:number(get('Vel PO')),old:OUTPUT.map(get),synoptic:String(get('Servicio Sinóptico')||'')};c.key=key(c);c.invalid=!Number.isFinite(c.day)||!c.service||!['IDA','REGRESO'].includes(c.dir)||!Number.isInteger(c.period)||c.period<1||c.period>24;cases.push(c);}
 return {cases,map,index};
}
function choose(c,trips,refs=[]){
 const candidates=trips.filter(t=>t.key===c.key);const reference=refs.find(r=>r.key===c.key);const po=reference?.po>0?reference.po:c.po>0?c.po:null;
 candidates.sort((a,b)=>a.speed-b.speed||a.start-b.start||a.ppu.localeCompare(b.ppu)||a.end-b.end||a.id.localeCompare(b.id));
 return {...c,trip:candidates[0]||null,count:candidates.length,po,poSource:reference?.po>0?'Anexo 3':po?'Vel PO de SSPD':'Sin referencia PO',reduction:po&&candidates.length?1-candidates[0].speed/po:null,decision:null,trace:null,event:null,events:[]};
}
function hav(a,b){const r=Math.PI/180,dl=(b.lat-a.lat)*r,dn=(b.lon-a.lon)*r;return 6371000*2*Math.asin(Math.min(1,Math.sqrt(Math.sin(dl/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dn/2)**2)));}
function distance(p,line){let best=Infinity;const kx=111320*Math.cos(p.lat*Math.PI/180),ky=111320;for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i],x=(a.lon-p.lon)*kx,y=(a.lat-p.lat)*ky,dx=(b.lon-a.lon)*kx,dy=(b.lat-a.lat)*ky;const u=Math.max(0,Math.min(1,-(x*dx+y*dy)/(dx*dx+dy*dy||1)));best=Math.min(best,Math.hypot(x+u*dx,y+u*dy));}return best;}
const aliases={lat:['LATITUD','LATITUDE','LAT'],lon:['LONGITUD','LONGITUDE','LON','LNG'],time:['FECHA GPS','TIMESTAMP','FECHA HORA','DATETIME','HORA','TIME'],date:['FECHA','DATE'],ppu:['PATENTE','PPU','PLATE','BUS'],speed:['VELOCIDAD','SPEED','VELOCIDAD (KM/HR)']};
function mapping(fields){return Object.fromEntries(Object.entries(aliases).map(([k,list])=>[k,fields.find(f=>list.includes(norm(f)))||'']));}
function trace(rows,m,c,options={}){
 if(!c.trip)throw Error('El caso no tiene viaje seleccionado');
 if(!m.lat||!m.lon||!m.time)throw Error('Asigna latitud, longitud y fecha/hora');
 if(!m.ppu&&!options.associate)throw Error('Confirma la asociación explícita del CSV sin patente');
 let pts=[],invalid=0,foreign=0,outside=0;const trip=c.trip;
 for(const r of rows){if(m.ppu&&plate(r[m.ppu])!==trip.ppu){foreign++;continue;}
  const lat=number(r[m.lat]),lon=number(r[m.lon]);let ts=timestamp((m.date?r[m.date]+' ':'')+r[m.time],trip.day,options.timezone);
  // Sólo las columnas con hora sin fecha pueden continuar al día siguiente.
  if(!m.date&&!Number.isFinite(date(r[m.time]))&&trip.end>=trip.day+DAY&&ts<trip.start)ts+=DAY;
  if(!Number.isFinite(ts)||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180||(lat===0&&lon===0)){invalid++;continue;}
  if(ts<trip.start||ts>trip.end){outside++;continue;}
  pts.push({lat,lon,t:ts,speed:m.speed?number(r[m.speed]):NaN});
 }
 pts.sort((a,b)=>a.t-b.t);pts=pts.filter((p,i)=>!i||p.t!==pts[i-1].t);
 if(pts.length<3)throw Error(`CSV insuficiente o equivocado: ${pts.length} posiciones del viaje; ${foreign} de otra patente; ${outside} fuera de rango; ${invalid} inválidas.`);
 let gaps=0;for(let i=1;i<pts.length;i++)if(pts[i].t-pts[i-1].t>120)gaps++;
 const coverage=(pts.at(-1).t-pts[0].t)/(trip.end-trip.start),complete=pts[0].t-trip.start<=120&&trip.end-pts.at(-1).t<=120&&gaps===0&&invalid===0&&coverage>=.8;
 return {points:pts,invalid,foreign,outside,gaps,coverage,complete,filename:options.filename||'',timezone:options.timezone||'local'};
}
function analyze(c,line=[],stops=[]){
 const pts=c.trace.points;let run=[],offRuns=[],off=[];
 const finishOff=()=>{if(run.length>=3&&run.at(-1).t-run[0].t>=60)offRuns.push(run);run=[];};
 for(let i=0;i<pts.length;i++){const p=pts[i];if(i&&p.t-pts[i-1].t>120)finishOff();const d=line.length>1?distance(p,line):NaN;off.push(d);if(d>100)run.push(p);else finishOff();}finishOff();
 const auto=line.length<2?null:offRuns.length?true:c.trace.complete?false:null;
 let events=[],low=[];
 const threshold=c.po>0?Math.min(c.po*.6,15):null;
 const finish=()=>{if(low.length>=3){let a=low[0],b=low.at(-1),duration=b.t-a.t,dist=0;for(let i=1;i<low.length;i++)dist+=hav(low[i-1],low[i]);const avg=dist/duration*3.6;
  if(duration>=180&&dist>=200&&avg<threshold&&a.t-c.trip.start>=120&&c.trip.end-b.t>=120){const near=stops.some(s=>hav(a,s)<50||hav(b,s)<50);events.push({start:a,end:b,duration,distance:dist,avg,nearStop:near,location:`${a.lat.toFixed(6)}, ${a.lon.toFixed(6)}`,time:`De ${hms(a.t)} a ${hms(b.t)}`});}}
  low=[];};
 if(threshold)for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],dt=b.t-a.t,kmh=hav(a,b)/dt*3.6;
  if(a.t>=c.trip.start+120&&b.t<=c.trip.end-120&&dt>0&&dt<=120&&kmh<threshold){if(!low.length)low.push(a);low.push(b);}else finish();}finish();
 events.sort((a,b)=>b.duration-a.duration||a.start.t-b.start.t);
 return {auto,off,offRuns,events,threshold,reason:line.length<2?'Falta ruta GTFS verificada':auto===null?'Cobertura insuficiente para proponer No':auto?'Separación sostenida de más de 100 m':'Sin separación sostenida en seguimiento completo'};
}
function validEvent(c){if(!c.event||!c.trace)return false;const m=c.event.time.match(/^De (\d{2}:\d{2}:\d{2}) a (\d{2}:\d{2}:\d{2})$/);if(!m||!Number.isFinite(clock(m[1]))||!Number.isFinite(clock(m[2])))return false;let start=c.trip.day+clock(m[1]),end=c.trip.day+clock(m[2]);if(start<c.trip.start&&c.trip.end>=c.trip.day+DAY)start+=DAY;if(end<start)end+=DAY;return start>=c.trip.start&&end<=c.trip.end&&end-start>=120&&c.trace.points.some(p=>p.t===start)&&c.trace.points.some(p=>p.t===end)&&!c.trace.points.some((p,i)=>i&&p.t>start&&p.t<=end&&p.t-c.trace.points[i-1].t>120);}
function result(c){if(!c.trip||!c.trace)return null;if(c.decision===true)return ['Sí',c.trip.plate,'',''];if(c.decision===false&&c.trace&&c.event&&c.event.location.trim()&&c.event.time.trim()&&validEvent(c))return ['No',c.trip.plate,c.event.location,c.event.time];return null;}
function status(c){if(!c.trip)return c.invalid?'Fila SSPD inválida':'Sin coincidencia';if(c.decision===true&&c.trace)return 'Desvío confirmado';if(result(c))return 'Reducción considerada';if(!c.trace)return 'Falta CSV';if(!c.event)return 'Datos insuficientes';return 'Pendiente de revisión';}
const api={DAY,norm,plate,service,number,date,clock,stamp,hms,timestamp,headers,offline,key,sspd,choose,hav,distance,mapping,trace,analyze,validEvent,result,status,OUTPUT};root.AR=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
