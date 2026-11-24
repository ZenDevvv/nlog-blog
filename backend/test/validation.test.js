import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAuth, validatePost, validId } from '../validation.js';
const account = { username: 'test_user', email: 'User@Example.com', password: 'long password' };
const post = { title: 'Hello', content: '<p>Body</p>', tags: ['news'] };
test('registration normalizes identifiers but preserves passwords', () => {
 assert.deepEqual(validateAuth({...account, username:' test_user ', email:' User@Example.com '},true).value,{...account,email:'user@example.com'});
});
test('registration rejects malformed input and enforces password byte boundaries', () => {
 for(const body of [null, [], 'text', {}, {...account,username:'a'}, {...account,username:'<script>'}, {...account,email:'bad'}, {...account,password:'short'}, {...account,password:'😀'.repeat(19)}]) assert.ok(validateAuth(body,true).error);
 assert.ok(validateAuth({...account,password:'x'.repeat(72)},true).value);
 assert.ok(validateAuth({...account,password:'x'.repeat(73)},true).error);
 assert.ok(validateAuth({username:'legacy-name',password:'short'}).value);
});
test('HTML sanitizer removes executable content while preserving basic formatting', () => {
 const result=validatePost({...post,content:'<script>alert(1)</script><p onclick="evil()">Hello <strong>world</strong><img src=x onerror=evil()><a href="javascript:evil()">link</a></p>'});
 assert.equal(result.value.content,'<p>Hello <strong>world</strong>link</p>');
});
test('empty editor markup, hidden content and oversized posts are rejected', () => {
 for(const content of ['<p><br></p>','<p>&nbsp;\u200B</p>','<script>alert(1)</script>','x'.repeat(50001)]) assert.ok(validatePost({...post,content}).error);
 assert.ok(validatePost({...post,title:'x'.repeat(201)}).error);
 assert.ok(validatePost({...post,title:'x'.repeat(200),content:'x'.repeat(50000)}).value);
 assert.ok(validatePost(null).error);
});
test('tags enforce type, count and syntax and remove duplicates', () => {
 for(const tags of [null,'tag',[1],[''],['a,b'],['two words'],['<b>'],['x'.repeat(31)],Array(11).fill('tag')]) assert.ok(validatePost({...post,tags}).error);
 assert.deepEqual(validatePost({...post,tags:['news','news']}).value.tags,['news']);
});
test('IDs reject SQL-like values, arrays and integer overflow', () => {
 for(const id of ['0','-1','1 OR 1=1','1.5','2147483648',['1'],undefined]) assert.equal(validId(id),false);
 assert.equal(validId('1'),true);
 assert.equal(validId('2147483647'),true);
});
