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

def ok(data: dict) -> dict:
    return {'statusCode': 200, 'headers': CORS, 'body': json.dumps(data, ensure_ascii=False)}

def err(msg: str, code: int = 400) -> dict:
    return {'statusCode': code, 'headers': CORS, 'body': json.dumps({'error': msg}, ensure_ascii=False)}

def get_player(cur, session_id):
    if not session_id:
        return None, None
    cur.execute(f"""
        SELECT p.id, p.name FROM {SCHEMA}.players p
        WHERE p.session_id = %s AND p.is_online = true
    """, (session_id,))
    row = cur.fetchone()
    return (row[0], row[1]) if row else (None, None)

def handler(event: dict, context) -> dict:
    """Покер: state (GET), action (POST): start | fold | call | raise | check"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    session_id = (event.get('headers') or {}).get('x-session-id', '')
    conn = get_conn()
    cur = conn.cursor()

    try:
        # GET — текущее состояние игры
        if method == 'GET':
            cur.execute(f"""
                SELECT id, phase, pot, community_cards, current_player_id, small_blind, big_blind
                FROM {SCHEMA}.poker_games
                WHERE room_id = 1
                ORDER BY id DESC LIMIT 1
            """)
            game = cur.fetchone()

            if not game:
                return ok({'phase': 'waiting', 'pot': 0, 'community_cards': [], 'seats': [], 'actions': []})

            game_id = game[0]

            # Места
            cur.execute(f"""
                SELECT ps.seat_index, ps.player_id, p.name, u.chips,
                       ps.bet, ps.total_bet, ps.status, ps.hole_cards
                FROM {SCHEMA}.poker_seats ps
                JOIN {SCHEMA}.players p ON p.id = ps.player_id
                JOIN {SCHEMA}.users u ON u.id = p.user_id
                WHERE ps.game_id = %s
                ORDER BY ps.seat_index
            """, (game_id,))
            seats_rows = cur.fetchall()

            # ID текущего игрока по сессии
            my_player_id = None
            if session_id:
                cur.execute(f"SELECT id FROM {SCHEMA}.players WHERE session_id = %s", (session_id,))
                row = cur.fetchone()
                if row:
                    my_player_id = row[0]

            seats = []
            for r in seats_rows:
                cards = r[7] if r[7] else []
                # Скрыть карты чужих
                if r[1] != my_player_id:
                    cards = [{'faceUp': False} for _ in cards]
                seats.append({
                    'seat_index': r[0], 'player_id': r[1], 'name': r[2],
                    'chips': r[3], 'bet': r[4], 'total_bet': r[5],
                    'status': r[6], 'hole_cards': cards
                })

            # История
            cur.execute(f"""
                SELECT player_name, action, amount, phase, created_at
                FROM {SCHEMA}.poker_actions
                WHERE game_id = %s
                ORDER BY id DESC LIMIT 30
            """, (game_id,))
            actions = [{'player': r[0], 'action': r[1], 'amount': r[2],
                        'phase': r[3], 'time': r[4].strftime('%H:%M')} for r in cur.fetchall()]

            return ok({
                'game_id': game_id,
                'phase': game[1],
                'pot': game[2],
                'community_cards': game[3] or [],
                'current_player_id': game[4],
                'small_blind': game[5],
                'big_blind': game[6],
                'seats': seats,
                'actions': actions,
            })

        # POST
        body = json.loads(event.get('body') or '{}')
        action = body.get('action', '')
        pid, pname = get_player(cur, session_id)

        if not pid:
            return err('Требуется авторизация', 401)

        # START — начать новую раздачу
        if action == 'start':
            # Игроки за столом
            cur.execute(f"""
                SELECT p.id, p.name FROM {SCHEMA}.players p
                WHERE p.room_id = 1 AND p.is_online = true AND p.at_table = true
                  AND p.last_seen > NOW() - INTERVAL '2 minutes'
                ORDER BY p.joined_at LIMIT 6
            """)
            table_players = cur.fetchall()
            if len(table_players) < 2:
                return err('За столом нужно минимум 2 игрока. Нажмите "Сесть за стол".')

            deck = make_deck()
            n = len(table_players)
            community = [
                {'suit': deck[n*2+i]['suit'], 'value': deck[n*2+i]['value'], 'faceUp': i < 3}
                for i in range(5)
            ]

            cur.execute(f"""
                INSERT INTO {SCHEMA}.poker_games
                  (room_id, phase, pot, deck, community_cards, small_blind, big_blind, started_at)
                VALUES (1, 'preflop', 0, %s, %s, 50, 100, NOW())
                RETURNING id
            """, (json.dumps(deck[n*2+5:]), json.dumps(community)))
            game_id = cur.fetchone()[0]

            for i, (oid, oname) in enumerate(table_players):
                hole = [
                    {'suit': deck[i*2]['suit'], 'value': deck[i*2]['value'], 'faceUp': True},
                    {'suit': deck[i*2+1]['suit'], 'value': deck[i*2+1]['value'], 'faceUp': True},
                ]
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.poker_seats
                      (game_id, player_id, seat_index, hole_cards, status)
                    VALUES (%s, %s, %s, %s, 'active')
                """, (game_id, oid, i, json.dumps(hole)))

            cur.execute(f"""
                INSERT INTO {SCHEMA}.chat_messages (room_id, player_name, text, type)
                VALUES (1, 'Система', 'Новая раздача началась! Удачи!', 'system')
            """)
            conn.commit()
            return ok({'game_id': game_id, 'ok': True})

        # FOLD / CALL / RAISE / CHECK
        if action in ('fold', 'call', 'raise', 'check'):
            amount = int(body.get('amount') or 0)

            cur.execute(f"""
                SELECT id, phase, pot FROM {SCHEMA}.poker_games
                WHERE room_id = 1 ORDER BY id DESC LIMIT 1
            """)
            game = cur.fetchone()
            if not game:
                return err('Игра не найдена')
            game_id, phase, pot = game

            cur.execute(f"""
                INSERT INTO {SCHEMA}.poker_actions
                  (game_id, player_id, player_name, action, amount, phase)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (game_id, pid, pname, action, amount, phase))

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
                cur.execute(f"""
                    UPDATE {SCHEMA}.users SET chips = chips - %s
                    WHERE id = (SELECT user_id FROM {SCHEMA}.players WHERE id = %s)
                """, (amount, pid))

            labels = {'fold': 'сбросил карты', 'call': f'уравнял {amount}₽', 'raise': f'поднял до {amount}₽', 'check': 'чекнул'}
            cur.execute(f"""
                INSERT INTO {SCHEMA}.chat_messages (room_id, player_name, text, type)
                VALUES (1, 'Система', %s, 'system')
            """, (f'{pname} {labels[action]}',))
            conn.commit()
            return ok({'ok': True})

        return err('Неизвестное действие')

    finally:
        cur.close()
        conn.close()
