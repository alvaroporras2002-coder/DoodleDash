import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DraftSaver} from '../../src/draftSaver.ts';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let n=0;n<100;n++){if(fn())return;await pause(5)}throw Error('Timed out waiting for draft queue');}
test('draft queue restores the latest value when editing back during an in-flight save',async t=>{
 const sends=[],pending=[],states=[];
 const saver=new DraftSaver(payload=>{sends.push(payload.text);return new Promise(resolve=>pending.push(resolve))},s=>states.push(s),1,10);
 t.after(()=>saver.stop());saver.start();saver.setActive(true);
 saver.update({text:'A'});await until(()=>sends.length===1);pending.shift()(true);await until(()=>states.at(-1)==='saved');
 saver.update({text:'B'});await until(()=>sends.length===2);
 saver.update({text:'A'});assert.equal(states.at(-1),'saving');
 pending.shift()(true);await until(()=>sends.length===3);
 assert.deepEqual(sends,['A','B','A']);pending.shift()(true);await until(()=>states.at(-1)==='saved');
 const count=states.length;saver.update({text:'A'});await pause(20);
 assert.equal(sends.length,3);assert.equal(states.length,count);
});
test('draft queue retries failures and stops requesting when inactive or idle',async t=>{
 let calls=0;const states=[];
 const saver=new DraftSaver(async()=>{calls++;if(calls===1)throw Error('Offline');return true},s=>states.push(s),1,10);
 t.after(()=>saver.stop());saver.start();saver.setActive(true);saver.update({text:'Latest'});
 await until(()=>states.at(-1)==='saved');assert.equal(calls,2);assert.ok(states.includes('error'));
 await pause(30);assert.equal(calls,2);
 saver.setActive(false);saver.update({text:'Waiting'});await pause(20);assert.equal(calls,2);
 saver.setActive(true);await until(()=>calls===3);await until(()=>states.at(-1)==='saved');
});
test('draft queue does not retry a closed round',async t=>{
 let calls=0;const states=[];
 const saver=new DraftSaver(async()=>{calls++;return false},s=>states.push(s),1,10);
 t.after(()=>saver.stop());saver.start();saver.setActive(true);saver.update({text:'Too late'});
 await until(()=>states.at(-1)==='closed');await pause(30);assert.equal(calls,1);
});
test('draft queue does not update unmounted UI after a request finishes',async()=>{
 let done;const states=[];
 const saver=new DraftSaver(()=>new Promise(r=>done=r),s=>states.push(s),1,10);
 saver.start();saver.setActive(true);saver.update({text:'A'});await until(()=>done);
 saver.stop();const count=states.length;done(true);await pause(20);assert.equal(states.length,count);
});
