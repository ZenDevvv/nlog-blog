import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createServer} from 'vite';
import {safeReturnPath} from '../src/authNavigation.js';

test('authentication return paths reject external navigation',()=>{
 for(const path of ['//evil.example','/\\evil.example','https://evil.example','/login','/register?from=/write','/\nevil']) assert.equal(safeReturnPath(path),'/');
 assert.equal(safeReturnPath('/write'),'/write');
});

test('guests can browse public content and profiles; publishing offers authentication and preserves intent',async()=>{
 const dom=new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',{url:'http://localhost',pretendToBeVisual:true});
 for(const key of ['window','document','navigator','Node','Element','HTMLElement','SVGElement','Text','MutationObserver','DOMParser','Range']) Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
 globalThis.getComputedStyle=dom.window.getComputedStyle;
 globalThis.requestAnimationFrame=dom.window.requestAnimationFrame.bind(dom.window);
 globalThis.cancelAnimationFrame=dom.window.cancelAnimationFrame.bind(dom.window);
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 dom.window.HTMLCanvasElement.prototype.getContext=()=>null;
 const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
 const React=await import('react'),h=React.createElement;
 const {createRoot}=await import('react-dom/client');
 const {MemoryRouter,Routes,Route,useLocation}=await import('react-router-dom');
 const {default:axios}=await import('axios'),originalAdapter=axios.defaults.adapter;
 const requests=[];
 axios.defaults.adapter=async config=>{
  requests.push(config.url);let data=[];
  if(config.url.endsWith('/profile/1'))data=[{id:1,username:'writer',created_at:'2026-01-01',post_id:null}];
  else if(config.url.endsWith('/posts/1'))data=[{id:1,user_id:1,title:'Public story',content:'<p>Readable body</p>',username:'writer',updated_at:'2026-01-01'}];
  return {status:200,data,config};
 };
 const load=async path=>(await server.ssrLoadModule('/src/'+path)).default;
 const Navbar=await load('components/Navbar.jsx'),Home=await load('pages/Home.jsx'),Profile=await load('pages/Profile.jsx'),Single=await load('pages/Single.jsx'),WritePage=await load('pages/WritePage.jsx'),Login=await load('pages/Login.jsx'),Register=await load('pages/Register.jsx');
 const {AuthContext}=await server.ssrLoadModule('/src/context/AuthContext.jsx');
 const {NotifProvider}=await server.ssrLoadModule('/src/context/NotifContext.jsx');
 const Probe=()=>{const l=useLocation();return h('output',{'data-route':l.pathname,'data-from':l.state?.from||''});};
 const root=createRoot(document.getElementById('root'));
 const render=async path=>{
  const routes=[['/',h(React.Fragment,null,h(Navbar),h(Home))],['/profile/:id',h(Profile)],['/post/:id',h(Single)],['/write',h(WritePage)],['/login',h(Login)],['/register',h(Register)]];
  await React.act(async()=>root.render(h(MemoryRouter,{key:path,initialEntries:[path]},h(AuthContext.Provider,{value:{currentUser:null,setCurrentUser:()=>{}}},h(NotifProvider,null,h(Probe),h(Routes,null,...routes.map(([path,element])=>h(Route,{key:path,path,element}))))))));
  await React.act(async()=>{await new Promise(r=>setTimeout(r,40));});
 };
 const click=async el=>{assert.ok(el);await React.act(async()=>el.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true,cancelable:true,button:0})));};
 try {
  await render('/');assert.ok(requests.some(x=>x.endsWith('/posts/')));assert.match(document.body.textContent,/No public posts found/);
  await click(document.querySelector('button[aria-label="Write a post"]'));assert.ok(document.querySelector('[role="dialog"]'));assert.equal(document.querySelector('.ql-editor'),null);
  await click(document.querySelector('[role="dialog"] a[href="/login"]'));assert.equal(document.querySelector('output').dataset.route,'/login');assert.equal(document.querySelector('output').dataset.from,'/write');
  await click(document.querySelector('a[href="/register"]'));assert.equal(document.querySelector('output').dataset.from,'/write');assert.match(document.body.textContent,/Continue as guest/);
  await render('/profile/1');assert.match(document.body.textContent,/@writer/);assert.match(document.body.textContent,/No public posts yet/);assert.equal(document.querySelector('button[aria-label="Profile settings"]'),null);
  await render('/post/1');assert.match(document.body.textContent,/Readable body/);assert.ok(document.querySelector('a[href="/profile/1"]'));assert.equal([...document.querySelectorAll('button')].some(x=>['Edit','Delete'].includes(x.textContent)),false);
  await render('/write');assert.ok(document.querySelector('[role="dialog"]'));await click(document.querySelector('[role="dialog"] button'));assert.equal(document.querySelector('output').dataset.route,'/');
 } finally {await React.act(async()=>root.unmount());await server.close();axios.defaults.adapter=originalAdapter;dom.window.close();}
});
