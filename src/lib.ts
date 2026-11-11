import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const configured = Boolean(url && key && !url.includes('YOUR_PROJECT') && !key.includes('YOUR_'));
export const supabase = configured ? createClient(url, key, {auth:{flowType:'pkce',persistSession:true,detectSessionInUrl:true}}) : null;
export async function rpc<T>(fn:string,args:Record<string,unknown>): Promise<T> {
 if(!supabase) throw new Error('Falta conectar Supabase. Puedes probar el lienzo en la práctica individual.');
 const {data,error} = await supabase.rpc(fn,args);
 if(error) throw new Error(error.message);
 return data as T;
}
export function normalizeCode(value:string) { return value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,12); }
export function secondsLeft(deadline:string|null, serverOffset:number, now=Date.now()) {return deadline ? Math.max(0, Math.ceil((Date.parse(deadline)-now-serverOffset)/1000)):0;}
export function downloadJson(filename:string,value:unknown) {
 const href=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=href;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);
}
export function beep() {
 try { const ctx=new AudioContext();const osc=ctx.createOscillator();const gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);gain.gain.setValueAtTime(.04,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.25);osc.frequency.value=650;osc.start();osc.stop(ctx.currentTime+.25);osc.onended=()=>void ctx.close(); } catch { /* Sound is optional. */ }
}
