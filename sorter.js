const $ = s => document.querySelector(s);
const YEAR = 365 * 864e5;
// shortcut: friends are keyed by name, so two friends with the same name share one decision; switch to profile IDs if that bites.
let S = { friends: [], dec: {}, done: {}, pics: {} };
let view = { filter: 'quiet', sort: 'quiet' };

const quiet = f => !f.last || Date.now() - f.last > 3 * YEAR;
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ini = n => n.split(/\s+/).map(w => w[0] || '').join('').slice(0, 2);
const save = () => chrome.storage.local.set({ dec: S.dec, done: S.done });

function ago(ms) {
  if (!ms) return 'never chatted';
  const m = Math.round((Date.now() - ms) / (30 * 864e5));
  return m < 12 ? `last chat ${m} mo ago` : `last chat ${Math.round(m / 12)} yrs ago`;
}

chrome.storage.local.get(['friends', 'dec', 'done', 'pics'], d => {
  S = { friends: d.friends || [], dec: d.dec || {}, done: d.done || {}, pics: d.pics || {} };
  draw();
});
// the Facebook page ticks friends off and saves photos and links as you browse it
chrome.storage.onChanged.addListener(ch => {
  if (ch.done) S.done = ch.done.newValue || {};
  if (ch.pics) S.pics = ch.pics.newValue || {};
  if (ch.done || ch.pics) draw();
});
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
  S.friends = friends;
  chrome.storage.local.set({ friends });
  draw();
});

function draw() {
  const F = S.friends;
  $('#load').classList.toggle('small', F.length > 0);
  if (!F.length) { $('#main').innerHTML = ''; return; }

  const rem = F.filter(f => S.dec[f.name] === 'remove');
  const keep = {
    all: () => true,
    quiet,
    open: f => !S.dec[f.name],
    remove: f => S.dec[f.name] === 'remove',
  }[view.filter];
  const L = F.filter(keep).sort(view.sort === 'old'
    ? (a, b) => a.since - b.since
    : (a, b) => (a.last || 0) - (b.last || 0));

  const chip = (k, t) => `<button class="chip" data-act="filter" data-k="${k}" aria-pressed="${view.filter === k}">${t}</button>`;
  let h = `<div class="stats">
    <div class="stat"><b>${F.length}</b><span class="muted">Friends</span></div>
    <div class="stat"><b>${F.filter(quiet).length}</b><span class="muted">Quiet 3+ years</span></div>
    <div class="stat"><b>${rem.length}</b><span class="muted">On remove list</span></div>
    <div class="stat"><b>${rem.filter(f => S.done[f.name]).length}</b><span class="muted">Unfriended</span></div>
  </div>
  <div class="tools">
    ${chip('quiet', 'Quiet 3+ years')}${chip('open', 'Not decided')}${chip('remove', 'Remove list')}${chip('all', 'All')}
    <select data-act="sort" aria-label="Sort friends">
      <option value="quiet" ${view.sort === 'quiet' ? 'selected' : ''}>Longest silence first</option>
      <option value="old" ${view.sort === 'old' ? 'selected' : ''}>Oldest friends first</option>
    </select>
  </div>`;

  if (!L.length) {
    h += `<p class="muted empty">${view.filter === 'remove' ? 'Nobody on your remove list yet. Pick Remove on a friend to add them.' : "You've decided on everyone here. Switch to All to see them."}</p>`;
  }
  for (const f of L) {
    const d = S.dec[f.name], done = S.done[f.name], n = esc(f.name), pic = S.pics[f.name];
    const link = pic?.url
      ? `<a class="btn" href="${esc(pic.url)}" target="_blank" rel="noopener">Open profile</a>`
      : `<a class="btn" href="https://www.facebook.com/search/people/?q=${encodeURIComponent(f.name)}" target="_blank" rel="noopener">Find on Facebook</a>`;
    h += `<div class="row ${done ? 'done' : ''}">
      <div class="av" aria-hidden="true">${esc(ini(f.name))}${pic?.img ? `<img src="${esc(pic.img)}" alt="">` : ''}</div>
      <div class="who"><div class="name">${n}</div>
        <div class="muted">Friends since ${new Date(f.since).getFullYear()}, ${ago(f.last)}</div></div>
      <span class="pill ${quiet(f) ? 'quiet' : 'talk'}">${quiet(f) ? 'Quiet' : 'Talking'}</span>
      ${d === 'remove' && view.filter === 'remove'
        ? `<label class="tick"><input type="checkbox" data-act="done" data-n="${n}" ${done ? 'checked' : ''}> Unfriended</label>`
        : ''}
      ${link}
      <button class="dec" data-act="dec" data-d="keep" data-n="${n}" aria-pressed="${d === 'keep'}">Keep</button>
      <button class="dec" data-act="dec" data-d="remove" data-n="${n}" aria-pressed="${d === 'remove'}">Remove</button>
    </div>`;
  }
  if (rem.length) {
    h += `<p class="next">Next: open <b>facebook.com/friends/list</b>. Only your ${rem.length} remove-list friends will show there, so you can unfriend them with Facebook's own button.</p>`;
  }
  $('#main').innerHTML = h;
}

$('#main').addEventListener('click', e => {
  const t = e.target.closest('[data-act]');
  if (!t) return;
  const a = t.dataset.act, n = t.dataset.n;
  if (a === 'filter') view.filter = t.dataset.k;
  else if (a === 'dec') { S.dec[n] = S.dec[n] === t.dataset.d ? undefined : t.dataset.d; save(); }
  else if (a === 'done') { S.done[n] = t.checked; save(); }
  else return;
  draw();
});
$('#main').addEventListener('change', e => {
  if (e.target.dataset.act === 'sort') { view.sort = e.target.value; draw(); }
});
