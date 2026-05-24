import json
import os
import random
import string
import psycopg2

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 't_p15559615_minimal_chat_draw_po')

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def gen_session():
    return ''.join(random.choices(string.ascii_letters + string.digits, k=32))

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Id',
}

def handler(event: dict, context) -> dict:
    """Управление комнатой: вход, список игроков, выход."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')
    session_id = event.get('headers', {}).get('x-session-id') or event.get('headers', {}).get('X-Session-Id', '')
    conn = get_conn()
    cur = conn.cursor()

    try:
        # POST /join — войти в комнату
        if method == 'POST' and '/join' in path:
            body = json.loads(event.get('body') or '{}')
            name = (body.get('name') or 'Игрок').strip()[:50]
            if not name:
                name = 'Игрок'

            if not session_id:
                session_id = gen_session()

            cur.execute(f"""
                INSERT INTO {SCHEMA}.players (session_id, name, room_id)
                VALUES (%s, %s, 1)
                ON CONFLICT (session_id) DO UPDATE
                SET name = EXCLUDED.name, room_id = 1, is_online = true, last_seen = NOW()
                RETURNING id, session_id, name, chips
            """, (session_id, name))
            row = cur.fetchone()
            conn.commit()

            # Системное сообщение в чат
            cur.execute(f"""
                INSERT INTO {SCHEMA}.chat_messages (room_id, player_name, text, type)
                VALUES (1, 'Система', %s, 'system')
            """, (f'{name} вошёл в комнату',))
            conn.commit()

            return {
                'statusCode': 200,
                'headers': CORS,
                'body': json.dumps({
                    'player_id': row[0],
                    'session_id': row[1],
                    'name': row[2],
                    'chips': row[3],
                })
            }

        # POST /leave — покинуть комнату
        if method == 'POST' and '/leave' in path:
            if session_id:
                cur.execute(f"""
                    UPDATE {SCHEMA}.players SET is_online = false, room_id = NULL
                    WHERE session_id = %s RETURNING name
                """, (session_id,))
                row = cur.fetchone()
                if row:
                    cur.execute(f"""
                        INSERT INTO {SCHEMA}.chat_messages (room_id, player_name, text, type)
                        VALUES (1, 'Система', %s, 'system')
                    """, (f'{row[0]} покинул комнату',))
                conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        # GET / — список игроков онлайн
        cur.execute(f"""
            SELECT id, name, chips, is_online, last_seen
            FROM {SCHEMA}.players
            WHERE room_id = 1 AND is_online = true
              AND last_seen > NOW() - INTERVAL '2 minutes'
            ORDER BY joined_at
            LIMIT 6
        """)
        rows = cur.fetchall()
        players = [{'id': r[0], 'name': r[1], 'chips': r[2], 'online': r[3]} for r in rows]

        # Обновить last_seen
        if session_id:
            cur.execute(f"UPDATE {SCHEMA}.players SET last_seen = NOW() WHERE session_id = %s", (session_id,))
            conn.commit()

        return {
            'statusCode': 200,
            'headers': CORS,
            'body': json.dumps({'players': players, 'room_id': 1})
        }

    finally:
        cur.close()
        conn.close()
