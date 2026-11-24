import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import cookieParser from 'cookie-parser';
import mysql from 'mysql2';
import jwt from 'jsonwebtoken';
import {randomBytes} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createSecurity} from '../security.js';

test('guests browse public content, private posts stay owner-only, and all writes require authentication', {skip:process.env.RUN_TIDB_INTEGRATION!=='1'}, async()=>{
 const originalUrl=process.env.DATABASE_URL, originalKey=process.env.JWT_KEY;
 const u=new URL(originalUrl);
 const admin=mysql.createPool({host:u.hostname,user:decodeURIComponent(u.username),password:decodeURIComponent(u.password),port:Number(u.port)||3306,ssl:{}});
 const database='nlog_guest_test_'+randomBytes(8).toString('hex');
 let db,server;
 try {
  await admin.promise().query(`CREATE DATABASE \`${database}\``);
  u.pathname='/'+database;
  process.env.DATABASE_URL=u.toString();process.env.JWT_KEY='guest-test-secret-only';
  ({default:db}=await import('../dbconfig.js'));
  for(const file of ['001_initial_schema.sql','002_post_views.sql','003_post_images.sql']) for(const sql of readFileSync(new URL('../migrations/'+file,import.meta.url),'utf8').split(';').map(x=>x.trim()).filter(Boolean)) await db.promise().query(sql);
  const [owner]=await db.promise().query("INSERT INTO users(username,email,password) VALUES('fixture','fixture@example.invalid','fixture')");
  const [other]=await db.promise().query("INSERT INTO users(username,email,password) VALUES('other','other@example.invalid','fixture')");
  const [pub]=await db.promise().query("INSERT INTO posts(user_id,title,content,privacy) VALUES(?,'Public title','public body','public')",[owner.insertId]);
  const [priv]=await db.promise().query("INSERT INTO posts(user_id,title,content,privacy) VALUES(?,'Secret title','secret body','private')",[owner.insertId]);
  const [onlyPrivate]=await db.promise().query("INSERT INTO posts(user_id,title,content,privacy) VALUES(?,'Only secret','hidden','private')",[other.insertId]);
  const [tag]=await db.promise().query("INSERT INTO tags(tag_name) VALUES('shared')");
  await db.promise().query('INSERT INTO post_tags(post_id,tag_id) VALUES(?,?),(?,?)',[pub.insertId,tag.insertId,priv.insertId,tag.insertId]);
  const {default:routes}=await import('../routes/posts.js');
  const {getProfile}=await import('../controllers/profile.js');
  const {optionalAuth}=await import('../middleware/auth.js');
  const app=express();const security=createSecurity({secret:process.env.JWT_KEY,origin:'https://frontend.example'});
  app.locals.security=security;app.use(cookieParser(),express.json(),security.csrfProtect);
  app.get('/auth/csrf',security.csrfToken);app.use('/posts',routes);app.get('/profile/:id',optionalAuth,getProfile);
  server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const base=`http://127.0.0.1:${server.address().port}`;
  const request=(path,options={})=>fetch(base+path,{...options,signal:AbortSignal.timeout(5000)});
  for(const path of ['/posts/','/posts/?tag=shared','/posts/trending','/posts/search?q=fixture','/posts/search?q=secret']) {
   const res=await request(path);assert.equal(res.status,200,path);
   const rows=await res.json();assert.ok(rows.every(x=>x.privacy==='public'),path);
   if(!path.includes('q=secret')) assert.equal(rows.length,1,path);
  }
  assert.equal((await request('/posts/'+pub.insertId)).status,200);
  const invalidCookie={cookie:'access_token=invalid'};
  assert.equal((await request('/posts/'+pub.insertId,{headers:invalidCookie})).status,200);
  assert.equal((await request('/posts/'+priv.insertId)).status,404);
  const ownerCookie='access_token='+jwt.sign({id:owner.insertId},process.env.JWT_KEY);
  const otherCookie='access_token='+jwt.sign({id:other.insertId},process.env.JWT_KEY);
  assert.equal((await request('/posts/'+priv.insertId,{headers:{cookie:otherCookie}})).status,404);
  const own=await request('/posts/'+priv.insertId,{headers:{cookie:ownerCookie}});assert.equal(own.status,200);assert.equal((await own.json())[0].user_id,owner.insertId);
  const profile=await (await request('/profile/'+owner.insertId)).json();assert.equal(profile.length,1);assert.equal(profile[0].post_id,pub.insertId);
  const empty=await (await request('/profile/'+other.insertId)).json();assert.equal(empty.length,1);assert.equal(empty[0].post_id,null);assert.equal(empty[0].content,null);
  const ownProfile=await (await request('/profile/'+owner.insertId,{headers:{cookie:ownerCookie}})).json();assert.equal(ownProfile.length,2);
  const csrfResponse=await request('/auth/csrf');const {csrfToken}=await csrfResponse.json();
  const headers={cookie:csrfResponse.headers.get('set-cookie').split(';')[0],'x-csrf-token':csrfToken,'content-type':'application/json'};
  for(const [method,path] of [['POST','/posts/'],['PUT','/posts/'+pub.insertId],['DELETE','/posts/'+pub.insertId]]) assert.equal((await request(path,{method,headers,body:'{}'})).status,401);
  assert.equal((await request('/posts/'+priv.insertId+'/increment-views',{method:'PUT',headers,body:'{}'})).status,404);
  const [unchanged]=await db.promise().query('SELECT views FROM posts WHERE id=?',[priv.insertId]);assert.equal(unchanged[0].views,0);
 } finally {
  if(server) await new Promise(r=>{server.close(r);server.closeAllConnections();});
  if(db) await db.promise().end();
  await admin.promise().query(`DROP DATABASE IF EXISTS \`${database}\``);await admin.promise().end();
  process.env.DATABASE_URL=originalUrl;if(originalKey===undefined)delete process.env.JWT_KEY;else process.env.JWT_KEY=originalKey;
 }
});
