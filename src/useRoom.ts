import {useCallback,useEffect,useRef,useState} from 'react';
import {rpc,supabase,secondsLeft} from './lib';
import type {GameState} from './types';
export function useRoom(code:string,userId:string|undefined) {
 const [state,setState]=useState<GameState|null>(null),[error,setError]=useState(''),[connected,setConnected]=useState(false),[busy,setBusy]=useState(false);
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
    const next=await rpc<GameState>('game_state',{code,include_albums:include});
    if(current!==generation.current)return;
    if(!include&&['reveal','finished'].includes(next.status)&&previous)next.albums=previous.albums;
    offset.current=Date.parse(next.serverNow)-Date.now();snapshot.current=next;setState(next);setError('');
   } while(queued.current&&current===generation.current);
  }catch(e){if(current===generation.current)setError(e instanceof Error?e.message:'No pudimos actualizar la sala.');}
  finally{pending.current=false;}
 },[code,userId]);
 useEffect(()=>{
  generation.current++;setState(null);snapshot.current=null;setError('');setConnected(false);
  if(!code||!userId||!supabase)return;
  void refresh();
  const channel=supabase.channel(`room:${code}:${userId}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'room_events',filter:`code=eq.${code}`},()=>void refresh()).subscribe(status=>{setConnected(status==='SUBSCRIBED');if(status==='SUBSCRIBED')void refresh();});
  const polling=window.setInterval(()=>void refresh(),5000);
  const heartbeat=()=>{void rpc('game_action',{code,action:'heartbeat',payload:{}}).catch(()=>{})};heartbeat();
  const pulse=window.setInterval(heartbeat,15000);
  const online=()=>{heartbeat();void refresh()};window.addEventListener('online',online);window.addEventListener('focus',online);
  return()=>{generation.current++;void supabase?.removeChannel(channel);clearInterval(polling);clearInterval(pulse);window.removeEventListener('online',online);window.removeEventListener('focus',online);};
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
 const action=useCallback(async(action:string,payload:Record<string,unknown>={})=>{
  setBusy(true);setError('');
  try{await rpc('game_action',{code,action,payload});await refresh();}
  catch(e){setError(e instanceof Error?e.message:'No pudimos completar la acción.');throw e;}
  finally{setBusy(false);}
 },[code,refresh]);
 return{state,error,connected,busy,action,refresh,offset};
}
