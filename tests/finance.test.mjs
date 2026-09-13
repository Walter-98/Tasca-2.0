import test from 'node:test';
import assert from 'node:assert/strict';
import {monthlyDates,accountBalance,validDate} from '../src/lib/finance.ts';
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
