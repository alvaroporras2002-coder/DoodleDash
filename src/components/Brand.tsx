import {PencilLine} from 'lucide-react';
export function Brand(){return <span className="brand"><span className="brand-mark"><PencilLine size={24} strokeWidth={2.6}/></span>Doodle<span>Dash</span><span className="brand-dot">✦</span></span>}
export function DoodleArt(){return <div className="doodle-art" aria-label="Ilustración de una cadena creativa de dibujos" role="img">
 <div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/>
 <span className="art-star star-one">✦</span><span className="art-star star-two">✳</span><span className="art-squiggle">〰</span>
 <div className="art-note note-one"><span className="note-label">LA IDEA ORIGINAL</span><span className="handwritten">Un aguacate<br/>llegando tarde...</span><span className="note-avatar">🍒 <small>Vale</small></span></div>
 <div className="art-note note-two"><span className="note-label">LA INTERPRETACIÓN</span><svg viewBox="0 0 210 180" aria-hidden="true"><path d="M71 42C84 13 113 21 122 44C131 67 160 86 155 119C151 157 105 164 76 150C44 135 48 103 57 81Z" fill="#b9d47c" stroke="#273f2b" strokeWidth="4"/><path d="M84 59C95 35 111 48 115 66C120 86 139 99 134 123C130 145 99 147 80 136C63 125 66 108 73 91Z" fill="#e8edb9"/><ellipse cx="102" cy="114" rx="22" ry="25" fill="#af653e" stroke="#6c3d29" strokeWidth="3"/><path d="M81 76l7-3m22 0 7 3M94 86q8 8 15 0M69 143l-12 17m63-12 16 11M57 96 35 87m111 7 25-19" fill="none" stroke="#273f2b" strokeWidth="4" strokeLinecap="round"/><path d="m155 46 22-8-9 20m-1-19-16 14" stroke="#eb1700" strokeWidth="3" fill="none"/></svg><span className="note-avatar">🥑 <small>Dani</small></span></div>
 <div className="art-note note-three"><span className="note-label">LO QUE ENTENDIMOS</span><span className="handwritten">¿Guacamole<br/>con prisa? 🏃</span><span className="note-avatar">🍕 <small>Álex</small></span></div>
 <div className="art-sticker"><span>100%</span> buenas risas</div><span className="art-arrow">↝</span>
 </div>}
