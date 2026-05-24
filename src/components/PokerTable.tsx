import { useState, useEffect, useCallback, useRef } from 'react';
import Icon from '@/components/ui/icon';
import { pokerApi } from '@/lib/api';

interface Card {
  suit?: string;
  value?: string;
  faceUp?: boolean;
}

interface Seat {
  seat_index: number;
  player_id: number;
  name: string;
  chips: number;
  bet: number;
  status: string;
  hole_cards: Card[];
}

interface PokerAction {
  player: string;
  action: string;
  amount: number;
  phase: string;
  time: string;
}

interface GameState {
  game_id?: number;
  phase: string;
  pot: number;
  community_cards: Card[];
  current_player_id?: number;
  seats: Seat[];
  actions: PokerAction[];
}

interface PokerTableProps {
  myId: number | null;
  joined: boolean;
  atTable: boolean;
  onSit: () => Promise<void>;
  onStand: () => Promise<void>;
}

const SEAT_POSITIONS = [
  'bottom-4 left-1/2 -translate-x-1/2',
  'bottom-16 left-8',
  'top-16 left-8',
  'top-4 left-1/2 -translate-x-1/2',
  'top-16 right-8',
  'bottom-16 right-8',
];

function PlayingCard({ card, delay = 0, small = false }: { card: Card; delay?: number; small?: boolean }) {
  if (!card.faceUp || !card.suit) {
    return (
      <div
        className="rounded-md border border-[hsl(var(--border))] animate-card-deal card-shine flex items-center justify-center"
        style={{
          animationDelay: `${delay}ms`,
          background: 'linear-gradient(135deg, hsl(220,50%,20%) 0%, hsl(220,50%,14%) 100%)',
          minHeight: small ? '3rem' : '4.5rem',
          minWidth: small ? '2rem' : '3rem',
          width: small ? '2rem' : '3rem',
          height: small ? '3rem' : '4.5rem',
        }}
      >
        <div className="w-full h-full rounded-md opacity-30"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.05) 3px, rgba(255,255,255,0.05) 6px)' }} />
      </div>
    );
  }
  const isRed = card.suit === '♥' || card.suit === '♦';
  return (
    <div
      className="rounded-md border flex flex-col justify-between p-1 animate-card-deal card-shine bg-[hsl(0,0%,96%)]"
      style={{
        animationDelay: `${delay}ms`,
        minHeight: small ? '3rem' : '4.5rem',
        minWidth: small ? '2rem' : '3rem',
        width: small ? '2rem' : '3rem',
        height: small ? '3rem' : '4.5rem',
        borderColor: 'rgba(255,255,255,0.3)',
      }}
    >
      <span className={`font-bold leading-none text-xs ${isRed ? 'text-red-600' : 'text-gray-900'}`}>{card.value}</span>
      <span className={`text-center leading-none ${isRed ? 'text-red-600' : 'text-gray-900'} ${small ? 'text-base' : 'text-xl'}`}>{card.suit}</span>
    </div>
  );
}

function PlayerSeat({ seat, isMe, isActive }: { seat: Seat; isMe: boolean; isActive: boolean }) {
  const statusColor = {
    active: isActive ? 'border-[hsl(var(--primary))]' : 'border-[hsl(var(--border))]',
    folded: 'border-[hsl(var(--border))] opacity-50',
    waiting: 'border-[hsl(var(--border))]',
    allIn: 'border-red-500',
    winner: 'border-yellow-400',
  }[seat.status] || 'border-[hsl(var(--border))]';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex gap-1">
        {(seat.hole_cards || [{ faceUp: false }, { faceUp: false }]).map((c, i) => (
          <PlayingCard key={i} card={c} small delay={i * 100} />
        ))}
      </div>
      <div className={`border rounded-lg px-3 py-1.5 text-center min-w-[90px] transition-colors ${statusColor} ${isMe ? 'bg-[hsl(var(--accent))]' : 'bg-[hsl(var(--card))]'}`}>
        <div className="text-xs font-medium text-[hsl(var(--foreground))] truncate max-w-[80px]">
          {seat.name} {isMe && '(вы)'}
        </div>
        <div className="text-xs text-[hsl(var(--primary))] font-semibold">{seat.chips?.toLocaleString()} ₽</div>
        {seat.bet > 0 && <div className="text-[10px] text-[hsl(var(--muted-foreground))]">ставка {seat.bet}</div>}
      </div>
    </div>
  );
}

export default function PokerTable({ myId, joined, atTable, onSit, onStand }: PokerTableProps) {
  const [game, setGame] = useState<GameState>({ phase: 'waiting', pot: 0, community_cards: [], seats: [], actions: [] });
  const [showHistory, setShowHistory] = useState(false);
  const [showReplay, setShowReplay] = useState(false);
  const [betAmount, setBetAmount] = useState(200);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchGame = useCallback(async () => {
    try {
      const data = await pokerApi.getState();
      setGame(data);
    } catch (_e) { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchGame();
    pollRef.current = setInterval(fetchGame, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchGame]);

  const doAction = async (action: string, amount = 0) => {
    if (!joined) { setError('Войдите в комнату чтобы играть'); return; }
    setActionLoading(true);
    setError('');
    try {
      const res = await pokerApi.action(action, amount);
      if (res.error) setError(res.error);
      else await fetchGame();
    } finally {
      setActionLoading(false);
    }
  };

  const startGame = async () => {
    if (!joined) { setError('Войдите в комнату чтобы играть'); return; }
    setActionLoading(true);
    setError('');
    try {
      const res = await pokerApi.start();
      if (res.error) setError(res.error);
      else await fetchGame();
    } finally {
      setActionLoading(false);
    }
  };

  const myTurn = game.current_player_id === myId;
  const mySeat = game.seats.find(s => s.player_id === myId);
  const isPlaying = mySeat && mySeat.status !== 'folded';
  const phaseLabel: Record<string, string> = { waiting: 'Ожидание', preflop: 'Префлоп', flop: 'Флоп', turn: 'Тёрн', river: 'Ривер', showdown: 'Вскрытие' };

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <h2 className="font-cormorant text-xl font-semibold text-[hsl(var(--primary))]">Royal Table</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowHistory(!showHistory)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${showHistory ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]' : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'}`}>
            История
          </button>
          <button onClick={() => setShowReplay(!showReplay)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${showReplay ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]' : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'}`}>
            <Icon name="Play" size={10} className="inline mr-1" />Реплей
          </button>
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2 animate-fade-in">
          {error}
        </div>
      )}

      {showHistory ? (
        <div className="flex-1 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 overflow-y-auto">
          <div className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-3">История ходов</div>
          {game.actions.length === 0 && (
            <div className="text-xs text-[hsl(var(--muted-foreground))] text-center py-6">Ходов пока нет</div>
          )}
          <div className="space-y-2">
            {[...game.actions].reverse().map((a, i) => (
              <div key={i} className="flex items-start gap-3 animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                <span className="text-[10px] text-[hsl(var(--muted-foreground))] shrink-0 mt-0.5">{a.time}</span>
                <span className="text-xs text-[hsl(var(--foreground))]">
                  <span className="text-[hsl(var(--primary))]">{a.player}</span> {
                    a.action === 'fold' ? 'сбросил карты' :
                    a.action === 'call' ? `уравнял ${a.amount}₽` :
                    a.action === 'raise' ? `поднял до ${a.amount}₽` :
                    a.action === 'check' ? 'чекнул' : a.action
                  }
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : showReplay ? (
        <div className="flex-1 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 flex flex-col items-center justify-center gap-4">
          <div className="text-[hsl(var(--muted-foreground))] text-sm">57.122865, 65.588077</div>
          <div className="flex gap-2">
            {(game.community_cards.slice(0, 3).length > 0 ? game.community_cards.slice(0, 3) : [{}, {}, {}]).map((c, i) => (
              <PlayingCard key={i} card={c} delay={i * 150} />
            ))}
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-1.5 rounded-lg text-xs hover:bg-[hsl(var(--accent))] transition-colors bg-[#000000] text-lime-300">люк</button>
            <button className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#000000] text-amber-400">...</button>
            <button className="px-4 py-1.5 rounded-lg text-xs hover:bg-[hsl(var(--accent))] transition-colors bg-[#000000] text-red-600">???</button>
          </div>
          <div className="w-full bg-[hsl(var(--muted))] rounded-full h-1">
            <div className="bg-[hsl(var(--primary))] h-1 rounded-full w-2/5" />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-2 min-h-0">
          {/* Poker table */}
          <div className="relative flex-1 rounded-[3rem] felt border-4 border-[hsl(var(--table-border))] overflow-hidden"
            style={{ boxShadow: '0 0 0 6px hsl(30,30%,20%), 0 20px 60px rgba(0,0,0,0.7)' }}>

            {game.phase === 'waiting' ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div className="text-[hsl(var(--primary))] font-cormorant text-2xl font-semibold">Ожидание игроков</div>
                <div className="text-sm text-[hsl(45,30%,70%)] opacity-70">
                  {game.seats.length === 0 ? 'Никого нет за столом' : `За столом: ${game.seats.length} чел.`}
                </div>
                {joined && !atTable && (
                  <button onClick={onSit} disabled={actionLoading}
                    className="px-6 py-2 rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity gold-glow">
                    Сесть за стол
                  </button>
                )}
                {joined && atTable && (
                  <div className="flex flex-col items-center gap-3">
                    <div className="text-xs text-green-400 font-medium flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      Вы за столом
                    </div>
                    <div className="flex gap-2">
                      <button onClick={startGame} disabled={actionLoading}
                        className="px-5 py-1.5 rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity">
                        {actionLoading ? 'Запуск...' : 'Начать раздачу'}
                      </button>
                      <button onClick={onStand} disabled={actionLoading}
                        className="px-4 py-1.5 rounded-full border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] text-sm hover:border-red-500 hover:text-red-400 transition-colors">
                        Встать
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Seats */}
                {game.seats.map((seat, i) => (
                  <div key={seat.player_id} className={`absolute ${SEAT_POSITIONS[i % 6]}`}>
                    <PlayerSeat
                      seat={seat}
                      isMe={seat.player_id === myId}
                      isActive={seat.player_id === game.current_player_id}
                    />
                  </div>
                ))}

                {/* Center */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
                  <div className="text-[10px] uppercase tracking-widest text-[hsl(45,30%,70%)] opacity-80 font-semibold">
                    {phaseLabel[game.phase] || game.phase}
                  </div>
                  <div className="flex gap-2">
                    {(game.community_cards.length > 0 ? game.community_cards : [{}, {}, {}, {}, {}]).map((card, i) => (
                      <PlayingCard key={i} card={card} delay={i * 80} />
                    ))}
                  </div>
                  <div className="flex items-center gap-2 bg-black/30 rounded-full px-4 py-1.5 gold-glow">
                    <div className="w-3 h-3 rounded-full bg-[hsl(var(--primary))] animate-pulse-ring" />
                    <span className="text-[hsl(var(--primary))] font-semibold text-sm">Банк: {game.pot.toLocaleString()} ₽</span>
                  </div>
                  {myTurn && (
                    <div className="text-[hsl(var(--primary))] text-xs animate-pulse font-semibold">Ваш ход!</div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          {game.phase !== 'waiting' && isPlaying && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
              <button onClick={() => doAction('fold')} disabled={actionLoading || !myTurn}
                className="flex-1 py-2 rounded-lg bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] text-sm font-medium hover:bg-[hsl(var(--destructive))] hover:text-white transition-colors disabled:opacity-40">
                Пас
              </button>
              <button onClick={() => doAction('call', 100)} disabled={actionLoading || !myTurn}
                className="flex-1 py-2 rounded-lg bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40">
                Колл
              </button>
              <div className="flex-1 flex gap-1">
                <input type="number" value={betAmount} onChange={e => setBetAmount(Number(e.target.value))} min={200}
                  className="w-16 bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-lg px-2 py-2 text-xs text-center text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--primary))]" />
                <button onClick={() => doAction('raise', betAmount)} disabled={actionLoading || !myTurn}
                  className="flex-1 py-2 rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity">
                  Рейз
                </button>
              </div>
            </div>
          )}

          {game.phase !== 'waiting' && !isPlaying && joined && (
            <div className="flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))] py-2 px-1">
              <span>Вы не участвуете — ждите следующей раздачи</span>
              {atTable && (
                <button onClick={onStand}
                  className="text-xs px-3 py-1 rounded-full border border-[hsl(var(--border))] hover:border-red-500 hover:text-red-400 transition-colors">
                  Встать
                </button>
              )}
            </div>
          )}
          {game.phase !== 'waiting' && isPlaying && atTable && game.seats.find(s => s.player_id === myId)?.status === 'folded' && (
            <button onClick={onStand}
              className="self-end text-xs px-3 py-1 rounded-full border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-red-500 hover:text-red-400 transition-colors">
              Встать со стола
            </button>
          )}
        </div>
      )}
    </div>
  );
}