/* Double Nine Networks — on-site wording editor.
   Normal visitors: applies saved wording from content.js (tiny, invisible).
   Open any page with  ?edit  on the end (e.g. doubleninenetworks.com/?edit)  to change wording. */
(function () {
  'use strict';
  var REPO = 'gvkxla33/Double-Nine-Networks', BRANCH = 'main', FILE = 'content.js';
  var PAGES = [['index.html', 'Home'], ['services.html', 'Services'], ['industries.html', 'Industries'],
    ['partnerships.html', 'Partnerships'], ['about.html', 'About'], ['contact.html', 'Contact'], ['booking.html', 'Book a review']];

  /* storage that never throws */
  var mem = {};
  function sget(st, k) { try { return window[st].getItem(k); } catch (e) { return mem[st + k] || null; } }
  function sset(st, k, v) { try { window[st].setItem(k, v); } catch (e) { mem[st + k] = v; } }
  function sdel(st, k) { try { window[st].removeItem(k); } catch (e) { delete mem[st + k]; } }

  function norm(s) { return s.replace(/\s+/g, ' ').trim(); }
  var C = window.DN_CONTENT || {};
  var els = Array.prototype.slice.call(document.querySelectorAll('[data-ek]'));
  var byKey = {};
  els.forEach(function (el) {
    var t = el.textContent;
    el.__d = norm(t);
    el.__lead = /^\s/.test(t) ? ' ' : '';
    el.__trail = /\s$/.test(t) ? ' ' : '';
    var k = el.getAttribute('data-ek');
    (byKey[k] = byKey[k] || []).push(el);
  });
  function setText(el, v) { el.textContent = el.__lead + v + el.__trail; }
  function committed(k) { var c = C[k], el = byKey[k] && byKey[k][0]; return (c && el && c.d === el.__d) ? c.v : (el ? el.__d : ''); }
  function setKey(k, v) { (byKey[k] || []).forEach(function (el) { setText(el, v); }); }

  /* 1. apply published wording (everyone) */
  Object.keys(byKey).forEach(function (k) { var v = committed(k); if (v !== byKey[k][0].__d) setKey(k, v); });

  /* 2. edit mode only from here */
  var q = location.search + location.hash;
  if (/(^|[?&#])edit($|[&#=])/.test(q)) sset('sessionStorage', 'dn_edit', '1');
  if (sget('sessionStorage', 'dn_edit') !== '1') return;

  var pending = {};
  try { pending = JSON.parse(sget('sessionStorage', 'dn_pending') || '{}'); } catch (e) { pending = {}; }
  function savePending() { sset('sessionStorage', 'dn_pending', JSON.stringify(pending)); }
  Object.keys(pending).forEach(function (k) { if (byKey[k] && pending[k].d === byKey[k][0].__d) setKey(k, pending[k].v); });

  var css = document.createElement('style');
  css.textContent =
    'body.dn-editing{padding-bottom:84px}' +
    '[data-ek]{cursor:text}' +
    '[data-ek]:hover{outline:2px dashed #2c9ad8;outline-offset:3px}' +
    '[data-ek]:focus{outline:2px solid #2c9ad8;outline-offset:3px;background:rgba(44,154,216,.12)}' +
    '[data-ek].dn-changed{outline:2px solid #f5b83d;outline-offset:3px}' +
    '#dn-bar{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;background:#14213d;color:#fff;font:500 14px/1.3 Inter,system-ui,sans-serif;padding:12px 16px;display:flex;flex-wrap:wrap;gap:10px 14px;align-items:center;box-shadow:0 -6px 24px rgba(0,0,0,.25)}' +
    '#dn-bar b{font-weight:700}#dn-bar .dn-n{background:#2c9ad8;border-radius:99px;padding:2px 10px;font-size:13px}' +
    '#dn-bar .dn-n.zero{background:#3b4a63}' +
    '#dn-bar select,#dn-bar button{font:600 14px Inter,system-ui,sans-serif;border-radius:8px;border:0;padding:9px 14px;cursor:pointer}' +
    '#dn-bar select{background:#fff;color:#14213d}' +
    '#dn-bar .dn-pub{background:#2c9ad8;color:#fff}#dn-bar .dn-pub[disabled]{opacity:.5;cursor:default}' +
    '#dn-bar .dn-ghost{background:#26385c;color:#fff}' +
    '#dn-bar .dn-sp{flex:1 1 20px}' +
    '#dn-msg{flex:1 1 100%;font-size:13px;color:#cfe3f5}#dn-msg.err{color:#ffb4b4}#dn-msg.ok{color:#9be3b0}' +
    '#dn-modal{position:fixed;inset:0;z-index:2147483100;background:rgba(10,18,36,.7);display:flex;align-items:center;justify-content:center;padding:16px}' +
    '#dn-modal .box{background:#fff;color:#172a4d;border-radius:14px;max-width:520px;width:100%;padding:24px;font:400 15px/1.5 Inter,system-ui,sans-serif}' +
    '#dn-modal h3{margin:0 0 8px;font:800 20px Archivo,Inter,sans-serif}#dn-modal ol{padding-left:20px;margin:10px 0}' +
    '#dn-modal input{width:100%;box-sizing:border-box;padding:11px;border:1px solid #dbe5f0;border-radius:8px;font:14px monospace;margin:8px 0}' +
    '#dn-modal .row{display:flex;gap:10px;justify-content:flex-end;margin-top:10px}' +
    '#dn-modal button{font:600 14px Inter,sans-serif;border:0;border-radius:8px;padding:10px 16px;cursor:pointer}' +
    '#dn-modal .go{background:#2c9ad8;color:#fff}#dn-modal .no{background:#e0e9f4;color:#172a4d}' +
    '#dn-modal .warn{font-size:13px;color:#8a4b00;background:#fff4e0;border-radius:8px;padding:8px 10px}';
  document.head.appendChild(css);
  document.body.classList.add('dn-editing');

  /* open FAQ answers so their text can be edited */
  Array.prototype.forEach.call(document.querySelectorAll('details'), function (d) { d.removeAttribute('name'); d.open = true; });

  var plain = true;
  els.forEach(function (el) {
    el.setAttribute('contenteditable', 'plaintext-only');
    if (el.contentEditable !== 'plaintext-only') { plain = false; el.setAttribute('contenteditable', 'true'); }
    el.setAttribute('spellcheck', 'true');
    el.addEventListener('focus', function () { el.__start = norm(el.textContent); });
    el.addEventListener('keydown', function (e) {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
      else if (e.key === 'Escape') { e.preventDefault(); setText(el, el.__start); el.blur(); }
    });
    el.addEventListener('keyup', function (e) { e.stopPropagation(); });
    el.addEventListener('paste', function (e) {
      if (plain) return;
      e.preventDefault();
      var t = (e.clipboardData || window.clipboardData).getData('text').replace(/\s+/g, ' ');
      document.execCommand('insertText', false, t);
    });
    el.addEventListener('blur', function () {
      var k = el.getAttribute('data-ek'), v = norm(el.textContent);
      if (!v) v = el.__start || el.__d;
      setKey(k, v);
      if (v === committed(k)) delete pending[k]; else pending[k] = { v: v, d: el.__d };
      savePending(); refresh();
    });
  });
  /* links/buttons must not navigate or toggle while editing */
  document.addEventListener('click', function (e) {
    if (e.target.closest('#dn-bar,#dn-modal')) return;
    var t = e.target.closest('a,button,summary,label,[role=button]');
    if (t) e.preventDefault();
  }, true);
  document.addEventListener('submit', function (e) { e.preventDefault(); }, true);

  /* toolbar */
  var bar = document.createElement('div'); bar.id = 'dn-bar';
  var here = location.pathname.split('/').pop() || 'index.html';
  var opts = PAGES.map(function (p) { return '<option value="' + p[0] + '"' + (p[0] === here ? ' selected' : '') + '>' + p[1] + '</option>'; }).join('');
  bar.innerHTML = '<b>Editing wording</b><span class="dn-n zero" id="dn-n">0 changes</span>' +
    '<select id="dn-pg" aria-label="Go to page">' + opts + '</select><span class="dn-sp"></span>' +
    '<button class="dn-ghost" id="dn-disc" type="button">Discard</button>' +
    '<button class="dn-pub" id="dn-pub" type="button" disabled>Publish</button>' +
    '<button class="dn-ghost" id="dn-exit" type="button">Exit</button>' +
    '<div id="dn-msg">Click any text to change it. Press Enter when done (Esc cancels). Yellow outline = changed but not published yet.</div>';
  document.body.appendChild(bar);
  var nEl = bar.querySelector('#dn-n'), msg = bar.querySelector('#dn-msg');
  function say(t, cls) { msg.textContent = t; msg.className = cls || ''; }
  function count() { return Object.keys(pending).length; }
  function refresh() {
    var n = count();
    nEl.textContent = n + (n === 1 ? ' change' : ' changes'); nEl.className = 'dn-n' + (n ? '' : ' zero');
    bar.querySelector('#dn-pub').disabled = !n;
    els.forEach(function (el) { el.classList.toggle('dn-changed', !!pending[el.getAttribute('data-ek')]); });
  }
  refresh();

  bar.querySelector('#dn-pg').addEventListener('change', function (e) { location.href = e.target.value; });

  var armed = {};
  function twice(id, label, first, fn) {
    var b = bar.querySelector(id);
    b.addEventListener('click', function () {
      if (first()) { fn(); return; }
      if (armed[id]) { clearTimeout(armed[id]); armed[id] = 0; b.textContent = label; fn(); return; }
      b.textContent = 'Click again to confirm';
      armed[id] = setTimeout(function () { armed[id] = 0; b.textContent = label; }, 3500);
    });
  }
  twice('#dn-disc', 'Discard', function () { return !count(); }, function () {
    Object.keys(pending).forEach(function (k) { setKey(k, committed(k)); });
    pending = {}; savePending(); refresh(); say('Unpublished changes discarded.');
  });
  twice('#dn-exit', 'Exit', function () { return !count(); }, function () {
    sdel('sessionStorage', 'dn_edit'); sdel('sessionStorage', 'dn_pending');
    location.href = location.href.split('#')[0].split('?')[0];
  });

  /* token dialog */
  function askToken(cb) {
    var m = document.createElement('div'); m.id = 'dn-modal';
    m.innerHTML = '<div class="box"><h3>One-time setup: connect to GitHub</h3>' +
      '<p>Publishing saves your wording to your website’s GitHub. It needs a private key, created once:</p>' +
      '<ol><li>Open <b>github.com/settings/personal-access-tokens/new</b></li>' +
      '<li>Name it “Website wording”. Expiration: your choice.</li>' +
      '<li>Repository access: <b>Only select repositories</b> → Double-Nine-Networks</li>' +
      '<li>Permissions → Repository → <b>Contents: Read and write</b></li>' +
      '<li>Generate token, copy it, paste below</li></ol>' +
      '<input id="dn-tok" type="password" placeholder="github_pat_..." autocomplete="off">' +
      '<div class="warn">Only do this on your own computer. The key is kept in this browser so you won’t be asked again.</div>' +
      '<div class="row"><button class="no" type="button">Cancel</button><button class="go" type="button">Save and publish</button></div></div>';
    document.body.appendChild(m);
    var inp = m.querySelector('#dn-tok'); inp.focus();
    m.querySelector('.no').onclick = function () { m.remove(); };
    m.querySelector('.go').onclick = function () {
      var t = inp.value.trim(); if (!t) return;
      try { localStorage.setItem('dn_token', t); } catch (e) { mem.tok = t; }
      m.remove(); cb(t);
    };
  }
  function getToken() { try { return localStorage.getItem('dn_token'); } catch (e) { return mem.tok || null; } }
  function clearToken() { try { localStorage.removeItem('dn_token'); } catch (e) {} mem.tok = null; }

  /* publish */
  function b64(s) { return btoa(unescape(encodeURIComponent(s))); }
  function unb64(s) { return decodeURIComponent(escape(atob(s.replace(/\s/g, '')))); }
  var api = 'https://api.github.com/repos/' + REPO + '/contents/' + FILE;
  function gh(tok, method, url, body) {
    return fetch(url, {
      method: method, body: body ? JSON.stringify(body) : undefined,
      headers: { 'Authorization': 'Bearer ' + tok, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' }
    });
  }
  function attempt(tok, tries) {
    return gh(tok, 'GET', api + '?ref=' + BRANCH).then(function (r) {
      if (r.status === 401 || r.status === 403) throw { auth: true };
      if (r.status === 404) return { sha: undefined, obj: {} };
      if (!r.ok) throw { text: 'GitHub said ' + r.status + ' while reading.' };
      return r.json().then(function (j) {
        var obj = {}, txt = unb64(j.content);
        try { obj = JSON.parse(txt.replace(/^[^{]*/, '').replace(/;\s*$/, '')); } catch (e) { obj = {}; }
        return { sha: j.sha, obj: obj };
      });
    }).then(function (cur) {
      Object.keys(pending).forEach(function (k) {
        if (pending[k].v === pending[k].d) delete cur.obj[k]; else cur.obj[k] = { v: pending[k].v, d: pending[k].d };
      });
      var text = 'window.DN_CONTENT = ' + JSON.stringify(cur.obj, null, 2) + ';\n';
      return gh(tok, 'PUT', api, { message: 'Update site wording', content: b64(text), sha: cur.sha, branch: BRANCH }).then(function (r) {
        if (r.status === 401 || r.status === 403) throw { auth: true };
        if ((r.status === 409 || r.status === 422) && tries > 0) return attempt(tok, tries - 1);
        if (!r.ok) throw { text: 'GitHub said ' + r.status + ' while saving. Try again in a moment.' };
        C = cur.obj; window.DN_CONTENT = C;
      });
    });
  }
  function doPublish(tok) {
    var b = bar.querySelector('#dn-pub'); b.disabled = true; say('Publishing…');
    attempt(tok, 2).then(function () {
      pending = {}; savePending(); refresh();
      say('Published. Your site updates in about a minute — then refresh the page to see it live.', 'ok');
    }).catch(function (e) {
      b.disabled = !count();
      if (e && e.auth) { clearToken(); say('GitHub did not accept the key (expired or wrong permissions). Click Publish to enter a new one.', 'err'); }
      else if (e && e.text) say(e.text, 'err');
      else say('Could not reach GitHub. Publishing only works on the live site (doubleninenetworks.com), not in the preview.', 'err');
    });
  }
  bar.querySelector('#dn-pub').addEventListener('click', function () {
    if (!count()) return;
    var t = getToken(); if (t) doPublish(t); else askToken(doPublish);
  });
  window.addEventListener('beforeunload', function (e) { /* pending survives page changes; only warn on close if unpublished */ });
})();
