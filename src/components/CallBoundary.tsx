import {Component,type ReactNode} from 'react';
export default class CallBoundary extends Component<{children:ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return{failed:true};}
 render(){return this.state.failed?<div className="setup-notice" role="status">The call is unavailable right now. You can keep playing.</div>:this.props.children;}
}
