'use client';
import {useState} from 'react';
import {UserX} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {apiFetch,supabase} from './api';
export default function Account({email,onErased}:{email?:string,onErased:()=>void}){
 const [open,setOpen]=useState(false),[conferma,setConferma]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function elimina(e:React.FormEvent){
  e.preventDefault();setBusy(true);setError('');
  try{
   const r=await apiFetch('/api/planning',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'erase_me',id:'erase',confirm:conferma.trim().toUpperCase()})});
   const j:any=await r.json();if(!r.ok)throw Error(j.error);
   await supabase?.auth.signOut().catch(()=>{});
   onErased();
  }catch(e){setError((e as Error).message);setBusy(false);}
 }
 return <section className="panel danger">
  <div className="panel-head"><div><h2>Il tuo account</h2><p className="meta">{email}</p></div></div>
  <p className="planning-help">Puoi chiudere il tuo account quando vuoi e i tuoi dati vengono cancellati dal database, non nascosti. È un diritto, non una concessione: prima di farlo, scarica un backup dalla sezione qui sopra.</p>
  <Button variant="ghost" className="delete" onClick={()=>{setError('');setConferma('');setOpen(true);}}><UserX size={16}/> Chiudi il mio account ed elimina i dati</Button>
  <Dialog open={open} onOpenChange={o=>!o&&!busy&&setOpen(false)}><DialogContent className="form-dialog">
   <DialogTitle>Eliminare account e dati?</DialogTitle>
   <DialogDescription>L’operazione è immediata e non si può annullare.</DialogDescription>
   <div className="sharing-note">
    <p><b>Vengono eliminati:</b> il tuo accesso, i tuoi conti con tutti i loro movimenti, le ricorrenze, i budget, gli obiettivi, i rimborsi e gli inviti che hai creato.</p>
    <p><b>Attenzione ai conti condivisi:</b> quelli di cui sei proprietario spariscono anche per chi li usa con te, insieme ai movimenti che ha registrato. I conti di altre persone a cui partecipi restano loro: perdi solo l’accesso.</p>
    <p>Se ti serve una copia, annulla e usa prima <b>Scarica backup</b>.</p>
   </div>
   <form onSubmit={elimina}>
    <label>Scrivi <b>ELIMINA</b> per confermare<Input required value={conferma} onChange={e=>setConferma(e.target.value)} placeholder="ELIMINA" autoComplete="off"/></label>
    {error&&<p role="alert" className="error">{error}</p>}
    <Button className="delete save" disabled={busy||conferma.trim().toUpperCase()!=='ELIMINA'}>{busy?'Eliminazione…':'Elimina definitivamente'}</Button>
    <Button type="button" variant="ghost" className="save" disabled={busy} onClick={()=>setOpen(false)}>Annulla</Button>
   </form>
  </DialogContent></Dialog>
 </section>;
}
