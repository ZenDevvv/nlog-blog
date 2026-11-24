import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { requireAuth } from '../middleware/auth.js';
import { createSecurity } from '../security.js';

const secret='test-only-security-key-not-used-by-production';
const origin='https://frontend.example';
async function setup(t, limits = {}, production = false) {
 const security=createSecurity({secret,origin,limits,production});
 const app=express();
 app.set('trust proxy',1);
 app.use(security.headers,security.apiLimit,cookieParser(),express.json());
 app.use(security.csrfProtect);
 app.get('/auth/csrf',security.csrfToken);
 app.post('/write',(req,res)=>res.json({ok:true}));
 app.post('/login',security.loginLimit,security.accountLoginLimit,(req,res)=>res.status(req.body.success ? 200 : 401).json({ok:!!req.body.success}));
 app.post('/register',security.registrationLimit,(req,res)=>res.sendStatus(201));
 app.put('/posts', (req,res,next)=>{req.user={id:1};next();},security.writeLimit,(req,res)=>res.sendStatus(200));
 app.put('/views',security.viewLimit,(req,res)=>res.sendStatus(200));
 const server=app.listen(0,'127.0.0.1');
 await new Promise(resolve=>server.once('listening',resolve));
 t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
 const base=`http://127.0.0.1:${server.address().port}`;
 const request=(path,options={})=>fetch(base+path,{...options,headers:{origin,...options.headers},signal:AbortSignal.timeout(5000)});
 const response=await request('/auth/csrf');
 const {csrfToken}=await response.json();
 const cookie=response.headers.get('set-cookie').split(';')[0];
 const headers={cookie,'x-csrf-token':csrfToken,'content-type':'application/json'};
 return {request,headers,csrfToken,response};
}
test('CSRF rejects missing, forged, mismatched, expired tokens and hostile origins',async t=>{
 const {request,headers}=await setup(t);
 assert.equal((await request('/write',{method:'POST',headers})).status,200);
 for(const overrides of [{cookie:''},{'x-csrf-token':''},{'x-csrf-token':'forged'},{origin:'https://evil.example'}]) assert.equal((await request('/write',{method:'POST',headers:{...headers,...overrides}})).status,403);
 const forged='pretend-token';
 assert.equal((await request('/write',{method:'POST',headers:{cookie:`csrf=${forged}`,'x-csrf-token':forged}})).status,403);
 const expired=jwt.sign({purpose:'csrf'},secret,{audience:'nlog-csrf',expiresIn:-1});
 assert.equal((await request('/write',{method:'POST',headers:{cookie:`csrf=${expired}`,'x-csrf-token':expired}})).status,403);
 assert.equal((await request('/auth/csrf',{headers:{origin:'https://evil.example'}})).status,403);
 const repeat=await request('/auth/csrf',{headers});
 assert.equal((await repeat.json()).csrfToken,headers['x-csrf-token']);
});
test('production CSRF cookie and API responses carry security headers',async t=>{
 const {response}=await setup(t,{},true);
 const cookie=response.headers.get('set-cookie');
 for(const value of ['__Host-csrf=','HttpOnly','Secure','SameSite=None','Path=/']) assert.ok(cookie.includes(value));
 assert.equal(response.headers.get('cache-control'),'no-store');
 assert.equal(response.headers.get('x-content-type-options'),'nosniff');
 assert.ok(response.headers.get('content-security-policy'));
});
test('login, registration, account, write and view limits return 429 with retry headers',async t=>{
 const {request,headers}=await setup(t,{login:2,account:2,registration:2,write:2,view:2});
 for(const [path,method] of [['/login','POST'],['/register','POST'],['/posts','PUT'],['/views','PUT']]){
  for(let i=0;i<2;i++) assert.notEqual((await request(path,{method,headers,body:JSON.stringify({username:'user'})})).status,429);
  const blocked=await request(path,{method,headers,body:JSON.stringify({username:'user'})});
  assert.equal(blocked.status,429,path);assert.ok(blocked.headers.get('retry-after'));
 }
});
test('API limits aggregate requests and account limits cannot be bypassed by changing IP',async t=>{
 const {request,headers}=await setup(t,{api:3,login:10,account:1});
 assert.equal((await request('/login',{method:'POST',headers:{...headers,'x-forwarded-for':'192.0.2.1'},body:'{"username":"USER"}'})).status,401);
 assert.equal((await request('/login',{method:'POST',headers:{...headers,'x-forwarded-for':'192.0.2.2'},body:'{"username":"user"}'})).status,429);
 assert.equal((await request('/auth/csrf')).status,200);
 // The first setup token request used the loopback IP; repeated reads exhaust it.
 assert.equal((await request('/auth/csrf')).status,200);
 assert.equal((await request('/auth/csrf')).status,429);
});
test('successful logins do not exhaust the failed-login allowance',async t=>{
 const {request,headers}=await setup(t,{login:1,account:1});
 for(let i=0;i<3;i++) assert.equal((await request('/login',{method:'POST',headers,body:'{"username":"user","success":true}'})).status,200);
});

test('CSRF tokens and malformed identity claims cannot authenticate as login sessions', async t => {
 const previous=process.env.JWT_KEY;
 process.env.JWT_KEY=secret;
 t.after(()=>{ if(previous===undefined) delete process.env.JWT_KEY; else process.env.JWT_KEY=previous; });
 for(const claims of [{purpose:'csrf'},{id:0},{id:'1'},{id:2147483648}]) {
  const token=jwt.sign(claims,secret);
  await new Promise((resolve,reject)=>requireAuth({cookies:{access_token:token}}, {status(code){assert.equal(code,403);return this;},json(){resolve();}},()=>reject(new Error('Invalid session accepted'))));
 }
 const req={cookies:{access_token:jwt.sign({id:1},secret)}};
 await new Promise((resolve,reject)=>requireAuth(req,{status(){reject(new Error('Valid session rejected'));return this;},json(){}},resolve));
 assert.equal(req.user.id,1);
});
