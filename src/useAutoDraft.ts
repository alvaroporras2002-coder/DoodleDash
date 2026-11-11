import {useCallback,useEffect,useRef,useState} from 'react';
import {rpc} from './lib';
export function useAutoDraft(code:string,gameId:string,round:number,active:boolean){
 const [status,setStatus]=useState<'idle'|'saving'|'saved'|'error'>('idle');
 const latest=useRef<Record<string,unknown>|null>(null),saved=useRef(''),running=useRef(false),sentAt=useRef(0),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[]);
 const flush=useCallback(async()=>{
  if(!active||running.current||!latest.current||Date.now()-sentAt.current<650)return;
  const payload=latest.current,key=JSON.stringify(payload);
  if(key===saved.current)return;
  running.current=true;sentAt.current=Date.now();if(alive.current)setStatus('saving');
  try{const accepted=await rpc<boolean>('game_save_draft',{code,game_id:gameId,round_index:round,payload});if(accepted){saved.current=key;if(alive.current)setStatus(latest.current&&JSON.stringify(latest.current)===key?'saved':'saving');}}
  catch{if(alive.current)setStatus('error');}
  finally{running.current=false;}
 },[code,gameId,round,active]);
 const update=useCallback((payload:Record<string,unknown>)=>{latest.current=payload;if(JSON.stringify(payload)===saved.current){setStatus('saved');return;}setStatus('saving');void flush();},[flush]);
 useEffect(()=>{if(!active)return;const timer=setInterval(()=>void flush(),800);const onHide=()=>{if(document.hidden)void flush()};document.addEventListener('visibilitychange',onHide);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',onHide);};},[flush,active]);
 return {update,status};
}
