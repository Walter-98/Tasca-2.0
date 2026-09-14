'use client';
import {useRef,useState} from 'react';
import {Download,Upload,DatabaseBackup} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {AlertDialog,AlertDialogContent,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from '@/components/ui/alert-dialog';
import {apiFetch} from './api';
import {localToday,type Account,type Recurring,type Goal} from '@/lib/finance';
type Dati={conti:Account[],movimenti:any[],ricorrenze:Recurring[],budget:{month:string,amount:number}[],obiettivi:Goal[]};
export default function Backup({dati,refresh}:{dati:Dati,refresh:()=>Promise<void>}){
 const file=useRef<HTMLInputElement>(null);
 const [da,setDa]=useState<Dati|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[stato,setStato]=useState('');
 function scarica(){
  const pacchetto={tasca:'1.1',esportato:new Date().toISOString(),...dati};
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(pacchetto,null,1)],{type:'application/json'}));
  a.download=`tasca-backup-${localToday()}.json`;a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  setStato('Backup scaricato. Conservalo fuori dal telefono.');
 }
 async function leggi(e:React.ChangeEvent<HTMLInputElement>){
  setError('');setStato('');
  const f=e.target.files?.[0];if(!f)return;
  try{
   const j=JSON.parse(await f.text());
   const letto:Dati={conti:j.conti||[],movimenti:j.movimenti||[],ricorrenze:j.ricorrenze||[],budget:j.budget||[],obiettivi:j.obiettivi||[]};
   if(!Array.isArray(letto.conti)||!Array.isArray(letto.movimenti))throw Error('formato');
   setDa(letto);
  }catch{setError('Questo file non è un backup di Tasca.');}
  finally{if(file.current)file.current.value='';}
 }
 async function invia(percorso:string,v:any){
  const r=await apiFetch(percorso,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(v)});
  const j:any=await r.json();if(!r.ok)throw Error(j.error);
 }
 async function ripristina(){
  if(!da)return;
  setBusy(true);setError('');
  const totale=da.conti.length+da.movimenti.length+da.ricorrenze.length+da.budget.length+da.obiettivi.length;
  let fatti=0;const avanza=()=>{fatti++;setStato(`Ripristino in corso: ${fatti} di ${totale}`);};
  const mappa=new Map<string,string>();
  try{
   for(const c of da.conti){
    const id=crypto.randomUUID();mappa.set(c.id,id);
    await invia('/api/planning',{action:'account',id,name:c.name,opening:c.opening,opening_date:c.opening_date});avanza();
   }
   for(const m of da.movimenti){
    if(m.type==='transfer'&&(!mappa.get(m.account_id)||!mappa.get(m.to_account_id))){avanza();continue;}
    await invia('/api/finance',{action:'movement',id:crypto.randomUUID(),type:m.type,amount:m.amount,category:m.category,description:m.description,date:m.date,account_id:m.account_id?mappa.get(m.account_id)||'':'',to_account_id:m.to_account_id?mappa.get(m.to_account_id)||'':''});avanza();
   }
   for(const r of da.ricorrenze){
    const conto=mappa.get(r.account_id);if(!conto){avanza();continue;}
    await invia('/api/planning',{action:'recurring',id:crypto.randomUUID(),account_id:conto,type:r.type,amount:r.amount,category:r.category,description:r.description,start_date:r.start_date,end_date:r.end_date,active:r.active});avanza();
   }
   for(const b of da.budget){await invia('/api/finance',{action:'budget',month:b.month,amount:b.amount});avanza();}
   for(const g of da.obiettivi){
    const id=crypto.randomUUID();
    await invia('/api/finance',{action:'goal',id,name:g.name,target:g.target,due_date:g.due_date});
    if(g.saved>0)await invia('/api/finance',{action:'goal_save',id,amount:g.saved});
    avanza();
   }
   await refresh();
   setStato(`Ripristino completato: ${fatti} voci aggiunte.`);
  }catch(e){setError('Ripristino interrotto: '+(e as Error).message+`. Aggiunte ${fatti} voci su ${totale}.`);}
  finally{setBusy(false);setDa(null);}
 }
 const quante=(d:Dati)=>`${d.conti.length} conti, ${d.movimenti.length} movimenti, ${d.ricorrenze.length} ricorrenze, ${d.budget.length} budget, ${d.obiettivi.length} obiettivi`;
 return <section className="panel backup">
  <div className="panel-head"><div><h2>Backup e ripristino</h2><p className="meta">Il CSV è un rendiconto. Questo è l’archivio completo.</p></div></div>
  <p className="planning-help">Il file contiene conti, movimenti, ricorrenze, budget e obiettivi in un unico documento leggibile. Conservalo dove conservi i documenti importanti: chi lo apre vede i tuoi conti.</p>
  <div className="backup-actions">
   <Button variant="outline" onClick={scarica} disabled={busy}><Download size={17}/> Scarica backup</Button>
   <Button variant="outline" onClick={()=>file.current?.click()} disabled={busy}><Upload size={17}/> Ripristina da file</Button>
   <input ref={file} type="file" accept="application/json,.json" hidden onChange={leggi}/>
  </div>
  {stato&&<p role="status" className="feedback">{stato}</p>}
  {error&&<p role="alert" className="error">{error}</p>}
  <AlertDialog open={!!da} onOpenChange={o=>!o&&setDa(null)}><AlertDialogContent>
   <AlertDialogTitle><DatabaseBackup size={18}/> Ripristinare questo backup?</AlertDialogTitle>
   <AlertDialogDescription>
    Il file contiene {da?quante(da):''}. Le voci vengono <b>aggiunte</b> a quelle che hai già: Tasca non cancella niente e non riconosce i doppioni.
    I conti rinascono come tuoi e non condivisi; gli inviti e i rimborsi non vengono ripristinati.
   </AlertDialogDescription>
   <AlertDialogFooter><AlertDialogCancel>Annulla</AlertDialogCancel><AlertDialogAction onClick={ripristina}>Ripristina</AlertDialogAction></AlertDialogFooter>
  </AlertDialogContent></AlertDialog>
 </section>;
}
