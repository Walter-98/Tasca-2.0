'use client';
import {useState} from 'react';
import {Scale,HandCoins,Trash2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {AlertDialog,AlertDialogTrigger,AlertDialogContent,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from '@/components/ui/alert-dialog';
import {apiFetch} from './api';
import {accountDebts,saldiGruppo,semplificaSaldi,localToday,money,type Account,type Settlement,type SharedMovement} from '@/lib/finance';
import type {Member} from './sharing';
type Rimborso={account:Account,email:string,importo:number,direction:string};
export default function Split({accounts,movements,settlements,members,userId,refresh}:{accounts:Account[],movements:SharedMovement[],settlements:Settlement[],members:Member[],userId:string,refresh:()=>Promise<void>}){
 const today=localToday();
 const [form,setForm]=useState<Rimborso|null>(null),[amount,setAmount]=useState(''),[date,setDate]=useState(today),[note,setNote]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const condivisi=accounts.filter(a=>members.some(m=>m.account_id===a.id)).map(a=>{
  const altri=members.filter(m=>m.account_id===a.id).map(m=>({user_id:m.user_id||'',email:m.email}));
  const partecipanti=[a.owner_id||'',...altri.map(x=>x.user_id)].filter(Boolean);
  const emails:Record<string,string>={};
  if(a.owner_id)emails[a.owner_id]=a.owner_email||'chi possiede il conto';
  for(const x of altri)emails[x.user_id]=x.email;
  const netti=saldiGruppo(a.id,partecipanti,movements,settlements);
  return {account:a,partecipanti,emails,saldi:accountDebts(a.id,userId,partecipanti,movements,settlements),giro:semplificaSaldi(netti)};
 }).filter(x=>x.partecipanti.length>1&&x.partecipanti.includes(userId));
 if(condivisi.length===0)return null;
 async function send(v:any,messaggio:string){
  setBusy(true);setError('');
  try{
   const r=await apiFetch('/api/finance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(v)});
   const j:any=await r.json();if(!r.ok)throw Error(j.error);
   await refresh();setForm(null);setNotice(messaggio);setTimeout(()=>setNotice(''),3000);
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 function apri(account:Account,email:string,netto:number){
  setError('');setAmount(netto?String(Math.abs(netto)/100):'');setDate(today);setNote('');
  setForm({account,email,importo:netto,direction:netto<0?'paid':'received'});
 }
 return <section className="panel split">
  <div className="panel-head"><div><h2>Chi deve quanto a chi</h2><p className="meta">Solo le spese marcate come divise entrano in questo conteggio.</p></div></div>
  {condivisi.map(({account,saldi,emails,partecipanti,giro})=><div className="split-account" key={account.id}>
   <h3><Scale size={17}/> {account.name}</h3>
   {Object.entries(saldi).map(([uid,netto])=><div className="split-row" key={uid}>
    <div><b>{emails[uid]||'Partecipante'}</b>
     <span>{netto>0?`ti deve ${money(netto)}`:netto<0?`devi ${money(-netto)}`:'siete in pari'}</span></div>
    <Button size="sm" variant="outline" disabled={busy} onClick={()=>apri(account,emails[uid]||'',netto)}><HandCoins size={15}/> Registra rimborso</Button>
   </div>)}
   {partecipanti.length>2&&giro.length>0&&<div className="giro"><b>Il giro di rimborsi più corto</b>{giro.map((g,i)=><p key={i}>{g.da===userId?'Tu dai':`${emails[g.da]||'Partecipante'} dà`} {money(g.importo)} a {g.a===userId?'te':(emails[g.a]||'partecipante')}</p>)}<span className="meta">Con più di due persone conviene fare questi passaggi invece di saldare uno a uno.</span></div>}
   {settlements.filter(s=>s.account_id===account.id).slice(0,4).map(s=><div className="split-history" key={s.id}>
    <span>{new Date(s.date+'T12:00:00').toLocaleDateString('it-IT')} · {s.from_user===userId?'hai rimborsato':'hai ricevuto'} {money(s.amount)}{s.note?` · ${s.note}`:''}</span>
    <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="sm" aria-label="Elimina rimborso" disabled={busy}><Trash2 size={14}/></Button></AlertDialogTrigger>
     <AlertDialogContent><AlertDialogTitle>Eliminare questo rimborso?</AlertDialogTitle>
      <AlertDialogDescription>Il saldo tra voi torna a com’era prima di registrarlo.</AlertDialogDescription>
      <AlertDialogFooter><AlertDialogCancel>Annulla</AlertDialogCancel><AlertDialogAction onClick={()=>send({action:'settle_delete',id:s.id},'Rimborso eliminato')}>Elimina</AlertDialogAction></AlertDialogFooter>
     </AlertDialogContent></AlertDialog>
   </div>)}
  </div>)}
  <p className="planning-help">Quando registri una spesa su un conto condiviso puoi indicare quanto resta a tuo carico: il resto viene diviso fra gli altri partecipanti.</p>
  {error&&!form&&<p role="alert" className="error">{error}</p>}
  {notice&&<p role="status" className="toast">{notice}</p>}
  <Dialog open={!!form} onOpenChange={o=>!o&&setForm(null)}><DialogContent className="form-dialog">
   <DialogTitle>Rimborso con {form?.email}</DialogTitle>
   <DialogDescription>Registra il denaro passato di mano fuori dai conti: un bonifico, dei contanti, una cena pagata per intero.</DialogDescription>
   {form&&<form onSubmit={e=>{e.preventDefault();send({action:'settle',id:crypto.randomUUID(),account_id:form.account.id,email:form.email,direction:form.direction,amount:Math.round(Number(amount.replace(',','.'))*100),date,note},'Rimborso registrato');}}>
    <div className="form-grid">
     <label>Direzione<select value={form.direction} onChange={e=>setForm({...form,direction:e.target.value})}>
      <option value="paid">Ho pagato io</option><option value="received">Ho ricevuto io</option></select></label>
     <label>Importo (€)<Input required inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,2})?" placeholder="0,00" value={amount} onChange={e=>setAmount(e.target.value)}/></label>
    </div>
    <div className="form-grid">
     <label>Data<Input type="date" required min={form.account.opening_date} max="2100-12-31" value={date} onChange={e=>setDate(e.target.value)}/></label>
     <label>Nota (facoltativa)<Input maxLength={160} placeholder="Es. bonifico" value={note} onChange={e=>setNote(e.target.value)}/></label>
    </div>
    {error&&<p role="alert" className="error">{error}</p>}
    <Button className="primary save" disabled={busy}>{busy?'Salvataggio…':'Salva rimborso'}</Button>
   </form>}
  </DialogContent></Dialog>
 </section>;
}
