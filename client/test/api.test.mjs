import test from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import { configureApi } from '../src/api.js';

test('mutations share a CSRF request, carry credentials and retry only CSRF rejection once',async()=>{
 let tokens=0, writes=0;
 const client=axios.create({adapter:async config=>{
  if(config.url.endsWith('/auth/csrf')){tokens++;assert.equal(config.withCredentials,true);return {data:{csrfToken:'token-'+tokens},status:200,config};}
  assert.equal(config.withCredentials,true);
  assert.match(config.headers['X-CSRF-Token'],/^token-/);
  writes++;
  return {data:{ok:true},status:200,config};
 }});
 configureApi(client,'https://api.example');
 await Promise.all([client.post('https://api.example/posts',{}),client.put('https://api.example/posts/1',{})]);
 assert.equal(tokens,1);assert.equal(writes,2);
 let attempts=0;
 client.defaults.adapter=async config=>{
  if(config.url.endsWith('/auth/csrf')){tokens++;return {data:{csrfToken:'token-'+tokens},status:200,config};}
  attempts++;
  if(attempts===1) throw {config,response:{status:403,data:{code:'CSRF_INVALID'}}};
  assert.equal(config.headers['X-CSRF-Token'],'token-2');
  return {data:{ok:true},status:200,config};
 };
 await client.post('https://api.example/posts',{});
 assert.equal(attempts,2);assert.equal(tokens,2);
});
test('unrelated origins receive neither API credentials nor CSRF tokens',async()=>{
 const client=axios.create({adapter:async config=>{assert.equal(config.withCredentials,undefined);assert.equal(config.headers['X-CSRF-Token'],undefined);return {status:200,data:{},config};}});
 configureApi(client,'https://api.example');
 await client.post('https://other.example/data',{});
});
