export type Account={id:string,name:string,opening:number,opening_date:string,owner_id?:string,can_share?:boolean,shared?:boolean};
export type Recurring={id:string,type:string,amount:number,category:string,description:string,account_id:string,start_date:string,end_date:string|null,active:number};
export type Occurrence={id:string,recurring_id:string,date:string};
export function localToday(){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome'}).format(new Date());}
export function validDate(v:unknown):v is string {return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&v>='2000-01-01'&&v<='2100-12-31'&&!isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;}
// Clamp the original day independently each month: 31 Jan → 28 Feb → 31 Mar.
export function monthlyDates(start:string,end:string){if(!validDate(start)||!validDate(end)||end<start)return [];const day=Number(start.slice(8)),result:string[]=[];let y=Number(start.slice(0,4)),m=Number(start.slice(5,7));for(let i=0;i<1212;i++){const d=`${y}-${String(m).padStart(2,'0')}-${String(Math.min(day,new Date(Date.UTC(y,m,0)).getUTCDate())).padStart(2,'0')}`;if(d>end)break;result.push(d);m++;if(m===13){m=1;y++;}}return result;}
export const money=(n:number)=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(n/100);
export function accountBalance(account:Account,movements:{type:string,amount:number,date:string,account_id?:string|null,to_account_id?:string|null}[],at=localToday()){return account.opening+movements.filter(m=>m.date>=account.opening_date&&m.date<=at).reduce((n,m)=>n+(m.to_account_id===account.id&&m.type==='transfer'?m.amount:0)+(m.account_id===account.id?(m.type==='income'?m.amount:-m.amount):0),0);}
