import {SignJWT} from 'jose';

export type VideoEnv = {
 VITE_SUPABASE_URL?:string; VITE_SUPABASE_ANON_KEY?:string;
 LIVEKIT_URL?:string; LIVEKIT_API_KEY?:string; LIVEKIT_API_SECRET?:string; VIDEO_ENABLED?:string;
};
type Admission={roomName:string;identity:string;name:string;avatar:string;capacity:number;members:string[]};
type Fetcher=typeof fetch;
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const message=(error:string,status:number)=>json({error},status);

// Server-only: this module is never imported by the Vite browser entrypoint.
export async function handleVideo(request:Request,env:VideoEnv,fetcher:Fetcher=fetch):Promise<Response>{
 if(request.method!=='POST')return message('Método no permitido.',405);
 if(request.headers.get('Origin')!==new URL(request.url).origin)return message('Origen no permitido.',403);
 if(!request.headers.get('content-type')?.includes('application/json'))return message('Envía JSON.',415);
 if(Number(request.headers.get('content-length')||0)>2048)return message('Solicitud demasiado grande.',413);
 if(env.VIDEO_ENABLED!=='true'||!env.LIVEKIT_URL||!env.LIVEKIT_API_KEY||!env.LIVEKIT_API_SECRET||!env.VITE_SUPABASE_URL||!env.VITE_SUPABASE_ANON_KEY)return message('La videollamada todavía no está activada. Puedes seguir jugando sin ella.',503);
 const authorization=request.headers.get('Authorization');
 if(!authorization?.startsWith('Bearer ')||authorization.length>8192)return message('Vuelve a entrar al juego.',401);
 let body:{code?:unknown;action?:unknown};
 try{let raw='';let bytes=0;const reader=request.body?.getReader(),decoder=new TextDecoder();if(reader){while(true){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.byteLength;if(bytes>2048){await reader.cancel();return message('Solicitud demasiado grande.',413);}raw+=decoder.decode(chunk.value,{stream:true});}raw+=decoder.decode();}body=JSON.parse(raw);}catch{return message('Solicitud no válida.',400);}
 if(!body||typeof body!=='object'||typeof body.code!=='string'||!/^([A-F0-9]{6}|[A-F0-9]{12})$/.test(body.code))return message('Código de sala no válido.',400);
 const action=body.action??'join';
 if(typeof action!=='string'||!['join','heartbeat','leave'].includes(action))return message('Acción no válida.',400);
 try{
  const sb=new URL(env.VITE_SUPABASE_URL),lk=new URL(env.LIVEKIT_URL);
  if(sb.protocol!=='https:'||lk.protocol!=='wss:')return message('Configuración de llamada no válida.',503);
  const authHeaders={apikey:env.VITE_SUPABASE_ANON_KEY,Authorization:authorization};
  const auth=await fetcher(`${sb.origin}/auth/v1/user`,{headers:authHeaders,signal:AbortSignal.timeout(8000)});
  if(!auth.ok)return message('Tu sesión de invitado venció. Vuelve a entrar.',401);
  const user=await auth.json() as {id?:string;is_anonymous?:boolean};
  if(!user.id||user.is_anonymous!==true)return message('Se requiere una sesión de invitado del juego.',403);
  const roomName=`doodledash-${body.code}`;
  async function service(method:string,data:unknown){
   const jwt=await new SignJWT({video:{room:roomName,roomAdmin:true,roomCreate:method==='CreateRoom'}}).setProtectedHeader({alg:'HS256'}).setIssuer(env.LIVEKIT_API_KEY!).setIssuedAt().setNotBefore(Math.floor(Date.now()/1000)-5).setExpirationTime('60s').sign(new TextEncoder().encode(env.LIVEKIT_API_SECRET));
   const url=new URL(`/twirp/livekit.RoomService/${method}`,lk);url.protocol='https:';
   const response=await fetcher(url,{method:'POST',headers:{Authorization:`Bearer ${jwt}`,'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(8000)});
   if(!response.ok){if(method==='RemoveParticipant'&&response.status===404)return {};throw new Error('Media service unavailable');}
   return await response.json() as Record<string,unknown>;
  }
  // A departed member may remove only their own media identity, never somebody else's.
  if(action==='leave'){await service('RemoveParticipant',{room:roomName,identity:user.id});return json({ok:true});}
  const access=await fetcher(`${sb.origin}/rest/v1/rpc/game_video_access`,{method:'POST',headers:{...authHeaders,'Content-Type':'application/json'},body:JSON.stringify({code:body.code,issue_token:action==='join'}),signal:AbortSignal.timeout(8000)});
  if(!access.ok){const failure=await access.json().catch(()=>({})) as {code?:string};if(failure.code==='PGRST202'||failure.code==='42883')return message('Falta aplicar el SQL de videollamadas en Supabase.',503);if(access.status>=500||access.status===429)return message('El servidor está ocupado. Puedes seguir jugando y reintentar la llamada.',access.status===429?429:502);return message(failure.code==='P0001'?'Espera cinco segundos antes de volver a entrar.':'Ya no tienes acceso a esta llamada.',failure.code==='P0001'?429:403);}
  const admission=await access.json() as Admission;
  if(admission.identity!==user.id||admission.roomName!==roomName||admission.capacity!==20||!admission.members.includes(user.id))return message('Acceso a llamada no válido.',403);
  if(action==='join')await service('CreateRoom',{name:roomName,maxParticipants:20,emptyTimeout:120,departureTimeout:20});
  // Every connected client's heartbeat removes participants no longer in the game.
  const list=await service('ListParticipants',{room:roomName});
  const members=new Set(admission.members);
  const stale=((list.participants??[]) as {identity:string}[]).filter(p=>!members.has(p.identity));
  for(const p of stale)await service('RemoveParticipant',{room:roomName,identity:p.identity});
  if(action==='heartbeat')return json({ok:true,capacity:20});
  const token=await new SignJWT({name:admission.name,metadata:JSON.stringify({avatar:admission.avatar}),video:{room:roomName,roomJoin:true,canPublish:true,canSubscribe:true,canPublishData:false,canUpdateOwnMetadata:false,canPublishSources:['camera','microphone']}})
   .setProtectedHeader({alg:'HS256'}).setIssuer(env.LIVEKIT_API_KEY).setSubject(user.id).setIssuedAt().setNotBefore(Math.floor(Date.now()/1000)-5).setExpirationTime('120s').sign(new TextEncoder().encode(env.LIVEKIT_API_SECRET));
  return json({token,serverUrl:lk.origin,capacity:20});
 }catch{return message('No pudimos conectar la llamada. Reintenta; tu partida sigue disponible.',502);}
}
