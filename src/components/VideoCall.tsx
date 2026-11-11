import {useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {LiveKitRoom,ParticipantTile,RoomAudioRenderer,useLocalParticipant,useParticipants,useRoomContext,useTracks} from '@livekit/components-react';
import {ConnectionState,RoomEvent,Track,VideoPresets,type RoomOptions} from 'livekit-client';
import {Camera,CameraOff,ChevronDown,ChevronLeft,ChevronRight,ChevronUp,Headphones,Loader2,Mic,MicOff,PhoneOff,Users,PictureInPicture2,GripHorizontal} from 'lucide-react';
import '@livekit/components-styles';
import './VideoCall.css';
import {syncCallSubscriptions} from '../callSubscriptions';
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
 useEffect(()=>{setFloating(false);setPosition(null)},[inRound]);
 function move(left:number,top:number){const bounds=panel.current?.getBoundingClientRect();if(!bounds)return;setPosition({left:Math.max(8,Math.min(window.innerWidth-bounds.width-8,left)),top:Math.max(8,Math.min(window.innerHeight-bounds.height-8,top))});}
 useEffect(()=>{if(!floating||!ticket)return;const resize=()=>{const b=panel.current?.getBoundingClientRect();if(b)move(b.left,b.top)};window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[floating,ticket]);
 const grip=<button className="icon-button video-grip" aria-label="Move call panel" title="Drag or use the arrow keys to move the panel" onPointerDown={e=>{const b=panel.current?.getBoundingClientRect();if(!b||!floating)return;drag.current={x:e.clientX,y:e.clientY,left:b.left,top:b.top};e.currentTarget.setPointerCapture(e.pointerId)}} onPointerMove={e=>{if(drag.current)move(drag.current.left+e.clientX-drag.current.x,drag.current.top+e.clientY-drag.current.y)}} onPointerUp={()=>{drag.current=null}} onPointerCancel={()=>{drag.current=null}} onLostPointerCapture={()=>{drag.current=null}} onKeyDown={e=>{if(!floating)return;const b=panel.current?.getBoundingClientRect();if(!b)return;const delta:Record<string,[number,number]>={ArrowLeft:[-20,0],ArrowRight:[20,0],ArrowUp:[0,-20],ArrowDown:[0,20]};if(delta[e.key]){e.preventDefault();move(b.left+delta[e.key][0],b.top+delta[e.key][1])}}}><GripHorizontal size={17}/></button>;
 const controller=useRef<AbortController|null>(null),alive=useRef(true),joined=useRef(false),attempt=useRef(0);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;attempt.current++;controller.current?.abort();if(joined.current)void videoRequest(code,'leave').catch(()=>{});};},[code]);
 function leave(){attempt.current++;controller.current?.abort();setTicket(null);setJoining(false);joined.current=false;void videoRequest(code,'leave').catch(()=>{});}
 useEffect(()=>{if(!canJoin&&ticket){setError('You are no longer a member of this room.');leave();}},[canJoin,ticket]);
 async function join(){
  if(joining||ticket)return;
  setJoining(true);setError('');setNotice('');controller.current=new AbortController();const current=++attempt.current;
  try{const next=await videoRequest(code,'join',controller.current.signal);if(alive.current&&current===attempt.current){joined.current=true;setTicket(next);}}
  catch(e){if(alive.current&&current===attempt.current&&!(e instanceof DOMException&&e.name==='AbortError'))setError(e instanceof Error?e.message:'We could not join the call.');}
  finally{if(alive.current&&current===attempt.current)setJoining(false);}
 }
 useEffect(()=>{
  if(!ticket)return;
  let stopped=false,pending=false,failures=0;
  const check=async()=>{if(pending)return;pending=true;try{await videoRequest(code,'heartbeat');failures=0;if(!stopped)setNotice('');}catch(e){
   if(stopped)return;
   if(e instanceof VideoError&&(e.status===401||e.status===403)){setError(e.message);leave();}
   else{failures++;setNotice('Checking call connection…');if(failures>=3){setError('The connection to the call server was lost. You can join again.');leave();}}
  }finally{pending=false;}};
  const timer=setInterval(()=>void check(),30000);const focus=()=>void check();window.addEventListener('online',focus);
  return()=>{stopped=true;clearInterval(timer);window.removeEventListener('online',focus);};
 },[ticket,code]);
 return <section ref={panel} className={`video-call ${inRound?'video-round':''} ${ticket&&floating?'video-floating':''}`} style={ticket&&floating&&position?{left:position.left,top:position.top,right:'auto',bottom:'auto'}:undefined} aria-label="Optional team call" data-testid="optional-call">
  {!ticket?<div className="video-invite"><div className="video-invite-icon"><Headphones size={23}/></div><div><span className="eyebrow">OPTIONAL · UP TO 20 PEOPLE</span><h2>Reactions are part of the fun.</h2><p>Play without a call or join just to listen. You choose when to enable your camera and microphone.</p></div><button className="secondary" onClick={()=>void join()} disabled={joining||!canJoin}>{joining?<Loader2 className="spin" size={17}/>:<Headphones size={17}/>} {joining?'Connecting…':'Join the call'}</button></div>:<LiveKitRoom data-lk-theme="default" token={ticket.token} serverUrl={ticket.serverUrl} options={options} connectOptions={connectOptions} connect={true} audio={false} video={false} onDisconnected={()=>{if(joined.current){joined.current=false;setTicket(null);setNotice('You left the call. You are still in the game.');}}} onError={e=>setError(`Call: ${e.message}`)}>
    <CallContent compact={inRound} leave={leave} setError={setError} grip={floating?grip:null} floating={floating} toggleFloating={()=>{setFloating(!floating);setPosition(null)}}/>
   </LiveKitRoom>}
  {error&&<div role="alert" className="video-message">{error}<button className="text-button" onClick={()=>setError('')}>Close</button></div>}
  {notice&&<p role="status" className="video-message">{notice}</p>}
 </section>
}

function CallContent({leave,setError,grip,floating,toggleFloating,compact}:{compact:boolean;leave:()=>void;setError:(message:string)=>void;grip:ReactNode;floating:boolean;toggleFloating:()=>void}){
 const room=useRoomContext(),{localParticipant,isMicrophoneEnabled,isCameraEnabled}=useLocalParticipant();
 const participants=useParticipants();
 const media=useTracks([{source:Track.Source.Camera,withPlaceholder:true},{source:Track.Source.Microphone,withPlaceholder:false}],{onlySubscribed:false});
 const cameras=useMemo(()=>media.filter(ref=>ref.source===Track.Source.Camera),[media]);
 const [expanded,setExpanded]=useState(false);
 const compactView=compact&&!expanded;
 const [page,setPage]=useState(0),[all,setAll]=useState(false),[collapsed,setCollapsed]=useState(false),[changing,setChanging]=useState(false),[connection,setConnection]=useState(room.state),[audioReady,setAudioReady]=useState(room.canPlaybackAudio);
 const sorted=[...cameras].sort((a,b)=>a.participant.identity.localeCompare(b.participant.identity));
 const pageSize=all?20:compactView?3:6,pages=Math.max(1,Math.ceil(sorted.length/pageSize)),current=Math.min(page,pages-1);
 const visible=collapsed?[]:sorted.slice(current*pageSize,(current+1)*pageSize);
 const visibleIds=visible.map(t=>t.participant.identity).join(',');
 useEffect(()=>{
  const sync=()=>syncCallSubscriptions(room.remoteParticipants.values(),new Set(visibleIds.split(',')));
  // Publications can arrive after a participant's camera; listen independently of the gallery.
  const events=[RoomEvent.TrackPublished,RoomEvent.TrackUnpublished,RoomEvent.TrackMuted,RoomEvent.TrackUnmuted,RoomEvent.ParticipantConnected,RoomEvent.Reconnected,RoomEvent.Connected] as const;
  for(const event of events)room.on(event,sync);
  sync();
  return()=>{for(const event of events)room.off(event,sync);};
 },[room,visibleIds]);
 useEffect(()=>{
  const handler=(value:ConnectionState)=>setConnection(value);
  const playback=()=>setAudioReady(room.canPlaybackAudio);
  room.on(RoomEvent.ConnectionStateChanged,handler);room.on(RoomEvent.AudioPlaybackStatusChanged,playback);
  playback();
  return()=>{room.off(RoomEvent.ConnectionStateChanged,handler);room.off(RoomEvent.AudioPlaybackStatusChanged,playback);};
 },[room]);
 async function enableSound(){
  try{await room.startAudio();setAudioReady(room.canPlaybackAudio);setError('');}
  catch{setError('Your browser blocked audio. Allow sound for this site and click Hear voices again.');}
 }
 async function toggle(kind:'camera'|'microphone'){
  setChanging(true);setError('');
  try{if(kind==='camera')await localParticipant.setCameraEnabled(!isCameraEnabled);else await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);}
  catch(e){const detail=e instanceof Error?e.message:'';setError(`Could not enable ${kind==='camera'?'the camera':'the microphone'}. Check browser permissions and make sure another app is not using the device. ${detail}`);}
  finally{setChanging(false)}
 }
 return <div className={compactView?'call-content video-compact':'call-content'}><div className="video-heading">{grip}<div><span className="eyebrow">TEAM CALL</span><strong><Users size={15}/>{participants.length}/20 in the call</strong></div><span className="video-quality">{connection===ConnectionState.Connected?'Connected · lightweight video':connection===ConnectionState.Reconnecting?'Reconnecting…':'Connecting…'}</span><button className="icon-button" aria-label={floating?'Dock call in page':'Float call over game'} onClick={toggleFloating}><PictureInPicture2 size={17}/></button><button className="icon-button" onClick={()=>setCollapsed(!collapsed)} aria-label={collapsed?'Show cameras':'Minimize cameras'}>{collapsed?<ChevronDown/>:<ChevronUp/>}</button></div>
 {compact&&<button className="text-button camera-size-toggle" aria-expanded={expanded} onClick={()=>{setExpanded(!expanded);setPage(0);setAll(false)}}>{expanded?'Compact cameras':'Expand cameras'}</button>}
 <RoomAudioRenderer volume={1}/>
 <button className="secondary video-start-audio" onClick={()=>void enableSound()} disabled={connection!==ConnectionState.Connected}><Headphones size={17}/>{audioReady?'Sound enabled · restart audio':'Hear voices · enable sound'}</button>
 {!isMicrophoneEnabled&&<p className="video-privacy" role="status">Your microphone is off. Click Enable microphone so others can hear you; enabling your camera does not enable your voice.</p>}
 {!collapsed&&<><div className={`video-grid ${all?'video-gallery':''}`} data-testid="call-camera-grid">{visible.map(ref=><ParticipantTile key={ref.participant.identity} trackRef={ref}/>)}</div><div className="video-pagination"><span>{all?'Gallery view · uses more data':'Paged cameras to save bandwidth'}</span><div><button className="text-button" onClick={()=>{setAll(!all);setPage(0)}}>{all?'View by page':'View everyone'}</button>{!all&&<><button className="icon-button" aria-label="Previous cameras" disabled={current===0} onClick={()=>setPage(current-1)}><ChevronLeft size={16}/></button><small>{current+1}/{pages}</small><button className="icon-button" aria-label="Next cameras" disabled={current>=pages-1} onClick={()=>setPage(current+1)}><ChevronRight size={16}/></button></>}</div></div></>}
 {collapsed&&<p className="video-collapsed">Cameras are minimized. Your camera and microphone keep their current settings.</p>}
 <MicrophoneLevel participant={localParticipant} enabled={isMicrophoneEnabled}/>
 <div className="video-controls"><button className={isMicrophoneEnabled?'secondary':'secondary media-off'} aria-pressed={isMicrophoneEnabled} onClick={()=>void toggle('microphone')} disabled={changing||connection!==ConnectionState.Connected}>{isMicrophoneEnabled?<Mic size={17}/>:<MicOff size={17}/>} {isMicrophoneEnabled?'Mute':'Enable microphone'}</button><button className={isCameraEnabled?'secondary':'secondary media-off'} aria-pressed={isCameraEnabled} onClick={()=>void toggle('camera')} disabled={changing||connection!==ConnectionState.Connected}>{isCameraEnabled?<Camera size={17}/>:<CameraOff size={17}/>} {isCameraEnabled?'Turn camera off':'Enable camera'}</button><button className="secondary leave-call" onClick={leave}><PhoneOff size={17}/>Leave call</button></div>
 <p className="video-privacy">Leaving the call does not leave the game. DoodleDash does not record this call.</p></div>
}

export function MicrophoneLevel({participant,enabled}:{participant:{audioLevel:number};enabled:boolean}){
 const [level,setLevel]=useState(0);
 useEffect(()=>{
  if(!enabled){setLevel(0);return;}
  const read=()=>setLevel(Math.round(Math.min(1,Math.max(0,participant.audioLevel||0))*100));
  read();const timer=setInterval(read,120);return()=>clearInterval(timer);
 },[participant,enabled]);
 return <div className="mic-check"><span>{enabled?'Microphone on':'Microphone off'}</span><div className="mic-level" role="meter" aria-label="Microphone input level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={level}><span style={{width:`${level}%`}}/></div><small>{!enabled?'Enable it to speak':level>2?'Input detected':'Speak to test your microphone'}</small></div>;
}
