/* Extend the original chain instead of maintaining a second competing suite.
 * Run npm run test:collection after editing this source. Never put credentials here. */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const file = path.join(root, 'postman/Event-Booking-API.postman_collection.json');
const collection = JSON.parse(fs.readFileSync(file, 'utf8'));
collection.item = collection.item.slice(0, 2);
collection.info.name = 'Event Booking API Testing';
collection.info.description = '11 API operations. Run all folders in order on a dedicated test database. Definitions are not execution evidence.';
collection.item[0].name = 'Main Business Chain';
collection.item[1].name = 'Selected Negative Cases';
const items = [];
let sequence = 0;
function add(label, method, url, token, body, status, code, extra = [], pre = []) {
  const id = 'AUTO-' + String(++sequence).padStart(3, '0');
  const tests = [
    'pm.test("HTTP ' + status + '",()=>pm.response.to.have.status(' + status + '));',
    ...(code ? ['pm.test("Error '+code+'",()=>pm.expect(pm.response.json().error.code).to.eql("'+code+'"));'] : []),
    ...extra,
  ];
  const request = {
    method, url: '{{baseUrl}}'+url,
    header: body === undefined ? [] : [{key:'Content-Type',value:'application/json'}],
    auth: token ? {type:'bearer',bearer:[{key:'token',value:'{{'+token+'}}',type:'string'}]} : {type:'noauth'},
    description: id + '. Source: implemented routes/validators and docs/business-rules.md. See automated-cases.md.',
  };
  if (body !== undefined) request.body = {mode:'raw',raw:typeof body === 'string' ? body : JSON.stringify(body),options:{raw:{language:'json'}}};
  const event = [{listen:'test',script:{type:'text/javascript',exec:tests}}];
  if (pre.length) event.unshift({listen:'prerequest',script:{type:'text/javascript',exec:pre}});
  const item = {name:id+' '+label,request,event};
  items.push(item);
  return item;
}
const save = key => ['if(pm.response.code<300)pm.environment.set("'+key+'",String(pm.response.json().id));'];
const eventBody = {title:'Extended test event',description:'',capacity:2,start_time:'{{futureStartTime}}'};
const registerBody = {username:'qa_{{runId}}_extra',email:'extra_{{runId}}@example.test',password:'{{userPassword}}'};
const eventUrl = '/api/events/{{extendedEventId}}';
add('Login Organizer B','POST','/api/auth/login',null,{email:'{{otherOrganizerEmail}}',password:'{{otherOrganizerPassword}}'},200,null,[
  'pm.test("Organizer role",()=>pm.expect(pm.response.json().user.role).to.eql("organizer"));',
  'if(pm.response.code===200)pm.environment.set("otherOrganizerToken",pm.response.json().token);',
]);
add('Create open fixture','POST','/api/events','organizerToken',eventBody,201,null,save('extendedEventId'));
for (const [method,url,body,authorized] of [
  ['POST','/api/events',eventBody,'organizerToken'],
  ['PUT',eventUrl,eventBody,'organizerToken'],
  ['PATCH',eventUrl+'/close',{},'organizerToken'],
  ['POST',eventUrl+'/book',{},'userAToken'],
  ['DELETE',eventUrl+'/book',undefined,'userAToken'],
  ['GET','/api/bookings/me',undefined,'userAToken'],
  ['GET',eventUrl+'/bookings',undefined,'organizerToken'],
]) {
  add('Missing JWT '+method+' '+url,method,url,null,body,401,'TOKEN_MISSING');
  add('Wrong role '+method+' '+url,method,url,authorized==='userAToken'?'organizerToken':'userAToken',body,403,'FORBIDDEN');
}
for (const [method,url,body] of [['PUT',eventUrl,eventBody],['PATCH',eventUrl+'/close',{}],['GET',eventUrl+'/bookings',undefined]]) {
  add('Non-owner '+method,method,url,'otherOrganizerToken',body,403,'NOT_EVENT_OWNER');
}
const malformed=add('Malformed Authorization','GET','/api/bookings/me',null,undefined,401,'TOKEN_MALFORMED');
malformed.request.header.push({key:'Authorization',value:'Basic invalid'});
add('Damaged signature','GET','/api/bookings/me','damagedToken',undefined,401,'TOKEN_INVALID',[],[
  'const t=pm.environment.get("userAToken").split(".");t[2]=(t[2][0]==="a"?"b":"a")+t[2].slice(1);pm.environment.set("damagedToken",t.join("."));',
]);
for (const [label,variable,code] of [
  ['Expired signed JWT','expiredToken','TOKEN_EXPIRED'],
  ['Disallowed algorithm','wrongAlgorithmToken','TOKEN_INVALID'],
  ['Token subject not in database','missingSubjectToken','TOKEN_INVALID'],
  ['Forged role claim cannot grant Organizer','forgedRoleToken','FORBIDDEN'],
]) {
  add(label,label.startsWith('Forged')?'POST':'GET',label.startsWith('Forged')?'/api/events':'/api/bookings/me',variable,label.startsWith('Forged')?eventBody:undefined,label.startsWith('Forged')?403:401,code,[],[
    'if(!pm.environment.get("'+variable+'"))pm.execution.skipRequest();',
  ]);
}
add('Cannot self-promote','POST','/api/auth/register',null,{...registerBody,role:'organizer'},400,'UNKNOWN_FIELD');
for (const field of ['username','email','password']) {
  const body={...registerBody};delete body[field];
  add('Register missing '+field,'POST','/api/auth/register',null,body,400,'MISSING_FIELD');
}
for (const [label,field,value,code] of [
  ['username length 2','username','ab','INVALID_FIELD'],
  ['username length 51','username','a'.repeat(51),'INVALID_FIELD'],
  ['username number','username',123,'INVALID_FIELD'],
  ['username whitespace','username','   ','INVALID_FIELD'],
  ['bad email','email','a@@example.test','INVALID_EMAIL'],
  ['email local 65','email','a'.repeat(65)+'@example.test','INVALID_EMAIL'],
  ['email dots','email','a..b@example.test','INVALID_EMAIL'],
  ['email missing domain label','email','a@localhost','INVALID_EMAIL'],
  ['password length 7','password','a'.repeat(7),'INVALID_FIELD'],
  ['password length 73','password','a'.repeat(73),'INVALID_FIELD'],
  ['password 75 UTF8 bytes','password','中'.repeat(25),'INVALID_FIELD'],
  ['password null','password',null,'INVALID_FIELD'],
]) add('Register '+label,'POST','/api/auth/register',null,{...registerBody,[field]:value},400,code);
for (const [label,changes] of [
  ['username minimum',{username:'{{shortUsername}}'}],
  ['username maximum',{username:'{{longUsername}}'}],
  ['password minimum',{password:'a'.repeat(8)}],
  ['password maximum bytes',{password:'中'.repeat(24)}],
  ['email normalization',{email:'  NORMAL_{{runId}}@EXAMPLE.TEST  '}],
]) {
  const suffix = String(sequence+1);
  add('Register valid '+label,'POST','/api/auth/register',null,{...registerBody,username:'valid_{{runId}}_'+suffix,email:'valid_{{runId}}_'+suffix+'@example.test',...changes},201,null,[
    'pm.test("No password; public role",()=>{const j=pm.response.json();pm.expect(j).not.to.have.property("password");pm.expect(j.role).to.eql("user");});',
    ...(label==='email normalization'?['pm.test("Email normalized",()=>pm.expect(pm.response.json().email).to.eql("normal_"+pm.environment.get("runId")+"@example.test"));']:[]),
  ],[
    'pm.environment.set("shortUsername",Date.now().toString(36).slice(-3));',
    'pm.environment.set("longUsername",("max_"+pm.environment.get("runId")).padEnd(50,"x"));',
  ]);
}
add('Duplicate username','POST','/api/auth/register',null,{...registerBody,username:'{{userAUsername}}'},409,'DUPLICATE');
add('Duplicate normalized email','POST','/api/auth/register',null,{...registerBody,email:'  {{userAEmail}}  '},409,'DUPLICATE');
for (const [label,body,status,code] of [
  ['wrong password',{email:'{{userAEmail}}',password:'Incorrect123!'},401,'INVALID_CREDENTIALS'],
  ['unknown account',{email:'absent_{{runId}}@example.test',password:'{{userPassword}}'},401,'INVALID_CREDENTIALS'],
  ['missing password',{email:'{{userAEmail}}'},400,'MISSING_FIELD'],
  ['wrong type',{email:12,password:'{{userPassword}}'},400,'INVALID_FIELD'],
  ['unknown field',{email:'{{userAEmail}}',password:'{{userPassword}}',role:'user'},400,'UNKNOWN_FIELD'],
]) add('Login '+label,'POST','/api/auth/login',null,body,status,code);
for (const [label,body,code] of [
  ['array',[],'INVALID_BODY'],
  ['unknown owner',{...eventBody,organizer_id:'1'},'UNKNOWN_FIELD'],
  ['missing capacity',{title:'x',start_time:'{{futureStartTime}}'},'MISSING_FIELD'],
  ['blank title',{...eventBody,title:'  '},'INVALID_FIELD'],
  ['title 121',{...eventBody,title:'a'.repeat(121)},'INVALID_FIELD'],
  ['description 2001',{...eventBody,description:'a'.repeat(2001)},'INVALID_FIELD'],
  ['description null',{...eventBody,description:null},'INVALID_FIELD'],
]) add('Create '+label,'POST','/api/events','organizerToken',body,400,code);
for (const value of [0,-1,1.5,100001,'1',null,true]) {
  add('Capacity '+JSON.stringify(value),'POST','/api/events','organizerToken',{...eventBody,capacity:value},400,'INVALID_CAPACITY');
}
for (const value of ['2000-01-01T00:00:00Z','2099-02-29T00:00:00Z','2099-01-01T24:00:00Z','2099-01-01T00:00:00','2099-01-01T00:00:00+14:01',123]) {
  add('Invalid start time '+value,'POST','/api/events','organizerToken',{...eventBody,start_time:value},400,'INVALID_START_TIME');
}
for (const [label,changes] of [
  ['minimums',{title:'x',capacity:1,description:''}],
  ['maximums',{title:'x'.repeat(120),description:'x'.repeat(2000),capacity:100000}],
  ['timezone offset',{start_time:'2099-01-01T08:00:00+08:00'}],
]) add('Create valid '+label,'POST','/api/events','organizerToken',{...eventBody,...changes},201);
for (const id of ['0','-1','01','1.5','12abc','9007199254740992','%201','1%20']) {
  add('Strict ID '+id,'GET','/api/events/'+id,null,undefined,400,'INVALID_ID');
}
for (const [method,suffix,body,token] of [
  ['GET','',undefined,null],['PUT','',eventBody,'organizerToken'],
  ['PATCH','/close',{},'organizerToken'],['POST','/book',{},'userAToken'],
  ['DELETE','/book',undefined,'userAToken'],['GET','/bookings',undefined,'organizerToken'],
]) add('Missing event '+method+' '+suffix,method,'/api/events/9007199254740991'+suffix,token,body,404,'EVENT_NOT_FOUND');
add('Booking rejects user_id','POST',eventUrl+'/book','userAToken',{user_id:'{{userBId}}'},400,'UNKNOWN_FIELD');
add('Close rejects supplied status','PATCH',eventUrl+'/close','organizerToken',{status:'OPEN'},400,'UNKNOWN_FIELD');
add('PUT requires complete fields','PUT',eventUrl,'organizerToken',{title:'x'},400,'MISSING_FIELD');
add('Cancel without booking','DELETE',eventUrl+'/book','userAToken',undefined,404,'BOOKING_NOT_FOUND');
add('A books extended event','POST',eventUrl+'/book','userAToken',{},201,null,save('extendedBookingId'));
add('B cannot cancel A booking','DELETE',eventUrl+'/book','userBToken',undefined,404,'BOOKING_NOT_FOUND');
add('B books extended event','POST',eventUrl+'/book','userBToken',{},201);
add('Capacity below active rejected','PUT',eventUrl,'organizerToken',{...eventBody,capacity:1},409,'CAPACITY_BELOW_BOOKINGS');
add('Rejected PUT preserves data','GET',eventUrl,null,undefined,200,null,[
  'pm.test("Capacity unchanged and count is two",()=>{const j=pm.response.json();pm.expect(j.capacity).to.eql(2);pm.expect(Number(j.active_bookings)).to.eql(2);});',
]);
add('Capacity equals active allowed','PUT',eventUrl,'organizerToken',eventBody,200);
add('A cancels extended event','DELETE',eventUrl+'/book','userAToken',undefined,200);
add('Repeated cancellation rejected','DELETE',eventUrl+'/book','userAToken',undefined,409,'BOOKING_CANCELLED');
add('B history excludes A IDs','GET','/api/bookings/me','userBToken',undefined,200,null,[
  'pm.test("No A booking IDs",()=>{const ids=pm.response.json().bookings.map(b=>String(b.id));pm.expect(ids).not.to.include(pm.environment.get("bookingId"));pm.expect(ids).not.to.include(pm.environment.get("extendedBookingId"));});',
]);
add('Closed event cannot be edited','PUT','/api/events/{{eventId}}','organizerToken',eventBody,409,'EVENT_CLOSED');
add('Cancel allowed after CLOSED','DELETE','/api/events/{{eventId}}/book','userBToken',undefined,200);
add('Create rebook-full fixture','POST','/api/events','organizerToken',{...eventBody,capacity:1},201,null,save('rebookFullEventId'));
add('A first books rebook-full fixture','POST','/api/events/{{rebookFullEventId}}/book','userAToken',{},201,null,save('rebookFullBookingId'));
add('A releases rebook-full fixture','DELETE','/api/events/{{rebookFullEventId}}/book','userAToken',undefined,200);
add('B takes rebook-full fixture','POST','/api/events/{{rebookFullEventId}}/book','userBToken',{},201);
add('Rebooking cannot bypass full capacity','POST','/api/events/{{rebookFullEventId}}/book','userAToken',{},409,'EVENT_FULL');
add('Rejected rebooking preserves CANCELLED','GET','/api/bookings/me','userAToken',undefined,200,null,[
  'pm.test("A row remains CANCELLED",()=>{const b=pm.response.json().bookings.find(b=>String(b.id)===pm.environment.get("rebookFullBookingId"));pm.expect(b.status).to.eql("CANCELLED");});',
]);
add('Public list includes OPEN and CLOSED','GET','/api/events',null,undefined,200,null,[
  'pm.test("Both states stay visible",()=>{const states=pm.response.json().events.map(e=>e.status);pm.expect(states).to.include("OPEN");pm.expect(states).to.include("CLOSED");});',
]);
add('Public detail contract count','GET',eventUrl,null,undefined,200,null,[
  'pm.test("active_bookings follows OpenAPI integer contract",()=>{const n=pm.response.json().active_bookings;pm.expect(n).to.be.a("number");pm.expect(Number.isInteger(n)).to.eql(true);});',
]);
add('UTC created_at represents real creation time','GET',eventUrl,null,undefined,200,null,[
  'pm.test("created_at within this run",()=>{const t=Date.parse(pm.response.json().created_at);pm.expect(t).to.be.at.least(Number(pm.environment.get("runId"))-2000);pm.expect(t).to.be.at.most(Date.now()+2000);});',
]);
add('Booking timestamps represent real instants','GET','/api/bookings/me','userBToken',undefined,200,null,[
  'pm.test("Booking times within run",()=>{for(const b of pm.response.json().bookings){for(const k of ["created_at","updated_at"]){const t=Date.parse(b[k]);pm.expect(t).to.be.at.least(Number(pm.environment.get("runId"))-2000);pm.expect(t).to.be.at.most(Date.now()+2000);}}});',
]);
const malformedJson = add('Malformed JSON','POST','/api/auth/register',null,'{"username":',400,'INVALID_JSON');
add('Body larger than 32kb','POST','/api/auth/register',null,{padding:'x'.repeat(33000)},413,'BODY_TOO_LARGE');
collection.item.push({name:'Extended Authentication Boundaries and Workflows',description:'Run after Main Business Chain. Optional signed-JWT fixtures are provided by test:local; skipped when absent in manual Postman.',item:items});
fs.writeFileSync(file,JSON.stringify(collection,null,2)+'\n');
const templateFile=path.join(root,'postman/local.postman_environment.json');
const environment=JSON.parse(fs.readFileSync(templateFile,'utf8'));
environment.name='Event Booking API - Local Template';
for (const key of ['extendedEventId','extendedBookingId','expiredToken','wrongAlgorithmToken','missingSubjectToken','forgedRoleToken']) {
  if(!environment.values.some(v=>v.key===key))environment.values.push({key,value:'',enabled:true,type:key.endsWith('Token')?'secret':'default'});
}
environment._postman_exported_using='Repository template; no runtime credentials';
delete environment._postman_exported_at;
fs.writeFileSync(templateFile,JSON.stringify(environment,null,2)+'\n');
const rows=items.map(i=>{
  const t=i.event.find(e=>e.listen==='test').script.exec;
  return '| '+i.name.split(' ')[0]+' | '+i.name.slice(9).replace(/\|/g,'/')+' | '+i.request.method+' '+i.request.url.replace('{{baseUrl}}','')+' | '+t[0].match(/HTTP (\d+)/)[1]+' '+(t[1]?.match(/Error ([A-Z_]+)/)?.[1]||'检查响应/数据')+' | Not Run |';
});
fs.writeFileSync(path.join(root,'test-cases/automated-cases.md'),[
  '# 自动化用例明细',
  '',
  '由 scripts/newman/build-collection.js 生成，来源为实际 routes、validators 和业务规则。定义状态不代表执行结果；实际结果按运行编号查 evidence/runs/。',
  '前两组保留原有业务链和负向请求。以下每个 AUTO 编号与 Collection 请求名、证据一一对应。按 Collection 全部顺序执行；Organizer A/B 必须先准备。',
  '每条步骤：1. 完成前置业务链；2. 发送所列请求（完整输入见 Collection）；3. 校验 HTTP、错误码及附加断言。带 expired/wrongAlgorithm/missingSubject/forgedRole 的请求需要隔离运行器生成的签名 JWT，手工缺失时为 Not Run。',
  '',
  '| ID | 场景/输入 | 请求 | 预期 | 定义状态 |',
  '| --- | --- | --- | --- | --- |',
  ...rows,
  '',
  '边界风险来源：Requirement（实现中的长度、范围和状态规则）；并发场景来源为 Inferred QA Risk，另见 concurrency-and-db.md。这里的数值 100000 是输入上限测试，不代表已执行十万用户负载。',
  '',
].join('\n'));
console.log('Collection: '+collection.item.reduce((n,f)=>n+f.item.length,0)+' requests; '+items.length+' extended cases');
