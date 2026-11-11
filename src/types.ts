export type Mode = 'classic' | 'speed' | 'masterpiece' | 'memory' | 'animation' | 'copy' | 'icebreaker';
export type Settings = { mode: Mode; seconds: number; maxPlayers: number };
export type Player = { id: string; name: string; avatar: string; ready: boolean; submitted: boolean; active: boolean };
export type Entry = { playerId: string; name: string; kind: 'write'|'draw'|'describe'; text?: string; image?: string; round: number };
export type Album = { id: string; author: string; entries: Entry[] };
export type GameState = {
 gameId: string; canClaimHost?: boolean; code: string; hostId: string; status: 'lobby'|'playing'|'reveal'|'finished'; settings: Settings;
 players: Player[]; round: number; totalRounds: number; deadline: string|null;
 task: { kind: 'write'|'draw'|'describe'; prompt?: string; image?: string; chainId: string }|null;
 albums: Album[]; revealIndex: number; reactions: {name:string;emoji:string}[]; serverNow: string;
};
export const avatars = ['🍒','🍕','🥑','🍩','🌮','🍔','🍋','🥨','🍓','🍣','🧁','🥝'];
export const modes: { id: Mode; name: string; tag: string; icon: string; description: string; color: string }[] = [
 {id:'classic',name:'Teléfono descompuesto',tag:'EL FAVORITO',icon:'☎',description:'Una frase, un dibujo y muchas interpretaciones inesperadas.',color:'peach'},
 {id:'speed',name:'Entrega exprés',tag:'MÁS RÁPIDO',icon:'⚡',description:'La misma cadena, con la mitad del tiempo. Confía en tu primer trazo.',color:'yellow'},
 {id:'masterpiece',name:'Obra maestra',tag:'SIN PRISA',icon:'✦',description:'El doble de tiempo para darle un poco más de arte al desastre.',color:'purple'},
 {id:'memory',name:'De memoria',tag:'A RECORDAR',icon:'◉',description:'Mira el dibujo unos segundos. Después, recréalo de memoria.',color:'mint'},
 {id:'animation',name:'En movimiento',tag:'FOTOGRAMA A FOTOGRAMA',icon:'▶',description:'Continúa el dibujo anterior y descubre la animación final.',color:'blue'},
 {id:'copy',name:'Copia creativa',tag:'DE MANO EN MANO',icon:'▧',description:'Reinterpreta cada dibujo. ¿Cuánto cambiará hasta el final?',color:'pink'},
 {id:'icebreaker',name:'Rompehielos',tag:'PARTIDA CORTA',icon:'☀',description:'Escribe una idea y dibuja la de un compañero. Dos rondas para conectar.',color:'yellow'},
];
export const defaultSettings: Settings = {mode:'classic',seconds:90,maxPlayers:12};
