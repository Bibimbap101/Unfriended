// Helper on Facebook's own pages: it hides, highlights and ticks off rows.
// It only clicks Facebook's buttons to unfriend people you queued with an Unfriend button in the sorter.
let S = { friends: [], dec: {}, done: {}, pics: {}, fail: {}, clean: true, queue: [], lock: null };
let names = new Set(), remove = new Set();

function load(d) {
  S = { friends: d.friends || [], dec: d.dec || {}, done: d.done || {}, pics: d.pics || {}, fail: d.fail || {}, clean: d.clean !== false, queue: d.queue || [], lock: d.lock || null };
  names = new Set(S.friends.map(f => f.name));
  // only people still in your friend list, so someone dropped from it can't leave clean-up mode stuck
  remove = new Set(Object.keys(S.dec).filter(n => S.dec[n] === 'remove' && names.has(n)));
  apply();
  work();
}
chrome.storage.local.get(null, load);
chrome.storage.onChanged.addListener(() => chrome.storage.local.get(null, load));

const onFriendsPage = () => location.pathname.startsWith('/friends');

function apply() {
  checkDone();
  drawPanel();
  if (!onFriendsPage()) return;
  let picsChanged = false;
  // shortcut: rows are found by matching the link text to a friend's name; if Facebook changes its layout this may stop matching.
  document.querySelectorAll('a[role="link"]').forEach(a => {
    const name = (a.innerText || '').split('\n')[0].trim();
    if (!names.has(name)) return;
    const row = rowOf(a);
    // hidden rows can't be scrolled to, so show everyone while loading
    const on = S.clean && remove.size > 0 && !loading;
    row.classList.toggle('unf-hit', on && remove.has(name) && !S.done[name]);
    row.classList.toggle('unf-done', on && !!S.done[name]);
    row.classList.toggle('unf-hide', on && !remove.has(name));
    const pic = readPic(a, row);
    // Facebook gives the same photo a new address on every page load, so only save a new link or a first photo;
    // saving every changed address made open Facebook tabs re-save each other's photos in a loop and froze the browser.
    const old = S.pics[name];
    // never replace a saved link: with two friends of the same name it would flip between them forever
    if (pic && (!old?.url || (old.url === pic.url && !old.img && pic.img))) { S.pics[name] = pic; picsChanged = true; }
  });
  if (picsChanged) chrome.storage.local.set({ pics: S.pics });
}

// The name link sits a few levels inside the row; the row is the first parent that also holds the photo.
function rowOf(a) {
  let el = a;
  for (let i = 0; i < 12 && el.parentElement; i++) {
    el = el.parentElement;
    if (el.querySelector('image, img')) return el;
  }
  return a;
}

// Reads the photo and profile link Facebook already shows in the row, for the sorter's "Open profile" button.
function readPic(a, row) {
  const u = new URL(a.href, location.origin);
  if (u.hostname !== 'www.facebook.com' || u.pathname.startsWith('/friends')) return null;
  // profile.php links keep the person's ID in "?id=", other links are just the username path
  const id = u.pathname === '/profile.php' && u.searchParams.get('id');
  const url = id ? `https://www.facebook.com/profile.php?id=${encodeURIComponent(id)}` : u.origin + u.pathname;
  const im = row.querySelector('image, img');
  const src = im && (im.getAttribute('xlink:href') || im.getAttribute('href') || im.getAttribute('src'));
  return { url, img: src && src.startsWith('https://') ? src : null };
}

// After you unfriend, Facebook swaps the "Friends" button for "Add friend" next to their name.
function checkDone() {
  for (const h of document.querySelectorAll('h1')) {
    const name = h.innerText.trim();
    if (!remove.has(name) || S.done[name]) continue;
    // shortcut: only looks a few levels around the name so "People you may know" buttons don't count; English Facebook only.
    let box = h;
    for (let i = 0; i < 8 && box.parentElement; i++) box = box.parentElement;
    const added = [...box.querySelectorAll('[role="button"], [aria-label]')]
      .some(b => b.getAttribute('aria-label') === 'Add friend' || b.innerText?.trim() === 'Add friend');
    if (added) {
      S.done[name] = true;
      chrome.storage.local.set({ done: S.done });
    }
  }
}

function drawPanel() {
  let p = document.getElementById('unf-panel');
  if (!loadMsg && (!onFriendsPage() || !remove.size)) { p?.remove(); return; }
  if (!p) {
    p = document.createElement('div');
    p.id = 'unf-panel';
    p.addEventListener('click', e => {
      if (e.target.closest('[data-unf="toggle"]')) chrome.storage.local.set({ clean: !S.clean });
      if (e.target.closest('[data-unf="stopLoad"]')) { loading = false; loadMsg = ''; apply(); }
    });
    p.addEventListener('change', e => {
      const n = e.target.dataset.unfName;
      if (n) { S.done[n] = e.target.checked; chrome.storage.local.set({ done: S.done }); }
    });
    document.body.appendChild(p);
  }
  // A to Z, the same order as the sorter's Remove list and the unfriend queue
  const list = [...remove].sort((a, b) => a.localeCompare(b));
  const done = list.filter(n => S.done[n]).length;
  const html = loadMsg ? `
    <div class="unf-head">
      <div><b>Unfriended</b><div class="unf-sub">${loadMsg}</div></div>
      <button data-unf="stopLoad">${loading ? 'Stop' : 'OK'}</button>
    </div>` : `
    <div class="unf-head">
      <div><b>Clean-up mode ${S.clean ? 'on' : 'off'}</b>
        <div class="unf-sub">${done === list.length ? 'All done. Everyone on your list is removed.' : `${done} of ${list.length} done`}</div></div>
      <button data-unf="toggle">${S.clean ? 'Show everyone' : 'Turn on'}</button>
    </div>
    <div class="unf-bar"><i style="width:${Math.round(done / list.length * 100)}%"></i></div>
    <div class="unf-list">${list.map(n => `<label><input type="checkbox" data-unf-name="${esc(n)}" ${S.done[n] ? 'checked' : ''}> ${esc(n)}</label>${!S.done[n] && S.pics[n]?.url ? `<a href="${esc(S.pics[n].url)}" target="_blank" rel="noopener">Open profile</a>` : ''}`).join('')}</div>`;
  // only touch the DOM when something changed, so ticking a box isn't interrupted
  if (p.dataset.html !== html) { p.innerHTML = html; p.dataset.html = html; }
}

// The sorter puts names in "queue". One friends-list tab takes a lock and unfriends them one at a time.
const me = Math.random().toString(36).slice(2);
let busy = false;
// waits in the background script, because Chrome slows timers in a tab you aren't looking at
const sleep = ms => chrome.runtime.sendMessage({ sleep: ms }).catch(() => new Promise(r => setTimeout(r, ms)));
async function waitFor(fn, ms = 8000) {
  for (let t = 0; t < ms; t += 250) { const v = fn(); if (v) return v; await sleep(250); }
  return null;
}

const LIST = 'https://www.facebook.com/friends/list';
const NOT_FOUND = "Couldn't find them on Facebook. Try Open profile.";
// This page's address in the same form readPic saves profile links, so the two can be compared.
function here() {
  const id = location.pathname === '/profile.php' && new URLSearchParams(location.search).get('id');
  return id ? `https://www.facebook.com/profile.php?id=${encodeURIComponent(id)}` : location.origin + location.pathname.replace(/\/$/, '');
}

async function work() {
  const name = S.queue[0], profile = name && S.pics[name]?.url;
  const onList = location.pathname === '/friends/list';
  const onProfile = !!profile && profile.replace(/\/$/, '') === here();
  if (busy || !name || (!onList && !onProfile)) return;
  // shortcut: two friends-list tabs can both grab a free lock at the same moment; fine unless you open several at once.
  if (S.lock && S.lock.id !== me && Date.now() - S.lock.t < 30000) return;
  busy = true;
  await chrome.storage.local.set({ lock: { id: me, t: Date.now() } });
  let err, warn = fbWarning();
  if (!warn) {
    try { err = onList ? await unfriend(name) : await unfriendOnProfile(); } catch { err = 'Something went wrong on Facebook. Try again.'; }
    warn = fbWarning();
  }
  // the list's search missed them: open their profile in this tab and unfriend from there
  if (onList && err === NOT_FOUND && profile && !warn) {
    await chrome.storage.local.set({ lock: null });
    location.href = profile;
    return;
  }
  const d = await chrome.storage.local.get(['queue', 'done', 'fail']);
  const done = d.done || {}, fail = d.fail || {};
  if (warn) fail[name] = `Facebook said: "${warn}"`;
  else if (err) fail[name] = err; else { done[name] = true; delete fail[name]; }
  // a Facebook warning empties the whole queue at once, so nobody else gets unfriended after it
  const queue = warn ? [] : (d.queue || []).filter(n => n !== name);
  const halt = warn ? `Stopped: Facebook said "${warn}". Wait a day before unfriending more.` : null;
  await chrome.storage.local.set({ queue, done, fail, halt, lock: queue.length ? { id: me, t: Date.now() } : null });
  // a short pause between people so Facebook doesn't see a burst of unfriends
  if (queue.length) {
    await sleep(3000);
    if (!onList) { location.href = LIST; return; }
  } else return chrome.runtime.sendMessage({ close: true }); // all done: close this tab and go back to the sorter
  busy = false;
  chrome.storage.local.get(null, load);
}

// Facebook's "slow down" popups. Returns the warning line, or null if there's none on screen.
// shortcut: English Facebook only; add more phrases here if Facebook words a warning differently.
const WARN = /try again later|can.t use this feature|temporarily blocked|limit how often|going too fast|misus|suspicious|restricted|checkpoint/i;
function fbWarning() {
  for (const d of document.querySelectorAll('[role="dialog"], [role="alertdialog"], [role="alert"]')) {
    const line = (d.innerText || '').split('\n').find(l => WARN.test(l));
    if (line) return line.trim().slice(0, 160);
  }
  return null;
}

// Same 3 clicks you'd do: the row's "More" (…) button, "Unfriend …" in the menu, then "Confirm".
// shortcut: English Facebook only, and the name must match the one in your Facebook download.
async function unfriend(name) {
  // a scan names a second friend with the same name "Name (2)"; search the real name, then pick the row by profile link
  const want = S.pics[name]?.url;
  name = name.replace(/ \(\d+\)$/, '');
  const box = document.querySelector('input[aria-label="Search through your friends list"], input[placeholder="Search friends"]');
  if (!box) return "Couldn't find Facebook's friend search. Reload the friends page.";
  // React ignores a plain .value change, so set it the way typing does
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(box, name);
  box.dispatchEvent(new Event('input', { bubbles: true }));
  const row = await waitFor(() => {
    const a = [...document.querySelectorAll('a[role="link"]')].find(a => nameOf(a) === name && (!want || readPic(a, a)?.url === want));
    let el = a;
    for (let i = 0; el && i < 12; i++, el = el.parentElement) if (el.querySelector('[aria-label="More"]')) return el;
  });
  if (!row) return NOT_FOUND;
  row.querySelector('[aria-label="More"]').click();
  return confirmUnfriend(() => row.querySelector('[aria-label="Add friend"]'));
}

// Fallback on their profile page: the "Friends" button under their name, then the same menu and Confirm.
async function unfriendOnProfile() {
  const main = () => document.querySelector('[role="main"]') || document;
  const isBtn = label => b => b.getAttribute('aria-label') === label || b.innerText?.trim() === label;
  const btn = await waitFor(() => [...main().querySelectorAll('[role="button"]')].find(isBtn('Friends')));
  if (!btn) return "Their profile has no Friends button. You may not be friends anymore.";
  btn.click();
  return confirmUnfriend(() => [...main().querySelectorAll('[role="button"]')].find(isBtn('Add friend')));
}

// "Unfriend …" in the open menu, then "Confirm", then wait until Facebook shows "Add friend".
async function confirmUnfriend(added) {
  const item = await waitFor(() => [...document.querySelectorAll('[role="menuitem"]')].find(m => m.innerText.trim().startsWith('Unfriend')));
  if (!item) return "Facebook's menu had no Unfriend option.";
  item.click();
  const ok = await waitFor(() => [...document.querySelectorAll('[role="dialog"] [role="button"], [role="dialog"] button')]
    .find(b => b.getAttribute('aria-label') === 'Confirm' || b.innerText?.trim() === 'Confirm'));
  if (!ok) return "Facebook's Confirm popup didn't show up.";
  ok.click();
  if (!await waitFor(added)) return "Facebook didn't confirm it. Check their profile.";
  return null;
}

function esc(s) {
  return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// "Scan friends list" and "Load profile links" in the sorter: scroll the list for you until Facebook has loaded every row.
// Scan also saves everyone it finds as your friend list, so you don't need Facebook's download.
let loading = false, loadMsg = '';
const nameOf = a => (a.innerText || '').split('\n')[0].trim();
async function autoLoad() {
  const { autoload, scan } = await chrome.storage.local.get(['autoload', 'scan']);
  if (!autoload || Date.now() - autoload > 60000) return;
  // logged out, Facebook shows its login form instead of your friends
  if (document.querySelector('input[type="password"]')) {
    await chrome.storage.local.remove(['autoload', 'scan']);
    loadMsg = 'Log in to Facebook first, then click Scan friends list again in Unfriended.';
    drawPanel();
    return;
  }
  // a scan reads your profile's Friends tab, which lists more people than facebook.com/friends/list
  const friendsTab = !location.pathname.startsWith('/friends') && (/\/friends\/?$/.test(location.pathname) || new URLSearchParams(location.search).get('sk') === 'friends');
  if (scan ? !friendsTab : location.pathname !== '/friends/list') return;
  await chrome.storage.local.remove(['autoload', 'scan']);
  if (!scan && !await waitFor(() => names.size)) return;
  loading = true;
  apply();
  const found = new Map(); // profile link -> { name, img }, so two friends with the same name both count
  let last = -1, still = 0;
  // ~9 seconds with no new friends means Facebook has nothing left to load
  while (loading && still < 6) {
    let end;
    if (scan) {
      // every friend card has a "More options for <name>" button next to a link with that name;
      // other buttons like "More options for album" (the Photos section) have no such link, so they're skipped
      for (const b of document.querySelectorAll('[aria-label^="More options for "]')) {
        const name = b.getAttribute('aria-label').slice(17).trim();
        let card = b, a;
        for (let i = 0; i < 8 && card && !(a = [...card.querySelectorAll('a[role="link"]')].find(x => nameOf(x) === name)); i++) card = card.parentElement;
        const pic = a && readPic(a, card);
        if (pic && !found.has(pic.url)) found.set(pic.url, { name, img: pic.img });
        end = b;
      }
    } else {
      const links = [...document.querySelectorAll('a[role="link"]')].filter(a => names.has(nameOf(a)));
      links.forEach(a => found.set(nameOf(a), true));
      end = links.at(-1);
    }
    scrollToBottom(end);
    const count = found.size;
    still = count === last ? still + 1 : 0;
    last = count;
    loadMsg = `${scan ? 'Scanning' : 'Loading friends'}… ${count} found`;
    drawPanel();
    await sleep(1500);
  }
  const stopped = !loading;
  loading = false;
  if (scan && last > 0) {
    // add new names and keep the ones you already have, so dates from a Facebook download and your picks stay
    const d = await chrome.storage.local.get(['friends', 'pics']);
    const old = d.friends || [], have = new Set(old.map(f => f.name)), pics = { ...(d.pics || {}) };
    const byUrl = new Map(Object.entries(pics).filter(([, p]) => p?.url).map(([n, p]) => [p.url, n]));
    const used = new Set();
    for (const [url, { name, img }] of found) {
      // the same person keeps their name from before; a second friend with a taken name becomes "Name (2)"
      let key = byUrl.get(url);
      for (let i = 1; !key; i++) {
        const k = i === 1 ? name : `${name} (${i})`;
        if (!used.has(k) && (!pics[k]?.url || pics[k].url === url)) key = k;
      }
      used.add(key);
      pics[key] = { url, img: img || pics[key]?.img || null };
    }
    const friends = [...old, ...[...used].filter(n => !have.has(n)).map(name => ({ name, since: null, last: null }))];
    // "scanned" tells the sorter to show its done popup
    await chrome.storage.local.set({ friends, pics, scanned: { found: last, added: friends.length - old.length, t: Date.now() } });
  }
  if (scan && !last) loadMsg = "Didn't find any friends on this page. Check you're logged in to the right account.";
  else if (scan || !stopped) return chrome.runtime.sendMessage({ close: true });
  apply();
}
autoLoad();

// Facebook's "load more" spot sits below the last row, so scroll the list's own box all the way down, not just to the last friend.
function scrollToBottom(el) {
  for (; el; el = el.parentElement) {
    if (el.scrollHeight > el.clientHeight + 10 && /auto|scroll/.test(getComputedStyle(el).overflowY)) {
      el.scrollTop = el.scrollHeight;
      return;
    }
  }
  window.scrollTo(0, document.documentElement.scrollHeight);
}

// Facebook loads rows as you scroll and changes pages without reloading, so re-apply on changes.
let timer;
new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(apply, 300); })
  .observe(document.documentElement, { childList: true, subtree: true });
