// Dev-only fixture. Exercises the same components used in the multiplayer room.
import {useState} from 'react';
import ReactDOM from 'react-dom/client';
import {LobbyReady,RoundGuide,SubmissionStatus,ReplayMenu} from '../src/components/GameGuidance';
import {Reveal} from '../src/components/GameRoom';
import {MicrophoneLevel} from '../src/components/VideoCall';
import {type Player,type GameState,type Mode} from '../src/types';
import '../src/styles.css';
const initial:Player[]=[{id:'host',name:'Alex',avatar:'🍕',ready:true,submitted:true,active:true},{id:'guest',name:'Sam',avatar:'🥑',ready:false,submitted:false,active:true}];
function Harness(){
 const [players,setPlayers]=useState(initial),[started,setStarted]=useState(false),[replay,setReplay]=useState(''),[level,setLevel]=useState(0),[enabled,setEnabled]=useState(false);
 const [state,setState]=useState<GameState>({gameId:'test',code:'ABC123',hostId:'host',status:'reveal',settings:{mode:'classic',seconds:90,maxPlayers:20},players:initial,round:1,totalRounds:2,deadline:null,task:null,revealIndex:0,reactions:[],serverNow:new Date().toISOString(),albums:[{id:'story',author:'Alex',entries:[{playerId:'host',name:'Alex',kind:'write',round:0,text:'A cat delivering pizza'},{playerId:'guest',name:'Sam',kind:'describe',round:1,text:'A secret silly interpretation'}]}]});
 async function replayMode(mode:Mode){setReplay(mode)}
 return <main className="page-width"><h1>Room clarity</h1><LobbyReady players={players} meId="host" isHost={true} busy={false} onReady={()=>setPlayers(p=>p.map(x=>x.id==='host'?{...x,ready:!x.ready}:x))} onStart={()=>setStarted(true)}/><button onClick={()=>setPlayers(p=>p.map(x=>({...x,ready:true})))}>Teammate ready</button><p role="status">{started?'Game started':'Lobby'}</p><RoundGuide kind="draw" mode="memory"/><SubmissionStatus players={players}/><button onClick={()=>setPlayers(p=>p.map(x=>({...x,submitted:true})))}>Teammate finished</button><MicrophoneLevel participant={{audioLevel:level}} enabled={enabled}/><button onClick={()=>{setEnabled(!enabled);setLevel(.6)}}>Toggle test microphone</button><Reveal state={state} isHost={true} busy={false} act={()=>setState(s=>({...s,revealIndex:s.revealIndex+1,status:s.revealIndex>=1?'finished':'reveal'}))} onReplay={replayMode}/><ReplayMenu mode="classic" busy={false} onReplay={replayMode}/><output aria-label="Next mode">{replay}</output></main>;
}
ReactDOM.createRoot(document.getElementById('root')!).render(<Harness/>);
