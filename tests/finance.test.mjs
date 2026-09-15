import test from 'node:test';
import assert from 'node:assert/strict';
import {monthlyDates,accountBalance,validDate,othersShare,accountDebts,upcomingDue,monthlyTarget,addDays,monthsBetween,leggiCsv,leggiImporto,leggiData,rilevaColonne,convertiRighe,semplificaSaldi,statisticheAnno,impronta,categoriaDa,saldiGruppo} from '../src/lib/finance.ts';
test('monthly dates clamp without drifting after February',()=>{
assert.deepEqual(monthlyDates('2026-01-31','2026-04-30'),['2026-01-31','2026-02-28','2026-03-31','2026-04-30']);
assert.deepEqual(monthlyDates('2024-01-31','2024-03-30'),['2024-01-31','2024-02-29']);
});
test('invalid dates and reversed periods produce no occurrences',()=>{
assert.equal(validDate('2026-02-30'),false);assert.deepEqual(monthlyDates('2026-03-15','2026-03-14'),[]);
assert.deepEqual(monthlyDates('2026-02-30','2026-03-30'),[]);
});
test('transfers preserve total available and exclude future movements',()=>{
const a={id:'bank',name:'Bank',opening:100000,opening_date:'2026-01-01'};
const b={id:'cash',name:'Cash',opening:10000,opening_date:'2026-01-01'};
const m=[{type:'transfer',amount:20000,date:'2026-01-02',account_id:'bank',to_account_id:'cash'},
{type:'expense',amount:1500,date:'2026-01-03',account_id:'cash'},
{type:'income',amount:200000,date:'2026-02-01',account_id:'bank'},
{type:'expense',amount:10000,date:'2025-12-31',account_id:'bank'},
{type:'expense',amount:9000,date:'2026-01-02',account_id:null}];
assert.equal(accountBalance(a,m,'2026-01-15'),80000);assert.equal(accountBalance(b,m,'2026-01-15'),28500);
assert.equal(accountBalance(a,m,'2026-01-15')+accountBalance(b,m,'2026-01-15'),108500);
});

test('la quota degli altri rispetta la percentuale di chi paga',()=>{
 assert.equal(othersShare(10000,50,1),5000);
 assert.equal(othersShare(10000,70,1),3000);
 assert.equal(othersShare(10000,0,1),10000);
 assert.equal(othersShare(9999,50,1),4999); // il centesimo dispari resta a chi ha pagato
 assert.equal(othersShare(10000,40,2),3000);
 assert.equal(othersShare(10000,50,0),0);
});

test('il saldo tra due persone tiene conto dei rimborsi',()=>{
 const mov=[
  {id:'1',type:'expense',amount:10000,date:'2026-09-01',account_id:'c',owner_id:'io',split:50},
  {id:'2',type:'expense',amount:6000,date:'2026-09-02',account_id:'c',owner_id:'lei',split:50},
  {id:'3',type:'expense',amount:4000,date:'2026-09-03',account_id:'c',owner_id:'io',split:null},
  {id:'4',type:'expense',amount:9000,date:'2026-09-04',account_id:'altro',owner_id:'io',split:50}];
 const net=accountDebts('c','io',['io','lei'],mov,[]);
 assert.equal(net.lei,2000);
 const conRimborso=accountDebts('c','io',['io','lei'],mov,[{id:'r',account_id:'c',from_user:'lei',to_user:'io',amount:2000,date:'2026-09-05',note:''}]);
 assert.equal(conRimborso.lei,0);
});

test('le scadenze in arrivo distinguono il gia arrivato dal prossimo',()=>{
 const regola={id:'a',active:1,start_date:'2026-09-10',end_date:null,type:'expense',amount:100,category:'Casa',description:'Affitto',account_id:'c'};
 const righe=upcomingDue([regola],new Set(),'2026-09-14',7);
 assert.deepEqual(righe.map(r=>[r.date,r.late]),[['2026-09-10',true]]);
 const conProssima=upcomingDue([regola],new Set(['rec:a:2026-09-10']),'2026-10-08',7);
 assert.deepEqual(conProssima.map(r=>[r.date,r.late]),[['2026-10-10',false]]);
});

test('accantonamento mensile per arrivare in tempo',()=>{
 assert.equal(monthlyTarget({id:'g',name:'Vacanza',target:120000,saved:20000,due_date:'2027-09-14'},'2026-09-14'),Math.ceil(100000/12));
 assert.equal(monthlyTarget({id:'g',name:'Vacanza',target:120000,saved:120000,due_date:'2027-09-14'},'2026-09-14'),0);
 assert.equal(monthlyTarget({id:'g',name:'Vacanza',target:1000,saved:0,due_date:null},'2026-09-14'),null);
 assert.equal(monthlyTarget({id:'g',name:'Vacanza',target:1000,saved:0,due_date:'2026-09-20'},'2026-09-14'),1000);
});

test('legge gli importi nei formati che usano le banche',()=>{
 assert.equal(leggiImporto('1.234,56'),123456);
 assert.equal(leggiImporto('1,234.56'),123456);
 assert.equal(leggiImporto('-45,20'),-4520);
 assert.equal(leggiImporto('(45,20)'),-4520);
 assert.equal(leggiImporto('€ 12,00'),1200);
 assert.equal(leggiImporto('1.500'),150000);
 assert.equal(leggiImporto('12.50'),1250);
 assert.equal(leggiImporto('abc'),null);
 assert.equal(leggiImporto(''),null);
});

test('legge le date nei formati che usano le banche',()=>{
 assert.equal(leggiData('31/01/2026'),'2026-01-31');
 assert.equal(leggiData('01-02-2026'),'2026-02-01');
 assert.equal(leggiData('2026-03-05'),'2026-03-05');
 assert.equal(leggiData('05.04.2026'),'2026-04-05');
 assert.equal(leggiData('05/04/26'),'2026-04-05');
 assert.equal(leggiData('32/01/2026'),null);
 assert.equal(leggiData('non una data'),null);
});

test('il CSV con virgolette e punto e virgola viene letto per intero',()=>{
 const csv='Data;Descrizione;Importo\n31/01/2026;"SUPERMERCATO, VIA ROMA";-45,20\n01/02/2026;STIPENDIO;1.800,00\n';
 const righe=leggiCsv(csv);
 assert.equal(righe.length,3);
 assert.deepEqual(righe[1],['31/01/2026','SUPERMERCATO, VIA ROMA','-45,20']);
 const col=rilevaColonne(righe[0]);
 assert.equal(col.data,0);assert.equal(col.descrizione,1);assert.equal(col.importo,2);
 const {righe:mov,scartate}=convertiRighe(righe,col);
 assert.equal(scartate,0);
 assert.deepEqual(mov[0],{date:'2026-01-31',amount:4520,description:'SUPERMERCATO, VIA ROMA',type:'expense'});
 assert.equal(mov[1].type,'income');
});

test('colonne separate dare e avere',()=>{
 const csv='Data operazione,Causale,Uscite,Entrate\n10/03/2026,Affitto,600.00,\n15/03/2026,Rimborso,,120.50\n';
 const righe=leggiCsv(csv);
 const col=rilevaColonne(righe[0]);
 const {righe:mov}=convertiRighe(righe,col);
 assert.deepEqual(mov.map(m=>[m.type,m.amount]),[['expense',60000],['income',12050]]);
});

test('l impronta riconosce lo stesso movimento importato due volte',()=>{
 const a={date:'2026-01-31',amount:4520,description:'Supermercato  via Roma',type:'expense'};
 const b={date:'2026-01-31',amount:4520,description:'SUPERMERCATO VIA ROMA',type:'expense'};
 assert.equal(impronta(a),impronta(b));
 assert.notEqual(impronta(a),impronta({...a,amount:4521}));
});

test('le regole assegnano la categoria dalla descrizione',()=>{
 const regole={'esselunga':'Spesa alimentare','enel':'Casa'};
 assert.equal(categoriaDa('PAGAMENTO POS ESSELUNGA SPA',regole),'Spesa alimentare');
 assert.equal(categoriaDa('Bolletta ENEL energia',regole),'Casa');
 assert.equal(categoriaDa('Qualcos altro',regole),null);
});

test('il giro di rimborsi e il piu corto possibile',()=>{
 const giro=semplificaSaldi({anna:-5000,marco:3000,luca:2000});
 assert.equal(giro.length,2);
 assert.deepEqual(giro.map(g=>[g.da,g.a,g.importo]),[['anna','marco',3000],['anna','luca',2000]]);
 assert.deepEqual(semplificaSaldi({a:0,b:0}),[]);
});

test('le statistiche annuali confrontano con l anno prima',()=>{
 const mov=[
  {type:'expense',amount:10000,date:'2026-01-10',category:'Casa'},
  {type:'expense',amount:5000,date:'2026-02-10',category:'Trasporti'},
  {type:'income',amount:200000,date:'2026-01-27',category:'Stipendio'},
  {type:'expense',amount:8000,date:'2025-01-10',category:'Casa'}];
 const s=statisticheAnno(mov,'2026');
 assert.equal(s.entrate,200000);
 assert.equal(s.uscite,15000);
 assert.equal(s.saldo,185000);
 assert.equal(s.categorie[0].nome,'Casa');
 assert.equal(s.categorie[0].variazione,25);
 assert.equal(s.categorie[1].variazione,null);
 assert.equal(s.mesi[0].uscite,10000);
});

test('in un gruppo di tre i saldi si compensano e il giro e minimo',()=>{
 const mov=[
  {id:'1',type:'expense',amount:9000,date:'2026-09-01',account_id:'casa',owner_id:'anna',split:34},
  {id:'2',type:'expense',amount:6000,date:'2026-09-02',account_id:'casa',owner_id:'marco',split:34}];
 const netti=saldiGruppo('casa',['anna','marco','luca'],mov,[]);
 assert.equal(Object.values(netti).reduce((a,b)=>a+b,0),0);
 assert.ok(netti.anna>0&&netti.luca<0);
 const giro=semplificaSaldi(netti);
 assert.ok(giro.length<=2);
 const dovuto=Object.values(netti).filter(v=>v<0).reduce((a,b)=>a-b,0);
 assert.equal(giro.reduce((s,g)=>s+g.importo,0),dovuto);
});
