const fs = require('node:fs');
const path = require('node:path');
const newman = require('newman');
const root = path.resolve(__dirname, '../..');
function sanitize(value, secrets = []) {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(v => sanitize(v, secrets));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v]) =>
    [k, /password|secret|token|authorization/i.test(k) ? '[REDACTED]' : sanitize(v, secrets)]));
  if (typeof value !== 'string') return value;
  let text = value;
  for (const secret of secrets.filter(Boolean).sort((a,b)=>b.length-a.length)) text = text.split(String(secret)).join('[REDACTED]');
  text = text.replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,'[REDACTED JWT]');
  return text.length > 2200 ? text.slice(0,2200)+' [TRUNCATED]' : text;
}
async function runSuite(variables, outputDir, options = {}) {
  const collection = JSON.parse(fs.readFileSync(path.join(root, options.collection || 'postman/Event-Booking-API.postman_collection.json')));
  const environment = JSON.parse(fs.readFileSync(path.join(root, options.environment || 'postman/local.postman_environment.json')));
  for (const [key,value] of Object.entries(variables)) {
    const entry=environment.values.find(v=>v.key===key);
    if(entry)entry.value=String(value);else environment.values.push({key,value:String(value),enabled:true});
  }
  const secrets = [...Object.entries(variables).filter(([k])=>/password|token|secret/i.test(k)).map(([,v])=>String(v)),
    ...environment.values.filter(v=>/password|token|secret/i.test(v.key)).map(v=>v.value)];
  const startedAt = new Date().toISOString();
  const summary = await new Promise((resolve,reject) => newman.run({
    collection,environment,reporters:[],timeoutRequest:15000,timeoutScript:10000,
  },(err,result)=>err?reject(err):resolve(result)));
  // Do not export Newman's raw summary: it contains environment passwords and JWTs.
  const executions = summary.run.executions.map(e=>{
    let response;
    try { response=JSON.parse(e.response?.stream?.toString()||'null'); }
    catch { response=e.response?.stream?.toString()||null; }
    let body=e.request.body?.raw;
    try {body=JSON.parse(body);}catch {}
    return {
      name:e.item.name,source:e.item.request.description?.toString(),
      request:{method:e.request.method,url:e.request.url.toString(),body:sanitize(body,secrets)},
      actualStatus:e.response?.code ?? null,response:sanitize(response,secrets),
      durationMs:e.response?.responseTime ?? null,
      assertions:(e.assertions||[]).map(a=>({name:a.assertion,status:a.skipped?'Not Run':a.error?'Fail':'Pass',message:a.error?sanitize(a.error.message,secrets):undefined})),
    };
  });
  const declared=collection.item.flatMap(folder=>folder.item).map(i=>i.name);
  const executed=new Set(executions.map(e=>e.name));
  const result = {
    tool:'Newman '+require('newman/package.json').version,startedAt,endedAt:new Date().toISOString(),
    requests:executions.length,assertions:summary.run.stats.assertions,
    failures:summary.run.failures.map(f=>({source:f.source?.name,name:f.error?.name,message:sanitize(f.error?.message||'',secrets)})),
    notRun:declared.filter(n=>!executed.has(n)),
    executions,
  };
  fs.mkdirSync(outputDir,{recursive:true});
  fs.writeFileSync(path.join(outputDir,'newman.json'),JSON.stringify(result,null,2)+'\n');
  console.log('Newman: '+result.requests+' requests, '+result.assertions.total+' assertions, '+result.failures.length+' failures, '+result.notRun.length+' not run');
  return {result,environment:summary.environment};
}
module.exports={runSuite,sanitize};
if(require.main===module) (async()=>{
  const values={
    baseUrl:process.env.EVENT_BOOKING_BASE_URL||'http://127.0.0.1:3000',
    organizerEmail:process.env.EVENT_BOOKING_ORGANIZER_EMAIL,
    organizerPassword:process.env.EVENT_BOOKING_ORGANIZER_PASSWORD,
    otherOrganizerEmail:process.env.EVENT_BOOKING_OTHER_ORGANIZER_EMAIL,
    otherOrganizerPassword:process.env.EVENT_BOOKING_OTHER_ORGANIZER_PASSWORD,
  };
  const url=new URL(values.baseUrl);
  if(!['127.0.0.1','localhost','[::1]'].includes(url.hostname))throw new Error('Runner accepts a local test API only');
  if(process.env.EVENT_BOOKING_ALLOW_TEST_WRITES!=='YES')throw new Error('Confirm dedicated test data by setting EVENT_BOOKING_ALLOW_TEST_WRITES=YES; collection creates accounts/events and closes its events');
  if(Object.values(values).some(v=>!v))throw new Error('Supply both Organizer test accounts through EVENT_BOOKING_* environment variables; see README');
  const output=path.join(root,'evidence/newman',new Date().toISOString().replace(/[:.]/g,'-'));
  const {result}=await runSuite(values,output,{
    collection:process.argv[2],environment:process.argv[3],
  });
  process.exitCode=result.failures.length?1:0;
})().catch(e=>{console.error(e.message);process.exitCode=1;});
