// Same application and pool; bind this test-only process to loopback and close gracefully.
const app = require('../../src/app');
const {pool} = require('../../src/db/connection');
(async()=>{
  if(!process.env.JWT_SECRET || process.env.JWT_SECRET.length<32)throw new Error('JWT configuration missing');
  await pool.query('SELECT 1');
  const server=app.listen(0,'127.0.0.1',()=>process.send({ready:true,port:server.address().port}));
  process.on('message',message=>{
    if(message.shutdown)server.close(async()=>{await pool.end();process.exit(0);});
  });
  process.on('disconnect',()=>server.close(async()=>{await pool.end();process.exit(0);}));
})().catch(e=>{console.error('Test service startup:',e.message);process.exit(1);});
