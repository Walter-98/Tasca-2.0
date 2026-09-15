'use client';
import {useState} from 'react';
import {Printer,TrendingUp,TrendingDown,FileText} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {money,statisticheAnno,localToday} from '@/lib/finance';
const NOMI=['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const COLORI=['#635bdb','#2f9c8b','#eeae47','#e07b66','#8895e8','#be70a0','#55a8c7','#9a8876','#98a1ae'];
export default function Report({movimenti,nome}:{movimenti:any[],nome?:string}){
 const anni=Array.from(new Set(movimenti.map(m=>m.date.slice(0,4)))).sort().reverse();
 const [anno,setAnno]=useState(anni[0]||localToday().slice(0,4));
 const s=statisticheAnno(movimenti,anno);
 const max=Math.max(1,...s.mesi.flatMap(m=>[m.entrate,m.uscite]));
 const scarto=(ora:number,prima:number)=>prima?Math.round((ora-prima)/prima*100):null;
 const variazioneUscite=scarto(s.uscite,s.uscitePrecedenti);
 return <section className="panel report">
  <div className="panel-head no-print">
   <div><h2>Rendiconto annuale</h2><p className="meta">Il tuo anno in una pagina, pronta da stampare o salvare in PDF.</p></div>
   <div className="report-tools">
    <select aria-label="Anno del rendiconto" value={anno} onChange={e=>setAnno(e.target.value)}>
     {(anni.length?anni:[anno]).map(a=><option key={a}>{a}</option>)}
    </select>
    <Button variant="outline" onClick={()=>window.print()} disabled={!s.movimenti}><Printer size={17}/> Stampa o salva PDF</Button>
   </div>
  </div>
  {!s.movimenti
   ?<div className="empty compact no-print"><FileText className="mx-auto mb-3"/><h3>Ancora niente da raccontare per il {anno}</h3>
     <p>Il rendiconto si costruisce dai movimenti registrati. Scegli un altro anno o inizia a registrare.</p></div>
   :<div className="stampabile">
     <header className="report-head">
      <h1>Rendiconto {anno}</h1>
      <p>{nome?`${nome} · `:''}Tasca · generato il {new Date().toLocaleDateString('it-IT')} · {s.movimenti} movimenti</p>
     </header>
     <div className="report-cards">
      <div><span>Entrate</span><strong>{money(s.entrate)}</strong>
       {scarto(s.entrate,s.entratePrecedenti)!==null&&<small>{scarto(s.entrate,s.entratePrecedenti)! >=0?'+':''}{scarto(s.entrate,s.entratePrecedenti)}% sul {Number(anno)-1}</small>}</div>
      <div><span>Uscite</span><strong>{money(s.uscite)}</strong>
       {variazioneUscite!==null&&<small>{variazioneUscite>=0?'+':''}{variazioneUscite}% sul {Number(anno)-1}</small>}</div>
      <div className={s.saldo>=0?'buono':'meno'}><span>Differenza</span><strong>{money(s.saldo)}</strong>
       <small>{s.entrate?`hai messo da parte il ${Math.round(s.saldo/s.entrate*100)}% di quanto entrato`:'nessuna entrata registrata'}</small></div>
      <div><span>Spesa media al mese</span><strong>{money(s.mediaUscite)}</strong><small>sui mesi con movimenti</small></div>
     </div>
     <h3>Mese per mese</h3>
     <div className="report-bars">
      {s.mesi.map(m=><div key={m.mese}>
       <div className="coppia">
        <i style={{height:`${m.entrate/max*100}%`}} title={`Entrate ${money(m.entrate)}`}/>
        <i style={{height:`${m.uscite/max*100}%`}} title={`Uscite ${money(m.uscite)}`}/>
       </div>
       <span>{NOMI[m.mese-1].slice(0,3)}</span>
      </div>)}
     </div>
     <table className="report-table">
      <thead><tr><th>Mese</th><th>Entrate</th><th>Uscite</th><th>Differenza</th></tr></thead>
      <tbody>{s.mesi.filter(m=>m.entrate||m.uscite).map(m=><tr key={m.mese}>
       <td>{NOMI[m.mese-1]}</td><td>{money(m.entrate)}</td><td>{money(m.uscite)}</td>
       <td className={m.entrate-m.uscite>=0?'buono':'meno'}>{money(m.entrate-m.uscite)}</td></tr>)}</tbody>
      <tfoot><tr><td>Totale</td><td>{money(s.entrate)}</td><td>{money(s.uscite)}</td><td>{money(s.saldo)}</td></tr></tfoot>
     </table>
     <h3>Dove sono andati i soldi</h3>
     <table className="report-table">
      <thead><tr><th>Categoria</th><th>Spesa {anno}</th><th>Quota</th><th>Rispetto al {Number(anno)-1}</th></tr></thead>
      <tbody>{s.categorie.map((c,i)=><tr key={c.nome}>
       <td><i className="pallino" style={{background:COLORI[i%COLORI.length]}}/> {c.nome}</td>
       <td>{money(c.valore)}</td>
       <td>{s.uscite?Math.round(c.valore/s.uscite*100):0}%</td>
       <td>{c.variazione===null?<span className="meta">nessun confronto</span>
        :<span className={c.variazione>0?'meno':'buono'}>{c.variazione>0?<TrendingUp size={14}/>:<TrendingDown size={14}/>} {c.variazione>0?'+':''}{c.variazione}% ({money(c.precedente)})</span>}</td>
      </tr>)}</tbody>
     </table>
     <p className="report-nota">I trasferimenti tra conti non sono contati come entrate o uscite. Gli importi provengono dai movimenti che hai registrato: Tasca non si collega alla banca e non verifica i saldi reali.</p>
    </div>}
 </section>;
}
