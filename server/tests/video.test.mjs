import {test} from 'node:test';
import assert from 'node:assert/strict';
import {jwtVerify} from 'jose';
import {handleVideo} from '../video.ts';
const uid='20000000-0000-0000-0000-000000000001';
const env={VITE_SUPABASE_URL:'https://project.example',VITE_SUPABASE_ANON_KEY:'test-publishable-key',LIVEKIT_URL:'wss://media.example',LIVEKIT_API_KEY:'test-api-key',LIVEKIT_API_SECRET:'test-only-secret-do-not-use-in-production',VIDEO_ENABLED:'true'};
function req(body={code:'ABC123',action:'join'},overrides={}){return new Request('https://game.example/api/video',{method:'POST',headers:{Origin:'https://game.example','Content-Type':'application/json',Authorization:'Bearer test-session',...overrides},body:JSON.stringify(body)});}
function mock(options={}){
 const calls=[];
 const members=Array.from({length:20},(_,i)=>`20000000-0000-0000-0000-${String(i+1).padStart(12,'0')}`);
 const fetcher=async(input,init)=>{
  const url=String(input),body=init?.body?JSON.parse(init.body):{};calls.push({url,body,headers:init?.headers});
  if(url.endsWith('/auth/v1/user'))return Response.json({id:uid,is_anonymous:true},{status:options.authStatus||200});
  if(url.endsWith('/rpc/game_video_access'))return options.outsider?Response.json({code:'42501'},{status:403}):Response.json({roomName:'doodledash-ABC123',identity:uid,name:'Alvaro',avatar:'🍕',capacity:20,members});
  if(url.endsWith('/ListParticipants'))return Response.json({participants:[...members.map(identity=>({identity})),...(options.stale?[{identity:'removed-player'}]:[])]});
  if(url.includes('/twirp/'))return Response.json({});
  throw new Error('Unexpected request '+url);
 };return{fetcher,calls,members};
}
test('20-member admission creates capped SFU room and camera/microphone-only signed ticket',async()=>{
 const m=mock();const response=await handleVideo(req({code:'ABC123',action:'join',identity:'spoofed',name:'fake'}),env,m.fetcher);assert.equal(response.status,200);
 const data=await response.json();const{payload}=await jwtVerify(data.token,new TextEncoder().encode(env.LIVEKIT_API_SECRET),{issuer:env.LIVEKIT_API_KEY});
 assert.equal(payload.sub,uid);assert.equal(payload.name,'Alvaro');assert.equal(payload.video.room,'doodledash-ABC123');
 assert.deepEqual(payload.video.canPublishSources,['camera','microphone']);assert.equal(payload.video.canPublishData,false);assert.equal(payload.video.roomAdmin,undefined);assert.equal(payload.video.roomCreate,undefined);
 assert.ok(payload.exp-payload.iat<=120);assert.equal(data.capacity,20);assert.ok(!JSON.stringify(data).includes(env.LIVEKIT_API_SECRET));
 const create=m.calls.find(x=>x.url.endsWith('/CreateRoom'));assert.equal(create.body.maxParticipants,20);
 assert.equal(m.calls.find(x=>x.url.endsWith('/game_video_access')).body.issue_token,true);
});
test('outsiders and expired sessions cannot reach the media service',async()=>{
 for(const options of [{outsider:true},{authStatus:401}]){const m=mock(options);const response=await handleVideo(req(),env,m.fetcher);assert.ok([401,403].includes(response.status));assert.equal(m.calls.filter(x=>x.url.includes('/twirp/')).length,0);}
});
test('cross-origin, malformed and unconfigured requests are refused without network calls',async()=>{
 const m=mock();assert.equal((await handleVideo(req({}, {Origin:'https://evil.example'}),env,m.fetcher)).status,403);
 assert.equal((await handleVideo(req({code:'../other'}),env,m.fetcher)).status,400);
 assert.equal((await handleVideo(req(),{...env,VIDEO_ENABLED:'false'},m.fetcher)).status,503);
 assert.equal((await handleVideo(req({}, {Authorization:''}),env,m.fetcher)).status,401);
 assert.equal(m.calls.length,0);
});
test('heartbeat validates membership and removes stale media identities without minting tickets',async()=>{
 const m=mock({stale:true});const response=await handleVideo(req({code:'ABC123',action:'heartbeat'}),env,m.fetcher);assert.equal(response.status,200);
 assert.deepEqual(m.calls.find(x=>x.url.endsWith('/RemoveParticipant')).body,{room:'doodledash-ABC123',identity:'removed-player'});
 assert.equal((await response.json()).token,undefined);assert.equal(m.calls.some(x=>x.url.endsWith('/CreateRoom')),false);
});
test('leave can only remove the authenticated identity even when a caller supplies another target',async()=>{
 const m=mock();const response=await handleVideo(req({code:'ABC123',action:'leave',identity:'other'}),env,m.fetcher);assert.equal(response.status,200);
 assert.deepEqual(m.calls.find(x=>x.url.endsWith('/RemoveParticipant')).body,{room:'doodledash-ABC123',identity:uid});
});
test('upstream outages return a safe error without secrets',async()=>{
 const response=await handleVideo(req(),env,async()=>{throw new Error(env.LIVEKIT_API_SECRET)});assert.equal(response.status,502);assert.ok(!(await response.text()).includes(env.LIVEKIT_API_SECRET));
});

import {syncCallSubscriptions} from '../../src/callSubscriptions.ts';
test('optional call subscribes late microphone and keeps voices when cameras are hidden',()=>{
 const calls=[];const p={identity:'partner',trackPublications:new Map()};
 syncCallSubscriptions([p],new Set());
 const mic={source:'microphone',isDesired:false,setSubscribed(value){this.isDesired=value;calls.push(['mic',value]);}};
 p.trackPublications.set('mic',mic);
 syncCallSubscriptions([p],new Set());
 assert.deepEqual(calls,[['mic',true]]);
 syncCallSubscriptions([p],new Set());
 assert.equal(calls.length,1);
 p.trackPublications.set('cam',{source:'camera',isDesired:true,setSubscribed(value){this.isDesired=value;calls.push(['camera',value]);}});
 syncCallSubscriptions([p],new Set());
 assert.equal(mic.isDesired,true);
 assert.deepEqual(calls.at(-1),['camera',false]);
 syncCallSubscriptions([p],new Set(['partner']));
 assert.deepEqual(calls.at(-1),['camera',true]);
});
test('optional call restores microphone subscription intent on reconnect',()=>{
 const mic={source:'microphone',isDesired:false,setSubscribed(value){this.isDesired=value;}};
 const p={identity:'reconnected',trackPublications:new Map([['mic',mic]])};
 syncCallSubscriptions([p],new Set());assert.equal(mic.isDesired,true);
 mic.isDesired=false;
 syncCallSubscriptions([p],new Set());assert.equal(mic.isDesired,true);
});
