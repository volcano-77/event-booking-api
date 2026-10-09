const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yamljs');
async function runProbe({baseUrl,organizerEmail,password,db}) {
  const records=[];
  const request=async(method,url,token,body)=>{
    const r=await fetch(baseUrl+url,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});
    return {status:r.status,json:await r.json()};
  };
  const login=await request('POST','/api/auth/login',null,{email:organizerEmail,password});
  assert.equal(login.status,200);
  const start=new Date();
  const created=await request('POST','/api/events',login.json.token,{title:'Targeted contract reproduction',capacity:1,start_time:new Date(Date.now()+86400000).toISOString()});
  assert.equal(created.status,201);
  const detail=await request('GET','/api/events/'+created.json.id);
  const list=await request('GET','/api/events');
  records.push({
    id:'REG-COUNT',status:typeof detail.json.active_bookings==='number'&&list.json.events.every(e=>typeof e.active_bookings==='number')?'Pass':'Fail',
    expected:'active_bookings is an integer in list and detail',
    actual:{detailValue:detail.json.active_bookings,detailType:typeof detail.json.active_bookings,listValue:list.json.events[0].active_bookings,listType:typeof list.json.events[0].active_bookings},
  });
  const end=new Date();
  const timestamp=new Date(detail.json.created_at);
  const [[databaseTime]]=await db.query('SELECT NOW(3) db_local_now,UTC_TIMESTAMP(3) db_utc_now,@@session.time_zone session_timezone,@@global.time_zone global_timezone');
  records.push({
    id:'REG-TIME',status:timestamp.getTime()>=start.getTime()-2000&&timestamp.getTime()<=end.getTime()+2000?'Pass':'Fail',
    expected:'created_at represents the actual instant of creation (ISO UTC), within request time window',
    actual:{requestStart:start.toISOString(),responseEnd:end.toISOString(),apiCreatedAt:detail.json.created_at,offsetFromEndSeconds:(timestamp-end)/1000,databaseTime},
  });
  const spec=YAML.load(path.resolve(__dirname,'../docs/openapi.yaml'));
  const response=spec.paths['/api/auth/register'].post.responses['201'];
  const unexpectedKeys=Object.keys(response).filter(k=>!['description','headers','content','links','$ref'].includes(k)&&!k.startsWith('x-'));
  records.push({id:'REG-OPENAPI',status:unexpectedKeys.length?'Fail':'Pass',expected:'OpenAPI Response Object contains supported keys only',actual:{unexpectedKeys}});
  return records;
}
module.exports={runProbe};
