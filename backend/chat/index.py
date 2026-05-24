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

def handler(event: dict, context) -> dict:
    """Чат: GET получить сообщения, POST отправить."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    session_id = (event.get('headers') or {}).get('x-session-id', '')
    conn = get_conn()
    cur = conn.cursor()

    try:
        if method == 'GET':
            params = event.get('queryStringParameters') or {}
            since_id = int(params.get('since_id') or 0)

            cur.execute(f"""
                SELECT id, player_name, text, type, created_at
                FROM {SCHEMA}.chat_messages
                WHERE room_id = 1 AND id > %s
                ORDER BY id ASC LIMIT 60
            """, (since_id,))
            rows = cur.fetchall()
            messages = [{
                'id': r[0], 'author': r[1], 'text': r[2],
                'type': r[3], 'time': r[4].strftime('%H:%M'),
            } for r in rows]
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'messages': messages}, ensure_ascii=False)}

        if method == 'POST':
            body = json.loads(event.get('body') or '{}')
            text = (body.get('text') or '').strip()[:500]
            if not text:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Пустое сообщение'})}

            player_name = 'Игрок'
            if session_id:
                cur.execute(f"SELECT name FROM {SCHEMA}.players WHERE session_id = %s AND is_online = true", (session_id,))
                row = cur.fetchone()
                if row:
                    player_name = row[0]

            cur.execute(f"""
                INSERT INTO {SCHEMA}.chat_messages (room_id, player_name, text, type)
                VALUES (1, %s, %s, 'user') RETURNING id, created_at
            """, (player_name, text))
            row = cur.fetchone()
            conn.commit()
            return {'statusCode': 200, 'headers': CORS,
                    'body': json.dumps({'id': row[0], 'time': row[1].strftime('%H:%M'), 'ok': True})}

        return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Not found'})}

    finally:
        cur.close()
        conn.close()
