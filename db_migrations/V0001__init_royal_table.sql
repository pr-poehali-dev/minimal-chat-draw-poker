
-- Игроки (сессии без регистрации)
CREATE TABLE t_p15559615_minimal_chat_draw_po.players (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(64) UNIQUE NOT NULL,
  name VARCHAR(50) NOT NULL,
  chips INTEGER NOT NULL DEFAULT 1500,
  room_id INTEGER,
  is_online BOOLEAN DEFAULT true,
  joined_at TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW()
);

-- Комнаты
CREATE TABLE t_p15559615_minimal_chat_draw_po.rooms (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL DEFAULT 'Royal Table',
  max_players INTEGER DEFAULT 6,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO t_p15559615_minimal_chat_draw_po.rooms (name) VALUES ('Royal Table #1');

-- Покер-игры
CREATE TABLE t_p15559615_minimal_chat_draw_po.poker_games (
  id SERIAL PRIMARY KEY,
  room_id INTEGER REFERENCES t_p15559615_minimal_chat_draw_po.rooms(id),
  phase VARCHAR(20) DEFAULT 'waiting',  -- waiting, preflop, flop, turn, river, showdown
  pot INTEGER DEFAULT 0,
  community_cards JSONB DEFAULT '[]',
  deck JSONB DEFAULT '[]',
  current_player_id INTEGER,
  dealer_id INTEGER,
  small_blind INTEGER DEFAULT 50,
  big_blind INTEGER DEFAULT 100,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Позиции игроков за покер-столом
CREATE TABLE t_p15559615_minimal_chat_draw_po.poker_seats (
  id SERIAL PRIMARY KEY,
  game_id INTEGER REFERENCES t_p15559615_minimal_chat_draw_po.poker_games(id),
  player_id INTEGER REFERENCES t_p15559615_minimal_chat_draw_po.players(id),
  seat_index INTEGER NOT NULL,
  hole_cards JSONB DEFAULT '[]',
  bet INTEGER DEFAULT 0,
  total_bet INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'waiting', -- waiting, active, folded, allIn, winner
  UNIQUE(game_id, seat_index)
);

-- История ходов покера
CREATE TABLE t_p15559615_minimal_chat_draw_po.poker_actions (
  id SERIAL PRIMARY KEY,
  game_id INTEGER REFERENCES t_p15559615_minimal_chat_draw_po.poker_games(id),
  player_id INTEGER REFERENCES t_p15559615_minimal_chat_draw_po.players(id),
  player_name VARCHAR(50),
  action VARCHAR(20) NOT NULL, -- fold, call, raise, check, allIn
  amount INTEGER DEFAULT 0,
  phase VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Сообщения чата
CREATE TABLE t_p15559615_minimal_chat_draw_po.chat_messages (
  id SERIAL PRIMARY KEY,
  room_id INTEGER REFERENCES t_p15559615_minimal_chat_draw_po.rooms(id),
  player_id INTEGER,
  player_name VARCHAR(50) NOT NULL,
  text TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'user', -- user, system
  created_at TIMESTAMP DEFAULT NOW()
);

-- Данные холста (последнее состояние)
CREATE TABLE t_p15559615_minimal_chat_draw_po.canvas_state (
  id SERIAL PRIMARY KEY,
  room_id INTEGER REFERENCES t_p15559615_minimal_chat_draw_po.rooms(id) UNIQUE,
  layers JSONB DEFAULT '[]',
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO t_p15559615_minimal_chat_draw_po.canvas_state (room_id, layers)
VALUES (1, '[]');

-- Индексы
CREATE INDEX idx_players_session ON t_p15559615_minimal_chat_draw_po.players(session_id);
CREATE INDEX idx_players_room ON t_p15559615_minimal_chat_draw_po.players(room_id);
CREATE INDEX idx_chat_room ON t_p15559615_minimal_chat_draw_po.chat_messages(room_id);
CREATE INDEX idx_chat_created ON t_p15559615_minimal_chat_draw_po.chat_messages(created_at);
CREATE INDEX idx_poker_actions_game ON t_p15559615_minimal_chat_draw_po.poker_actions(game_id);
CREATE INDEX idx_poker_seats_game ON t_p15559615_minimal_chat_draw_po.poker_seats(game_id);
