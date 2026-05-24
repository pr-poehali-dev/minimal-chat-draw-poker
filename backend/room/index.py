import json
import os
import psycopg2

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 't_p15559615_minimal_chat_draw_po')

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Id',
}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def ok(data: dict) -> dict:
    return {'statusCode': 200, 'headers': CORS, 'body': json.dumps(data, ensure_ascii=False)}

def err(msg: str, code: int = 400) -> dict:
    return {'statusCode': code, 'headers': CORS, 'body': json.dumps({'error': msg}, ensure_ascii=False)}

def handler(event: dict, context) -> dict:
    """Комната: список игроков онлайн, сесть/встать за стол, кик по неактиву.
    POST action: sit | stand | ping
    GET: список игроков + автокик неактивных
    """
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    session_id = (event.get('headers') or {}).get('x-session-id', '')
    conn = get_conn()
    cur = conn.cursor()

    try:
        # Автокик неактивных (> 2 минут без ping)
        cur.execute(f"""
            UPDATE {SCHEMA}.players
            SET is_online = false, at_table = false
            WHERE is_online = true
              AND last_seen < NOW() - INTERVAL '2 minutes'
            RETURNING name
        """)
        kicked = cur.fetchall()
        for (kname,) in kicked:
            cur.execute(f"""
                INSERT INTO {SCHEMA}.chat_messages (room_id, player_name, text, type)
                VALUES (1, 'Система', %s, 'system')
            """, (f'{kname} отключился по неактивности',))
        if kicked:
            conn.commit()

        if method == 'GET':
            # Список онлайн-игроков
            cur.execute(f"""
                SELECT p.id, p.name, u.chips, p.at_table
                FROM {SCHEMA}.players p
                JOIN {SCHEMA}.users u ON u.id = p.user_id
                WHERE p.room_id = 1 AND p.is_online = true
                  AND p.last_seen > NOW() - INTERVAL '2 minutes'
                ORDER BY p.last_seen DESC
                LIMIT 20
            """)
            rows = cur.fetchall()
            players = [{'id': r[0], 'name': r[1], 'chips': r[2], 'at_table': bool(r[3])} for r in rows]

            # Обновить last_seen
            if session_id:
                cur.execute(f"""
                    UPDATE {SCHEMA}.players SET last_seen = NOW()
                    WHERE session_id = %s AND is_online = true
                """, (session_id,))
                conn.commit()

            return ok({'players': players})

        body = json.loads(event.get('body') or '{}')
        action = body.get('action', '')

        if not session_id:
            return err('Требуется авторизация', 401)

        # Найти игрока
        cur.execute(f"""
            SELECT p.id, p.name, p.at_table
            FROM {SCHEMA}.players p
            WHERE p.session_id = %s AND p.is_online = true
        """, (session_id,))
        player = cur.fetchone()
        if not player:
            return err('Игрок не найден', 403)

        player_id, player_name, at_table = player

        # PING — обновить активность
        if action == 'ping':
            cur.execute(f"""
                UPDATE {SCHEMA}.players SET last_seen = NOW()
                WHERE session_id = %s
            """, (session_id,))
            conn.commit()
            return ok({'ok': True})

        # SIT — сесть за покерный стол
        if action == 'sit':
            cur.execute(f"""
                UPDATE {SCHEMA}.players SET at_table = true
                WHERE session_id = %s
            """, (session_id,))
            cur.execute(f"""
                INSERT INTO {SCHEMA}.chat_messages (room_id, player_name, text, type)
                VALUES (1, 'Система', %s, 'system')
            """, (f'{player_name} сел за покерный стол',))
            conn.commit()
            return ok({'ok': True, 'at_table': True})

        # STAND — встать из-за стола
        if action == 'stand':
            cur.execute(f"""
                UPDATE {SCHEMA}.players SET at_table = false
                WHERE session_id = %s
            """, (session_id,))
            cur.execute(f"""
                INSERT INTO {SCHEMA}.chat_messages (room_id, player_name, text, type)
                VALUES (1, 'Система', %s, 'system')
            """, (f'{player_name} встал из-за стола',))
            conn.commit()
            return ok({'ok': True, 'at_table': False})

        return err('Неизвестное действие')

    finally:
        cur.close()
        conn.close()
