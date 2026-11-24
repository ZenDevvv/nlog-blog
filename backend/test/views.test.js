import test from 'node:test';
import assert from 'node:assert/strict';
import mysql from 'mysql2';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { countView } from '../views.js';

test('TiDB counts concurrent/repeated views once and allows a new view after 24 hours', { skip: process.env.RUN_TIDB_INTEGRATION !== '1' }, async () => {
 const url=new URL(process.env.DATABASE_URL);
 const options={host:url.hostname,user:decodeURIComponent(url.username),password:decodeURIComponent(url.password),port:Number(url.port)||3306,ssl:{},connectionLimit:5};
 const admin=mysql.createPool(options);
 const database='nlog_security_test_'+randomBytes(8).toString('hex');
 let pool;
 try {
  await admin.promise().query(`CREATE DATABASE \`${database}\``);
  pool=mysql.createPool({...options,database});
  for(const filename of ['001_initial_schema.sql','002_post_views.sql']) {
   for(const sql of readFileSync(new URL('../migrations/'+filename,import.meta.url),'utf8').split(';').map(x=>x.trim()).filter(Boolean)) await pool.promise().query(sql);
  }
  const [user]=await pool.promise().query("INSERT INTO users (username,email,password) VALUES ('fixture','fixture@example.invalid','not-a-real-password')");
  const [post]=await pool.promise().query("INSERT INTO posts (user_id,title,content) VALUES (?, 'fixture','fixture')",[user.insertId]);
  const viewer='a'.repeat(64);
  const results=await Promise.all(Array.from({length:4},()=>countView(pool,post.insertId,viewer)));
  assert.equal(results.filter(x=>x.counted).length,1);
  assert.equal((await countView(pool,post.insertId,viewer)).counted,false);
  await pool.promise().query('UPDATE post_views SET last_viewed_at=DATE_SUB(NOW(), INTERVAL 25 HOUR)');
  assert.equal((await countView(pool,post.insertId,viewer)).counted,true);
  assert.equal((await countView(pool,post.insertId,'b'.repeat(64))).counted,true);
  const [rows]=await pool.promise().query('SELECT views FROM posts WHERE id=?',[post.insertId]);
  assert.equal(rows[0].views,3);
  assert.deepEqual(await countView(pool,2147483647,viewer),{found:false,counted:false});
 } finally {
  if(pool) await pool.promise().end();
  // Only this test's randomly named scratch database is removed.
  await admin.promise().query(`DROP DATABASE IF EXISTS \`${database}\``);
  await admin.promise().end();
 }
});
