export type Account={id:string,name:string,opening:number,opening_date:string,owner_id?:string,owner_email?:string,can_share?:boolean,shared?:boolean};
export type Recurring={id:string,type:string,amount:number,category:string,description:string,account_id:string,start_date:string,end_date:string|null,active:number};
export type Occurrence={id:string,recurring_id:string,date:string};
export function localToday(){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome'}).format(new Date());}
export function validDate(v:unknown):v is string {return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&v>='2000-01-01'&&v<='2100-12-31'&&!isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;}
// Clamp the original day independently each month: 31 Jan → 28 Feb → 31 Mar.
export function monthlyDates(start:string,end:string){if(!validDate(start)||!validDate(end)||end<start)return [];const day=Number(start.slice(8)),result:string[]=[];let y=Number(start.slice(0,4)),m=Number(start.slice(5,7));for(let i=0;i<1212;i++){const d=`${y}-${String(m).padStart(2,'0')}-${String(Math.min(day,new Date(Date.UTC(y,m,0)).getUTCDate())).padStart(2,'0')}`;if(d>end)break;result.push(d);m++;if(m===13){m=1;y++;}}return result;}
export const money=(n:number)=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(n/100);
export function accountBalance(account:Account,movements:{type:string,amount:number,date:string,account_id?:string|null,to_account_id?:string|null}[],at=localToday()){return account.opening+movements.filter(m=>m.date>=account.opening_date&&m.date<=at).reduce((n,m)=>n+(m.to_account_id===account.id&&m.type==='transfer'?m.amount:0)+(m.account_id===account.id?(m.type==='income'?m.amount:-m.amount):0),0);}

// ---- Obiettivi di risparmio, scadenze in arrivo, divisione delle spese ----
export type Goal={id:string,name:string,target:number,saved:number,due_date:string|null,created_at?:string};
export type Settlement={id:string,account_id:string,from_user:string,to_user:string,amount:number,date:string,note:string,from_email?:string,to_email?:string};
export type SharedMovement={id:string,type:string,amount:number,date:string,account_id?:string|null,owner_id?:string,split?:number|null};

export function addDays(date:string,n:number){const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}

// Scadenze non ancora registrate: quelle già arrivate (late) e quelle entro i prossimi giorni.
export function upcomingDue(rules:Recurring[],settled:Set<string>,today:string,days=7){
 const limit=addDays(today,days);
 return rules.filter(r=>r.active).flatMap(r=>monthlyDates(r.start_date,r.end_date&&r.end_date<limit?r.end_date:limit)
  .filter(d=>!settled.has(`rec:${r.id}:${d}`))
  .map(date=>({rule:r,date,late:date<=today}))).sort((a,b)=>a.date.localeCompare(b.date));
}

// Quota che ciascun altro partecipante deve a chi ha pagato. split = percentuale a carico di chi registra.
export function othersShare(amount:number,split:number,others:number){
 if(others<1||!(split>=0&&split<=100))return 0;
 return Math.round((amount-Math.round(amount*split/100))/others);
}

// Saldo netto verso di me, per persona: positivo = quella persona mi deve, negativo = devo io.
export function accountDebts(accountId:string,me:string,participants:string[],movements:SharedMovement[],settlements:Settlement[]){
 const net:Record<string,number>={};
 for(const p of participants)if(p!==me)net[p]=0;
 for(const m of movements){
  if(m.account_id!==accountId||m.type!=='expense'||m.split==null||!m.owner_id||!participants.includes(m.owner_id))continue;
  const others=participants.filter(p=>p!==m.owner_id);
  const share=othersShare(m.amount,m.split,others.length);
  if(m.owner_id===me){for(const o of others)if(o in net)net[o]+=share;}
  else if(others.includes(me)&&m.owner_id in net)net[m.owner_id]-=share;
 }
 for(const s of settlements){
  if(s.account_id!==accountId)continue;
  if(s.from_user===me&&s.to_user in net)net[s.to_user]+=s.amount;
  else if(s.to_user===me&&s.from_user in net)net[s.from_user]-=s.amount;
 }
 return net;
}

export function monthsBetween(from:string,to:string){
 if(!validDate(from)||!validDate(to))return 0;
 const m=(Number(to.slice(0,4))-Number(from.slice(0,4)))*12+(Number(to.slice(5,7))-Number(from.slice(5,7)));
 return to.slice(8)>=from.slice(8)?m:m-1;
}

// Quanto accantonare ogni mese per arrivare in tempo. null se l'obiettivo non ha una data.
export function monthlyTarget(goal:Goal,today:string){
 const left=Math.max(0,goal.target-goal.saved);
 if(!goal.due_date||!validDate(goal.due_date))return null;
 if(left===0)return 0;
 const months=monthsBetween(today,goal.due_date);
 return months<=0?left:Math.ceil(left/months);
}

// ================= Importazione estratti conto =================
export type RigaCsv={date:string,amount:number,description:string,type:'income'|'expense'};

// Divide un CSV rispettando virgolette e ritorni a capo dentro i campi.
export function leggiCsv(testo:string,separatore?:string):string[][]{
 const t=testo.replace(/^﻿/,'').replace(/\r\n?/g,'\n');
 const sep=separatore||indovinaSeparatore(t);
 const righe:string[][]=[];let campo='',riga:string[]=[],dentro=false;
 for(let i=0;i<t.length;i++){
  const c=t[i];
  if(dentro){
   if(c==='"'){if(t[i+1]==='"'){campo+='"';i++;}else dentro=false;}
   else campo+=c;
  }else if(c==='"')dentro=true;
  else if(c===sep){riga.push(campo);campo='';}
  else if(c==='\n'){riga.push(campo);campo='';if(riga.some(x=>x.trim()!==''))righe.push(riga);riga=[];}
  else campo+=c;
 }
 riga.push(campo);
 if(riga.some(x=>x.trim()!==''))righe.push(riga);
 return righe.map(r=>r.map(c=>c.trim()));
}
export function indovinaSeparatore(testo:string){
 const campione=testo.split('\n').slice(0,10).join('\n');
 const conta=(s:string)=>(campione.match(new RegExp('\\'+s,'g'))||[]).length;
 return [';','\t',',','|'].sort((a,b)=>conta(b)-conta(a))[0];
}

// "1.234,56" "-1,234.56" "€ 45,20" "(45,20)" -> centesimi. null se non e' un importo.
export function leggiImporto(v:string):number|null{
 if(v==null)return null;
 let s=String(v).replace(/[\s €$£]/g,'');
 if(!s)return null;
 let segno=1;
 if(/^\(.*\)$/.test(s)){segno=-1;s=s.slice(1,-1);}
 if(/^[-−]/.test(s)){segno=-1;s=s.slice(1);}
 else if(s.startsWith('+'))s=s.slice(1);
 if(!/^[\d.,]+$/.test(s)||!/\d/.test(s))return null;
 const ultimoPunto=s.lastIndexOf('.'),ultimaVirgola=s.lastIndexOf(',');
 let decimale=-1;
 if(ultimoPunto>=0&&ultimaVirgola>=0)decimale=Math.max(ultimoPunto,ultimaVirgola);
 else{
  const solo=Math.max(ultimoPunto,ultimaVirgola);
  if(solo>=0&&s.length-solo-1<=2&&s.split(s[solo]).length===2)decimale=solo;
 }
 const intero=(decimale<0?s:s.slice(0,decimale)).replace(/[.,]/g,'');
 const frazione=decimale<0?'':s.slice(decimale+1).padEnd(2,'0').slice(0,2);
 const centesimi=Number(intero||'0')*100+Number(frazione||'0');
 return Number.isFinite(centesimi)?segno*centesimi:null;
}

// 31/01/2026, 31-01-26, 2026-01-31, 31.01.2026 -> 2026-01-31
export function leggiData(v:string):string|null{
 if(!v)return null;
 const s=String(v).trim().slice(0,10).replace(/[.\s]/g,'/').replace(/-/g,'/');
 let m=s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
 if(m){const d=`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;return validDate(d)?d:null;}
 m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
 if(!m)return null;
 const anno=m[3].length===2?(Number(m[3])>70?'19':'20')+m[3]:m[3];
 const d=`${anno}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
 return validDate(d)?d:null;
}

const vociData=['data','date','datacontabile','datavaluta','dataoperazione','giorno'];
const vociImporto=['importo','amount','ammontare','valore','saldo'];
const vociUscita=['uscite','uscita','dare','addebiti','addebito','debito','spese','withdrawal','debit'];
const vociEntrata=['entrate','entrata','avere','accrediti','accredito','credito','deposit','credit'];
const vociDescrizione=['descrizione','causale','operazione','description','memo','dettagli','note'];
const ripulisci=(s:string)=>s.toLowerCase().normalize('NFD').replace(/[^a-z]/g,'');

export function rilevaColonne(intestazione:string[]){
 const trova=(voci:string[])=>{
  const i=intestazione.findIndex(c=>voci.includes(ripulisci(c)));
  return i>=0?i:intestazione.findIndex(c=>voci.some(v=>ripulisci(c).startsWith(v)));
 };
 return {data:trova(vociData),importo:trova(vociImporto),uscita:trova(vociUscita),entrata:trova(vociEntrata),descrizione:trova(vociDescrizione)};
}

export function impronta(r:{date:string,amount:number,description:string,type:string}){
 return `${r.date}|${r.type}|${r.amount}|${r.description.toLowerCase().replace(/\s+/g,' ').trim().slice(0,60)}`;
}

// Converte le righe grezze in movimenti, scartando quelle non interpretabili.
export function convertiRighe(righe:string[][],col:{data:number,importo:number,uscita:number,entrata:number,descrizione:number},saltaPrima=1){
 const buone:RigaCsv[]=[];let scartate=0;
 for(const r of righe.slice(saltaPrima)){
  const date=leggiData(r[col.data]||'');
  let importo=col.importo>=0?leggiImporto(r[col.importo]||''):null;
  if(importo==null&&col.entrata>=0){const e=leggiImporto(r[col.entrata]||'');if(e)importo=Math.abs(e);}
  if(importo==null&&col.uscita>=0){const u=leggiImporto(r[col.uscita]||'');if(u)importo=-Math.abs(u);}
  const description=(col.descrizione>=0?r[col.descrizione]||'':'').replace(/\s+/g,' ').trim().slice(0,160);
  if(!date||importo==null||importo===0){scartate++;continue;}
  buone.push({date,amount:Math.abs(importo),description:description||'Movimento importato',type:importo>0?'income':'expense'});
 }
 return {righe:buone,scartate};
}

// Regole testuali: la chiave e' un pezzo di descrizione, il valore la categoria.
export function categoriaDa(descrizione:string,regole:Record<string,string>){
 const d=descrizione.toLowerCase();
 for(const [chiave,categoria] of Object.entries(regole))if(chiave&&d.includes(chiave.toLowerCase()))return categoria;
 return null;
}

// ================= Gruppi: il giro di rimborsi piu' corto =================
export function semplificaSaldi(netti:Record<string,number>){
 const debitori=Object.entries(netti).filter(([,v])=>v<0).map(([k,v])=>({k,v:-v})).sort((a,b)=>b.v-a.v);
 const creditori=Object.entries(netti).filter(([,v])=>v>0).map(([k,v])=>({k,v})).sort((a,b)=>b.v-a.v);
 const giro:{da:string,a:string,importo:number}[]=[];
 let i=0,j=0;
 while(i<debitori.length&&j<creditori.length){
  const importo=Math.min(debitori[i].v,creditori[j].v);
  if(importo>0)giro.push({da:debitori[i].k,a:creditori[j].k,importo});
  debitori[i].v-=importo;creditori[j].v-=importo;
  if(debitori[i].v<=0)i++;
  if(creditori[j].v<=0)j++;
 }
 return giro;
}

// ================= Rendiconto annuale =================
export function statisticheAnno(movimenti:{type:string,amount:number,date:string,category:string}[],anno:string){
 const di=(a:string)=>movimenti.filter(m=>m.date.startsWith(a));
 const somma=(righe:{type:string,amount:number}[],tipo:string)=>righe.filter(m=>m.type===tipo).reduce((s,m)=>s+m.amount,0);
 const correnti=di(anno),precedenti=di(String(Number(anno)-1));
 const mesi=Array.from({length:12},(_,i)=>{
  const chiave=`${anno}-${String(i+1).padStart(2,'0')}`;
  const righe=movimenti.filter(m=>m.date.startsWith(chiave));
  return {mese:i+1,entrate:somma(righe,'income'),uscite:somma(righe,'expense')};
 });
 const perCategoria=(righe:typeof movimenti)=>{
  const mappa:Record<string,number>={};
  for(const m of righe)if(m.type==='expense')mappa[m.category]=(mappa[m.category]||0)+m.amount;
  return mappa;
 };
 const ora=perCategoria(correnti),prima=perCategoria(precedenti);
 const categorie=Object.entries(ora).map(([nome,valore])=>({
  nome,valore,
  precedente:prima[nome]||0,
  variazione:prima[nome]?Math.round((valore-prima[nome])/prima[nome]*100):null,
 })).sort((a,b)=>b.valore-a.valore);
 const entrate=somma(correnti,'income'),uscite=somma(correnti,'expense');
 const mesiConDati=mesi.filter(m=>m.entrate||m.uscite).length||1;
 return {
  entrate,uscite,saldo:entrate-uscite,
  entratePrecedenti:somma(precedenti,'income'),uscitePrecedenti:somma(precedenti,'expense'),
  mediaUscite:Math.round(uscite/mesiConDati),mesi,categorie,
  movimenti:correnti.filter(m=>m.type!=='transfer').length,
 };
}

// Saldo di ciascun partecipante sul conto: positivo = ha messo piu' di quanto gli spetta.
export function saldiGruppo(accountId:string,partecipanti:string[],movimenti:SharedMovement[],rimborsi:Settlement[]){
 const netti:Record<string,number>={};
 for(const p of partecipanti)netti[p]=0;
 for(const m of movimenti){
  if(m.account_id!==accountId||m.type!=='expense'||m.split==null||!m.owner_id||!(m.owner_id in netti))continue;
  const altri=partecipanti.filter(p=>p!==m.owner_id);
  const quota=othersShare(m.amount,m.split,altri.length);
  netti[m.owner_id]+=quota*altri.length; // ha anticipato la quota degli altri
  for(const a of altri)netti[a]-=quota;
 }
 for(const s of rimborsi){
  if(s.account_id!==accountId)continue;
  if(s.from_user in netti)netti[s.from_user]+=s.amount;
  if(s.to_user in netti)netti[s.to_user]-=s.amount;
 }
 return netti;
}

// ================= Estratto conto in PDF =================
// Il PDF non ha colonne: ha parole con delle coordinate. Qui le rimettiamo in
// righe e proviamo a capire quale numero e' l'importo e da che parte sta.
export type VocePdf={t:string,x:number,y:number};
const NUMERO=/^[-+]?(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2}[-+]?$/;
const DATA_BREVE=/^\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}$/;
const importoPdf=(s:string)=>{const t=s.trim();return t.endsWith('-')?'-'+t.slice(0,-1):t.replace(/^\+/,'');};

// Raggruppa le parole che stanno alla stessa altezza: una riga dell'estratto.
export function righeDaVoci(voci:VocePdf[],tolleranza=3):VocePdf[][]{
 const ordinate=voci.filter(v=>v.t.trim()!=='').slice().sort((a,b)=>b.y-a.y||a.x-b.x);
 const righe:VocePdf[][]=[];
 for(const v of ordinate){
  const ultima=righe[righe.length-1];
  if(ultima&&Math.abs(ultima[0].y-v.y)<=tolleranza)ultima.push(v);
  else righe.push([v]);
 }
 return righe.map(r=>r.slice().sort((a,b)=>a.x-b.x));
}

// Trasforma le pagine in una griglia uguale a quella di un CSV, cosi' il resto
// dell'importazione (anteprima, doppioni, categorie) funziona senza cambiare.
export function pdfAGriglia(pagine:VocePdf[][]):string[][]{
 const righe:VocePdf[][]=[];
 for(const p of pagine)for(const r of righeDaVoci(p))righe.push(r);
 let xUscita=NaN,xEntrata=NaN;
 for(const r of righe)for(const v of r){
  const k=ripulisci(v.t);
  if(!k)continue;
  if(Number.isNaN(xUscita)&&vociUscita.includes(k))xUscita=v.x;
  if(Number.isNaN(xEntrata)&&vociEntrata.includes(k))xEntrata=v.x;
 }
 const dueColonne=!Number.isNaN(xUscita)&&!Number.isNaN(xEntrata)&&Math.abs(xUscita-xEntrata)>10;
 const griglia:string[][]=[['Data','Descrizione','Importo','Uscite','Entrate']];
 for(const r of righe){
  const testi=r.map(v=>v.t.trim()).filter(Boolean);
  if(!testi.length)continue;
  const numeri=r.filter(v=>NUMERO.test(v.t.trim()));
  if(!DATA_BREVE.test(testi[0])){
   // Riga senza data: e' la continuazione della descrizione di quella sopra.
   const ultima=griglia[griglia.length-1];
   if(griglia.length>1&&!numeri.length&&testi.length<12&&testi.join(' ').length>2)
    ultima[1]=(ultima[1]+' '+testi.join(' ')).replace(/\s+/g,' ').trim().slice(0,160);
   continue;
  }
  let inizio=1;
  while(inizio<testi.length&&inizio<3&&DATA_BREVE.test(testi[inizio]))inizio++;
  const primoNumero=testi.findIndex((t,i)=>i>=inizio&&NUMERO.test(t));
  const descrizione=testi.slice(inizio,primoNumero<0?undefined:primoNumero).join(' ').replace(/\s+/g,' ').trim().slice(0,160);
  let importo='',uscita='',entrata='';
  if(numeri.length&&dueColonne){
   const vicino=(v:VocePdf)=>Math.min(Math.abs(v.x-xUscita),Math.abs(v.x-xEntrata));
   const scelto=numeri.reduce((a,b)=>vicino(b)<vicino(a)?b:a);
   if(Math.abs(scelto.x-xUscita)<=Math.abs(scelto.x-xEntrata))uscita=importoPdf(scelto.t);
   else entrata=importoPdf(scelto.t);
  }else if(numeri.length)importo=importoPdf(numeri[0].t);
  if(!importo&&!uscita&&!entrata)continue;
  griglia.push([testi[0],descrizione||'Movimento importato',importo,uscita,entrata]);
 }
 return griglia;
}
