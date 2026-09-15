'use client';
import {useEffect,useRef,useState} from 'react';
import {Paperclip,Trash2,Download} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {supabase} from './api';
const LIMITE=5*1024*1024;
type File_={nome:string,percorso:string,dimensione:number};
// Rimpicciolisce le foto prima di caricarle: 8 MB di scontrino diventano poche centinaia di KB.
async function comprimi(f:File):Promise<Blob>{
 if(!f.type.startsWith('image/')||f.type==='image/heic')return f;
 try{
  const bitmap=await createImageBitmap(f);
  const lato=Math.max(bitmap.width,bitmap.height);
  const scala=lato>1600?1600/lato:1;
  const tela=document.createElement('canvas');
  tela.width=Math.round(bitmap.width*scala);tela.height=Math.round(bitmap.height*scala);
  tela.getContext('2d')!.drawImage(bitmap,0,0,tela.width,tela.height);
  const blob=await new Promise<Blob|null>(r=>tela.toBlob(r,'image/jpeg',0.82));
  return blob&&blob.size<f.size?blob:f;
 }catch{return f;}
}
export default function Allegati({movimento,utente}:{movimento:string,utente:string}){
 const input=useRef<HTMLInputElement>(null);
 const [file,setFile]=useState<File_[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const cartella=`${utente}/${movimento}`;
 async function carica(){
  if(!supabase)return;
  const {data,error}=await supabase.storage.from('allegati').list(cartella,{limit:20});
  if(error){setFile([]);return;}
  setFile((data||[]).filter(f=>f.name!=='.emptyFolderPlaceholder').map(f=>({nome:f.name,percorso:`${cartella}/${f.name}`,dimensione:f.metadata?.size||0})));
 }
 useEffect(()=>{carica();},[movimento]);
 async function aggiungi(e:React.ChangeEvent<HTMLInputElement>){
  const f=e.target.files?.[0];if(!f||!supabase)return;
  setBusy(true);setError('');
  try{
   const corpo=await comprimi(f);
   if(corpo.size>LIMITE)throw Error('Il file supera i 5 MB, anche dopo la compressione.');
   const nome=`${Date.now()}-${f.name.replace(/[^\w.\-]+/g,'_').slice(-60)}`;
   const {error}=await supabase.storage.from('allegati').upload(`${cartella}/${nome}`,corpo,{contentType:corpo.type||f.type||'application/octet-stream'});
   if(error)throw error;
   await carica();
  }catch(e:any){setError(e.message==='Bucket not found'?'L’archivio allegati non è ancora attivo: esegui supabase/allegati.sql.':e.message||'Caricamento non riuscito.');}
  finally{setBusy(false);if(input.current)input.current.value='';}
 }
 async function apri(percorso:string){
  if(!supabase)return;
  const {data,error}=await supabase.storage.from('allegati').createSignedUrl(percorso,60);
  if(error||!data)return setError('Non riesco ad aprire questo allegato.');
  window.open(data.signedUrl,'_blank','noopener');
 }
 async function elimina(percorso:string){
  if(!supabase)return;
  setBusy(true);
  const {error}=await supabase.storage.from('allegati').remove([percorso]);
  if(error)setError('Eliminazione non riuscita.');
  await carica();setBusy(false);
 }
 return <div className="allegati">
  <div className="allegati-testa">
   <span><Paperclip size={15}/> Allegati {file.length>0&&`(${file.length})`}</span>
   <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={()=>input.current?.click()}>{busy?'Caricamento…':'Aggiungi'}</Button>
   <input ref={input} type="file" accept="image/*,application/pdf" hidden onChange={aggiungi}/>
  </div>
  {file.map(f=><div className="allegato" key={f.percorso}>
   <button type="button" className="text-button" onClick={()=>apri(f.percorso)}><Download size={14}/> {f.nome.replace(/^\d+-/,'')}</button>
   <span className="meta">{Math.max(1,Math.round(f.dimensione/1024))} KB</span>
   <button type="button" className="edit" aria-label={`Elimina ${f.nome}`} disabled={busy} onClick={()=>elimina(f.percorso)}><Trash2 size={14}/></button>
  </div>)}
  {file.length===0&&<p className="meta">Scontrino, bolletta o garanzia: la foto resta agganciata a questo movimento. Solo tu la vedi.</p>}
  {error&&<p role="alert" className="error">{error}</p>}
 </div>;
}
