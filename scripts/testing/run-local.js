const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const crypto = require('node:crypto');
const {spawn,fork,execFileSync} = require('node:child_process');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const YAML = require('yamljs');
const {runSuite,sanitize} = require('../newman/run');
const {runChecks} = require('../../tests/concurrency-and-db');
const root = path.resolve(__dirname,'../..');
const pause = ms => new Promise(resolve=>setTimeout(resolve,ms));
async function freePort() {
  const s=net.createServer();
  await new Promise((resolve,reject)=>s.once('error',reject).listen(0,'127.0.0.1',resolve));
  const port=s.address().port;
  await new Promise(resolve=>s.close(resolve));return port;
}
async function waitFor(fn,timeout=60000) {
  const end=Date.now()+timeout;
  while(Date.now()<end){try{const r=await fn();if(r)return r;}catch{}await pause(250);}
  throw new Error('Local service readiness timed out; inspect ignored .runtime logs');
}
async function main() {
  if(process.env.EVENT_BOOKING_ALLOW_TEST_WRITES!=='YES')throw new Error('Set EVENT_BOOKING_ALLOW_TEST_WRITES=YES to authorize writes/close only in a newly created isolated database. No reset/delete is performed.');
  let bin=process.env.MYSQL_BIN;
  if(!bin&&process.platform==='win32')bin='C:/Program Files/MySQL/MySQL Server 8.0/bin';
  if(!bin)throw new Error('Set MYSQL_BIN to the MySQL 8 server binary directory');
  const exe=path.join(bin,process.platform==='win32'?'mysqld.exe':'mysqld');
  if(!fs.existsSync(exe))throw new Error('mysqld unavailable; set MYSQL_BIN');
  const id=new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomBytes(3).toString('hex');
  const runtime=path.join(root,'.runtime',id);
  const output=path.join(root,'evidence/runs',id);
  fs.mkdirSync(runtime,{recursive:true});fs.mkdirSync(output,{recursive:true});
  const database='event_booking_isolated';
  const dataDir=path.join(runtime,'mysql-data');
  const dbPort=await freePort();
  const dbPassword=crypto.randomBytes(24).toString('hex');
  const secret=crypto.randomBytes(32).toString('hex');
  const password=crypto.randomBytes(16).toString('hex')+'!';
  const sensitive=[dbPassword,secret,password];
  const manifest={
    runId:id,startedAt:new Date().toISOString(),timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,
    command:'$env:EVENT_BOOKING_ALLOW_TEST_WRITES="YES"; '+(process.argv.includes('--lab')?'npm run test:lab':process.argv.includes('--probe')?'npm run test:local -- --probe':'npm run test:local'),
    gitHead:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
    branch:execFileSync('git',['branch','--show-current'],{cwd:root,encoding:'utf8'}).trim(),
    workingTree:'Uncommitted testing portfolio improvements; file hashes identify tested sources',
    node:process.version,newman:require('newman/package.json').version,
    mysql:execFileSync(exe,['--version'],{encoding:'utf8'}).trim().replace(exe,'mysqld'),
    environment:{host:'127.0.0.1',dbPort,database,initialData:'Fresh directory; schema from src/db/schema.sql; two generated organizers'},
    safety:{noExistingDatabaseUsed:true,noDropTruncateOrDelete:true,closeAuthorized:true,dataRetained:true},
    files:{},status:'Pending',phases:[],
  };
  const sourceFiles=execFileSync('git',['ls-files','--cached','--others','--exclude-standard'],{cwd:root,encoding:'utf8'}).trim().split(/\r?\n/).filter(f=>/^(src\/|scripts\/|tests\/|postman\/|sql-validation\/|docs\/openapi.yaml|package)/.test(f));
  for(const f of sourceFiles)manifest.files[f]=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex');
  function save(){fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');}
  save();
  function launch(args,logName) {
    const fd=fs.openSync(path.join(runtime,logName),'a');
    const child=spawn(exe,args,{cwd:root,windowsHide:true,stdio:['ignore',fd,fd]});
    fs.closeSync(fd);return child;
  }
  let db,apiProcess,mysqlProcess;
  let shutdownConfirmed=false;
  try {
    console.log('Run '+id+': initialize fresh MySQL data directory (no existing data touched)');
    const init=launch(['--no-defaults','--initialize-insecure','--basedir='+path.dirname(bin),'--datadir='+dataDir,'--console'],'mysql-init.log');
    await new Promise((resolve,reject)=>{
      init.once('error',reject);init.once('exit',code=>code===0?resolve():reject(new Error('MySQL initialization exited '+code)));
    });
    console.log('Start loopback-only MySQL on port '+dbPort);
    mysqlProcess=launch(['--no-defaults','--basedir='+path.dirname(bin),'--datadir='+dataDir,'--port='+dbPort,'--bind-address=127.0.0.1','--mysqlx=OFF','--innodb-buffer-pool-size=64M','--pid-file='+path.join(runtime,'mysql.pid'),'--console'],'mysql.log');
    mysqlProcess.once('error',()=>{});
    const config={host:'127.0.0.1',port:dbPort,user:'root',timezone:'Z',supportBigNumbers:true,bigNumberStrings:true,multipleStatements:true,connectTimeout:1000};
    db=await waitFor(()=>mysql.createConnection(config),90000);
    await db.query("SET time_zone = '+00:00'");
    // Credential exists only in memory; the instance is never exposed beyond loopback.
    await db.query("ALTER USER 'root'@'localhost' IDENTIFIED BY ?",[dbPassword]);
    await db.query('CREATE DATABASE '+database+' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    await db.query('USE '+database);
    await db.query(fs.readFileSync(path.join(root,'src/db/schema.sql'),'utf8'));
    const hash=await bcrypt.hash(password,12);
    const organizers=[];
    for(const suffix of ['a','b']){
      const email='organizer_'+suffix+'@example.test';
      const [r]=await db.execute("INSERT INTO users(username,email,password,role) VALUES(?,?,?,'organizer')",['organizer_'+suffix,email,hash]);
      organizers.push({id:String(r.insertId),email});
    }
    manifest.phases.push({name:'environment',status:'Pass',time:new Date().toISOString()});
    const apiLog=fs.openSync(path.join(runtime,'api.log'),'a');
    apiProcess=fork(path.join(__dirname,'serve-isolated.js'),[],{cwd:root,windowsHide:true,env:{
      ...process.env,DB_HOST:'127.0.0.1',DB_PORT:String(dbPort),DB_USER:'root',DB_PASSWORD:dbPassword,DB_NAME:database,JWT_SECRET:secret,JWT_EXPIRES_IN:'1h',
    },stdio:['ignore',apiLog,apiLog,'ipc']});
    fs.closeSync(apiLog);
    const apiPort=await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('API startup timeout')),30000);
      apiProcess.once('message',m=>{clearTimeout(timer);m.ready?resolve(m.port):reject(new Error('API startup failed'));});
      apiProcess.once('exit',code=>{clearTimeout(timer);reject(new Error('API exited '+code));});
      apiProcess.once('error',reject);
    });
    const baseUrl='http://127.0.0.1:'+apiPort;
    manifest.environment.baseUrl=baseUrl;save();
    if(process.argv.includes('--probe')){
      const {runProbe}=require('../../tests/regression-probe');
      const checks=await runProbe({baseUrl,organizerEmail:organizers[0].email,password,db});
      fs.writeFileSync(path.join(output,'regression-probe.json'),JSON.stringify(checks,null,2)+'\n');
      manifest.mode='Targeted defect reproduction';
      manifest.phases.push({name:'regression-probe',checks:checks.length,status:checks.some(c=>c.status==='Fail')?'Fail':'Pass'});
      manifest.status=checks.some(c=>c.status==='Fail')?'Fail':'Pass';
      process.exitCode=manifest.status==='Pass'?0:1;
      return;
    }
    if(process.argv.includes('--lab')){
      const environment=JSON.parse(fs.readFileSync(path.join(root,'postman/local.postman_environment.json'),'utf8'));
      const values={baseUrl,organizerEmail:organizers[0].email,organizerPassword:password,otherOrganizerEmail:organizers[1].email,otherOrganizerPassword:password,userPassword:password};
      for(const entry of environment.values)entry.value=values[entry.key]||'';
      environment.name='Isolated manual lab '+id;
      fs.writeFileSync(path.join(runtime,'lab.postman_environment.local.json'),JSON.stringify(environment,null,2)+'\n');
      manifest.status='Not Run';manifest.mode='Manual lab; no automatic tests executed';save();
      console.log('Manual lab ready: '+baseUrl);
      console.log('Import .runtime/'+id+'/lab.postman_environment.local.json (contains local test credentials, do not publish).');
      console.log('Press Ctrl+C here when finished; services stop, data remains.');
      process.stdin.resume();
      await new Promise(resolve=>process.once('SIGINT',resolve));
      process.stdin.pause();
      return;
    }
    console.log('API ready on '+baseUrl+'; execute Newman collection');
    const userPassword=crypto.randomBytes(16).toString('hex')+'!';
    sensitive.push(userPassword);
    const makeToken=(sub,algorithm='HS256',extra={})=>jwt.sign(extra,secret,{subject:String(sub),algorithm,expiresIn:'1h'});
    // User A will get ID 3 in this guaranteed fresh database (organizers are 1 and 2).
    // Signed edge fixtures are operator-created solely for negative authentication tests.
    const values={
      baseUrl,organizerEmail:organizers[0].email,organizerPassword:password,
      otherOrganizerEmail:organizers[1].email,otherOrganizerPassword:password,userPassword,
      expiredToken:jwt.sign({},secret,{subject:'3',expiresIn:-10,algorithm:'HS256'}),
      wrongAlgorithmToken:makeToken('3','HS512'),
      missingSubjectToken:makeToken('9007199254740991'),
      forgedRoleToken:makeToken('3','HS256',{role:'organizer'}),
    };
    const suite=await runSuite(values,output);
    const {runProbe}=require('../../tests/regression-probe');
    const regressions=await runProbe({baseUrl,organizerEmail:organizers[0].email,password,db});
    fs.writeFileSync(path.join(output,'regression-probe.json'),JSON.stringify(regressions,null,2)+'\n');
    manifest.phases.push({name:'regression-probe',checks:regressions.length,status:regressions.some(c=>c.status==='Fail')?'Fail':'Pass'});
    const suiteIncomplete=suite.result.notRun.length>0||suite.result.assertions.pending>0;
    manifest.phases.push({name:'newman',status:suite.result.failures.length||suiteIncomplete?'Fail':'Pass',requests:suite.result.requests,failedAssertions:suite.result.assertions.failed,notRun:suite.result.notRun.length,pendingAssertions:suite.result.assertions.pending});
    const env=k=>suite.environment.get(k);
    console.log('Execute bounded concurrency and database consistency checks');
    const checks=await runChecks({db,baseUrl,organizerToken:env('organizerToken'),userAToken:env('userAToken'),userAId:env('userAId'),runId:Date.now().toString()});
    fs.writeFileSync(path.join(output,'concurrency-db.json'),JSON.stringify(checks,null,2)+'\n');
    manifest.phases.push({name:'concurrency-db',status:checks.some(c=>c.status!=='Pass')?'Fail':'Pass',checks:checks.length,failed:checks.filter(c=>c.status==='Fail').length,blocked:checks.filter(c=>c.status==='Blocked').length});
    let sql=fs.readFileSync(path.join(root,'sql-validation/validation-queries.sql'),'utf8');
    const ids={user_id:env('userAId'),other_user_id:env('userBId'),organizer_id:organizers[0].id,other_organizer_id:organizers[1].id,event_id:env('eventId'),other_event_id:env('extendedEventId'),booking_id:env('bookingId')};
    for(const [name,value] of Object.entries(ids)){
      if(!/^[1-9]\d*$/.test(value))throw new Error('SQL fixture ID missing: '+name);
      sql=sql.replace('SET @'+name+' = NULL;','SET @'+name+' = '+value+';');
    }
    const [sqlResults]=await db.query(sql);
    fs.writeFileSync(path.join(output,'sql-templates.json'),JSON.stringify({description:'Actual read-only template observations; DB assertions are in concurrency-db.json',ids,results:sqlResults.filter(Array.isArray)},null,2)+'\n');
    manifest.phases.push({name:'sql-templates',status:'Executed',resultSets:sqlResults.filter(Array.isArray).length});
    const spec=YAML.load(path.join(root,'docs/openapi.yaml'));
    const issues=[];
    const responseKeys=new Set(['description','headers','content','links','$ref']);
    for(const [route,methods] of Object.entries(spec.paths))for(const [method,op] of Object.entries(methods)){
      for(const [status,response] of Object.entries(op.responses||{}))for(const key of Object.keys(response)){
        if(!responseKeys.has(key)&&!key.startsWith('x-'))issues.push({route,method,status,unexpectedResponseProperty:key});
      }
    }
    const contract={id:'DOC-001',description:'Response Object allows only OpenAPI response properties',status:issues.length?'Fail':'Pass',issues};
    fs.writeFileSync(path.join(output,'openapi-review.json'),JSON.stringify(contract,null,2)+'\n');
    manifest.phases.push({name:'openapi-response-object-review',status:contract.status});
    manifest.status=suite.result.failures.length||suiteIncomplete||checks.some(c=>c.status!=='Pass')||issues.length||regressions.some(c=>c.status==='Fail')?'Fail':'Pass';
    process.exitCode=manifest.status==='Pass'?0:1;
  } catch(e) {
    manifest.status='Blocked';manifest.blocker=sanitize(e.message,sensitive);process.exitCode=1;
    console.error('Run blocked: '+manifest.blocker);
  } finally {
    console.log('Stop only this run’s API and isolated MySQL; retain all data');
    if(apiProcess&&apiProcess.exitCode===null&&apiProcess.signalCode===null){
      const exited=new Promise(resolve=>apiProcess.once('exit',resolve));
      if(apiProcess.connected)apiProcess.send({shutdown:true});
      await Promise.race([exited,pause(5000)]);
      if(apiProcess.exitCode===null&&apiProcess.signalCode===null){
        apiProcess.kill();
        await Promise.race([exited,pause(5000)]);
      }
    }
    if(db){
      try{await db.query('SHUTDOWN');shutdownConfirmed=true;}catch(e){manifest.shutdownNote='Shutdown query: '+e.code;}
      try{await db.end();}catch{}
    }
    // SHUTDOWN may acknowledge before the socket closes. Check loopback port, not the launcher PID.
    const isOpen=()=>new Promise(resolve=>{
      const socket=net.connect({host:'127.0.0.1',port:dbPort});
      socket.once('connect',()=>{socket.destroy();resolve(true);});
      socket.once('error',()=>{socket.destroy();resolve(false);});
    });
    try{await waitFor(async()=>!(await isOpen()),15000);shutdownConfirmed=true;}catch{shutdownConfirmed=false;}
    manifest.safety.isolatedMysqlStopped=shutdownConfirmed;
    manifest.safety.apiStopped=!apiProcess||apiProcess.exitCode!==null||apiProcess.signalCode!==null;
    if(!shutdownConfirmed||!manifest.safety.apiStopped){
      manifest.executionStatus=manifest.status;
      manifest.status='Blocked';
      manifest.blocker='Owned test service shutdown was not confirmed';
      process.exitCode=1;
    }
    manifest.endedAt=new Date().toISOString();
    save();
    console.log('Result: '+manifest.status+'; evidence/runs/'+id);
    if(!shutdownConfirmed){console.error('Isolated MySQL may still be running; inspect this run only. No existing service was stopped.');process.exitCode=1;}
  }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
