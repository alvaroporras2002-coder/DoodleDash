import type {Mode} from '../types';

export function Brand(){return <span className="brand"><span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 40 40"><path d="M10 25C4 15 20 5 26 12S12 34 11 24 31 14 30 25" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round"/><circle cx="30" cy="10" r="3" fill="currentColor"/></svg></span><span className="brand-name">doodle<span>online</span></span><span className="brand-dot" aria-hidden="true"/></span>}

export function DoodleArt(){return <div className="studio-art" aria-label="A playful violet flower on a shared artist canvas" role="img">
 <div className="studio-art-grid" aria-hidden="true"/>
 <div className="studio-orbit" aria-hidden="true"/>
 <div className="studio-caption"><span className="live-dot"/>THE SHARED CANVAS<span>VOL. 01</span></div>
 <div className="studio-canvas">
  <div className="canvas-chrome"><span><i/><i/><i/></span><small>untitled, but unforgettable</small><span>↗</span></div>
  <svg className="flower-art" viewBox="0 0 460 360" aria-hidden="true">
   <path d="M35 270Q110 190 160 240T300 265T425 211" stroke="#d0eba0" strokeWidth="46" strokeLinecap="round" fill="none"/>
   <path d="M224 282Q242 218 230 158" stroke="#315b44" strokeWidth="10" strokeLinecap="round" fill="none"/>
   <path d="M228 249Q174 240 172 207Q215 201 228 249M236 224Q283 181 310 204Q290 242 236 224" fill="#86b772" stroke="#315b44" strokeWidth="3"/>
   <path d="M218 100C178 27 141 88 169 113C87 90 100 166 150 161C95 214 161 249 190 205C190 278 269 249 253 207C311 267 345 203 307 174C384 188 364 113 315 125C359 67 287 40 268 91C261 23 203 41 218 100Z" fill="#b59ae9" stroke="#6c3fc4" strokeWidth="3.5" strokeLinejoin="round"/>
   <circle cx="232" cy="153" r="48" fill="#cbed8e" stroke="#315b44" strokeWidth="3.5"/>
   <path d="M214 147l1 6M246 147l1 6M215 166Q231 184 249 163" fill="none" stroke="#315b44" strokeWidth="4" strokeLinecap="round"/>
   <path d="M67 115l13-15m-3 25 17-4M345 282l12 15m0-22 18 5" fill="none" stroke="#7041d6" strokeWidth="4" strokeLinecap="round"/>
   <path d="m356 53 5 12 13 2-10 9 2 14-12-7-12 6 3-14-9-10 13-1Z" fill="#cbed8e" stroke="#315b44" strokeWidth="2"/>
  </svg>
  <div className="canvas-tools" aria-hidden="true"><span className="paint-dot violet"/><span className="paint-dot leaf"/><span className="paint-dot lilac"/><span className="paint-dot ink"/><span className="canvas-tool-line"/><span>✎</span><span>↶</span><span>↷</span></div>
 </div>
 <div className="studio-note"><span>THE PROMPT</span><p>A flower with<br/>main character energy.</p><small>one idea. many interpretations.</small></div>
 <div className="studio-sticker" aria-hidden="true"><span>make art</span><strong>not sense.</strong><svg viewBox="0 0 90 18"><path d="M4 12Q40-3 85 10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg></div>
 <div className="studio-cursor" aria-hidden="true"><svg viewBox="0 0 28 34"><path d="m3 2 21 17-11 2-6 10Z" fill="#315b44" stroke="#f6f4fa" strokeWidth="2"/></svg><span>your next masterpiece</span></div>
 <span className="studio-scribble" aria-hidden="true">✳</span>
 </div>}

export function ModeIllustration({mode}:{mode:Mode}){
 return <svg className="mode-illustration" viewBox="0 0 220 140" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
 {mode==='classic'?<><path d="M41 31h65v55H68L48 105V86h-7Z"/><path d="M118 50h62v54h-18l-18 15v-15h-26"/><path d="m57 69 12-15 12 10 11-18M135 74h27m-27 13h18"/><path d="m104 24 14-8m-2 19h18"/></>:
 mode==='speed'?<><path d="m118 20-38 57h33l-14 43 48-63h-34Z"/><path d="M39 45h32M29 66h34M40 88h24M161 47h27m-35 44h29"/></>:
 mode==='masterpiece'?<><rect x="61" y="21" width="99" height="85" rx="4"/><path d="m63 85 28-28 22 19 20-31 25 39M76 120l9-14m60 0 9 14"/><circle cx="91" cy="42" r="7"/><path d="m37 25 2 10 10 2-9 5-1 10-5-9-10-1 9-5Z"/></>:
 mode==='memory'?<><path d="M60 70Q110 10 168 70Q114 128 60 70Z"/><circle cx="113" cy="70" r="21"/><path d="M109 62q10-4 10 4t-10 11m1 9h1M55 28l-9-9m120 11 10-9M44 70H31m145 0h13"/></>:
 mode==='animation'?<><rect x="46" y="23" width="108" height="83" rx="5"/><path d="M66 106v13h107V39h-19"/><path d="m91 46 30 22-30 21Z"/><path d="M58 34h4m7 0h4m7 0h4M57 95h4m7 0h4m7 0h4"/></>:
 mode==='copy'?<><rect x="47" y="25" width="75" height="74" rx="5"/><rect x="99" y="47" width="75" height="74" rx="5"/><path d="m60 81 18-30 17 24M116 102l20-30 19 24"/><circle cx="100" cy="44" r="5"/><path d="m150 25 13 3-4 13M162 29l-21 7"/></>:
 <><path d="M44 64c-18-24 20-45 33-14 13-31 51-10 32 14L77 96Z"/><path d="M122 71c-15-23 20-42 32-14 12-28 46-9 30 14l-30 29Z"/><path d="M71 111q38 22 80 0M117 24v13m-18-9 7 10m29-10-7 10"/></>}
 </svg>;
}
