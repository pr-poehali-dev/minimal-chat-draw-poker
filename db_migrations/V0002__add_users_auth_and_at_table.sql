
-- Таблица пользователей с паролем (отдельная регистрация)
CREATE TABLE t_p15559615_minimal_chat_draw_po.users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(30) UNIQUE NOT NULL,
  password_hash VARCHAR(128) NOT NULL,
  chips INTEGER NOT NULL DEFAULT 1500,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Добавить user_id и at_table в players
ALTER TABLE t_p15559615_minimal_chat_draw_po.players
  ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES t_p15559615_minimal_chat_draw_po.users(id),
  ADD COLUMN IF NOT EXISTS at_table BOOLEAN DEFAULT false;

-- Индекс
CREATE INDEX idx_users_username ON t_p15559615_minimal_chat_draw_po.users(username);
