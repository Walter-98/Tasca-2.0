import {createClient} from '@supabase/supabase-js';
const url=import.meta.env.VITE_SUPABASE_URL||'',key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||'';
export const configured=/^https:\/\/[^/]+\.supabase\.co$/.test(url)&&key.length>30&&!key.includes('YOUR-');
export const supabase=configured?createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
export const homeUrl=()=>new URL(import.meta.env.BASE_URL,location.href).href.split('#')[0].split('?')[0];
export async function apiFetch(path:string,options?:RequestInit){
 if(!supabase)return Response.json({error:'Tasca non è ancora configurata.'},{status:503});
 if(!navigator.onLine)return Response.json({error:'Sei offline. Riconnettiti prima di salvare.'},{status:503});
 const {data,error}=options?.method==='POST'?await supabase.rpc('tasca_mutate',{kind:path.split('/').pop(),v:JSON.parse(String(options.body))}):await supabase.rpc('tasca_snapshot');
 if(error)return Response.json({error:error.message.startsWith('Tasca:')?error.message.slice(6).trim():'Operazione non riuscita. Controlla la connessione e riprova.'},{status:400});
 return Response.json(data);
}
