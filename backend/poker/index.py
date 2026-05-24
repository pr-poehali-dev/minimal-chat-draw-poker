import json
import os
import random
import psycopg2

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 't_p15559615_minimal_chat_draw_po')

SUITS = ['♠', '♥', '♦', '♣']
VALUES = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2']

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Id',
}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def make_deck():
    deck = [{'suit': s, 'value': v} for s in SUITS for v in VALUES]
    random.shuffle(deck)
    return deck

def get_player_id(cur, session_id):
    if not session_id:
        return None
    cur.execute(f"SELECT id, name FROM {SCHEMA}.players WHERE session_id = %s", (session_id,))
    row = cur.fetchone()
    return (row[0], row[1]) if row else (None, None)

def handler(event: dict, context) -> dict:
    """Покер: получить состояние игры, начать раздачу, сделать ход."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')
    session_id = event.get('headers', {}).get('x-session-id') or event.get('headers', {}).get('X-Session-Id', '')
    conn = get_conn()
    cur = conn.cursor()

    try:
        # GET / — текущее состояние
        if method == 'GET':
            cur.execute(f"""
                SELECT g.id, g.phase, g.pot, g.community_cards, g.current_player_id, g.small_blind, g.big_blind
                FROM {SCHEMA}.poker_games g
                WHERE g.room_id = 1
                ORDER BY g.id DESC LIMIT 1
            """)
            game = cur.fetchone()

            if not game:
                return {'statusCode': 200, 'headers': CORS,
                        'body': json.dumps({'phase': 'waiting', 'pot': 0, 'community_cards': [], 'seats': [], 'actions': []})}

            game_id = game[0]

            # Места за столом
            cur.execute(f"""
                SELECT ps.seat_index, ps.player_id, p.name, p.chips, ps.bet, ps.total_bet, ps.status, ps.hole_cards
                FROM {SCHEMA}.poker_seats ps
                JOIN {SCHEMA}.players p ON p.id = ps.player_id
                WHERE ps.game_id = %s
                ORDER BY ps.seat_index
            """, (game_id,))
            seats_rows = cur.fetchall()
            seats = [{
                'seat_index': r[0], 'player_id': r[1], 'name': r[2],
                'chips': r[3], 'bet': r[4], 'total_bet': r[5], 'status': r[6],
                'hole_cards': r[7] if r[7] else []
            } for r in seats_rows]

            # Скрываем карты чужих игроков
            player_id_me = None
            if session_id:
                cur.execute(f"SELECT id FROM {SCHEMA}.players WHERE session_id = %s", (session_id,))
                row = cur.fetchone()
                if row:
                    player_id_me = row[0]

            for seat in seats:
                if seat['player_id'] != player_id_me:
                    seat['hole_cards'] = [{'faceUp': False} for _ in seat['hole_cards']]

            # История действий
            cur.execute(f"""
                SELECT player_name, action, amount, phase, created_at
                FROM {SCHEMA}.poker_actions
                WHERE game_id = %s
                ORDER BY id DESC LIMIT 20
            """, (game_id,))
            actions = [{'player': r[0], 'action': r[1], 'amount': r[2], 'phase': r[3],
                        'time': r[4].strftime('%H:%M')} for r in cur.fetchall()]

            community = game[3] if game[3] else []
            revealed = [c for c in community if c.get('faceUp')]

            return {
                'statusCode': 200,
                'headers': CORS,
                'body': json.dumps({
                    'game_id': game_id,
                    'phase': game[1],
                    'pot': game[2],
                    'community_cards': community,
                    'current_player_id': game[4],
                    'small_blind': game[5],
                    'big_blind': game[6],
                    'seats': seats,
                    'actions': actions,
                })
            }

        # POST /start — начать новую раздачу
        if method == 'POST' and '/start' in path:
            pid, pname = get_player_id(cur, session_id)
            if not pid:
                return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Нужно войти в комнату'})}

            # Игроки онлайн в комнате
            cur.execute(f"""
                SELECT id, name FROM {SCHEMA}.players
                WHERE room_id = 1 AND is_online = true
                  AND last_seen > NOW() - INTERVAL '2 minutes'
                ORDER BY joined_at LIMIT 6
            """)
            online = cur.fetchall()
            if len(online) < 2:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Нужно минимум 2 игрока'})}

            deck = make_deck()

            # Создать игру
            cur.execute(f"""
                INSERT INTO {SCHEMA}.poker_games (room_id, phase, pot, deck, community_cards, small_blind, big_blind, started_at)
                VALUES (1, 'preflop', 0, %s, %s, 50, 100, NOW())
                RETURNING id
            """, (json.dumps(deck[len(online)*2:]), json.dumps([
                {'suit': '?', 'value': '?', 'faceUp': False},
                {'suit': '?', 'value': '?', 'faceUp': False},
                {'suit': '?', 'value': '?', 'faceUp': False},
                {'suit': '?', 'value': '?', 'faceUp': False},
                {'suit': '?', 'value': '?', 'faceUp': False},
            ])))
            game_id = cur.fetchone()[0]

            # Раздать карты и занять места
            for i, (oid, oname) in enumerate(online):
                hole = [deck[i*2], deck[i*2+1]]
                for c in hole:
                    c['faceUp'] = True
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.poker_seats (game_id, player_id, seat_index, hole_cards, status)
                    VALUES (%s, %s, %s, %s, 'active')
                """, (game_id, oid, i, json.dumps(hole)))

            conn.commit()

            # Сообщение в чат
            cur.execute(f"""
                INSERT INTO {SCHEMA}.chat_messages (room_id, player_name, text, type)
                VALUES (1, 'Система', 'Новая раздача началась! Удачи!', 'system')
            """)
            conn.commit()

            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'game_id': game_id, 'ok': True})}

        # POST /action — сделать ход
        if method == 'POST' and '/action' in path:
            pid, pname = get_player_id(cur, session_id)
            if not pid:
                return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Нужно войти в комнату'})}

            body = json.loads(event.get('body') or '{}')
            action = body.get('action')  # fold, call, raise, check
            amount = int(body.get('amount') or 0)

            # Текущая игра
            cur.execute(f"""
                SELECT id, phase, pot FROM {SCHEMA}.poker_games
                WHERE room_id = 1 ORDER BY id DESC LIMIT 1
            """)
            game = cur.fetchone()
            if not game:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Игра не найдена'})}

            game_id, phase, pot = game

            # Записать действие
            cur.execute(f"""
                INSERT INTO {SCHEMA}.poker_actions (game_id, player_id, player_name, action, amount, phase)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (game_id, pid, pname, action, amount, phase))

            # Обновить ставку и статус игрока
            if action == 'fold':
                cur.execute(f"""
                    UPDATE {SCHEMA}.poker_seats SET status = 'folded'
                    WHERE game_id = %s AND player_id = %s
                """, (game_id, pid))
            elif action in ('call', 'raise'):
                cur.execute(f"""
                    UPDATE {SCHEMA}.poker_seats
                    SET bet = bet + %s, total_bet = total_bet + %s
                    WHERE game_id = %s AND player_id = %s
                """, (amount, amount, game_id, pid))
                cur.execute(f"""
                    UPDATE {SCHEMA}.poker_games SET pot = pot + %s WHERE id = %s
                """, (amount, game_id))
                # Списать фишки у игрока
                cur.execute(f"""
                    UPDATE {SCHEMA}.players SET chips = chips - %s WHERE id = %s
                """, (amount, pid))

            conn.commit()

            # Чат: сообщение о ходе
            action_text = {'fold': 'сбросил карты', 'call': f'уравнял {amount}₽', 'raise': f'поднял до {amount}₽', 'check': 'чекнул'}.get(action, action)
            cur.execute(f"""
                INSERT INTO {SCHEMA}.chat_messages (room_id, player_name, text, type)
                VALUES (1, 'Система', %s, 'system')
            """, (f'{pname} {action_text}',))
            conn.commit()

            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Not found'})}

    finally:
        cur.close()
        conn.close()
