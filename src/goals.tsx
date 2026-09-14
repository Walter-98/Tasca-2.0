'use client';
import {useState} from 'react';
import {PiggyBank,Plus,Pencil,Trash2,ArrowDownLeft} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Progress} from '@/components/ui/progress';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {AlertDialog,AlertDialogTrigger,AlertDialogContent,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from '@/components/ui/alert-dialog';
import {apiFetch} from './api';
import {money,localToday,monthlyTarget,type Goal} from '@/lib/finance';
const cents=(v:string)=>Math.round(Number(v.replace(',','.'))*100);
export default function Goals({goals,refresh}:{goals:Goal[],refresh:()=>Promise<void>}){
 const today=localToday();
 const [goal,setGoal]=useState<Goal|null>(null),[target,setTarget]=useState('');
 const [saving,setSaving]=useState<Goal|null>(null),[amount,setAmount]=useState(''),[verso,setVerso]=useState('add');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function send(v:any,messaggio='Salvato'){
  setBusy(true);setError('');
  try{
   const r=await apiFetch('/api/finance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(v)});
   const j:any=await r.json();if(!r.ok)throw Error(j.error);
   await refresh();setGoal(null);setSaving(null);setNotice(messaggio);setTimeout(()=>setNotice(''),3000);
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 function nuovo(){setError('');setGoal({id:crypto.randomUUID(),name:'',target:0,saved:0,due_date:null});setTarget('');}
 return <section className="panel goals">
  <div className="panel-head">
   <div><h2>I tuoi obiettivi</h2><p className="meta">Il budget dice quanto non spendere. Un obiettivo dice per cosa.</p></div>
   <Button variant="outline" onClick={nuovo}><Plus size={16}/> Nuovo obiettivo</Button>
  </div>
  {goals.length===0
   ?<div className="empty compact"><PiggyBank className="mx-auto mb-3"/><h3>Una meta, non solo un limite</h3>
     <p>Vacanza, fondo imprevisti, cambio auto: scegli quanto serve ed entro quando. Tasca calcola quanto mettere da parte ogni mese.</p>
     <Button className="primary" onClick={nuovo}><Plus size={16}/> Crea il primo obiettivo</Button></div>
   :<div className="goal-grid">{goals.map(g=>{
     const perc=Math.min(100,Math.round(g.saved/Math.max(1,g.target)*100)),manca=Math.max(0,g.target-g.saved),mese=monthlyTarget(g,today);
     return <article className="goal-card" key={g.id}>
      <div className="goal-top">
       <span className="icon purple"><PiggyBank size={19}/></span>
       <button className="edit" aria-label={`Modifica ${g.name}`} onClick={()=>{setError('');setGoal(g);setTarget(String(g.target/100));}}><Pencil size={16}/></button>
      </div>
      <h3>{g.name}</h3>
      <strong>{money(g.saved)} <span>di {money(g.target)}</span></strong>
      <Progress value={perc}/>
      <p className="meta">{manca===0?'Obiettivo raggiunto.':`Mancano ${money(manca)}`}
       {g.due_date&&manca>0?` · entro il ${new Date(g.due_date+'T12:00:00').toLocaleDateString('it-IT')}`:''}</p>
      {mese!==null&&manca>0&&<p className="goal-rate">Da accantonare: <b>{money(mese)}</b> al mese</p>}
      {mese===null&&manca>0&&<p className="goal-rate meta">Nessuna data: aggiungila per sapere quanto mettere da parte ogni mese.</p>}
      <div className="goal-actions">
       <Button size="sm" disabled={busy} onClick={()=>{setError('');setSaving(g);setAmount('');setVerso('add');}}><ArrowDownLeft size={15}/> Accantona</Button>
       <AlertDialog><AlertDialogTrigger asChild><Button size="sm" variant="ghost" disabled={busy} aria-label={`Elimina ${g.name}`}><Trash2 size={15}/></Button></AlertDialogTrigger>
        <AlertDialogContent><AlertDialogTitle>Eliminare questo obiettivo?</AlertDialogTitle>
         <AlertDialogDescription>Sparisce l’obiettivo e il conteggio di quanto hai messo da parte. I movimenti dei conti non vengono toccati.</AlertDialogDescription>
         <AlertDialogFooter><AlertDialogCancel>Annulla</AlertDialogCancel><AlertDialogAction onClick={()=>send({action:'goal_delete',id:g.id},'Obiettivo eliminato')}>Elimina</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent></AlertDialog>
      </div>
     </article>;})}</div>}
  <p className="planning-help">L’accantonamento è un conteggio a parte: non sposta denaro tra i conti e non crea movimenti.</p>
  {error&&!goal&&!saving&&<p role="alert" className="error">{error}</p>}
  {notice&&<p role="status" className="toast">{notice}</p>}

  <Dialog open={!!goal} onOpenChange={o=>!o&&setGoal(null)}><DialogContent className="form-dialog">
   <DialogTitle>{goals.some(g=>g.id===goal?.id)?'Modifica obiettivo':'Nuovo obiettivo'}</DialogTitle>
   <DialogDescription>Scegli quanto vuoi raggiungere ed entro quando. La data è facoltativa, ma serve per calcolare il ritmo mensile.</DialogDescription>
   {goal&&<form onSubmit={e=>{e.preventDefault();send({...goal,action:'goal',target:cents(target)},'Obiettivo salvato');}}>
    <label>Nome<Input required maxLength={60} placeholder="Es. Vacanza, fondo imprevisti" value={goal.name} onChange={e=>setGoal({...goal,name:e.target.value})}/></label>
    <div className="form-grid">
     <label>Quanto serve (€)<Input required inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,2})?" placeholder="0,00" value={target} onChange={e=>setTarget(e.target.value)}/></label>
     <label>Entro il (facoltativo)<Input type="date" min={today} max="2100-12-31" value={goal.due_date||''} onChange={e=>setGoal({...goal,due_date:e.target.value||null})}/></label>
    </div>
    {error&&<p role="alert" className="error">{error}</p>}
    <Button className="primary save" disabled={busy}>{busy?'Salvataggio…':'Salva obiettivo'}</Button>
   </form>}
  </DialogContent></Dialog>

  <Dialog open={!!saving} onOpenChange={o=>!o&&setSaving(null)}><DialogContent className="form-dialog">
   <DialogTitle>{saving?.name}</DialogTitle>
   <DialogDescription>Aggiorna quanto hai messo da parte. Puoi anche togliere, se hai dovuto attingere.</DialogDescription>
   {saving&&<form onSubmit={e=>{e.preventDefault();const n=cents(amount);send({action:'goal_save',id:saving.id,amount:verso==='add'?n:-n},verso==='add'?'Accantonato':'Aggiornato');}}>
    <div className="form-grid">
     <label>Operazione<select value={verso} onChange={e=>setVerso(e.target.value)}><option value="add">Metto da parte</option><option value="sub">Prelevo</option></select></label>
     <label>Importo (€)<Input required inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,2})?" placeholder="0,00" value={amount} onChange={e=>setAmount(e.target.value)}/></label>
    </div>
    <p className="planning-help">Ora da parte: <b>{money(saving.saved)}</b> su {money(saving.target)}.</p>
    {error&&<p role="alert" className="error">{error}</p>}
    <Button className="primary save" disabled={busy}>{busy?'Salvataggio…':'Conferma'}</Button>
   </form>}
  </DialogContent></Dialog>
 </section>;
}
