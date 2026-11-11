import {useId,useState} from 'react';
import {avatars} from '../types';
export function AvatarPicker({value,onChange}:{value:string;onChange:(value:string)=>void}){
 const [expanded,setExpanded]=useState(false),id=useId();
 const first=avatars.slice(0,6),visible=expanded?avatars:first.includes(value)?first:[...first.slice(0,5),value];
 return <div className="avatar-picker" role="group" aria-label="Choose an avatar" id={id}>{visible.map(a=><button type="button" key={a} className={value===a?'selected':''} aria-pressed={value===a} aria-label={`Avatar ${a}`} onClick={()=>onChange(a)}>{a}</button>)}<button type="button" className="avatar-toggle" aria-expanded={expanded} aria-controls={id} onClick={()=>setExpanded(!expanded)}>{expanded?'Less':'More'}</button></div>;
}
