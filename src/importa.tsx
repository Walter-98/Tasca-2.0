'use client';
import {useRef,useState} from 'react';
import {Upload,FileSpreadsheet,CircleCheck,TriangleAlert} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {apiFetch} from './api';
import {leggiCsv,rilevaColonne,convertiRighe,impronta,categoriaDa,money,type Account,type RigaCsv} from '@/lib/finance';
const SPESE=['Casa','Spesa alimentare','Trasporti','Ristoranti e bar','Shopping','Salute','Tempo libero','Abbonamenti','Altro'];
const ENTRATE=['Stipendio','Lavoro extra','Rimborsi','Regali','Altro'];
// Regole di partenza: coprono la gran parte degli estratti conto italiani.
const REGOLE:Record<string,string>={
 esselunga:'Spesa alimentare',coop:'Spesa alimentare',conad:'Spesa alimentare',lidl:'Spesa alimentare',
 carrefour:'Spesa alimentare',eurospin:'Spesa alimentare',despar:'Spesa alimentare',penny:'Spesa alimentare',
 supermercat:'Spesa alimentare',macelleria:'Spesa alimentare',panificio:'Spesa alimentare',
 enel:'Casa',eni:'Casa',hera:'Casa',a2a:'Casa',acea:'Casa',iren:'Casa',affitto:'Casa',condominio:'Casa',
 tim:'Casa',vodafone:'Casa',windtre:'Casa',fastweb:'Casa',iliad:'Casa',
 q8:'Trasporti',tamoil:'Trasporti',esso:'Trasporti',autostrade:'Trasporti',telepass:'Trasporti',
 trenitalia:'Trasporti',italo:'Trasporti',carburant:'Trasporti',benzina:'Trasporti',parcheggio:'Trasporti',
 farmacia:'Salute',ticket:'Salute',dentista:'Salute',
 netflix:'Abbonamenti',spotify:'Abbonamenti',disney:'Abbonamenti',dazn:'Abbonamenti',prime:'Abbonamenti',
 ristorante:'Ristoranti e bar',pizzeria:'Ristoranti e bar',trattoria:'Ristoranti e bar',mcdonald:'Ristoranti e bar',
 amazon:'Shopping',zalando:'Shopping',decathlon:'Shopping',ikea:'Shopping',
 stipendio:'Stipendio',pensione:'Stipendio',
};
type Voce=RigaCsv&{categoria:string,doppione:boolean,tieni:boolean};
export default function Importa({accounts,movimenti,refresh}:{accounts:Account[],movimenti:any[],refresh:()=>Promise<void>}){
 const file=useRef<HTMLInputElement>(null);
 const [aperto,setAperto]=useState(false),[griglia,setGriglia]=useState<string[][]>([]),[intestazione,setIntestazione]=useState(true);
 const [col,setCol]=useState({data:-1,importo:-1,uscita:-1,entrata:-1,descrizione:-1});
 const [conto,setConto]=useState(''),[voci,setVoci]=useState<Voce[]>([]),[scartate,setScartate]=useState(0);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[stato,setStato]=useState('');
 const esistenti=new Set(movimenti.map(m=>impronta(m)));
 function prepara(g:string[][],c:typeof col,conIntestazione:boolean){
  const {righe,scartate}=convertiRighe(g,c,conIntestazione?1:0);
  setScartate(scartate);
  setVoci(righe.map(r=>{
   const doppione=esistenti.has(impronta(r));
   const trovata=categoriaDa(r.description,REGOLE);
   const categoria=r.type==='income'?(trovata&&ENTRATE.includes(trovata)?trovata:'Altro'):(trovata&&SPESE.includes(trovata)?trovata:'Altro');
   return {...r,categoria,doppione,tieni:!doppione};
  }));
 }
 async function leggiFile(e:React.ChangeEvent<HTMLInputElement>){
  setError('');setStato('');
  const f=e.target.files?.[0];if(!f)return;
  try{
   const g=leggiCsv(await f.text());
   if(g.length<2)throw Error('vuoto');
   const c=rilevaColonne(g[0]);
   setGriglia(g);setCol(c);setIntestazione(true);setConto(accounts[0]?.id||'');
   prepara(g,c,true);setAperto(true);
  }catch{setError('Non riesco a leggere questo file. Serve un CSV esportato dalla banca.');}
  finally{if(file.current)file.current.value='';}
 }
 function cambiaColonna(chiave:keyof typeof col,valore:number){
  const c={...col,[chiave]:valore};setCol(c);prepara(griglia,c,intestazione);
 }
 async function importa(){
  const daFare=voci.filter(v=>v.tieni);
  if(!daFare.length)return;
  setBusy(true);setError('');
  let fatti=0;
  try{
   for(const v of daFare){
    const r=await apiFetch('/api/finance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
     action:'movement',id:crypto.randomUUID(),type:v.type,amount:v.amount,category:v.categoria,
     description:v.description,date:v.date,account_id:conto||'',to_account_id:''})});
    const j:any=await r.json();if(!r.ok)throw Error(j.error);
    fatti++;setStato(`Importazione: ${fatti} di ${daFare.length}`);
   }
   await refresh();
   setAperto(false);setStato(`Importati ${fatti} movimenti.`);
  }catch(e){setError(`Importazione interrotta dopo ${fatti} movimenti: ${(e as Error).message}`);}
  finally{setBusy(false);}
 }
 const tenuti=voci.filter(v=>v.tieni).length,doppioni=voci.filter(v=>v.doppione).length;
 const opzioni=(indice:number)=><>
  <option value={-1}>— nessuna —</option>
  {(intestazione?griglia[0]||[]:(griglia[0]||[]).map((_,i)=>`Colonna ${i+1}`)).map((c,i)=><option key={i} value={i}>{c||`Colonna ${i+1}`}</option>)}
 </>;
 return <section className="panel importa">
  <div className="panel-head"><div><h2>Importa estratto conto</h2><p className="meta">Il file CSV della banca, senza riscrivere niente a mano.</p></div>
   <Button variant="outline" onClick={()=>file.current?.click()} disabled={!accounts.length}><Upload size={17}/> Scegli file CSV</Button>
   <input ref={file} type="file" accept=".csv,text/csv,text/plain" hidden onChange={leggiFile}/>
  </div>
  <p className="planning-help">{accounts.length?'Dalla tua banca esporta i movimenti in CSV (a volte si chiama «esporta in Excel»). Tasca riconosce da solo le colonne, ti mostra l’anteprima e scarta i doppioni.':'Crea prima un conto: i movimenti importati devono finire da qualche parte.'}</p>
  {stato&&!aperto&&<p role="status" className="feedback">{stato}</p>}
  {error&&!aperto&&<p role="alert" className="error">{error}</p>}
  <Dialog open={aperto} onOpenChange={o=>!o&&!busy&&setAperto(false)}><DialogContent className="form-dialog wide">
   <DialogTitle><FileSpreadsheet size={18}/> Anteprima importazione</DialogTitle>
   <DialogDescription>Controlla che le colonne siano quelle giuste, poi conferma. Niente viene salvato finché non premi Importa.</DialogDescription>
   <div className="form-grid">
    <label>Conto di destinazione<select value={conto} onChange={e=>setConto(e.target.value)}>
     <option value="">Non assegnato</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
    <label>Prima riga<select value={intestazione?'si':'no'} onChange={e=>{const v=e.target.value==='si';setIntestazione(v);prepara(griglia,col,v);}}>
     <option value="si">È l’intestazione</option><option value="no">È già un movimento</option></select></label>
   </div>
   <div className="form-grid">
    <label>Colonna data<select value={col.data} onChange={e=>cambiaColonna('data',Number(e.target.value))}>{opzioni(col.data)}</select></label>
    <label>Colonna descrizione<select value={col.descrizione} onChange={e=>cambiaColonna('descrizione',Number(e.target.value))}>{opzioni(col.descrizione)}</select></label>
   </div>
   <div className="form-grid">
    <label>Colonna importo<select value={col.importo} onChange={e=>cambiaColonna('importo',Number(e.target.value))}>{opzioni(col.importo)}</select></label>
    <label>Oppure uscite / entrate<span className="due-select">
     <select aria-label="Colonna uscite" value={col.uscita} onChange={e=>cambiaColonna('uscita',Number(e.target.value))}>{opzioni(col.uscita)}</select>
     <select aria-label="Colonna entrate" value={col.entrata} onChange={e=>cambiaColonna('entrata',Number(e.target.value))}>{opzioni(col.entrata)}</select>
    </span></label>
   </div>
   <div className="import-riepilogo">
    <span><CircleCheck size={15}/> {tenuti} da importare</span>
    {doppioni>0&&<span className="avviso"><TriangleAlert size={15}/> {doppioni} già presenti, esclusi</span>}
    {scartate>0&&<span className="avviso"><TriangleAlert size={15}/> {scartate} righe illeggibili, saltate</span>}
   </div>
   <div className="import-tabella">
    <table><thead><tr><th></th><th>Data</th><th>Descrizione</th><th>Importo</th><th>Categoria</th></tr></thead>
     <tbody>{voci.slice(0,300).map((v,i)=><tr key={i} className={v.doppione?'doppione':''}>
      <td><input type="checkbox" aria-label={`Importa ${v.description}`} checked={v.tieni} onChange={e=>setVoci(voci.map((x,j)=>j===i?{...x,tieni:e.target.checked}:x))}/></td>
      <td>{new Date(v.date+'T12:00:00').toLocaleDateString('it-IT')}</td>
      <td title={v.description}>{v.description}</td>
      <td className={v.type==='income'?'buono':''}>{v.type==='income'?'+':'−'}{money(v.amount)}</td>
      <td><select value={v.categoria} onChange={e=>setVoci(voci.map((x,j)=>j===i?{...x,categoria:e.target.value}:x))}>
       {(v.type==='income'?ENTRATE:SPESE).map(c=><option key={c}>{c}</option>)}</select></td>
     </tr>)}</tbody></table>
    {voci.length>300&&<p className="meta">Mostrate le prime 300 righe di {voci.length}: verranno importate tutte quelle selezionate.</p>}
   </div>
   {busy&&<p role="status" className="feedback">{stato}</p>}
   {error&&<p role="alert" className="error">{error}</p>}
   <Button className="primary save" disabled={busy||!tenuti} onClick={importa}>{busy?'Importazione…':`Importa ${tenuti} movimenti`}</Button>
   <Button type="button" variant="ghost" className="save" disabled={busy} onClick={()=>setAperto(false)}>Annulla</Button>
  </DialogContent></Dialog>
 </section>;
}
