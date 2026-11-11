import {lazy,Suspense,useEffect,useRef,useState} from 'react';
import type {Session} from '@supabase/supabase-js';
import {ArrowRight,Check,ChevronDown,HelpCircle,Loader2,LogOut,X} from 'lucide-react';
import {Brand} from './components/Brand';
import {HowTo} from './components/HowTo';
import {AvatarPicker} from './components/AvatarPicker';
import {useDialogFocus} from './useDialogFocus';
import {useOnline} from './useOnline';
import {localStore,sessionStore} from './storage';
import {configured,normalizeCode,rpc,supabase} from './lib';
import {avatars,defaultSettings} from './types';
const Practice=lazy(()=>import('./components/Practice'));
const GameRoom=lazy(()=>import('./components/GameRoom'));

export default function App(){
 const initialCode=useRef(normalizeCode(new URLSearchParams(location.search).get('room')||sessionStore.getItem('dd-invite')||''));
 const [session,setSession]=useState<Session|null>(null),[loading,setLoading]=useState(configured);
 const [room,setRoom]=useState(''),[joinCode,setJoinCode]=useState(initialCode.current);
 const [name,setName]=useState(()=>localStore.getItem('dd-name')||''),[avatar,setAvatar]=useState(()=>localStore.getItem('dd-avatar')||avatars[0]);
 const [entry,setEntry]=useState<'create'|'join'|null>(initialCode.current?'join':null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [how,setHow]=useState(false),[profile,setProfile]=useState(false),[practice,setPractice]=useState(false);
 const entering=useRef(false),nickname=useRef<HTMLInputElement|null>(null),roomInput=useRef<HTMLInputElement|null>(null);
 const online=useOnline(),profileDialog=useDialogFocus(profile,()=>setProfile(false));
 useEffect(()=>{
  const params=new URLSearchParams(location.search),hash=new URLSearchParams(location.hash.slice(1));
  const authError=params.get('error_description')||hash.get('error_description');
  if(authError){setError(authError);history.replaceState({},'',location.pathname)}
  if(!supabase)return;
  let alive=true;
  supabase.auth.getSession().then(({data,error})=>{if(!alive)return;if(error)setError(error.message);setSession(data.session);setLoading(false)}).catch(()=>{if(alive){setLoading(false);setError('Could not restore your session. Please try again.')}});
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>{setSession(next);setLoading(false)});
  return()=>{alive=false;subscription.unsubscribe()};
 },[]);
 useEffect(()=>{localStore.setItem('dd-name',name);localStore.setItem('dd-avatar',avatar)},[name,avatar]);
 useEffect(()=>{
  if(!session||entering.current)return;
  const saved=sessionStore.getItem('dd-room'),invite=normalizeCode(new URLSearchParams(location.search).get('room')||'');
  if(saved&&(!invite||invite===saved))setRoom(saved);
 },[session]);
 function choose(action:'create'|'join'){
  setEntry(action);setError('');setNotice('');
  requestAnimationFrame(()=>{if(action==='join')roomInput.current?.focus();else nickname.current?.focus()});
 }
 async function enter(){
  if(!entry||entering.current||!name.trim())return;
  if(entry==='join'&&joinCode.length<4){setError('Enter a valid room code.');return;}
  if(!supabase){setNotice('Connect Supabase to play online. Solo practice is available.');return;}
  entering.current=true;setBusy(true);setError('');
  try{
   if(!session){const {data,error}=await supabase.auth.signInAnonymously();if(error)throw error;setSession(data.session);}
   let code=joinCode;
   if(entry==='create')code=await rpc<string>('game_create',{settings:defaultSettings,nickname:name.trim(),avatar});
   else await rpc('game_join',{code,nickname:name.trim(),avatar});
   sessionStore.removeItem('dd-invite');sessionStore.setItem('dd-room',code);
   history.replaceState({},'',`${location.pathname}?room=${code}`);setRoom(code);
  }catch(e){setError(e instanceof Error?e.message:'Could not open the room.');}
  finally{setBusy(false);entering.current=false;}
 }
 function leave(){setRoom('');setEntry(null);sessionStore.removeItem('dd-room');sessionStore.removeItem('dd-invite');history.replaceState({},'',location.pathname);setJoinCode('')}
 async function logout(){
  try{
   if(room){try{await rpc('game_action',{code:room,action:'leave',payload:{}})}catch{/* Sign-out remains available for expired rooms. */}}
   const {error}=await supabase!.auth.signOut();if(error)throw error;leave();setProfile(false);
  }catch(e){setError(e instanceof Error?e.message:'Could not sign out.')}
 }
 return <>
 <header className="site-header"><div className="nav-inner">
  <button className="brand-button" aria-label="DoodleOnline home" onClick={()=>{if(!room){setPractice(false);setEntry(null);setError('');setNotice('')}}}><Brand/></button>
  <nav aria-label="Main navigation"><button className="nav-how" onClick={()=>setHow(true)}><HelpCircle size={17}/><span>How to play</span></button>{session&&<button className="profile-button" aria-label="Open profile" onClick={()=>setProfile(true)}><span>{avatar}</span><strong>{name||'Profile'}</strong><ChevronDown size={14}/></button>}</nav>
 </div></header>
 {!online&&<div className="offline-banner" role="status">You are offline. Reconnect to sync your work and continue with the team.</div>}
 <Suspense fallback={<main className="loading-page" role="status"><Loader2 className="spin"/><p>Opening room…</p></main>}>
 {loading?<main className="loading-page" role="status"><Loader2 className="spin"/><p>Loading…</p></main>:practice?<Practice exit={()=>setPractice(false)}/>:room&&session?<GameRoom code={room} userId={session.user.id} exit={leave}/>:<main className="home-page page-width">
  <section className="home-intro"><h1>Draw. Guess.<br/><span>Repeat.</span></h1><p>A drawing game for 2–20 people.</p></section>
  <div className="home-actions" aria-label="Start playing"><button className={entry==='create'?'primary selected':'primary'} aria-pressed={entry==='create'} disabled={busy} onClick={()=>choose('create')}>Create room</button><button className={entry==='join'?'secondary selected':'secondary'} aria-pressed={entry==='join'} disabled={busy} onClick={()=>choose('join')}>Join room</button></div>
  {entry&&<section className="entry-panel" aria-label={entry==='create'?'Create a room':'Join a room'}><div className="entry-title"><h2>{entry==='create'?'Create a room':'Join a room'}</h2><button className="icon-button" aria-label="Close room form" disabled={busy} onClick={()=>{setEntry(null);setError('');setNotice('')}}><X size={17}/></button></div>
   <form className="entry-form" onSubmit={e=>{e.preventDefault();void enter()}}>
    {entry==='join'&&<><label htmlFor="room-code">Room code</label><input ref={roomInput} id="room-code" value={joinCode} placeholder="Paste a room code" maxLength={12} autoComplete="off" spellCheck={false} disabled={busy} onChange={e=>setJoinCode(normalizeCode(e.target.value))}/></>}
    <label htmlFor="guest-name">Nickname</label><input ref={nickname} id="guest-name" value={name} placeholder="Your name" maxLength={24} autoComplete="nickname" disabled={busy} onChange={e=>setName(e.target.value)}/>
    <span className="field-label">Avatar</span><AvatarPicker value={avatar} onChange={setAvatar}/>
    <button className="primary full" type="submit" disabled={busy||!name.trim()||(entry==='join'&&joinCode.length<4)}>{busy?<><Loader2 className="spin" size={17}/>Opening…</>:<>{entry==='create'?'Create room':'Join room'}<ArrowRight size={17}/></>}</button>
   </form>
  </section>}
  {error&&<div className="alert" role="alert">{error}<button className="icon-button" aria-label="Dismiss error" onClick={()=>setError('')}><X size={16}/></button></div>}
  {notice&&<div className="setup-notice" role="status"><p>{notice}</p><button className="text-button" onClick={()=>setPractice(true)}>Open solo practice<ArrowRight size={15}/></button></div>}
  <div className="home-footer"><button className="text-button" onClick={()=>setPractice(true)}>Try the canvas</button></div>
 </main>}
 </Suspense>
 {how&&<HowTo close={()=>setHow(false)}/>}
 {profile&&<div className="modal-backdrop" onClick={()=>setProfile(false)}><section ref={profileDialog} tabIndex={-1} className="modal compact" role="dialog" aria-modal="true" aria-label="Your profile" onClick={e=>e.stopPropagation()}>
  <button className="icon-button modal-close" aria-label="Close profile" onClick={()=>setProfile(false)}><X size={19}/></button><h2>Your profile</h2>
  <label htmlFor="nickname">Nickname</label><input id="nickname" maxLength={24} value={name} onChange={e=>setName(e.target.value)}/>
  <span className="field-label">Avatar</span><AvatarPicker value={avatar} onChange={setAvatar}/>
  {room&&<p className="fine-print">Changes apply when you join a new room.</p>}
  <button className="primary full" disabled={!name.trim()} onClick={()=>setProfile(false)}>Save<Check size={17}/></button>
  {error&&<div className="alert" role="alert">{error}</div>}
  <button className="text-button logout" onClick={()=>void logout()}><LogOut size={16}/>Sign out</button>
 </section></div>}
 </>;
}
