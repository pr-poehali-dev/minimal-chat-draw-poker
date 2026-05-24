import func2url from '../../backend/func2url.json';

const AUTH_URL = (func2url as Record<string, string>).auth;
const ROOM_URL = func2url.room;
const POKER_URL = func2url.poker;
const CHAT_URL = func2url.chat;

export function getSessionId(): string {
  return localStorage.getItem('royal_session_id') || '';
}

export function setSessionId(sid: string) {
  localStorage.setItem('royal_session_id', sid);
}

export function clearSession() {
  localStorage.removeItem('royal_session_id');
}

function headers() {
  return {
    'Content-Type': 'application/json',
    'X-Session-Id': getSessionId(),
  };
}

// Auth
export const authApi = {
  me: () =>
    fetch(AUTH_URL, { headers: headers() }).then(r => r.json()),

  register: (username: string, password: string) =>
    fetch(AUTH_URL, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ action: 'register', username, password }),
    }).then(r => r.json()),

  login: (username: string, password: string) =>
    fetch(AUTH_URL, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ action: 'login', username, password }),
    }).then(r => r.json()),

  logout: () =>
    fetch(AUTH_URL, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ action: 'logout' }),
    }).then(r => r.json()),
};

// Room
export const roomApi = {
  getPlayers: () =>
    fetch(ROOM_URL, { headers: headers() }).then(r => r.json()),

  ping: () =>
    fetch(ROOM_URL, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ action: 'ping' }),
    }).then(r => r.json()),

  sit: () =>
    fetch(ROOM_URL, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ action: 'sit' }),
    }).then(r => r.json()),

  stand: () =>
    fetch(ROOM_URL, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ action: 'stand' }),
    }).then(r => r.json()),
};

// Poker
export const pokerApi = {
  getState: () =>
    fetch(POKER_URL, { headers: headers() }).then(r => r.json()),

  start: () =>
    fetch(POKER_URL, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ action: 'start' }),
    }).then(r => r.json()),

  action: (action: string, amount = 0) =>
    fetch(POKER_URL, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ action, amount }),
    }).then(r => r.json()),
};

// Chat
export const chatApi = {
  getMessages: (sinceId = 0) =>
    fetch(`${CHAT_URL}?since_id=${sinceId}`, { headers: headers() }).then(r => r.json()),

  send: (text: string) =>
    fetch(CHAT_URL, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ text }),
    }).then(r => r.json()),
};
