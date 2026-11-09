chrome.action.onClicked.addListener(() => chrome.tabs.create({ url: 'sorter.html' }));

// Chrome slows timers in tabs you aren't looking at, so the Facebook tab asks here to wait for it instead.
chrome.runtime.onMessage.addListener((m, sender, reply) => {
  // a finished scan closes its Facebook tab and brings you back to the sorter tab that started it
  if (m.close) {
    chrome.storage.local.get('back', d => {
      if (d.back) chrome.tabs.update(d.back, { active: true }).catch(() => {});
      chrome.tabs.remove(sender.tab.id);
    });
    return;
  }
  if (!m.sleep) return;
  setTimeout(reply, m.sleep);
  return true;
});

// Keep the computer from sleeping while friends are waiting to be unfriended.
const awake = queue => queue?.length ? chrome.power.requestKeepAwake('system') : chrome.power.releaseKeepAwake();
chrome.storage.onChanged.addListener(ch => { if (ch.queue) awake(ch.queue.newValue); });
chrome.storage.local.get('queue', d => awake(d.queue));
