import {useCallback,useEffect,useRef,useState} from 'react';
import {rpc,supabase,secondsLeft} from './lib';
import type {GameState} from './types';
export function useRoom(code:string,userId:string|undefined) {
 const [state,setState]=useState<GameState|null>(null),[error,setError]=useState(''),[connected,setConnected]=useState(false),[busy,setBusy]=useState(false);
 const live=useRef(false),actionFlight=useRef<Promise<void>|null>(null),actionKey=useRef('');
 const offset=useRef(0),pending=useRef(false),queued=useRef(false),generation=useRef(0),snapshot=useRef<GameState|null>(null);
 const refresh=useCallback(async()=>{
  if(!code||!userId)return;
  if(pending.current){queued.current=true;return}
  pending.current=true;const current=generation.current;
  try {
   do {
    queued.current=false;
    const previous=snapshot.current;
    const include=!(previous?.code===code&&['reveal','finished'].includes(previous.status)&&previous.albums.length>0);
    let sent=Date.now();
    let next=await rpc<GameState>('game_state',{code,include_albums:include});
    if(!include&&previous?.gameId!==next.gameId&&['reveal','finished'].includes(next.status)){sent=Date.now();next=await rpc<GameState>('game_state',{code,include_albums:true});}

    if(current!==generation.current)return;
    if(!include&&['reveal','finished'].includes(next.status)&&previous?.gameId===next.gameId)next.albums=previous.albums;
    offset.current=Date.parse(next.serverNow)-(sent+Date.now())/2;snapshot.current=next;setState(next);setError('');
   } while(queued.current&&current===generation.current);
  }catch(e){if(current===generation.current)setError(e instanceof Error?e.message:'We could not refresh the room.');}
  finally{
   pending.current=false;
   // A StrictMode effect restart can queue a refresh while the old RPC is in flight.
   // Retry the queued refresh after the stale request releases its lock.
   if(queued.current){queued.current=false;queueMicrotask(()=>void refresh());}
  }
 },[code,userId]);
 useEffect(()=>{
  generation.current++;setState(null);snapshot.current=null;setError('');setConnected(false);live.current=false;
  if(!code||!userId||!supabase)return;
  void refresh();
  const channel=supabase.channel(`room:${code}:${userId}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'room_events',filter:`code=eq.${code}`},()=>void refresh()).subscribe(status=>{live.current=status==='SUBSCRIBED';setConnected(live.current);if(status==='SUBSCRIBED')void refresh();});
  let cancelled=false;let polling:ReturnType<typeof setTimeout>;
  const poll=()=>{polling=setTimeout(async()=>{await refresh();if(!cancelled)poll();},document.hidden?30000:live.current?15000:5000)};poll();
  const heartbeat=()=>{void rpc('game_action',{code,action:'heartbeat',payload:{}}).catch(()=>{})};heartbeat();
  const pulse=window.setInterval(heartbeat,15000);
  const online=()=>{heartbeat();void refresh()};window.addEventListener('online',online);window.addEventListener('focus',online);
  return()=>{generation.current++;void supabase?.removeChannel(channel);cancelled=true;clearTimeout(polling);clearInterval(pulse);window.removeEventListener('online',online);window.removeEventListener('focus',online);};
 },[code,userId,refresh]);
 useEffect(()=>{
  if(!state||state.status!=='playing')return;
  let ticking=false;
  const timer=window.setInterval(async()=>{
   if(ticking||secondsLeft(state.deadline,offset.current)>0)return;
   ticking=true;
   try{await rpc('game_action',{code,action:'tick',payload:{}});await refresh();}catch{/* Polling recovers transient failures. */}finally{ticking=false;}
  },2000);
  return()=>clearInterval(timer);
 },[state?.deadline,state?.status,code,refresh]);
 const action=useCallback((name:string,payload:Record<string,unknown>={})=>{
  const key=name+JSON.stringify(payload);
  if(actionFlight.current){if(actionKey.current===key)return actionFlight.current;return Promise.reject(new Error('Wait for the current action to finish.'));}
  actionKey.current=key;
  setBusy(true);setError('');
  const run=(async()=>{try{await rpc('game_action',{code,action:name,payload});await refresh();}
   catch(e){setError(e instanceof Error?e.message:'We could not complete the action.');throw e;}})();
  actionFlight.current=run;
  void run.finally(()=>{if(actionFlight.current===run){actionFlight.current=null;setBusy(false);}}).catch(()=>{});
  return run;
 },[code,refresh]);
 return{state,error,connected,busy,action,refresh,offset};
}
