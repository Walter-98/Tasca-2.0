import {loadEnv} from 'vite';
const env={...loadEnv('production',process.cwd(),'VITE_'),...process.env};
const url=env.VITE_SUPABASE_URL,key=env.VITE_SUPABASE_PUBLISHABLE_KEY;
if(url||key){
 let publicKey=key?.startsWith('sb_publishable_');
 if(key?.startsWith('eyJ')){try{publicKey=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString()).role==='anon';}catch{publicKey=false;}}
 if(!/^https:\/\/[^/]+\.supabase\.co$/.test(url||'')||!publicKey)throw Error('Configurazione non valida. Usa Project URL e Publishable key (oppure JWT anon). Non usare chiavi segrete o service_role.');
}
