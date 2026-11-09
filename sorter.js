const $ = s => document.querySelector(s);
const YEAR = 365 * 864e5;
// shortcut: friends are keyed by name, so two friends with the same name share one decision; switch to profile IDs if that bites.
let S = { friends: [], dec: {}, done: {}, pics: {}, queue: [], fail: {}, halt: null, run: [] };
let view = { filter: 'open', sort: 'quiet', sel: new Set() };

const quiet = f => !f.last || Date.now() - f.last > 3 * YEAR;
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ini = n => n.split(/\s+/).map(w => w[0] || '').join('').slice(0, 2);
const save = () => chrome.storage.local.set({ dec: S.dec, done: S.done });

function ago(ms) {
  if (!ms) return 'never chatted';
  const m = Math.round((Date.now() - ms) / (30 * 864e5));
  return m < 12 ? `last chat ${m} mo ago` : `last chat ${Math.round(m / 12)} yrs ago`;
}

chrome.storage.local.get(['friends', 'dec', 'done', 'pics', 'queue', 'fail', 'halt', 'run'], d => {
  S = { friends: d.friends || [], dec: d.dec || {}, done: d.done || {}, pics: d.pics || {}, queue: d.queue || [], fail: d.fail || {}, halt: d.halt || null, run: d.run || [] };
  draw();
});
// the Facebook page ticks friends off, works through the unfriend queue, and saves photos and links as you browse it
chrome.storage.onChanged.addListener(ch => {
  for (const k of ['done', 'pics', 'fail']) if (ch[k]) S[k] = ch[k].newValue || {};
  if (ch.queue) S.queue = ch.queue.newValue || [];
  if (ch.halt) S.halt = ch.halt.newValue || null;
  if (ch.friends) {
    S.friends = ch.friends.newValue || [];
    $('#status').textContent = S.friends.length ? `${S.friends.length} friends loaded` : '';
  }
  if (ch.done || ch.pics || ch.fail || ch.queue || ch.halt || ch.friends) draw();
  if (ch.queue?.oldValue?.length && !ch.queue.newValue?.length) finished(!!ch.halt?.newValue);
  if (ch.scanned?.newValue) {
    const { found, added } = ch.scanned.newValue;
    popup(`${found} friends found`, added === found ? 'Pick Keep or Remove for each one in Not decided.'
      : added ? `${added} new. Sort them in Not decided.` : 'No new friends since your last scan.');
  }
});

// The queue just emptied: show the done popup for this run, unless Facebook stopped it (the red message shows then).
function finished(halted) {
  const run = S.run;
  S.run = [];
  chrome.storage.local.set({ run: [] });
  if (halted || !run.length) return;
  const ok = run.filter(n => S.done[n]).length, bad = run.filter(n => S.fail[n]).length;
  const left = S.friends.filter(f => S.dec[f.name] === 'remove' && !S.done[f.name]).length;
  popup(`${ok} ${ok === 1 ? 'friend' : 'friends'} unfriended`,
    left ? `${left} still on your Remove list.` : 'Your Remove list is all cleared.',
    bad ? `${bad} couldn't be removed. Press Try again on them.` : '');
}
function popup(title, sub, fail = '') {
  $('#doneTitle').textContent = title;
  $('#doneSub').textContent = sub;
  $('#doneFail').textContent = fail;
  if (!$('#done').open) $('#done').showModal();
}
$('#doneOk').addEventListener('click', () => $('#done').close());
// a click on the dimmed area outside the box closes it too
$('#done').addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.close(); });

// Adds names to the queue a Facebook friends-list tab works through. Opens that tab if none picks the work up.
function unfriend(names) {
  names = names.filter(n => !S.queue.includes(n) && !S.done[n]);
  if (!names.length) return;
  names.forEach(n => delete S.fail[n]);
  S.queue = [...S.queue, ...names];
  S.halt = null;
  S.run = [...new Set([...S.run, ...names])];
  chrome.storage.local.set({ queue: S.queue, fail: S.fail, halt: null, run: S.run });
  // when the queue is done, the Facebook tab closes and brings you back to this tab
  chrome.tabs.getCurrent(t => chrome.storage.local.set({ back: t.id }));
  setTimeout(() => chrome.storage.local.get('lock', d => {
    if (!d.lock || Date.now() - d.lock.t > 30000) chrome.tabs.create({ url: 'https://www.facebook.com/friends/list', active: false }, t => chrome.tabs.update(t.id, { autoDiscardable: false }));
  }), 3000);
}
// expired Facebook photo links fall back to the initials underneath
document.addEventListener('error', e => { if (e.target.tagName === 'IMG') e.target.remove(); }, true);

$('#pick').addEventListener('change', async e => {
  const picked = [...e.target.files].filter(f =>
    /your_friends\.json$|messages\/[^/]+\/[^/]+\/message_\d+\.json$/.test(f.webkitRelativePath));
  $('#status').textContent = `Reading ${picked.length} files…`;
  const files = [];
  for (const f of picked) {
    try { files.push({ path: f.webkitRelativePath, json: JSON.parse(await f.text()) }); } catch { /* skip broken file */ }
  }
  $('#status').textContent = '';
  const friends = parseExport(files);
  if (!friends.length) {
    $('#err').textContent = "Couldn't find your friend list in that folder. Pick the unzipped folder, and check you chose JSON when downloading.";
    return;
  }
  $('#err').textContent = '';
  e.target.value = ''; // so picking the same folder again still fires "change"
  S.friends = friends;
  chrome.storage.local.set({ friends });
  draw();
});

// Tells the Facebook tab to scroll the friends list (and, for a scan, save everyone on it), then come back to this tab.
function startLoad(scan) {
  chrome.tabs.getCurrent(t => chrome.storage.local.set({ autoload: Date.now(), scan, back: t.id }));
}
$('#scan').addEventListener('click', () => {
  $('#err').textContent = '';
  startLoad(true);
  // your profile's Friends tab lists more people than facebook.com/friends/list does
  chrome.tabs.create({ url: 'https://www.facebook.com/me/friends' });
});

$('#clear').addEventListener('click', () => {
  if (!confirm('Clear everything? Your friends, picks, links and photos will be removed from this browser.')) return;
  chrome.storage.local.clear();
  S = { friends: [], dec: {}, done: {}, pics: {}, queue: [], fail: {}, halt: null, run: [] };
  view.sel.clear();
  view.filter = 'open';
  draw();
});

function draw() {
  const F = S.friends;
  $('#load').classList.toggle('small', F.length > 0);
  if (!F.length) { $('#main').innerHTML = ''; return; }

  // a scanned list (or a download without dates) has no "friends since" or "last chat", so date tools are hidden
  const dated = F.some(f => f.since || f.last);
  if (!dated && view.filter === 'quiet') view.filter = 'open';
  const rem = F.filter(f => S.dec[f.name] === 'remove');
  const show = {
    all: () => true,
    quiet,
    open: f => !S.dec[f.name],
    keep: f => S.dec[f.name] === 'keep',
    remove: f => S.dec[f.name] === 'remove',
  }[view.filter];
  const by = !dated ? (a, b) => a.name.localeCompare(b.name)
    : view.sort === 'old' ? (a, b) => (a.since ?? Infinity) - (b.since ?? Infinity)
    : (a, b) => (a.last || 0) - (b.last || 0);
  // friends with an Open profile link go first, then the chosen sort
  const linkedFirst = f => S.pics[f.name]?.url ? 0 : 1;
  // the Remove list is always A to Z so it matches the Facebook panel and the unfriend order
  const L = F.filter(show).sort(view.filter === 'remove' ? (a, b) => a.name.localeCompare(b.name) : (a, b) => linkedFirst(a) - linkedFirst(b) || by(a, b));

  const chip = (k, t) => `<button class="chip" data-act="filter" data-k="${k}" aria-pressed="${view.filter === k}">${t}</button>`;
  let h = `<div class="stats">
    <div class="stat"><b>${F.length}</b><span class="muted">Friends</span></div>
    ${dated ? `<div class="stat"><b>${F.filter(quiet).length}</b><span class="muted">Quiet 3+ years</span></div>` : ''}
    <div class="stat"><b>${rem.length}</b><span class="muted">On remove list</span></div>
    <div class="stat"><b>${rem.filter(f => S.done[f.name]).length}</b><span class="muted">Unfriended</span></div>
  </div>`;
  // Facebook's download has no profile links; the friends page fills them in as you scroll it.
  const linked = F.filter(f => S.pics[f.name]?.url).length;
  if (linked < F.length) {
    h += `<div class="links"><span><b>${linked} of ${F.length}</b> friends have profile links. Click Load and the add-on scrolls your friends page to get the rest.</span>
      <a class="btn" data-act="load" href="https://www.facebook.com/friends/list" target="_blank" rel="noopener">Load profile links</a>
      ${linked ? `<button data-act="dropMissing">Remove ${F.length - linked} not found</button>` : ''}</div>`;
  }
  h += `<div class="tools">
    ${chip('open', 'Not decided')}${dated ? chip('quiet', 'Quiet 3+ years') : ''}${chip('keep', 'Keep list')}${chip('remove', 'Remove list')}${chip('all', 'All')}
    ${dated ? `<select data-act="sort" aria-label="Sort friends">
      <option value="quiet" ${view.sort === 'quiet' ? 'selected' : ''}>Longest silence first</option>
      <option value="old" ${view.sort === 'old' ? 'selected' : ''}>Oldest friends first</option>
    </select>` : ''}
    ${view.filter === 'remove' && rem.length ? '<button data-act="clearRemove">Clear remove list</button>' : ''}
  </div>`;
  // friends you can still tick to unfriend together: on the remove list, not done, not already queued
  const pickable = rem.filter(f => !S.done[f.name] && !S.queue.includes(f.name)).map(f => f.name);
  view.sel.forEach(n => pickable.includes(n) || view.sel.delete(n));
  if (view.filter === 'remove' && S.halt) h += `<div class="err" role="alert">${esc(S.halt)}</div>`;
  if (view.filter === 'remove' && (pickable.length || S.queue.length)) {
    h += `<div class="tools">
      ${pickable.length ? `<label class="tick"><input type="checkbox" data-act="selAll" ${view.sel.size === pickable.length ? 'checked' : ''}> Select all</label>` : ''}
      ${view.sel.size ? `<button class="unf" data-act="unfSel">Unfriend all ${view.sel.size}</button>` : ''}
      ${S.queue.length ? `<span class="muted">Unfriending ${S.queue.length} left, 3 seconds apart…</span><button data-act="stop">Stop</button>` : ''}
    </div>`;
  }

  if (!L.length) {
    h += `<p class="muted empty">${view.filter === 'remove' ? 'Nobody on your remove list yet. Pick Remove on a friend to add them.'
      : view.filter === 'keep' ? 'Nobody on your keep list yet. Pick Keep on a friend to add them.'
      : "You've decided on everyone here. Switch to All to see them."}</p>`;
  }
  for (const f of L) {
    const d = S.dec[f.name], done = S.done[f.name], n = esc(f.name), pic = S.pics[f.name];
    const link = pic?.url
      ? `<a class="btn" href="${esc(pic.url)}" target="_blank" rel="noopener">Open profile</a>`
      : `<a class="btn" href="https://www.facebook.com/search/people/?q=${encodeURIComponent(f.name)}" target="_blank" rel="noopener">Find on Facebook</a>`;
    const inRemove = d === 'remove' && view.filter === 'remove', q = S.queue.indexOf(f.name), fail = S.fail[f.name];
    const unf = done ? '<span class="pill talk">Unfriended</span>'
      : q === 0 ? '<span class="muted">Unfriending…</span>'
      : q > 0 ? '<span class="muted">Waiting…</span>'
      : `<button class="unf" data-act="unf" data-n="${n}">${fail ? 'Try again' : 'Unfriend'}</button>`;
    h += `<div class="row ${done ? 'done' : ''}">
      ${inRemove && pickable.includes(f.name) ? `<input type="checkbox" data-act="sel" data-n="${n}" aria-label="Select ${n}" ${view.sel.has(f.name) ? 'checked' : ''}>` : ''}
      <div class="av" aria-hidden="true">${esc(ini(f.name))}${pic?.img ? `<img src="${esc(pic.img)}" alt="">` : ''}</div>
      <div class="who"><div class="name">${n}</div>
        ${dated ? `<div class="muted">Friends since ${f.since ? new Date(f.since).getFullYear() : 'unknown'}, ${ago(f.last)}</div>` : ''}
        ${inRemove && fail ? `<div class="err">${esc(fail)}</div>` : ''}</div>
      ${dated ? `<span class="pill ${quiet(f) ? 'quiet' : 'talk'}">${quiet(f) ? 'Quiet' : 'Talking'}</span>` : ''}
      ${inRemove ? unf : ''}
      ${link}
      ${done ? '' : `<button class="dec" data-act="dec" data-d="keep" data-n="${n}" aria-pressed="${d === 'keep'}">Keep</button>
      <button class="dec" data-act="dec" data-d="remove" data-n="${n}" aria-pressed="${d === 'remove'}">Remove</button>`}
    </div>`;
  }
  if (rem.length) {
    h += `<p class="next">Press <b>Unfriend</b> on a friend in your Remove list, or tick several and press <b>Unfriend all</b>. It opens <b>facebook.com/friends/list</b> in a background tab and clicks Facebook's own buttons for you.</p>`;
  }
  $('#main').innerHTML = h;
}

$('#main').addEventListener('click', e => {
  const t = e.target.closest('[data-act]');
  if (!t) return;
  const a = t.dataset.act, n = t.dataset.n;
  if (a === 'filter') view.filter = t.dataset.k;
  else if (a === 'dec') { S.dec[n] = S.dec[n] === t.dataset.d ? undefined : t.dataset.d; save(); }
  else if (a === 'sel') t.checked ? view.sel.add(n) : view.sel.delete(n);
  else if (a === 'selAll') {
    view.sel = new Set(t.checked ? S.friends.filter(f => S.dec[f.name] === 'remove' && !S.done[f.name] && !S.queue.includes(f.name)).map(f => f.name) : []);
  }
  else if (a === 'unf') unfriend([n]);
  else if (a === 'unfSel') {
    if (!confirm(`Unfriend ${view.sel.size} people on Facebook? This can't be undone here. It goes one by one, 3 seconds apart, and stops if Facebook warns you.`)) return;
    unfriend([...view.sel].sort((a, b) => a.localeCompare(b)));
    view.sel.clear();
  }
  else if (a === 'load') startLoad(false);
  else if (a === 'stop') { S.queue = S.queue.slice(0, 1); chrome.storage.local.set({ queue: S.queue }); }
  // people your friends page never showed: they likely unfriended you, left Facebook, or changed their name
  else if (a === 'dropMissing') {
    const keep = S.friends.filter(f => S.pics[f.name]?.url);
    if (!confirm(`Remove ${S.friends.length - keep.length} people your friends page didn't show? They're probably not your friends anymore. Load your folder again to bring them back.`)) return;
    S.friends = keep;
    chrome.storage.local.set({ friends: keep });
  }
  else if (a === 'clearRemove') {
    const rem = Object.keys(S.dec).filter(k => S.dec[k] === 'remove');
    if (!confirm(`Clear your remove list? ${rem.length} friends go back to Not decided.`)) return;
    rem.forEach(k => { delete S.dec[k]; delete S.done[k]; });
    save();
  }
  else return;
  draw();
});
$('#main').addEventListener('change', e => {
  if (e.target.dataset.act === 'sort') { view.sort = e.target.value; draw(); }
});
