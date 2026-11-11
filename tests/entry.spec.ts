import {test,expect,type Page} from '@playwright/test';
import type {GameState,Settings} from '../src/types';

const roomCode='ABCDEF123456';
const userId='a17b75fa-15eb-4f79-9e75-426037ea245b';
type RpcCall={name:string;args:Record<string,unknown>};

function guestSession(){
 const now=Math.floor(Date.now()/1000);
 const encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url');
 const accessToken=[encode({alg:'HS256',typ:'JWT'}),encode({iss:'https://test.supabase.co/auth/v1',sub:userId,aud:'authenticated',role:'authenticated',iat:now,exp:now+3600,is_anonymous:true}),'mock-signature'].join('.');
 const user={id:userId,aud:'authenticated',role:'authenticated',is_anonymous:true,app_metadata:{provider:'anonymous',providers:['anonymous']},user_metadata:{},identities:[],created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
 return {access_token:accessToken,refresh_token:'mock-refresh-token',expires_in:3600,expires_at:now+3600,token_type:'bearer',user};
}

async function mockRoom(page:Page,{playing=false,existingSession=false}={}){
 const session=guestSession();
 const requests={signups:0,video:0,rpc:[] as RpcCall[],unhandled:[] as string[]};
 const state:GameState&{albumsIncluded:boolean}={
  code:roomCode,gameId:'390c4d13-1d56-4c61-b9c8-f1656f0dac97',hostId:userId,
  status:playing?'playing':'lobby',settings:{mode:'classic',seconds:90,maxPlayers:20},
  players:[{id:userId,name:'Guest artist',avatar:'🎨',ready:false,submitted:false,active:true},{id:'914fa2ac-c86b-4295-994e-782dd24be492',name:'Sam',avatar:'🌙',ready:true,submitted:false,active:true}],
  round:playing?1:0,totalRounds:4,deadline:playing?new Date(Date.now()+600_000).toISOString():null,
  task:playing?{kind:'draw',prompt:'A cat delivering pizza',chainId:'36c27c52-2225-4a5e-a134-65c32a630336'}:null,
  albums:[],albumsIncluded:true,revealIndex:0,reactions:[],serverNow:new Date().toISOString()
 };
 await page.addInitScript(({savedSession,restoreSession})=>{
  localStorage.clear();sessionStorage.clear();
  if(restoreSession){localStorage.setItem('sb-test-auth-token',JSON.stringify(savedSession));localStorage.setItem('dd-name','Returning artist');}
  const tracker=window as unknown as {entryMediaRequests:number};tracker.entryMediaRequests=0;
  Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:()=>{tracker.entryMediaRequests++;return Promise.reject(new Error('Calls must stay opt-in.'));}});
 },{savedSession:session,restoreSession:existingSession});
 // Realtime is optional: all snapshots below come through the real RPC client.
 await page.routeWebSocket('wss://test.supabase.co/**',socket=>socket.close());
 await page.route('**/api/video',async route=>{
  requests.video++;
  await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'The optional call was not requested by this test.'})});
 });
 await page.route('https://test.supabase.co/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const respond=(body:unknown,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(body)});
  if(path==='/auth/v1/signup'){requests.signups++;await respond(session);return;}
  if(path==='/auth/v1/user'){await respond(session.user);return;}
  if(path==='/auth/v1/token'){await respond(session);return;}
  if(path.startsWith('/rest/v1/rpc/')){
   const name=path.split('/').at(-1)!;
   const args=route.request().postDataJSON() as Record<string,unknown>;
   requests.rpc.push({name,args});
   if(name==='game_create'||name==='game_join'){
    state.players[0].name=String(args.nickname);state.players[0].avatar=String(args.avatar);
    if(name==='game_create')state.settings=args.settings as Settings;
    await respond(name==='game_create'?roomCode:true);return;
   }
   if(name==='game_state'){state.serverNow=new Date().toISOString();await respond(state);return;}
   if(name==='game_action'){
    if(args.action==='settings')state.settings={...state.settings,...args.payload as Settings};
    await respond(true);return;
   }
   if(name==='game_save_draft'){await respond(true);return;}
  }
  requests.unhandled.push(path);
  await respond({message:`Unexpected mocked endpoint: ${path}`},404);
 });
 return {requests,state};
}

async function createRoom(page:Page,nickname='Guest artist'){
 await page.goto('/');
 await expect(page.getByRole('heading',{name:/Draw\. Guess\.\s*Repeat\./})).toBeVisible();
 await page.getByRole('button',{name:'Create room',exact:true}).click();
 const panel=page.getByRole('region',{name:'Create a room',exact:true});
 await expect(panel).toHaveClass(/entry-panel/);
 await panel.getByRole('textbox',{name:'Nickname',exact:true}).fill(nickname);
 await panel.getByRole('button',{name:'Create room',exact:true}).click();
 await expect(page.locator('.room-layout')).toBeVisible();
}

test('configured entry guest creates a default room with one submit',async({page})=>{
 const {requests}=await mockRoom(page);
 await page.goto('/');
 await expect(page.getByRole('heading',{name:/Draw\. Guess\.\s*Repeat\./})).toBeVisible();
 await page.getByRole('button',{name:'Create room',exact:true}).click();
 const panel=page.getByRole('region',{name:'Create a room',exact:true});
 await expect(panel.getByRole('group',{name:'Choose an avatar'})).toBeVisible();
 await panel.getByRole('textbox',{name:'Nickname',exact:true}).fill('  One click artist  ');
 await panel.getByRole('button',{name:'Avatar 🌙',exact:true}).click();
 await panel.getByRole('button',{name:'Create room',exact:true}).click();
 await expect(page.locator('.room-layout')).toBeVisible();
 await expect(page).toHaveURL(new RegExp('room='+roomCode+'$'));
 expect(requests.signups).toBe(1);
 expect(requests.rpc.filter(call=>call.name==='game_create')).toEqual([{name:'game_create',args:{settings:{mode:'classic',seconds:90,maxPlayers:20},nickname:'One click artist',avatar:'🌙'}}]);
 expect(requests.rpc.filter(call=>call.name==='game_join')).toEqual([]);
 expect(requests.unhandled).toEqual([]);
});

test('configured entry invite guest joins with one submit and never creates a room',async({page})=>{
 const {requests}=await mockRoom(page);
 await page.goto(`/?room=${roomCode}`);
 const panel=page.getByRole('region',{name:'Join a room',exact:true});
 await expect(panel).toHaveClass(/entry-panel/);
 await expect(panel.getByRole('textbox',{name:'Room code',exact:true})).toHaveValue(roomCode);
 await panel.getByRole('textbox',{name:'Nickname',exact:true}).fill('Invited artist');
 await panel.getByRole('button',{name:'Join room',exact:true}).click();
 await expect(page.locator('.room-layout')).toBeVisible();
 expect(requests.signups).toBe(1);
 expect(requests.rpc.filter(call=>call.name==='game_join')).toEqual([{name:'game_join',args:{code:roomCode,nickname:'Invited artist',avatar:'🎨'}}]);
 expect(requests.rpc.filter(call=>call.name==='game_create')).toEqual([]);
 expect(requests.unhandled).toEqual([]);
});

test('configured entry restored guest creates a room without another anonymous signup',async({page})=>{
 const {requests}=await mockRoom(page,{existingSession:true});
 await createRoom(page,'Returning artist');
 expect(requests.signups).toBe(0);
 expect(requests.rpc.filter(call=>call.name==='game_create')).toHaveLength(1);
 expect(requests.unhandled).toEqual([]);
});

test('configured entry host chooses modes and updates settings inside the lobby',async({page})=>{
 const {requests}=await mockRoom(page);
 await createRoom(page);
 const modes=page.locator('.room-main .room-modes');
 await expect(modes.getByRole('button')).toHaveCount(7);
 for(const name of ['Drawing Telephone','Quick Sketch','Masterpiece','From Memory','In Motion','Creative Copy','Icebreaker'])await expect(modes.getByRole('button',{name:new RegExp(name)})).toBeVisible();
 const memory=modes.getByRole('button',{name:/From Memory/});
 await memory.click();
 await expect(memory).toHaveClass(/selected/);
 expect(requests.rpc.filter(call=>call.name==='game_action'&&call.args.action==='settings')).toEqual([{name:'game_action',args:{code:roomCode,action:'settings',payload:{mode:'memory',seconds:90,maxPlayers:20}}}]);
 await page.getByRole('combobox',{name:'Base time per round'}).selectOption('60');
 await expect(page.getByRole('combobox',{name:'Base time per round'})).toHaveValue('60');
 await expect.poll(()=>requests.rpc.filter(call=>call.name==='game_action'&&call.args.action==='settings').at(-1)?.args.payload).toEqual({mode:'memory',seconds:60,maxPlayers:20});
 expect(requests.unhandled).toEqual([]);
});

for(const width of [1440,390]){
 test(`configured entry drawing room keeps an opt-in call beside or below the game at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1000});
  const {requests}=await mockRoom(page,{playing:true});
  await createRoom(page);
  const layout=page.locator('.room-layout');
  const main=layout.locator(':scope > .room-main');
  const call=layout.locator(':scope > .call-sidebar');
  await expect(layout.locator(':scope > .room-sidebar')).toBeVisible();
  await expect(main.getByTestId('drawing-canvas')).toBeVisible();
  await expect(call.getByTestId('optional-call')).toBeVisible();
  await expect(call.getByRole('button',{name:'Join the call',exact:true})).toBeEnabled();
  expect(await layout.evaluate(el=>getComputedStyle(el).display)).toBe('grid');
  await page.evaluate(()=>document.fonts.ready);
  const mainBox=(await main.boundingBox())!;
  const callBox=(await call.boundingBox())!;
  if(width===1440)expect(callBox.x).toBeGreaterThanOrEqual(mainBox.x+mainBox.width-1);
  else expect(callBox.y).toBeGreaterThanOrEqual(mainBox.y+mainBox.height-1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  expect(await page.evaluate(()=>(window as unknown as {entryMediaRequests:number}).entryMediaRequests)).toBe(0);
  expect(requests.video).toBe(0);
  expect(requests.unhandled).toEqual([]);
 });
}
