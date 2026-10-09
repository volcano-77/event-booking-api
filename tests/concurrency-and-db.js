const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const crypto = require('node:crypto');
const {sanitize} = require('../scripts/newman/run');
async function runChecks({db,baseUrl,organizerToken,userAToken,userAId,runId}) {
  const records=[];
  const secrets=[organizerToken,userAToken];
  let current;
  async function api(method,url,token,body) {
    const response=await fetch(baseUrl+url,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
    const json=await response.json();
    current.steps.push({method,path:url,status:response.status,response:sanitize(json,secrets)});
    return {status:response.status,json};
  }
  async function check(id,title,fn) {
    current={id,title,startedAt:new Date().toISOString(),status:'Pending',steps:[],observations:[]};
    try{await fn();current.status='Pass';}catch(e){current.status='Fail';current.error=sanitize(e.message,secrets);}
    current.endedAt=new Date().toISOString();records.push(current);
    console.log(id+': '+current.status);
  }
  async function counts(id) {
    const [[row]]=await db.execute("SELECT e.capacity,e.status,COUNT(CASE WHEN b.status='ACTIVE' THEN 1 END) active,COUNT(b.id) row_count FROM events e LEFT JOIN bookings b ON b.event_id=e.id WHERE e.id=? GROUP BY e.id,e.capacity,e.status",[id]);
    current.observations.push({query:'capacity-and-active-count',eventId:id,...row});
    return row;
  }
  const future=new Date(Date.now()+86400000).toISOString();
  async function event(capacity) {
    const r=await api('POST','/api/events',organizerToken,{title:'Concurrency '+runId,capacity,start_time:future});
    assert.equal(r.status,201);
    return r.json.id;
  }
  const users=[];
  const parallelPassword=crypto.randomBytes(16).toString('hex')+'!';
  secrets.push(parallelPassword);
  await check('SETUP-USERS','Prepare 12 distinct API users for simultaneous booking',async()=>{
    for(let i=0;i<12;i++){
      const email='parallel_'+runId+'_'+i+'@example.test';
      const password=parallelPassword; // random test credential, never written to evidence
      const r=await api('POST','/api/auth/register',null,{username:'parallel_'+runId+'_'+i,email,password});
      assert.equal(r.status,201);
      const login=await api('POST','/api/auth/login',null,{email,password});
      assert.equal(login.status,200);secrets.push(login.json.token,password);
      users.push({id:r.json.id,token:login.json.token});
    }
  });
  if(users.length!==12) {
    records.push({id:'CONCURRENCY',status:'Blocked',reason:'12-user prerequisite failed'});
    return records;
  }
  for(let round=1;round<=5;round++)await check('CONC-001-R'+round,'12 users compete for capacity 3',async()=>{
    const id=await event(3);
    const responses=await Promise.all(users.map(u=>api('POST','/api/events/'+id+'/book',u.token,{})));
    assert.equal(responses.filter(r=>r.status===201).length,3);
    assert.equal(responses.filter(r=>r.status===409&&r.json.error.code==='EVENT_FULL').length,9);
    const count=await counts(id);assert.equal(Number(count.active),3);assert.equal(Number(count.row_count),3);
  });
  await check('CONC-002','8 simultaneous requests from one user create one booking',async()=>{
    const id=await event(3);
    const responses=await Promise.all(Array.from({length:8},()=>api('POST','/api/events/'+id+'/book',users[0].token,{})));
    assert.equal(responses.filter(r=>r.status===201).length,1);
    assert.equal(responses.filter(r=>r.status===409&&r.json.error.code==='ALREADY_BOOKED').length,7);
    const count=await counts(id);assert.equal(Number(count.active),1);assert.equal(Number(count.row_count),1);
  });
  for(let round=1;round<=5;round++)await check('CONC-003-R'+round,'Capacity reduction competes with last-place booking',async()=>{
    const id=await event(2);
    assert.equal((await api('POST','/api/events/'+id+'/book',users[0].token,{})).status,201);
    const [booking,update]=await Promise.all([
      api('POST','/api/events/'+id+'/book',users[1].token,{}),
      api('PUT','/api/events/'+id,organizerToken,{title:'Capacity race',capacity:1,start_time:future}),
    ]);
    assert.ok((booking.status===201&&update.status===409&&update.json.error.code==='CAPACITY_BELOW_BOOKINGS')||
      (booking.status===409&&booking.json.error.code==='EVENT_FULL'&&update.status===200));
    const count=await counts(id);
    assert.ok(Number(count.active)<=count.capacity);
    assert.equal(count.capacity,booking.status===201?2:1);
  });
  for(let round=1;round<=3;round++)await check('CONC-004-R'+round,'Close competes with booking; later booking is rejected',async()=>{
    const id=await event(1);
    const [booking,close]=await Promise.all([
      api('POST','/api/events/'+id+'/book',users[0].token,{}),
      api('PATCH','/api/events/'+id+'/close',organizerToken,{}),
    ]);
    assert.equal(close.status,200);
    assert.ok(booking.status===201||(booking.status===409&&booking.json.error.code==='EVENT_CLOSED'));
    const later=await api('POST','/api/events/'+id+'/book',users[1].token,{});
    assert.equal(later.status,409);assert.equal(later.json.error.code,'EVENT_CLOSED');
    const count=await counts(id);assert.equal(count.status,'CLOSED');assert.ok(Number(count.active)<=1);
  });
  await check('CONC-005','Two simultaneous cancellations release only one place',async()=>{
    const id=await event(1);
    assert.equal((await api('POST','/api/events/'+id+'/book',users[0].token,{})).status,201);
    const responses=await Promise.all([1,2].map(()=>api('DELETE','/api/events/'+id+'/book',users[0].token)));
    assert.equal(responses.filter(r=>r.status===200).length,1);
    assert.equal(responses.filter(r=>r.status===409&&r.json.error.code==='BOOKING_CANCELLED').length,1);
    const count=await counts(id);assert.equal(Number(count.active),0);assert.equal(Number(count.row_count),1);
    assert.equal((await api('POST','/api/events/'+id+'/book',users[1].token,{})).status,201);
  });
  await check('DB-001','No duplicated user/event pairs',async()=>{
    const [rows]=await db.query('SELECT user_id,event_id,COUNT(*) n FROM bookings GROUP BY user_id,event_id HAVING COUNT(*)>1');
    current.observations.push({query:'duplicate-pairs',rows});assert.equal(rows.length,0);
  });
  await check('DB-002','No event exceeds capacity',async()=>{
    const [rows]=await db.query("SELECT e.id,e.capacity,COUNT(CASE WHEN b.status='ACTIVE' THEN 1 END) active FROM events e LEFT JOIN bookings b ON b.event_id=e.id GROUP BY e.id,e.capacity HAVING active>e.capacity");
    current.observations.push({query:'over-capacity-events',rows});assert.equal(rows.length,0);
  });
  await check('DB-003','Foreign-key relationships remain intact',async()=>{
    const [[row]]=await db.query('SELECT (SELECT COUNT(*) FROM events e LEFT JOIN users u ON u.id=e.organizer_id WHERE u.id IS NULL) orphan_events,(SELECT COUNT(*) FROM bookings b LEFT JOIN users u ON u.id=b.user_id LEFT JOIN events e ON e.id=b.event_id WHERE u.id IS NULL OR e.id IS NULL) orphan_bookings');
    current.observations.push({query:'orphan-counts',...row});
    assert.equal(Number(row.orphan_events),0);assert.equal(Number(row.orphan_bookings),0);
  });
  await check('DB-004','Public registration stores user role and bcrypt hashes',async()=>{
    const [rows]=await db.query("SELECT role,password FROM users WHERE email LIKE 'parallel_%@example.test'");
    current.observations.push({query:'public-user-storage',rows:rows.length,roles:[...new Set(rows.map(r=>r.role))],allHashesBcrypt:rows.every(r=>/^\$2[aby]\$/.test(r.password)),allHashesVerify:await Promise.all(rows.map(r=>bcrypt.compare(parallelPassword,r.password))).then(r=>r.every(Boolean))});
    assert.equal(rows.length,12);assert.ok(rows.every(r=>r.role==='user'));
    assert.ok(current.observations[0].allHashesBcrypt);assert.ok(current.observations[0].allHashesVerify);
  });
  await check('DB-005','Cancel/rebook preserves ID and created time, advances update time',async()=>{
    const id=await event(1);
    const first=await api('POST','/api/events/'+id+'/book',userAToken,{});
    assert.equal(first.status,201);
    const read=async()=>{const [[r]]=await db.execute('SELECT id,status,created_at,updated_at FROM bookings WHERE id=?',[first.json.id]);return r;};
    const before=await read();
    const cancel=await api('DELETE','/api/events/'+id+'/book',userAToken);assert.equal(cancel.status,200);
    const cancelled=await read();assert.equal(cancelled.status,'CANCELLED');
    const afterCancel=await counts(id);assert.equal(Number(afterCancel.active),0);
    const rebook=await api('POST','/api/events/'+id+'/book',userAToken,{});
    assert.equal(rebook.status,200);assert.equal(rebook.json.id,first.json.id);
    const after=await read();
    current.observations.push({query:'lifecycle',before,cancelled,after});
    assert.equal(String(before.id),String(after.id));
    assert.equal(before.created_at.toISOString(),after.created_at.toISOString());
    assert.ok(after.updated_at.getTime()>=cancelled.updated_at.getTime());
    assert.ok(cancelled.updated_at.getTime()>before.updated_at.getTime());
    assert.equal(Number((await counts(id)).row_count),1);
  });
  await check('DB-006','Rejected capacity reduction leaves stored event unchanged',async()=>{
    const id=await event(2);
    for(const u of users.slice(0,2))assert.equal((await api('POST','/api/events/'+id+'/book',u.token,{})).status,201);
    const read=async()=>{const [[r]]=await db.execute('SELECT title,description,capacity,status,start_time,organizer_id FROM events WHERE id=?',[id]);return r;};
    const before=await read();
    const result=await api('PUT','/api/events/'+id,organizerToken,{title:'Must not persist',capacity:1,start_time:future});
    assert.equal(result.status,409);assert.equal(result.json.error.code,'CAPACITY_BELOW_BOOKINGS');
    const after=await read();current.observations.push({query:'rollback-unchanged',before,after});assert.deepEqual(after,before);
  });
  await check('API-STARTED','Started event rejects booking but allows own cancellation',async()=>{
    // Past time cannot be created via API; fixture inserted ONLY in this newly isolated database.
    const [[owner]]=await db.query("SELECT id FROM users WHERE role='organizer' ORDER BY id LIMIT 1");
    const [insert]=await db.execute("INSERT INTO events(title,capacity,organizer_id,start_time) VALUES('Started fixture',1,?,?)",[owner.id,new Date(Date.now()-60000)]);
    const id=String(insert.insertId);
    const attempt=await api('POST','/api/events/'+id+'/book',userAToken,{});
    assert.equal(attempt.status,409);assert.equal(attempt.json.error.code,'EVENT_STARTED');
    await db.execute('INSERT INTO bookings(user_id,event_id) VALUES(?,?)',[userAId,id]);
    assert.equal((await api('DELETE','/api/events/'+id+'/book',userAToken)).status,200);
    assert.equal(Number((await counts(id)).active),0);
  });
  await check('DB-007','Public API active counts agree with database',async()=>{
    const result=await api('GET','/api/events');
    assert.equal(result.status,200);
    const [rows]=await db.query("SELECT e.id,COUNT(CASE WHEN b.status='ACTIVE' THEN 1 END) active FROM events e LEFT JOIN bookings b ON b.event_id=e.id GROUP BY e.id");
    const apiCounts=new Map(result.json.events.map(e=>[String(e.id),Number(e.active_bookings)]));
    assert.equal(apiCounts.size,rows.length);
    for(const row of rows)assert.equal(apiCounts.get(String(row.id)),Number(row.active));
    current.observations.push({query:'api-db-count-comparison',eventsCompared:rows.length});
  });
  return records;
}
module.exports={runChecks};
