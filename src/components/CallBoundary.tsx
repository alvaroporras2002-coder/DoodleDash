import {Component,type ReactNode} from 'react';
export default class CallBoundary extends Component<{children:ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return{failed:true};}
 render(){return this.state.failed?<div className="setup-notice" role="status">La llamada no está disponible en este momento. Puedes seguir jugando normalmente.</div>:this.props.children;}
}
