import {supabase} from './lib';
export class VideoError extends Error{constructor(message:string,public status:number){super(message);}}
export type VideoTicket={token:string;serverUrl:string;capacity:number};
export async function videoRequest<T=VideoTicket>(code:string,action:'join'|'heartbeat'|'leave',signal?:AbortSignal):Promise<T>{
 if(!supabase)throw new VideoError('Conecta Supabase para usar la llamada.',503);
 const {data,error}=await supabase.auth.getSession();
 if(error||!data.session)throw new VideoError('Vuelve a entrar con tu apodo.',401);
 const response=await fetch('/api/video',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session.access_token}`},body:JSON.stringify({code,action}),signal,keepalive:action==='leave'});
 if(!response.headers.get('content-type')?.includes('application/json'))throw new VideoError('El servidor de llamadas no está desplegado todavía.',503);
 const result=await response.json() as T&{error?:string};
 if(!response.ok)throw new VideoError(result.error||'La llamada no está disponible.',response.status);
 return result;
}
