// Legge il PDF dell'estratto conto dentro il browser: il file non esce dal
// telefono o dal computer, non passa da nessun server.
import {getDocument,GlobalWorkerOptions} from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type {VocePdf} from './finance';
GlobalWorkerOptions.workerSrc=workerUrl;
export async function estraiPdf(file:File,maxPagine=80):Promise<VocePdf[][]>{
 const lettura=getDocument({data:new Uint8Array(await file.arrayBuffer()),useSystemFonts:false});
 const doc=await lettura.promise;
 const pagine:VocePdf[][]=[];
 try{
  for(let n=1;n<=Math.min(doc.numPages,maxPagine);n++){
   const pagina=await doc.getPage(n);
   const contenuto=await pagina.getTextContent();
   pagine.push(contenuto.items.flatMap((i:any)=>typeof i.str==='string'&&i.str.trim()?[{t:i.str,x:Math.round(i.transform[4]*10)/10,y:Math.round(i.transform[5]*10)/10}]:[]));
   pagina.cleanup();
  }
 }finally{await lettura.destroy();}
 return pagine;
}
