import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

// Mount the real editor without a browser or live API. Exercise React StrictMode's
// setup/cleanup cycle, parent updates, typing and pasted HTML conversion.
test('Quill adapter supports typing, editing, safe conversion and remounting', async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost' });
  for (const key of ['window','document','navigator','Node','Element','HTMLElement','Text','MutationObserver','DOMParser','Range']) {
    Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
  }
  globalThis.getComputedStyle = dom.window.getComputedStyle;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const server = await createServer({server:{middlewareMode:true},appType:'custom'});
  const React = await import('react');
  const {createRoot} = await import('react-dom/client');
  const {default:Quill} = await import('quill');
  const {default:Editor} = await server.ssrLoadModule('/src/components/RichTextEditor.jsx');
  const root=createRoot(document.getElementById('root'));
  const updates=[];
  const render=async(value)=>React.act(async()=>root.render(React.createElement(React.StrictMode,null,React.createElement(Editor,{value,onChange:html=>updates.push(html),placeholder:'Write here'}))));
  try {
    await render('<p>Existing <strong>post</strong></p>');
    assert.equal(document.querySelectorAll('.ql-editor').length,1);
    assert.equal(document.querySelector('.ql-editor').textContent,'Existing post');
    const editor=Quill.find(document.querySelector('.ql-container'));
    await React.act(async()=>editor.insertText(0,'New ', 'user'));
    assert.match(updates.at(-1),/New Existing/);
    await render(updates.at(-1));
    assert.match(document.querySelector('.ql-editor').textContent,/New Existing/);
    await render('<p onclick="evil()">Replacement<img src=x onerror="evil()"><a href="javascript:evil()">link</a></p>');
    assert.equal(document.querySelector('.ql-editor').textContent,'Replacementlink');
    assert.equal(document.querySelector('.ql-editor [onclick], .ql-editor [onerror], .ql-editor img, .ql-editor a'),null);
    await render('');
    assert.equal(document.querySelector('.ql-editor').textContent,'');
  } finally {
    await React.act(async()=>root.unmount());
    await server.close();
    dom.window.close();
  }
});
