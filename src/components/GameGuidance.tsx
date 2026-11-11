import {useState,useId} from 'react';
import {CheckCheck,Check,Play,RotateCcw,ArrowRight} from 'lucide-react';
import {modes,type Mode,type Player} from '../types';

export function LobbyReady({players,meId,isHost,busy,onReady,onStart}:{players:Player[];meId:string;isHost:boolean;busy:boolean;onReady:()=>void;onStart:()=>void}){
 const active=players.filter(p=>p.active),waiting=active.filter(p=>!p.ready),me=active.find(p=>p.id===meId);
 const ready=active.length-waiting.length;
 const reason=active.length<2?'Invite at least one teammate to start.':waiting.length?('Waiting for '+waiting.map(p=>p.id===meId?'you':p.name).join(',')+' to get ready.'):isHost?'Everyone is ready. Start when you like.':'Everyone is ready. Waiting for the host to start.';
 return <section className="lobby-ready" aria-label="Ready check"><div className="ready-summary"><h3>{ready} of {active.length} players ready</h3><div className="team-progress" role="progressbar" aria-label="Players ready" aria-valuemin={0} aria-valuemax={active.length||1} aria-valuenow={ready}><span style={{width:`${active.length?ready/active.length*100:0}%`}}/></div><p id="start-reason" role="status">{busy?'Updating the room…':reason}</p></div><div className="button-row"><button className={me?.ready?'secondary':'primary'} disabled={busy} onClick={onReady}><CheckCheck size={18}/>{me?.ready?'Ready ✓':'I am ready'}</button>{isHost&&<button className="primary dark" aria-describedby="start-reason" disabled={busy||active.length<2||waiting.length>0} onClick={onStart}><Play size={17}/>Start game</button>}</div></section>;
}

export function RoundGuide({kind,mode}:{kind:'write'|'draw'|'describe';mode:Mode}){
 const detail=kind==='write'?'Write a short idea for another player to draw.':kind==='describe'?'Your description becomes the next prompt.':mode==='memory'?'The reference disappears after 7 seconds. Recreate what you remember.':mode==='animation'?'Add small changes to the previous frame.':mode==='copy'?'Recreate the reference in your own style.':'Turn the phrase into a drawing.';
 return <details className="round-guide"><summary>Quick tip</summary><p>{detail}</p></details>;
}

export function SubmissionStatus({players}:{players:Player[]}){
 const active=players.filter(p=>p.active),done=active.filter(p=>p.submitted);
 return <section className="card waiting-card submitted-card" aria-label="Submission confirmed"><span className="submitted-check"><Check size={24}/></span><h2>Submitted</h2><div className="team-progress" role="progressbar" aria-label="Players finished" aria-valuemin={0} aria-valuemax={active.length||1} aria-valuenow={done.length}><span style={{width:`${active.length?done.length/active.length*100:0}%`}}/></div><strong role="status">{done.length} of {active.length} finished</strong><div className="ready-roster">{active.map(p=><span key={p.id} className={p.submitted?'ready-person is-ready':'ready-person'}>{p.avatar} {p.name}<small>{p.submitted?'Finished':'Creating…'}</small></span>)}</div></section>;
}

export function ReplayMenu({mode,busy,onReplay}:{mode:Mode;busy:boolean;onReplay:(mode:Mode)=>Promise<void>}){
 const modeId=useId();
 const [choose,setChoose]=useState(false),[next,setNext]=useState<Mode>(mode),[pending,setPending]=useState(false);
 async function replay(value:Mode){setPending(true);try{await onReplay(value)}catch{/* The room displays the server error. */}finally{setPending(false)}}
 return <section className="replay-menu"><div><h3>Next game</h3></div><div className="button-row"><button className="primary" disabled={busy||pending} onClick={()=>void replay(mode)}><RotateCcw size={17}/>Play again</button><button className="secondary" aria-expanded={choose} disabled={busy||pending} onClick={()=>setChoose(!choose)}>Try another mode</button></div>{choose&&<div className="replay-choice"><label htmlFor={modeId}>Next game mode</label><select id={modeId} value={next} onChange={e=>setNext(e.target.value as Mode)}>{modes.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select><button className="primary" disabled={busy||pending} onClick={()=>void replay(next)}>Back to lobby<ArrowRight size={17}/></button></div>}</section>;
}
