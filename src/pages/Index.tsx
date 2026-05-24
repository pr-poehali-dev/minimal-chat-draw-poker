import { useState } from 'react';
import PokerTable from '@/components/PokerTable';
import DrawingCanvas from '@/components/DrawingCanvas';
import Chat from '@/components/Chat';
import Icon from '@/components/ui/icon';

export default function Index() {
  const [mobileTab, setMobileTab] = useState<'poker' | 'canvas' | 'chat'>('poker');
  const [chatOpen, setChatOpen] = useState(true);

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
              <Icon name="Users" size={12} />
              6 игроков
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="Clock" size={12} />
              21:44
            </span>
          </div>
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${chatOpen ? 'bg-[hsl(var(--accent))] text-[hsl(var(--primary))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}
          >
            <Icon name="MessageSquare" size={13} />
            Чат
          </button>
        </div>
      </header>

      {/* Mobile tab bar */}
      <div className="sm:hidden flex border-b border-[hsl(var(--border))] shrink-0 bg-[hsl(var(--card))]">
        {(['poker', 'canvas', 'chat'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${mobileTab === tab ? 'text-[hsl(var(--primary))] border-b-2 border-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'}`}
          >
            {tab === 'poker' ? '♠ Покер' : tab === 'canvas' ? '🎨 Холст' : '💬 Чат'}
          </button>
        ))}
      </div>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">

        {/* Desktop */}
        <div className="hidden sm:flex flex-1 overflow-hidden">
          {/* Main content */}
          <div className="flex-1 flex flex-col overflow-hidden p-3 gap-3 min-w-0">
            {/* Poker table */}
            <div className="flex-[1.4] min-h-0 overflow-auto">
              <PokerTable />
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex-1 h-px bg-[hsl(var(--border))]" />
              <span className="text-[10px] uppercase tracking-widest text-[hsl(var(--muted-foreground))] font-semibold flex items-center gap-1.5">
                <span>🎨</span> Совместный холст
              </span>
              <div className="flex-1 h-px bg-[hsl(var(--border))]" />
            </div>

            {/* Drawing canvas */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <DrawingCanvas />
            </div>
          </div>

          {/* Chat sidebar */}
          {chatOpen && (
            <div className="w-72 shrink-0 border-l border-[hsl(var(--border))] flex flex-col bg-[hsl(var(--card))] animate-fade-in">
              <Chat />
            </div>
          )}
        </div>

        {/* Mobile tabs */}
        <div className="sm:hidden flex-1 overflow-hidden">
          {mobileTab === 'poker' && (
            <div className="h-full p-3 overflow-auto">
              <PokerTable />
            </div>
          )}
          {mobileTab === 'canvas' && (
            <div className="h-full p-3 overflow-hidden flex flex-col">
              <DrawingCanvas />
            </div>
          )}
          {mobileTab === 'chat' && (
            <div className="h-full flex flex-col">
              <Chat />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
