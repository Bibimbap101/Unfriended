// Run with: node parse.test.js
const assert = require('assert');
const { parseExport, fixText } = require('./parse.js');

assert.strictEqual(fixText('JosÃ©'), 'José');

const out = parseExport([
  { path: 'fb/connections/friends/your_friends.json',
    json: { friends_v2: [{ name: 'Ana', timestamp: 1300000000 }, { name: 'Ben', timestamp: 1200000000 }] } },
  { path: 'fb/your_facebook_activity/messages/inbox/ana_1/message_1.json',
    json: { participants: [{ name: 'Ana' }, { name: 'Me' }],
            messages: [{ sender_name: 'Me', timestamp_ms: 5 }, { sender_name: 'Ana', timestamp_ms: 3 }] } },
  { path: 'fb/your_facebook_activity/messages/inbox/group_2/message_1.json',
    json: { participants: [{ name: 'Ana' }, { name: 'Ben' }, { name: 'Me' }],
            messages: [{ sender_name: 'Me', timestamp_ms: 9 }] } },
]);

// Ana's last contact is your message in your 1-on-1 chat; Ben never chatted (your group message doesn't count for him).
assert.deepStrictEqual(out, [
  { name: 'Ana', since: 1300000000000, last: 5 },
  { name: 'Ben', since: 1200000000000, last: null },
]);
console.log('ok');
