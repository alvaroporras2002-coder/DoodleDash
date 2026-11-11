import {useEffect,useState} from 'react';
import type {Session} from '@supabase/supabase-js';
import {ArrowRight,Check,ChevronDown,HelpCircle,Loader2,LockKeyhole,LogOut,Plus,ShieldCheck,Sparkles,Users,X} from 'lucide-react';
import {Brand,DoodleArt} from './components/Brand';
import {HowTo} from './components/HowTo';
import Practice from './components/Practice';
import GameRoom from './components/GameRoom';
import {configured,normalizeCode,rpc,supabase} from './lib';
import {avatars,defaultSettings,modes,type Mode} from './types';

export default function App(){
 const [session,setSession]=useState<Session|null>(null),[loading,setLoading]=useState(configured),[how,setHow]=useState(false),[practice,setPractice]=useState(false);
 const [room,setRoom]=useState(''),[joinCode,setJoinCode]=useState(()=>normalizeCode(new URLSearchParams(location.search).get('room')||sessionStorage.getItem('dd-invite')||''));
 const [name,setName]=useState(()=>localStorage.getItem('dd-name')||''),[avatar,setAvatar]=useState(()=>localStorage.getItem('dd-avatar')||avatars[0]);
 const [selectedMode,setSelectedMode]=useState<Mode>('classic'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[showJoin,setShowJoin]=useState(false),[profile,setProfile]=useState(false);
 useEffect(()=>{
  const params=new URLSearchParams(location.search);const hash=new URLSearchParams(location.hash.slice(1));
  const authError=params.get('error_description')||hash.get('error_description');
  if(authError){setError(authError);history.replaceState({},'',location.pathname)}
  if(!supabase)return;
  let alive=true;
  supabase.auth.getSession().then(({data,error})=>{if(!alive)return;if(error)setError(error.message);setSession(data.session);setLoading(false)}).catch(()=>{if(alive){setLoading(false);setError('We could not restore your session. Please sign in again.')}});
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>{setSession(next);setLoading(false)});
  return()=>{alive=false;subscription.unsubscribe()};
 },[]);
 
 useEffect(()=>{localStorage.setItem('dd-name',name);localStorage.setItem('dd-avatar',avatar)},[name,avatar]);
 useEffect(()=>{if(!session)return;const saved=sessionStorage.getItem('dd-room');const invite=normalizeCode(new URLSearchParams(location.search).get('room')||'');if(saved&&(!invite||invite===saved))setRoom(saved)},[session]);
 useEffect(()=>{if(!how&&!profile)return;function handle(e:KeyboardEvent){if(e.key==='Escape'){setHow(false);setProfile(false)}}window.addEventListener('keydown',handle);return()=>window.removeEventListener('keydown',handle)},[how,profile]);
 async function login(){
  if(!supabase){setNotice('Connect Supabase to play with your team. You can try the canvas in solo practice meanwhile.');return;}
  if(!name.trim()){setProfile(true);return;}
  setBusy(true);setError('');
  try{const {data,error}=await supabase.auth.signInAnonymously();if(error)throw error;setSession(data.session);}
  catch(e){setError(e instanceof Error?e.message:'We could not create your guest session.');}
  finally{setBusy(false);}
 }
 async function enter(create:boolean){
  if(!session){void login();return}if(!name.trim()){setProfile(true);return}
  setBusy(true);setError('');
  try{let code=joinCode;if(create){code=await rpc<string>('game_create',{settings:{...defaultSettings,mode:selectedMode},nickname:name.trim(),avatar})}else{if(code.length<4)throw new Error('Enter a valid room code.');await rpc('game_join',{code,nickname:name.trim(),avatar})}sessionStorage.removeItem('dd-invite');sessionStorage.setItem('dd-room',code);history.replaceState({},'',`${location.pathname}?room=${code}`);setRoom(code)}catch(e){setError(e instanceof Error?e.message:'We could not open the room.')}finally{setBusy(false)}
 }
 function leave(){setRoom('');sessionStorage.removeItem('dd-room');sessionStorage.removeItem('dd-invite');history.replaceState({},'',location.pathname);setJoinCode('')}
 async function logout(){try{if(room){try{await rpc('game_action',{code:room,action:'leave',payload:{}})}catch{/* An expired room must not prevent sign-out. */}}const {error}=await supabase!.auth.signOut();if(error)throw error;leave();setProfile(false)}catch(e){setError(e instanceof Error?e.message:'Could not sign out.')}}
 const userId=session?.user.id;
 return <><header className="site-header"><div className="nav-inner"><button className="brand-button" onClick={()=>{if(!room){setPractice(false);window.scrollTo({top:0,behavior:'smooth'})}}} aria-label="DoodleDash home"><Brand/></button><nav aria-label="Main navigation"><button className="nav-how" onClick={()=>setHow(true)}><HelpCircle size={17}/>How to play</button>{session?<button className="profile-button" onClick={()=>setProfile(true)}><span>{avatar}</span><strong>{name||'My profile'}</strong><ChevronDown size={15}/></button>:<span className="team-label"><Users size={16}/>MADE FOR YOUR TEAM</span>}</nav></div></header>
 {loading?<main className="loading-page"><Loader2 className="spin"/><p>Getting your creative space ready…</p></main>:practice?<Practice exit={()=>setPractice(false)}/>:room&&userId?<GameRoom code={room} userId={userId} exit={leave}/>:<main>
 <section className="hero page-width"><div className="hero-copy"><span className="hero-badge"><span className="live-dot"/>THE BREAK YOUR TEAM NEEDED</span><h1>Big ideas.<br/>Bad drawings.<br/><span>Great team.</span><svg viewBox="0 0 370 20" aria-hidden="true"><path d="M4 13Q178-3 364 9M16 19Q190 3 344 16" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round"/></svg></h1><p>A phrase becomes a drawing. A drawing becomes anything. Connect with your team, one sketch at a time.</p>
 {!session?<div className="guest-entry"><label htmlFor="guest-name">Your nickname</label><input id="guest-name" maxLength={24} placeholder="What does your team call you?" value={name} onChange={e=>setName(e.target.value)}/><label>Choose your avatar</label><div className="avatar-picker">{avatars.map(a=><button key={a} className={avatar===a?'selected':''} aria-pressed={avatar===a} aria-label={`Avatar ${a}`} onClick={()=>setAvatar(a)}>{a}</button>)}</div><button className="primary full" onClick={()=>void login()} disabled={busy||!name.trim()}>{busy?'Joining…':'Join with my nickname'}<ArrowRight size={18}/></button><div className="login-caption"><LockKeyhole size={13}/>No email or password · session saved in this browser</div><button className="practice-link" onClick={()=>setPractice(true)}>Want a quick look? <strong>Try the canvas <ArrowRight size={14}/></strong></button></div>:<div className="signed-in-card"><span className="eyebrow">HELLO, {name.toUpperCase()} 👋</span><h3>Ready for a fun break together?</h3><div className="button-row"><button className="primary" disabled={busy} onClick={()=>void enter(true)}><Plus size={19}/>{busy?'Getting ready…':'Create private room'}</button><button className="secondary" onClick={()=>setShowJoin(!showJoin)}>Join a room</button></div></div>}
 {(!session&&joinCode)&&<div className="invited"><Users size={17}/>You are invited to room <strong>{joinCode}</strong>. Choose your nickname to join.</div>}
 {(session&&(showJoin||joinCode))&&<form className="join-form" onSubmit={e=>{e.preventDefault();void enter(false)}}><label htmlFor="room-code">Invitation code</label><div><input id="room-code" placeholder="e.g. A7K2P9" value={joinCode} onChange={e=>setJoinCode(normalizeCode(e.target.value))} autoComplete="off" maxLength={12}/><button className="primary" disabled={busy||joinCode.length<4}>Join<ArrowRight size={16}/></button></div></form>}
 {error&&<div className="alert" role="alert">{error}<button className="icon-button" aria-label="Dismiss error" onClick={()=>setError('')}><X size={16}/></button></div>}
 {notice&&<div className="setup-notice" role="status"><strong>The game is ready to set up.</strong><p>{notice}</p><button className="text-button" onClick={()=>setPractice(true)}>Open solo practice<ArrowRight size={15}/></button></div>}
 <div className="hero-meta"><span><Check size={14}/>No installation</span><span><Check size={14}/>Private rooms</span><span><Check size={14}/>2–20 players</span></div></div><DoodleArt/></section>
 <section className="how-strip page-width"><div><span className="strip-icon">✎</span><strong>Talent is optional.<br/><span>Laughter is included.</span></strong></div><ol><li><b>01</b>Write an idea</li><li><b>02</b>Pass it and draw</li><li><b>03</b>Reveal the chaos</li></ol><button className="icon-button" aria-label="View instructions" onClick={()=>setHow(true)}><ArrowRight/></button></section>
 <section className="modes-section page-width" id="modos"><div className="section-top"><div><span className="eyebrow">CHOOSE YOUR KIND OF CHAOS</span><h2>One team. So many ways to play.</h2></div><span className="mode-count">7 modes · zero pressure</span></div><div className="mode-grid">{modes.map((m,i)=><button key={m.id} className={`mode-card ${session&&selectedMode===m.id?'mode-selected':''}`} onClick={()=>{setSelectedMode(m.id);if(session){window.scrollTo({top:0,behavior:'smooth'})}else{setNotice(`${m.name}: ${m.description} Choose your nickname to create a room with this mode.`);window.scrollTo({top:0,behavior:'smooth'})}}}><div className={`mode-art ${m.color}`}><span className="mode-big-icon">{m.icon}</span><span className="mode-doodle">{['〰','↗','⋆','?','◌','≈','✴'][i]}</span><span className="mode-number">0{i+1}</span></div><div className="mode-card-copy"><span className="mode-tag">{m.tag}</span><h3>{m.name}</h3><p>{m.description}</p><span className="mode-cta">{session&&selectedMode===m.id?'Selected':'Choose mode'}{session&&selectedMode===m.id?<Check size={16}/>:<ArrowRight size={16}/>}</span></div></button>)}</div></section>
 <section className="bottom-banner page-width"><div><Sparkles size={27}/><h2>Fewer meetings.<br/><span>More “who drew that?”</span></h2></div><button className="primary" onClick={()=>session?void enter(true):void login()} disabled={busy}>{session?'Create a room':'Bring your team together'}<ArrowRight size={18}/></button></section>
 </main>}
 {!room&&<footer className="page-width"><Brand/><p>A team project. Not officially affiliated with DoorDash or Gartic.</p><button className="text-button" onClick={()=>setHow(true)}>How to play</button></footer>}
 {how&&<HowTo close={()=>setHow(false)}/>}
 {profile&&<div className="modal-backdrop" onClick={()=>setProfile(false)}><section className="modal compact" role="dialog" aria-modal="true" aria-label="Your profile" onClick={e=>e.stopPropagation()}><button className="icon-button modal-close" aria-label="Close profile" onClick={()=>setProfile(false)}><X/></button><span className="eyebrow">YOUR PERSONAL TOUCH</span><h2>How your team will see you.</h2><label htmlFor="nickname">Your nickname</label>{room&&<p className="fine-print">Nickname and avatar changes apply when you join a new room.</p>}<input id="nickname" maxLength={24} value={name} onChange={e=>setName(e.target.value)} autoFocus/><label>Choose your avatar</label><div className="avatar-picker">{avatars.map(a=><button key={a} className={avatar===a?'selected':''} aria-pressed={avatar===a} aria-label={`Avatar ${a}`} onClick={()=>setAvatar(a)}>{a}</button>)}</div><p className="fine-print"><ShieldCheck size={14}/>Guest · use this browser to return to your game</p><button className="primary full" disabled={!name.trim()} onClick={()=>setProfile(false)}>Save profile<Check size={17}/></button>{error&&<div className="alert" role="alert">{error}</div>}<button className="text-button logout" onClick={()=>void logout()}><LogOut size={16}/>Sign out as guest</button></section></div>}
 </>
}
