import {useEffect,useRef} from 'react';
export function useDialogFocus(open:boolean,onClose:()=>void){
 const ref=useRef<HTMLElement|null>(null),close=useRef(onClose);close.current=onClose;
 useEffect(()=>{
  if(!open||!ref.current)return;
  const dialog=ref.current,previous=document.activeElement as HTMLElement|null;
  const controls=()=>Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')).filter(el=>el.getClientRects().length>0);
  (controls()[0]||dialog).focus({preventScroll:true});
  const key=(e:KeyboardEvent)=>{
   if(e.key==='Escape'){e.preventDefault();close.current();return;}
   if(e.key!=='Tab')return;const items=controls(),first=items[0],last=items.at(-1);
   if(!first){e.preventDefault();dialog.focus();return;}
   if(e.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){e.preventDefault();last!.focus();}
   else if(!e.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){e.preventDefault();first.focus();}
  };
  document.addEventListener('keydown',key);
  return()=>{document.removeEventListener('keydown',key);if(previous?.isConnected)previous.focus({preventScroll:true});};
 },[open]);
 return ref;
}
