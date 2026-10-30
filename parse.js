// Facebook's export stores UTF-8 text as Latin-1 escapes ("JosÃ©" instead of "José").
function fixText(s) {
  try { return decodeURIComponent(escape(s)); } catch { return s; }
}

// files: [{ path, json }] from the unzipped Facebook download (JSON format).
// Returns [{ name, since, last }] with times in ms; last is null if you never chatted, since is null if Facebook left the date out.
function parseExport(files) {
  const last = {};
  const bump = (name, ms) => {
    name = fixText(name);
    if (!last[name] || ms > last[name]) last[name] = ms;
  };
  let friends = [];
  for (const { path, json } of files) {
    if (/your_friends\.json$/.test(path)) {
      friends = (json.friends_v2 || json.friends || []).map(f => ({ name: fixText(f.name), since: f.timestamp ? f.timestamp * 1000 : null }));
    } else if (/messages\/[^/]+\/[^/]+\/message_\d+\.json$/.test(path)) {
      const msgs = json.messages || [];
      const newest = msgs.reduce((m, x) => Math.max(m, x.timestamp_ms || 0), 0);
      // in a 1-on-1 chat, your own messages count as contact too
      if ((json.participants || []).length === 2) json.participants.forEach(p => bump(p.name, newest));
      msgs.forEach(m => m.sender_name && bump(m.sender_name, m.timestamp_ms));
    }
  }
  return friends.map(f => ({ ...f, last: last[f.name] || null }));
}

if (typeof module !== 'undefined') module.exports = { parseExport, fixText };
