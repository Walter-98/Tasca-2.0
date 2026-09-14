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
