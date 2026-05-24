import func2url from '../../backend/func2url.json';

const ROOM_URL = func2url.room;
const POKER_URL = func2url.poker;
const CHAT_URL = func2url.chat;

// Session ID — хранится в localStorage
export function getSessionId(): string {
  let sid = localStorage.getItem('royal_session_id');
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    localStorage.setItem('royal_session_id', sid);
  }
  return sid;
}

function headers() {
  return {
    'Content-Type': 'application/json',
    'X-Session-Id': getSessionId(),
  };
}

// Room
export const roomApi = {
  join: (name: string) =>
    fetch(`${ROOM_URL}/join`, { method: 'POST', headers: headers(), body: JSON.stringify({ name }) }).then(r => r.json()),

  leave: () =>
    fetch(`${ROOM_URL}/leave`, { method: 'POST', headers: headers(), body: '{}' }).then(r => r.json()),

  getPlayers: () =>
    fetch(ROOM_URL, { headers: headers() }).then(r => r.json()),
};

// Poker
export const pokerApi = {
  getState: () =>
    fetch(POKER_URL, { headers: headers() }).then(r => r.json()),

  start: () =>
    fetch(`${POKER_URL}/start`, { method: 'POST', headers: headers(), body: '{}' }).then(r => r.json()),

  action: (action: string, amount = 0) =>
    fetch(`${POKER_URL}/action`, { method: 'POST', headers: headers(), body: JSON.stringify({ action, amount }) }).then(r => r.json()),
};

// Chat
export const chatApi = {
  getMessages: (sinceId = 0) =>
    fetch(`${CHAT_URL}?since_id=${sinceId}`, { headers: headers() }).then(r => r.json()),

  send: (text: string) =>
    fetch(CHAT_URL, { method: 'POST', headers: headers(), body: JSON.stringify({ text }) }).then(r => r.json()),
};
