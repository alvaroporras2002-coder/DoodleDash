import {useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {LiveKitRoom,ParticipantTile,RoomAudioRenderer,StartAudio,useLocalParticipant,useParticipants,useRoomContext,useTracks} from '@livekit/components-react';
import {ConnectionState,RoomEvent,Track,VideoPresets,type RoomOptions} from 'livekit-client';
import {Camera,CameraOff,ChevronDown,ChevronLeft,ChevronRight,ChevronUp,Headphones,Loader2,Mic,MicOff,PhoneOff,Users,PictureInPicture2,GripHorizontal} from 'lucide-react';
import '@livekit/components-styles';
import './VideoCall.css';
import {VideoError,videoRequest,type VideoTicket} from '../videoApi';

const options:RoomOptions={adaptiveStream:true,dynacast:true,disconnectOnPageLeave:true,
 audioCaptureDefaults:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},
 videoCaptureDefaults:{resolution:{width:320,height:180,frameRate:15}},
 publishDefaults:{simulcast:true,videoEncoding:{maxBitrate:150_000,maxFramerate:15},videoSimulcastLayers:[VideoPresets.h90],dtx:true,red:true,stopMicTrackOnMute:true}};

const connectOptions={autoSubscribe:false};

// Mounted once per game room; round changes never reconnect the call.
export default function VideoCall({code,canJoin=true,inRound=false}:{code:string;canJoin?:boolean;inRound?:boolean}){
 const [ticket,setTicket]=useState<VideoTicket|null>(null),[joining,setJoining]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [floating,setFloating]=useState(false),[position,setPosition]=useState<{left:number;top:number}|null>(null);
 const panel=useRef<HTMLElement|null>(null),drag=useRef<{x:number;y:number;left:number;top:number}|null>(null);
 useEffect(()=>{setFloating(inRound);setPosition(null)},[inRound]);
 function move(left:number,top:number){const bounds=panel.current?.getBoundingClientRect();if(!bounds)return;setPosition({left:Math.max(8,Math.min(window.innerWidth-bounds.width-8,left)),top:Math.max(8,Math.min(window.innerHeight-bounds.height-8,top))});}
 useEffect(()=>{if(!floating||!ticket)return;const resize=()=>{const b=panel.current?.getBoundingClientRect();if(b)move(b.left,b.top)};window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[floating,ticket]);
 const grip=<button className="icon-button video-grip" aria-label="Mover panel de llamada" title="Arrastra o usa las flechas para mover el panel" onPointerDown={e=>{const b=panel.current?.getBoundingClientRect();if(!b||!floating)return;drag.current={x:e.clientX,y:e.clientY,left:b.left,top:b.top};e.currentTarget.setPointerCapture(e.pointerId)}} onPointerMove={e=>{if(drag.current)move(drag.current.left+e.clientX-drag.current.x,drag.current.top+e.clientY-drag.current.y)}} onPointerUp={()=>{drag.current=null}} onPointerCancel={()=>{drag.current=null}} onLostPointerCapture={()=>{drag.current=null}} onKeyDown={e=>{if(!floating)return;const b=panel.current?.getBoundingClientRect();if(!b)return;const delta:Record<string,[number,number]>={ArrowLeft:[-20,0],ArrowRight:[20,0],ArrowUp:[0,-20],ArrowDown:[0,20]};if(delta[e.key]){e.preventDefault();move(b.left+delta[e.key][0],b.top+delta[e.key][1])}}}><GripHorizontal size={17}/></button>;
 const controller=useRef<AbortController|null>(null),alive=useRef(true),joined=useRef(false),attempt=useRef(0);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;attempt.current++;controller.current?.abort();if(joined.current)void videoRequest(code,'leave').catch(()=>{});};},[code]);
 function leave(){attempt.current++;controller.current?.abort();setTicket(null);setJoining(false);joined.current=false;void videoRequest(code,'leave').catch(()=>{});}
 useEffect(()=>{if(!canJoin&&ticket){setError('Ya no participas en esta sala.');leave();}},[canJoin,ticket]);
 async function join(){
  if(joining||ticket)return;
  setJoining(true);setError('');setNotice('');controller.current=new AbortController();const current=++attempt.current;
  try{const next=await videoRequest(code,'join',controller.current.signal);if(alive.current&&current===attempt.current){joined.current=true;setTicket(next);}}
  catch(e){if(alive.current&&current===attempt.current&&!(e instanceof DOMException&&e.name==='AbortError'))setError(e instanceof Error?e.message:'No pudimos entrar a la llamada.');}
  finally{if(alive.current&&current===attempt.current)setJoining(false);}
 }
 useEffect(()=>{
  if(!ticket)return;
  let stopped=false,pending=false,failures=0;
  const check=async()=>{if(pending)return;pending=true;try{await videoRequest(code,'heartbeat');failures=0;if(!stopped)setNotice('');}catch(e){
   if(stopped)return;
   if(e instanceof VideoError&&(e.status===401||e.status===403)){setError(e.message);leave();}
   else{failures++;setNotice('Comprobando conexión de llamada…');if(failures>=3){setError('Se perdió la conexión con el servidor de llamadas. Puedes volver a entrar.');leave();}}
  }finally{pending=false;}};
  const timer=setInterval(()=>void check(),30000);const focus=()=>void check();window.addEventListener('online',focus);
  return()=>{stopped=true;clearInterval(timer);window.removeEventListener('online',focus);};
 },[ticket,code]);
 return <section ref={panel} className={`video-call ${ticket&&floating?'video-floating':''}`} style={ticket&&floating&&position?{left:position.left,top:position.top,right:'auto',bottom:'auto'}:undefined} aria-label="Llamada opcional del equipo" data-testid="optional-call">
  {!ticket?<div className="video-invite"><div className="video-invite-icon"><Headphones size={23}/></div><div><span className="eyebrow">OPCIONAL · HASTA 20 PERSONAS</span><h2>Las reacciones también juegan.</h2><p>Puedes jugar sin llamada o entrar solo para escuchar. Tú decides cuándo activar cámara y micrófono.</p></div><button className="secondary" onClick={()=>void join()} disabled={joining||!canJoin}>{joining?<Loader2 className="spin" size={17}/>:<Headphones size={17}/>} {joining?'Conectando…':'Entrar a la llamada'}</button></div>:<LiveKitRoom data-lk-theme="default" token={ticket.token} serverUrl={ticket.serverUrl} options={options} connectOptions={connectOptions} connect={true} audio={false} video={false} onDisconnected={()=>{if(joined.current){joined.current=false;setTicket(null);setNotice('Saliste de la llamada. Sigues en la partida.');}}} onError={e=>setError(`Llamada: ${e.message}`)}>
    <CallContent leave={leave} setError={setError} grip={floating?grip:null} floating={floating} toggleFloating={()=>{setFloating(!floating);setPosition(null)}}/>
   </LiveKitRoom>}
  {error&&<div role="alert" className="video-message">{error}<button className="text-button" onClick={()=>setError('')}>Cerrar</button></div>}
  {notice&&<p role="status" className="video-message">{notice}</p>}
 </section>
}

function CallContent({leave,setError,grip,floating,toggleFloating}:{leave:()=>void;setError:(message:string)=>void;grip:ReactNode;floating:boolean;toggleFloating:()=>void}){
 const room=useRoomContext(),{localParticipant,isMicrophoneEnabled,isCameraEnabled}=useLocalParticipant();
 const participants=useParticipants();
 const media=useTracks([{source:Track.Source.Camera,withPlaceholder:true},{source:Track.Source.Microphone,withPlaceholder:false}],{onlySubscribed:false});
 const cameras=useMemo(()=>media.filter(ref=>ref.source===Track.Source.Camera),[media]);
 const [page,setPage]=useState(0),[all,setAll]=useState(false),[collapsed,setCollapsed]=useState(false),[changing,setChanging]=useState(false),[connection,setConnection]=useState(room.state);
 const sorted=[...cameras].sort((a,b)=>a.participant.identity.localeCompare(b.participant.identity));
 const pageSize=all?20:6,pages=Math.max(1,Math.ceil(sorted.length/pageSize)),current=Math.min(page,pages-1);
 const visible=collapsed?[]:sorted.slice(current*pageSize,(current+1)*pageSize);
 const visibleIds=visible.map(t=>t.participant.identity).join(',');
 useEffect(()=>{
  const allowed=new Set(visibleIds.split(','));
  for(const p of room.remoteParticipants.values())for(const publication of p.trackPublications.values()){
   const subscribe=publication.source===Track.Source.Microphone||(publication.source===Track.Source.Camera&&allowed.has(p.identity));
   if(publication.isSubscribed!==subscribe)publication.setSubscribed(subscribe);
  }
 },[room,visibleIds,cameras]);
 useEffect(()=>{const handler=(value:ConnectionState)=>setConnection(value);room.on(RoomEvent.ConnectionStateChanged,handler);return()=>{room.off(RoomEvent.ConnectionStateChanged,handler);};},[room]);
 async function toggle(kind:'camera'|'microphone'){
  setChanging(true);setError('');
  try{if(kind==='camera')await localParticipant.setCameraEnabled(!isCameraEnabled);else await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);}
  catch(e){const detail=e instanceof Error?e.message:'';setError(`No pudimos activar ${kind==='camera'?'la cámara':'el micrófono'}. Revisa el permiso del navegador y que otra aplicación no esté usando el dispositivo. ${detail}`);}
  finally{setChanging(false)}
 }
 return <><div className="video-heading">{grip}<div><span className="eyebrow">LLAMADA DEL EQUIPO</span><strong><Users size={15}/>{participants.length}/20 en la llamada</strong></div><span className="video-quality">{connection===ConnectionState.Connected?'Conectados · video ligero':connection===ConnectionState.Reconnecting?'Reconectando…':'Conectando…'}</span><button className="icon-button" aria-label={floating?'Fijar llamada en la página':'Flotar llamada sobre el juego'} onClick={toggleFloating}><PictureInPicture2 size={17}/></button><button className="icon-button" onClick={()=>setCollapsed(!collapsed)} aria-label={collapsed?'Mostrar cámaras':'Minimizar cámaras'}>{collapsed?<ChevronDown/>:<ChevronUp/>}</button></div>
 <RoomAudioRenderer/>
 <StartAudio label="Activar sonido de la llamada" className="secondary video-start-audio"/>
 {!collapsed&&<><div className={`video-grid ${all?'video-gallery':''}`} data-testid="call-camera-grid">{visible.map(ref=><ParticipantTile key={ref.participant.identity} trackRef={ref}/>)}</div><div className="video-pagination"><span>{all?'Vista de todos · mayor consumo de datos':'Hasta seis cámaras a la vez para cuidar tu conexión'}</span><div><button className="text-button" onClick={()=>{setAll(!all);setPage(0)}}>{all?'Ver por páginas':'Ver a todos'}</button>{!all&&<><button className="icon-button" aria-label="Cámaras anteriores" disabled={current===0} onClick={()=>setPage(current-1)}><ChevronLeft size={16}/></button><small>{current+1}/{pages}</small><button className="icon-button" aria-label="Cámaras siguientes" disabled={current>=pages-1} onClick={()=>setPage(current+1)}><ChevronRight size={16}/></button></>}</div></div></>}
 {collapsed&&<p className="video-collapsed">Las cámaras están minimizadas. Tu cámara y micrófono conservan el estado de sus botones.</p>}
 <div className="video-controls"><button className={isMicrophoneEnabled?'secondary':'secondary media-off'} aria-pressed={isMicrophoneEnabled} onClick={()=>void toggle('microphone')} disabled={changing||connection!==ConnectionState.Connected}>{isMicrophoneEnabled?<Mic size={17}/>:<MicOff size={17}/>} {isMicrophoneEnabled?'Silenciar':'Activar micrófono'}</button><button className={isCameraEnabled?'secondary':'secondary media-off'} aria-pressed={isCameraEnabled} onClick={()=>void toggle('camera')} disabled={changing||connection!==ConnectionState.Connected}>{isCameraEnabled?<Camera size={17}/>:<CameraOff size={17}/>} {isCameraEnabled?'Apagar cámara':'Activar cámara'}</button><button className="secondary leave-call" onClick={leave}><PhoneOff size={17}/>Salir de la llamada</button></div>
 <p className="video-privacy">Salir de la llamada no te saca del juego. DoodleDash no graba esta llamada.</p></>
}
