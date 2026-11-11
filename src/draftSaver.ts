export type DraftStatus='idle'|'saving'|'saved'|'error'|'closed';
type Draft={payload:Record<string,unknown>;key:string};
export class DraftSaver{
 private latest:Draft|null=null;private savedKey='';private running=false;private active=false;private stopped=true;
 private sentAt=0;private timer:ReturnType<typeof setTimeout>|null=null;
 private send:(payload:Record<string,unknown>)=>Promise<boolean>;private notify:(status:DraftStatus)=>void;private delay:number;private retry:number;
 constructor(send:(payload:Record<string,unknown>)=>Promise<boolean>,notify:(status:DraftStatus)=>void,delay=650,retry=2000){this.send=send;this.notify=notify;this.delay=delay;this.retry=retry;}
 start(){this.stopped=false;}
 stop(){this.stopped=true;this.cancel();}
 setActive(active:boolean){this.active=active;if(active)this.schedule(0);else this.cancel();}
 update(payload:Record<string,unknown>){
  const key=JSON.stringify(payload);if(this.latest?.key===key)return;
  this.latest={payload,key};
  if(!this.running&&key===this.savedKey){this.notify('saved');return;}
  this.notify('saving');this.schedule(0);
 }
 flush(){this.cancel();void this.run();}
 private cancel(){if(this.timer!==null){clearTimeout(this.timer);this.timer=null;}}
 private schedule(delay:number){
  if(this.stopped||!this.active||this.running||!this.latest||this.latest.key===this.savedKey||this.timer!==null)return;
  this.timer=setTimeout(()=>{this.timer=null;void this.run();},delay);
 }
 private async run(){
  if(this.stopped||!this.active||this.running||!this.latest||this.latest.key===this.savedKey)return;
  const wait=this.delay-(Date.now()-this.sentAt);if(wait>0){this.schedule(wait);return;}
  const draft=this.latest;this.running=true;this.sentAt=Date.now();this.notify('saving');let failed=false;
  try{
   const accepted=await this.send(draft.payload);
   if(this.stopped)return;
   if(!accepted){this.active=false;this.notify('closed');return;}
   this.savedKey=draft.key;
   this.notify(this.latest.key===this.savedKey?'saved':'saving');
  }catch{failed=true;if(!this.stopped)this.notify('error');}
  finally{this.running=false;if(!this.stopped)this.schedule(failed?this.retry:Math.max(0,this.delay-(Date.now()-this.sentAt)));}
 }
}
