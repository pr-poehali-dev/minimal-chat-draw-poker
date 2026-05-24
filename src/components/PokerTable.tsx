import { useState, useCallback } from 'react';
import Icon from '@/components/ui/icon';

type Suit = '♠' | '♥' | '♦' | '♣';
type CardValue = 'A' | 'K' | 'Q' | 'J' | '10' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2';

interface Card {
  suit: Suit;
  value: CardValue;
  faceUp: boolean;
}

interface Player {
  id: number;
  name: string;
  chips: number;
  cards: Card[];
  bet: number;
  status: 'active' | 'folded' | 'waiting' | 'allIn' | 'dealer';
  isYou?: boolean;
}

interface HandHistory {
  id: number;
  time: string;
  action: string;
  amount?: number;
  winner?: string;
}

const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const VALUES: CardValue[] = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];

function randomCard(faceUp = true): Card {
  return {
    suit: SUITS[Math.floor(Math.random() * 4)],
    value: VALUES[Math.floor(Math.random() * 13)],
    faceUp,
  };
}

const INITIAL_PLAYERS: Player[] = [
  { id: 1, name: 'Вы', chips: 1500, cards: [], bet: 0, status: 'active', isYou: true },
  { id: 2, name: 'Alex_Pro', chips: 2200, cards: [], bet: 50, status: 'active' },
  { id: 3, name: 'Viktor88', chips: 800, cards: [], bet: 100, status: 'active' },
  { id: 4, name: 'Marina_K', chips: 3100, cards: [], bet: 0, status: 'folded' },
  { id: 5, name: 'Дмитрий', chips: 1700, cards: [], bet: 100, status: 'active' },
  { id: 6, name: 'Svetlana', chips: 950, cards: [], bet: 0, status: 'waiting' },
];

const INITIAL_HISTORY: HandHistory[] = [
  { id: 1, time: '21:42', action: 'Viktor88 делает рейз', amount: 200 },
  { id: 2, time: '21:42', action: 'Marina_K сбрасывает карты' },
  { id: 3, time: '21:43', action: 'Alex_Pro уравнивает', amount: 200 },
  { id: 4, time: '21:43', action: 'Вы уравниваете', amount: 200 },
  { id: 5, time: '21:44', action: 'Флоп открыт' },
];

const COMMUNITY_CARDS: Card[] = [
  { suit: '♥', value: 'A', faceUp: true },
  { suit: '♠', value: 'K', faceUp: true },
  { suit: '♦', value: '7', faceUp: true },
  { suit: '♣', value: '3', faceUp: false },
  { suit: '♥', value: 'J', faceUp: false },
];

const MY_CARDS: Card[] = [
  { suit: '♠', value: 'A', faceUp: true },
  { suit: '♦', value: 'K', faceUp: true },
];

function PlayingCard({ card, delay = 0, small = false }: { card: Card; delay?: number; small?: boolean }) {
  const isRed = card.suit === '♥' || card.suit === '♦';

  if (!card.faceUp) {
    return (
      <div
        className={`${small ? 'w-8 h-12' : 'w-12 h-18'} rounded-md border border-[hsl(var(--border))] flex items-center justify-center animate-card-deal card-shine`}
        style={{
          animationDelay: `${delay}ms`,
          background: 'linear-gradient(135deg, hsl(220,50%,20%) 0%, hsl(220,50%,14%) 100%)',
          minHeight: small ? '3rem' : '4.5rem',
          minWidth: small ? '2rem' : '3rem',
        }}
      >
        <div className="w-full h-full rounded-md opacity-30"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.05) 3px, rgba(255,255,255,0.05) 6px)'
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`${small ? 'w-8 h-12 text-xs' : 'w-12 h-18 text-sm'} rounded-md border flex flex-col justify-between p-1 animate-card-deal card-shine bg-[hsl(0,0%,96%)]`}
      style={{
        animationDelay: `${delay}ms`,
        minHeight: small ? '3rem' : '4.5rem',
        minWidth: small ? '2rem' : '3rem',
        borderColor: 'rgba(255,255,255,0.3)',
      }}
    >
      <span className={`font-bold leading-none ${isRed ? 'text-red-600' : 'text-gray-900'}`}>{card.value}</span>
      <span className={`text-center leading-none ${isRed ? 'text-red-600' : 'text-gray-900'} ${small ? 'text-base' : 'text-xl'}`}>{card.suit}</span>
    </div>
  );
}

function PlayerSeat({ player, position }: { player: Player; position: string }) {
  const statusColor = {
    active: 'border-[hsl(var(--primary))]',
    folded: 'border-[hsl(var(--border))] opacity-50',
    waiting: 'border-[hsl(var(--border))]',
    allIn: 'border-red-500',
    dealer: 'border-blue-400',
  }[player.status];

  const cards = player.isYou ? MY_CARDS : [randomCard(false), randomCard(false)];

  return (
    <div className={`absolute ${position} flex flex-col items-center gap-1`}>
      <div className="flex gap-1">
        {cards.map((c, i) => (
          <PlayingCard key={i} card={player.isYou ? c : { ...c, faceUp: false }} small delay={i * 100} />
        ))}
      </div>
      <div className={`border rounded-lg px-3 py-1.5 text-center min-w-[90px] ${statusColor} ${player.isYou ? 'bg-[hsl(var(--accent))]' : 'bg-[hsl(var(--card))]'}`}>
        <div className="text-xs font-medium text-[hsl(var(--foreground))] truncate max-w-[80px]">{player.name}</div>
        <div className="text-xs text-[hsl(var(--primary))] font-semibold">{player.chips.toLocaleString()} ₽</div>
        {player.bet > 0 && (
          <div className="text-[10px] text-[hsl(var(--muted-foreground))]">ставка {player.bet}</div>
        )}
      </div>
    </div>
  );
}

const PLAYER_POSITIONS = [
  'bottom-4 left-1/2 -translate-x-1/2',
  'bottom-16 left-8',
  'top-16 left-8',
  'top-4 left-1/2 -translate-x-1/2',
  'top-16 right-8',
  'bottom-16 right-8',
];

export default function PokerTable() {
  const [players] = useState(INITIAL_PLAYERS);
  const [history, setHistory] = useState(INITIAL_HISTORY);
  const [pot] = useState(600);
  const [showHistory, setShowHistory] = useState(false);
  const [showReplay, setShowReplay] = useState(false);
  const [betAmount, setBetAmount] = useState(200);
  const [phase] = useState<'preflop' | 'flop' | 'turn' | 'river'>('flop');

  const addHistory = useCallback((action: string, amount?: number) => {
    const now = new Date();
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    setHistory(prev => [...prev, { id: Date.now(), time, action, amount }]);
  }, []);

  const handleFold = () => addHistory('Вы сбрасываете карты');
  const handleCall = () => addHistory('Вы уравниваете', 100);
  const handleRaise = () => addHistory('Вы делаете рейз', betAmount);

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <h2 className="font-cormorant text-xl font-semibold text-[hsl(var(--primary))]">Royal Table</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${showHistory ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]' : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'}`}
          >
            История
          </button>
          <button
            onClick={() => setShowReplay(!showReplay)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${showReplay ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]' : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'}`}
          >
            <Icon name="Play" size={10} className="inline mr-1" />
            Реплей
          </button>
        </div>
      </div>

      {showHistory ? (
        /* History Panel */
        <div className="flex-1 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 overflow-y-auto">
          <div className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-3">История раздачи</div>
          <div className="space-y-2">
            {history.map((h, i) => (
              <div key={h.id} className="flex items-start gap-3 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                <span className="text-[10px] text-[hsl(var(--muted-foreground))] shrink-0 mt-0.5">{h.time}</span>
                <span className="text-xs text-[hsl(var(--foreground))]">{h.action}</span>
                {h.amount && <span className="text-xs text-[hsl(var(--primary))] ml-auto shrink-0">+{h.amount}</span>}
              </div>
            ))}
          </div>
        </div>
      ) : showReplay ? (
        /* Replay Panel */
        <div className="flex-1 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 flex flex-col items-center justify-center gap-4">
          <div className="text-[hsl(var(--muted-foreground))] text-sm">Реплей последней раздачи</div>
          <div className="flex gap-2">
            {COMMUNITY_CARDS.slice(0, 3).map((c, i) => (
              <PlayingCard key={i} card={c} delay={i * 150} />
            ))}
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-1.5 rounded-lg bg-[hsl(var(--muted))] text-xs hover:bg-[hsl(var(--accent))] transition-colors">
              <Icon name="SkipBack" size={12} className="inline mr-1" />Назад
            </button>
            <button className="px-4 py-1.5 rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-xs font-semibold">
              <Icon name="Play" size={12} className="inline mr-1" />Воспроизвести
            </button>
            <button className="px-4 py-1.5 rounded-lg bg-[hsl(var(--muted))] text-xs hover:bg-[hsl(var(--accent))] transition-colors">
              <Icon name="SkipForward" size={12} className="inline mr-1" />Вперёд
            </button>
          </div>
          <div className="w-full bg-[hsl(var(--muted))] rounded-full h-1">
            <div className="bg-[hsl(var(--primary))] h-1 rounded-full w-2/5 transition-all" />
          </div>
        </div>
      ) : (
        /* Main Table */
        <div className="flex-1 flex flex-col gap-2 min-h-0">
          {/* Poker table */}
          <div className="relative flex-1 rounded-[3rem] felt border-4 border-[hsl(var(--table-border))] shadow-2xl overflow-hidden"
            style={{ boxShadow: '0 0 0 6px hsl(30,30%,20%), 0 20px 60px rgba(0,0,0,0.7)' }}>

            {/* Players */}
            {INITIAL_PLAYERS.map((player, i) => (
              <PlayerSeat key={player.id} player={player} position={PLAYER_POSITIONS[i]} />
            ))}

            {/* Center — community cards + pot */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              {/* Phase badge */}
              <div className="text-[10px] uppercase tracking-widest text-[hsl(45,30%,70%)] opacity-80 font-semibold">
                {phase === 'flop' ? 'Флоп' : phase === 'turn' ? 'Тёрн' : phase === 'river' ? 'Ривер' : 'Префлоп'}
              </div>

              {/* Community cards */}
              <div className="flex gap-2">
                {COMMUNITY_CARDS.map((card, i) => (
                  <PlayingCard key={i} card={card} delay={i * 100} />
                ))}
              </div>

              {/* Pot */}
              <div className="flex items-center gap-2 bg-black/30 rounded-full px-4 py-1.5 gold-glow">
                <div className="w-3 h-3 rounded-full bg-[hsl(var(--primary))] animate-pulse-ring" />
                <span className="text-[hsl(var(--primary))] font-semibold text-sm">Банк: {pot.toLocaleString()} ₽</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
            <button onClick={handleFold}
              className="flex-1 py-2 rounded-lg bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] text-sm font-medium hover:bg-[hsl(var(--destructive))] hover:text-white transition-colors">
              Пас
            </button>
            <button onClick={handleCall}
              className="flex-1 py-2 rounded-lg bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] text-sm font-medium hover:opacity-90 transition-opacity">
              Колл 100
            </button>
            <div className="flex-1 flex gap-1">
              <input
                type="number"
                value={betAmount}
                onChange={e => setBetAmount(Number(e.target.value))}
                className="w-16 bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-lg px-2 py-2 text-xs text-center text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--primary))]"
              />
              <button onClick={handleRaise}
                className="flex-1 py-2 rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-sm font-semibold hover:opacity-90 transition-opacity">
                Рейз
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
