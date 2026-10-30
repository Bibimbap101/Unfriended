// Read-only helper on Facebook's own pages: it hides, highlights and ticks off rows.
// It never clicks, sends or unfriends anything. You press Facebook's real buttons.
let S = { friends: [], dec: {}, done: {}, pics: {}, clean: true };
let names = new Set(), remove = new Set();

function load(d) {
  S = { friends: d.friends || [], dec: d.dec || {}, done: d.done || {}, pics: d.pics || {}, clean: d.clean !== false };
  names = new Set(S.friends.map(f => f.name));
  remove = new Set(Object.keys(S.dec).filter(n => S.dec[n] === 'remove'));
  apply();
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
    const on = S.clean && remove.size > 0;
    row.classList.toggle('unf-hit', on && remove.has(name) && !S.done[name]);
    row.classList.toggle('unf-done', on && !!S.done[name]);
    row.classList.toggle('unf-hide', on && !remove.has(name));
    const pic = readPic(a, row);
    if (pic && (S.pics[name]?.url !== pic.url || S.pics[name]?.img !== pic.img)) { S.pics[name] = pic; picsChanged = true; }
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
  if (!onFriendsPage() || !remove.size) { p?.remove(); return; }
  if (!p) {
    p = document.createElement('div');
    p.id = 'unf-panel';
    p.addEventListener('click', e => {
      if (e.target.closest('[data-unf="toggle"]')) chrome.storage.local.set({ clean: !S.clean });
    });
    p.addEventListener('change', e => {
      const n = e.target.dataset.unfName;
      if (n) { S.done[n] = e.target.checked; chrome.storage.local.set({ done: S.done }); }
    });
    document.body.appendChild(p);
  }
  const list = [...remove];
  const done = list.filter(n => S.done[n]).length;
  const html = `
    <div class="unf-head">
      <div><b>Clean-up mode ${S.clean ? 'on' : 'off'}</b>
        <div class="unf-sub">${done === list.length ? 'All done. Everyone on your list is removed.' : `${done} of ${list.length} done`}</div></div>
      <button data-unf="toggle">${S.clean ? 'Show everyone' : 'Turn on'}</button>
    </div>
    <div class="unf-bar"><i style="width:${Math.round(done / list.length * 100)}%"></i></div>
    <div class="unf-list">${list.map(n => `<label><input type="checkbox" data-unf-name="${esc(n)}" ${S.done[n] ? 'checked' : ''}> ${esc(n)}</label>`).join('')}</div>`;
  // only touch the DOM when something changed, so ticking a box isn't interrupted
  if (p.dataset.html !== html) { p.innerHTML = html; p.dataset.html = html; }
}

function esc(s) {
  return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// Facebook loads rows as you scroll and changes pages without reloading, so re-apply on changes.
let timer;
new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(apply, 300); })
  .observe(document.documentElement, { childList: true, subtree: true });
