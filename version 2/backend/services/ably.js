const Ably = require('ably');
let rest;
function getClient() {
  if (!process.env.ABLY_API_KEY) throw new Error('Hosted messaging is not configured');
  if (!rest) rest = new Ably.Rest({ key: process.env.ABLY_API_KEY });
  return rest;
}
function userChannel(userId) { return `tasky-v2:user:${userId}`; }
function hostedRealtime() {
  return {
    async publish(participants, event) {
      await Promise.all([...new Set(participants.map(String))].map(id => getClient().channels.get(userChannel(id)).publish('tasky-event', event)));
    },
    disconnect() {}, close() {}
  };
}
async function tokenFor(userId) {
  return getClient().auth.createTokenRequest({
    clientId: String(userId), ttl: 10 * 60 * 1000,
    capability: JSON.stringify({ [userChannel(userId)]: ['subscribe'] })
  });
}
module.exports = { hostedRealtime, tokenFor };
