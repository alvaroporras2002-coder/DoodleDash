import {supabase} from './lib';
export class VideoError extends Error{constructor(message:string,public status:number){super(message);}}
export type VideoTicket={token:string;serverUrl:string;capacity:number};
export async function videoRequest<T=VideoTicket>(code:string,action:'join'|'heartbeat'|'leave',signal?:AbortSignal):Promise<T>{
 if(!supabase)throw new VideoError('Connect Supabase to use the call.',503);
 const {data,error}=await supabase.auth.getSession();
 if(error||!data.session)throw new VideoError('Join again with your nickname.',401);
 const response=await fetch('/api/video',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session.access_token}`},body:JSON.stringify({code,action}),signal,keepalive:action==='leave'});
 if(!response.headers.get('content-type')?.includes('application/json'))throw new VideoError('The call server has not been deployed yet.',503);
 const result=await response.json() as T&{error?:string};
 if(!response.ok)throw new VideoError(result.error||'The call is unavailable.',response.status);
 return result;
}
