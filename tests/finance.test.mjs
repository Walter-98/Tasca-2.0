import test from 'node:test';
import assert from 'node:assert/strict';
import {monthlyDates,accountBalance,validDate,othersShare,accountDebts,upcomingDue,monthlyTarget,addDays,monthsBetween} from '../src/lib/finance.ts';
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
