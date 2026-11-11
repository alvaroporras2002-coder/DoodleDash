import {useDialogFocus} from '../useDialogFocus';
import {X,MessageSquare,Pencil,PartyPopper,ArrowRight} from 'lucide-react';
export function HowTo({close}:{close:()=>void}){
 const dialog=useDialogFocus(true,close);
 return <div className="modal-backdrop" onClick={close}><section ref={dialog} tabIndex={-1} className="modal" role="dialog" aria-modal="true" aria-label="How to play" onClick={e=>e.stopPropagation()}>
 <button className="icon-button modal-close" aria-label="Close instructions" onClick={close}><X size={19}/></button><h2>How to play</h2><p>Everyone plays at the same time.</p>
 <div className="how-steps">{[[MessageSquare,'01','Write','Start a story with a short phrase.'],[Pencil,'02','Draw','Sketch the prompt you receive.'],[PartyPopper,'03','Reveal','See how each story changed.']].map(([Icon,n,title,desc])=>{const I=Icon as typeof Pencil;return <article key={String(n)}><span className="step-icon"><I size={20}/></span><div><small>{String(n)}</small><h3>{String(title)}</h3><p>{String(desc)}</p></div></article>})}</div>
 <button className="primary full" onClick={close}>Got it!<ArrowRight size={17}/></button></section></div>;
}
