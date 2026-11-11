import {spawnSync} from 'node:child_process';
import {appendFileSync} from 'node:fs';
const run=spawnSync('npx',['playwright','test','--grep',process.argv[2],'--reporter=json'],{encoding:'utf8',maxBuffer:10*1024*1024});
let summary='Drawing flow passed';
if(run.status!==0){
 try{
  const report=JSON.parse(run.stdout);
  const errors=[];
  function walk(suites){for(const suite of suites||[]){for(const spec of suite.specs||[])for(const test of spec.tests||[])for(const result of test.results||[])for(const error of result.errors||[])errors.push(error.message||error.value||'Unknown error');walk(suite.suites)}}
  walk(report.suites);
  summary=errors.join(' | ')||report.errors?.[0]?.message||run.stderr||'Browser test failed';
 }catch{summary=run.stderr||run.stdout||'Browser test failed'}
 summary=summary.replace(/\u001b\[[0-9;]*m/g,'').replace(/\s+/g,' ').slice(0,240);
 console.error(run.stdout,run.stderr);
}
if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,`summary=${summary}\n`);
console.log(summary);
process.exit(run.status??1);
