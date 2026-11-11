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
 {id:'classic',name:'Drawing Telephone',tag:'THE FAVORITE',icon:'☎',description:'One phrase, one drawing, and plenty of unexpected interpretations.',color:'peach'},
 {id:'speed',name:'Express Delivery',tag:'FASTER',icon:'⚡',description:'The same chain, with half the time. Trust your first sketch.',color:'yellow'},
 {id:'masterpiece',name:'Masterpiece',tag:'TAKE YOUR TIME',icon:'✦',description:'Double the time to turn your creative chaos into art.',color:'purple'},
 {id:'memory',name:'From Memory',tag:'REMEMBER IT',icon:'◉',description:'Look at the drawing for a few seconds. Then recreate it from memory.',color:'mint'},
 {id:'animation',name:'In Motion',tag:'FRAME BY FRAME',icon:'▶',description:'Build on the previous drawing and reveal the final animation.',color:'blue'},
 {id:'copy',name:'Creative Copy',tag:'PASS IT ON',icon:'▧',description:'Reinterpret each drawing. How much will it change by the end?',color:'pink'},
 {id:'icebreaker',name:'Icebreaker',tag:'QUICK GAME',icon:'☀',description:'Write an idea and draw a teammate’s prompt. Two rounds to connect.',color:'yellow'},
];
export const defaultSettings: Settings = {mode:'classic',seconds:90,maxPlayers:20};
