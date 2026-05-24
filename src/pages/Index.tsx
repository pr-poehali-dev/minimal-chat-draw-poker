import { useState } from 'react';
import PokerTable from '@/components/PokerTable';
import DrawingCanvas from '@/components/DrawingCanvas';
import Chat from '@/components/Chat';
import Icon from '@/components/ui/icon';
import { useRoom } from '@/hooks/useRoom';

function JoinScreen({ onJoin, loading }: { onJoin: (name: string) => void; loading: boolean }) {
  const [name, setName] = useState('');

  const submit = () => {
    if (name.trim()) onJoin(name.trim());
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))]"
      style={{ backgroundImage: 'radial-gradient(ellipse at 50% 50%, hsl(160,30%,10%) 0%, hsl(var(--background)) 70%)' }}>
      <div className="flex flex-col items-center gap-8 animate-fade-in">
        {/* Logo */}
        <div className="text-center">
          <div className="text-[hsl(var(--primary))] text-6xl mb-3">♠</div>
          <h1 className="font-cormorant text-5xl font-bold text-[hsl(var(--foreground))] tracking-wide">
            Royal <span className="text-[hsl(var(--primary))]">Table</span>
          </h1>
          <p className="text-[hsl(var(--muted-foreground))] text-sm mt-2">Покер · Рисование · Общение</p>
        </div>

        {/* Form */}
        <div className="w-72 flex flex-col gap-3">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="Ваш никнейм"
            maxLength={30}
            autoFocus
            className="w-full bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-xl px-4 py-3 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:border-[hsl(var(--primary))] text-center text-base transition-colors"
          />
          <button
            onClick={submit}
            disabled={!name.trim() || loading}
            className="w-full py-3 rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-semibold text-base disabled:opacity-40 hover:opacity-90 transition-opacity gold-glow"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Icon name="Loader" size={16} className="animate-spin" />Вход...
              </span>
            ) : 'Войти в комнату'}
          </button>
        </div>

        {/* Suits decoration */}
        <div className="flex gap-6 text-2xl opacity-20">
          <span>♠</span><span className="text-red-400">♥</span><span className="text-red-400">♦</span><span>♣</span>
        </div>
      </div>
    </div>
  );
}

export default function Index() {
  const { joined, myName, myId, players, loading, join, leave } = useRoom();
  const [mobileTab, setMobileTab] = useState<'poker' | 'canvas' | 'chat'>('poker');
  const [chatOpen, setChatOpen] = useState(true);

  if (!joined) {
    return <JoinScreen onJoin={join} loading={loading} />;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[hsl(var(--background))]">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-[hsl(var(--border))] shrink-0"
        style={{ background: 'linear-gradient(90deg, hsl(var(--card)) 0%, hsl(160,18%,8%) 100%)' }}>
        <div className="flex items-center gap-3">
          <span className="text-[hsl(var(--primary))] text-lg">♠</span>
          <h1 className="font-cormorant font-bold text-xl text-[hsl(var(--foreground))] tracking-wide">
            Royal <span className="text-[hsl(var(--primary))]">Table</span>
          </h1>
          <div className="hidden sm:flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full bg-[hsl(var(--muted))]">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">Комната №1</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-3 text-xs text-[hsl(var(--muted-foreground))]">
            <span className="flex items-center gap-1.5">
              <Icon name="Users" size={12} />{players.length} онлайн
            </span>
            <span className="text-[hsl(var(--primary))] font-medium">{myName}</span>
          </div>
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${chatOpen ? 'bg-[hsl(var(--accent))] text-[hsl(var(--primary))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}
          >
            <Icon name="MessageSquare" size={13} />Чат
          </button>
          <button
            onClick={leave}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[hsl(var(--muted-foreground))] hover:text-red-400 transition-colors"
          >
            <Icon name="LogOut" size={13} />
          </button>
        </div>
      </header>

      {/* Mobile tab bar */}
      <div className="sm:hidden flex border-b border-[hsl(var(--border))] shrink-0 bg-[hsl(var(--card))]">
        {(['poker', 'canvas', 'chat'] as const).map(tab => (
          <button key={tab} onClick={() => setMobileTab(tab)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${mobileTab === tab ? 'text-[hsl(var(--primary))] border-b-2 border-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'}`}>
            {tab === 'poker' ? '♠ Покер' : tab === 'canvas' ? '🎨 Холст' : '💬 Чат'}
          </button>
        ))}
      </div>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop */}
        <div className="hidden sm:flex flex-1 overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden p-3 gap-3 min-w-0">
            <div className="flex-[1.4] min-h-0 overflow-auto">
              <PokerTable myId={myId} joined={joined} />
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex-1 h-px bg-[hsl(var(--border))]" />
              <span className="text-[10px] uppercase tracking-widest text-[hsl(var(--muted-foreground))] font-semibold flex items-center gap-1.5">
                <span>🎨</span> Совместный холст
              </span>
              <div className="flex-1 h-px bg-[hsl(var(--border))]" />
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <DrawingCanvas />
            </div>
          </div>

          {chatOpen && (
            <div className="w-72 shrink-0 border-l border-[hsl(var(--border))] flex flex-col bg-[hsl(var(--card))] animate-fade-in">
              <Chat myName={myName} players={players} />
            </div>
          )}
        </div>

        {/* Mobile */}
        <div className="sm:hidden flex-1 overflow-hidden">
          {mobileTab === 'poker' && (
            <div className="h-full p-3 overflow-auto">
              <PokerTable myId={myId} joined={joined} />
            </div>
          )}
          {mobileTab === 'canvas' && (
            <div className="h-full p-3 overflow-hidden flex flex-col">
              <DrawingCanvas />
            </div>
          )}
          {mobileTab === 'chat' && (
            <div className="h-full flex flex-col">
              <Chat myName={myName} players={players} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
