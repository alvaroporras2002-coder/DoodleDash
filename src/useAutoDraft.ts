import {useCallback,useEffect,useMemo,useState} from 'react';
import {rpc} from './lib';
import {DraftSaver,type DraftStatus} from './draftSaver';
export function useAutoDraft(code:string,gameId:string,round:number,active:boolean){
 const [status,setStatus]=useState<DraftStatus>('idle');
 const saver=useMemo(()=>new DraftSaver(payload=>rpc<boolean>('game_save_draft',{code,game_id:gameId,round_index:round,payload}),setStatus),[code,gameId,round]);
 useEffect(()=>{saver.start();const flush=()=>saver.flush();const onHide=()=>{if(document.hidden)saver.flush()};window.addEventListener('online',flush);document.addEventListener('visibilitychange',onHide);return()=>{saver.stop();window.removeEventListener('online',flush);document.removeEventListener('visibilitychange',onHide);};},[saver]);
 useEffect(()=>{saver.setActive(active)},[saver,active]);
 const update=useCallback((payload:Record<string,unknown>)=>saver.update(payload),[saver]);
 return {update,status};
}
