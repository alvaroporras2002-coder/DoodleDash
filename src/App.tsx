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
  supabase.auth.getSession().then(({data,error})=>{if(!alive)return;if(error)setError(error.message);setSession(data.session);setLoading(false)}).catch(()=>{if(alive){setLoading(false);setError('No pudimos recuperar tu sesión. Intenta iniciar sesión de nuevo.')}});
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>{setSession(next);setLoading(false)});
  return()=>{alive=false;subscription.unsubscribe()};
 },[]);
 
 useEffect(()=>{localStorage.setItem('dd-name',name);localStorage.setItem('dd-avatar',avatar)},[name,avatar]);
 useEffect(()=>{if(!session)return;const saved=sessionStorage.getItem('dd-room');const invite=normalizeCode(new URLSearchParams(location.search).get('room')||'');if(saved&&(!invite||invite===saved))setRoom(saved)},[session]);
 useEffect(()=>{if(!how&&!profile)return;function handle(e:KeyboardEvent){if(e.key==='Escape'){setHow(false);setProfile(false)}}window.addEventListener('keydown',handle);return()=>window.removeEventListener('keydown',handle)},[how,profile]);
 async function login(){
  if(!supabase){setNotice('Conecta Supabase para jugar con tu equipo. Mientras tanto, puedes probar el lienzo en práctica individual.');return;}
  if(!name.trim()){setProfile(true);return;}
  setBusy(true);setError('');
  try{const {data,error}=await supabase.auth.signInAnonymously();if(error)throw error;setSession(data.session);}
  catch(e){setError(e instanceof Error?e.message:'No pudimos crear tu sesión de invitado.');}
  finally{setBusy(false);}
 }
 async function enter(create:boolean){
  if(!session){void login();return}if(!name.trim()){setProfile(true);return}
  setBusy(true);setError('');
  try{let code=joinCode;if(create){code=await rpc<string>('game_create',{settings:{...defaultSettings,mode:selectedMode},nickname:name.trim(),avatar})}else{if(code.length<4)throw new Error('Escribe un código de sala válido.');await rpc('game_join',{code,nickname:name.trim(),avatar})}sessionStorage.removeItem('dd-invite');sessionStorage.setItem('dd-room',code);history.replaceState({},'',`${location.pathname}?room=${code}`);setRoom(code)}catch(e){setError(e instanceof Error?e.message:'No pudimos abrir la sala.')}finally{setBusy(false)}
 }
 function leave(){setRoom('');sessionStorage.removeItem('dd-room');sessionStorage.removeItem('dd-invite');history.replaceState({},'',location.pathname);setJoinCode('')}
 async function logout(){try{if(room){try{await rpc('game_action',{code:room,action:'leave',payload:{}})}catch{/* An expired room must not prevent sign-out. */}}const {error}=await supabase!.auth.signOut();if(error)throw error;leave();setProfile(false)}catch(e){setError(e instanceof Error?e.message:'No se pudo cerrar sesión.')}}
 const userId=session?.user.id;
 return <><header className="site-header"><div className="nav-inner"><button className="brand-button" onClick={()=>{if(!room){setPractice(false);window.scrollTo({top:0,behavior:'smooth'})}}} aria-label="DoodleDash inicio"><Brand/></button><nav aria-label="Navegación principal"><button className="nav-how" onClick={()=>setHow(true)}><HelpCircle size={17}/>Cómo se juega</button>{session?<button className="profile-button" onClick={()=>setProfile(true)}><span>{avatar}</span><strong>{name||'Mi perfil'}</strong><ChevronDown size={15}/></button>:<span className="team-label"><Users size={16}/>HECHO PARA EL EQUIPO</span>}</nav></div></header>
 {loading?<main className="loading-page"><Loader2 className="spin"/><p>Preparando tu espacio creativo…</p></main>:practice?<Practice exit={()=>setPractice(false)}/>:room&&userId?<GameRoom code={room} userId={userId} exit={leave}/>:<main>
 <section className="hero page-width"><div className="hero-copy"><span className="hero-badge"><span className="live-dot"/>LA PAUSA QUE TU EQUIPO NECESITABA</span><h1>Grandes ideas.<br/>Malos dibujos.<br/><span>Buenísimo equipo.</span><svg viewBox="0 0 370 20" aria-hidden="true"><path d="M4 13Q178-3 364 9M16 19Q190 3 344 16" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round"/></svg></h1><p>Una frase se convierte en dibujo. Un dibujo, en cualquier cosa. Conecta con tu equipo, un trazo a la vez.</p>
 {!session?<div className="guest-entry"><label htmlFor="guest-name">Tu apodo</label><input id="guest-name" maxLength={24} placeholder="¿Cómo te llama tu equipo?" value={name} onChange={e=>setName(e.target.value)}/><label>Elige tu avatar</label><div className="avatar-picker">{avatars.map(a=><button key={a} className={avatar===a?'selected':''} aria-pressed={avatar===a} aria-label={`Avatar ${a}`} onClick={()=>setAvatar(a)}>{a}</button>)}</div><button className="primary full" onClick={()=>void login()} disabled={busy||!name.trim()}>{busy?'Entrando…':'Entrar con mi apodo'}<ArrowRight size={18}/></button><div className="login-caption"><LockKeyhole size={13}/>Sin correo ni contraseña · sesión en este navegador</div><button className="practice-link" onClick={()=>setPractice(true)}>¿Quieres echar un vistazo? <strong>Prueba el lienzo <ArrowRight size={14}/></strong></button></div>:<div className="signed-in-card"><span className="eyebrow">HOLA, {name.toUpperCase()} 👋</span><h3>¿Listo para compartir una buena pausa?</h3><div className="button-row"><button className="primary" disabled={busy} onClick={()=>void enter(true)}><Plus size={19}/>{busy?'Preparando…':'Crear sala privada'}</button><button className="secondary" onClick={()=>setShowJoin(!showJoin)}>Unirme a una sala</button></div></div>}
 {(!session&&joinCode)&&<div className="invited"><Users size={17}/>Te invitaron a la sala <strong>{joinCode}</strong>. Elige tu apodo para entrar.</div>}
 {(session&&(showJoin||joinCode))&&<form className="join-form" onSubmit={e=>{e.preventDefault();void enter(false)}}><label htmlFor="room-code">Código de invitación</label><div><input id="room-code" placeholder="Ej. A7K2P9" value={joinCode} onChange={e=>setJoinCode(normalizeCode(e.target.value))} autoComplete="off" maxLength={12}/><button className="primary" disabled={busy||joinCode.length<4}>Entrar<ArrowRight size={16}/></button></div></form>}
 {error&&<div className="alert" role="alert">{error}<button className="icon-button" aria-label="Cerrar error" onClick={()=>setError('')}><X size={16}/></button></div>}
 {notice&&<div className="setup-notice" role="status"><strong>El juego está listo para configurar.</strong><p>{notice}</p><button className="text-button" onClick={()=>setPractice(true)}>Abrir práctica individual<ArrowRight size={15}/></button></div>}
 <div className="hero-meta"><span><Check size={14}/>Sin instalaciones</span><span><Check size={14}/>Salas privadas</span><span><Check size={14}/>3–20 personas</span></div></div><DoodleArt/></section>
 <section className="how-strip page-width"><div><span className="strip-icon">✎</span><strong>El talento es opcional.<br/><span>Las risas vienen incluidas.</span></strong></div><ol><li><b>01</b>Escribe una idea</li><li><b>02</b>Pásala y dibuja</li><li><b>03</b>Descubran el desastre</li></ol><button className="icon-button" aria-label="Ver instrucciones" onClick={()=>setHow(true)}><ArrowRight/></button></section>
 <section className="modes-section page-width" id="modos"><div className="section-top"><div><span className="eyebrow">ELIGE TU DOSIS DE CAOS</span><h2>Una mesa. Muchas formas de jugar.</h2></div><span className="mode-count">7 modos · cero presión</span></div><div className="mode-grid">{modes.map((m,i)=><button key={m.id} className={`mode-card ${session&&selectedMode===m.id?'mode-selected':''}`} onClick={()=>{setSelectedMode(m.id);if(session){window.scrollTo({top:0,behavior:'smooth'})}else{setNotice(`${m.name}: ${m.description} Elige tu apodo para crear una sala con este modo.`);window.scrollTo({top:0,behavior:'smooth'})}}}><div className={`mode-art ${m.color}`}><span className="mode-big-icon">{m.icon}</span><span className="mode-doodle">{['〰','↗','⋆','?','◌','≈','✴'][i]}</span><span className="mode-number">0{i+1}</span></div><div className="mode-card-copy"><span className="mode-tag">{m.tag}</span><h3>{m.name}</h3><p>{m.description}</p><span className="mode-cta">{session&&selectedMode===m.id?'Seleccionado':'Elegir modo'}{session&&selectedMode===m.id?<Check size={16}/>:<ArrowRight size={16}/>}</span></div></button>)}</div></section>
 <section className="bottom-banner page-width"><div><Sparkles size={27}/><h2>Menos reuniones.<br/><span>Más “¿quién dibujó eso?”</span></h2></div><button className="primary" onClick={()=>session?void enter(true):void login()} disabled={busy}>{session?'Crear una sala':'Reúne a tu equipo'}<ArrowRight size={18}/></button></section>
 </main>}
 {!room&&<footer className="page-width"><Brand/><p>Un proyecto de equipo. Sin afiliación oficial con DoorDash ni Gartic.</p><button className="text-button" onClick={()=>setHow(true)}>Cómo se juega</button></footer>}
 {how&&<HowTo close={()=>setHow(false)}/>}
 {profile&&<div className="modal-backdrop" onClick={()=>setProfile(false)}><section className="modal compact" role="dialog" aria-modal="true" aria-label="Tu perfil" onClick={e=>e.stopPropagation()}><button className="icon-button modal-close" aria-label="Cerrar perfil" onClick={()=>setProfile(false)}><X/></button><span className="eyebrow">TU TOQUE PERSONAL</span><h2>Así te verá tu equipo.</h2><label htmlFor="nickname">Tu apodo</label>{room&&<p className="fine-print">Los cambios de apodo y avatar se aplican al entrar en una nueva sala.</p>}<input id="nickname" maxLength={24} value={name} onChange={e=>setName(e.target.value)} autoFocus/><label>Elige tu avatar</label><div className="avatar-picker">{avatars.map(a=><button key={a} className={avatar===a?'selected':''} aria-pressed={avatar===a} aria-label={`Avatar ${a}`} onClick={()=>setAvatar(a)}>{a}</button>)}</div><p className="fine-print"><ShieldCheck size={14}/>Invitado · conserva este navegador para recuperar tu partida</p><button className="primary full" disabled={!name.trim()} onClick={()=>setProfile(false)}>Guardar perfil<Check size={17}/></button>{error&&<div className="alert" role="alert">{error}</div>}<button className="text-button logout" onClick={()=>void logout()}><LogOut size={16}/>Cerrar sesión de invitado</button></section></div>}
 </>
}
