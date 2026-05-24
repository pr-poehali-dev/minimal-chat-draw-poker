import json
import os
import hashlib
import secrets
import psycopg2

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 't_p15559615_minimal_chat_draw_po')

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Id',
}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def gen_session() -> str:
    return secrets.token_hex(24)

def ok(data: dict) -> dict:
    return {'statusCode': 200, 'headers': CORS, 'body': json.dumps(data, ensure_ascii=False)}

def err(msg: str, code: int = 400) -> dict:
    return {'statusCode': code, 'headers': CORS, 'body': json.dumps({'error': msg}, ensure_ascii=False)}

def handler(event: dict, context) -> dict:
    """Регистрация и вход. action: register | login | me"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    session_id = (event.get('headers') or {}).get('x-session-id', '')
    conn = get_conn()
    cur = conn.cursor()

    try:
        # GET — получить текущего пользователя по сессии
        if method == 'GET':
            if not session_id:
                return ok({'user': None})
            cur.execute(f"""
                SELECT p.id, u.username, p.chips, p.at_table, p.session_id
                FROM {SCHEMA}.players p
                JOIN {SCHEMA}.users u ON u.id = p.user_id
                WHERE p.session_id = %s AND p.is_online = true
                  AND p.last_seen > NOW() - INTERVAL '2 minutes'
            """, (session_id,))
            row = cur.fetchone()
            if not row:
                return ok({'user': None})
            # Обновить last_seen
            cur.execute(f"UPDATE {SCHEMA}.players SET last_seen = NOW() WHERE session_id = %s", (session_id,))
            conn.commit()
            return ok({'user': {'id': row[0], 'username': row[1], 'chips': row[2], 'at_table': row[3], 'session_id': row[4]}})

        body = json.loads(event.get('body') or '{}')
        action = body.get('action', '')

        # REGISTER
        if action == 'register':
            username = (body.get('username') or '').strip()[:30]
            password = (body.get('password') or '').strip()
            if len(username) < 2:
                return err('Никнейм слишком короткий (мин. 2 символа)')
            if len(password) < 4:
                return err('Пароль слишком короткий (мин. 4 символа)')

            # Проверить уникальность
            cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE username = %s", (username,))
            if cur.fetchone():
                return err('Этот никнейм уже занят')

            pw_hash = hash_password(password)
            cur.execute(f"""
                INSERT INTO {SCHEMA}.users (username, password_hash)
                VALUES (%s, %s) RETURNING id, chips
            """, (username, pw_hash))
            user_row = cur.fetchone()
            user_id, chips = user_row

            session = gen_session()
            cur.execute(f"""
                INSERT INTO {SCHEMA}.players (session_id, name, room_id, user_id, is_online, last_seen)
                VALUES (%s, %s, 1, %s, true, NOW())
                RETURNING id
            """, (session, username, user_id))
            player_id = cur.fetchone()[0]

            cur.execute(f"""
                INSERT INTO {SCHEMA}.chat_messages (room_id, player_name, text, type)
                VALUES (1, 'Система', %s, 'system')
            """, (f'{username} присоединился к комнате',))
            conn.commit()

            return ok({'user': {'id': player_id, 'username': username, 'chips': chips, 'at_table': False, 'session_id': session}})

        # LOGIN
        if action == 'login':
            username = (body.get('username') or '').strip()
            password = (body.get('password') or '').strip()
            pw_hash = hash_password(password)

            cur.execute(f"SELECT id, chips FROM {SCHEMA}.users WHERE username = %s AND password_hash = %s", (username, pw_hash))
            user_row = cur.fetchone()
            if not user_row:
                return err('Неверный никнейм или пароль')

            user_id, chips = user_row
            session = gen_session()

            # Обновить или создать запись игрока
            cur.execute(f"""
                INSERT INTO {SCHEMA}.players (session_id, name, room_id, user_id, is_online, last_seen)
                VALUES (%s, %s, 1, %s, true, NOW())
                ON CONFLICT (session_id) DO UPDATE
                  SET is_online = true, last_seen = NOW(), room_id = 1
                RETURNING id, at_table
            """, (session, username, user_id))
            p_row = cur.fetchone()
            player_id, at_table = p_row[0], p_row[1]

            cur.execute(f"""
                INSERT INTO {SCHEMA}.chat_messages (room_id, player_name, text, type)
                VALUES (1, 'Система', %s, 'system')
            """, (f'{username} вошёл в комнату',))
            conn.commit()

            return ok({'user': {'id': player_id, 'username': username, 'chips': chips, 'at_table': bool(at_table), 'session_id': session}})

        # LOGOUT
        if action == 'logout':
            if session_id:
                cur.execute(f"""
                    UPDATE {SCHEMA}.players SET is_online = false, at_table = false, last_seen = NOW()
                    WHERE session_id = %s RETURNING name
                """, (session_id,))
                row = cur.fetchone()
                if row:
                    cur.execute(f"""
                        INSERT INTO {SCHEMA}.chat_messages (room_id, player_name, text, type)
                        VALUES (1, 'Система', %s, 'system')
                    """, (f'{row[0]} покинул комнату',))
                conn.commit()
            return ok({'ok': True})

        return err('Неизвестное действие')

    finally:
        cur.close()
        conn.close()
