import { useState } from 'react';
import PokerTable from '@/components/PokerTable';
import DrawingCanvas from '@/components/DrawingCanvas';
import Chat from '@/components/Chat';
import AuthScreen from '@/components/AuthScreen';
import Icon from '@/components/ui/icon';
import { useAuth } from '@/hooks/useAuth';
import { useRoom } from '@/hooks/useRoom';

export default function Index() {
  const { user, loading, error, setError, register, login, logout, sit, stand } = useAuth();
  const { players } = useRoom(!!user);
  const [mobileTab, setMobileTab] = useState<'poker' | 'canvas' | 'chat'>('poker');
  const [chatOpen, setChatOpen] = useState(true);

  // Загрузка сессии
  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))]">
        <div className="flex flex-col items-center gap-4">
          <span className="text-[hsl(var(--primary))] text-4xl animate-pulse">♠</span>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">Загрузка...</span>
        </div>
      </div>
    );
  }

  // Экран входа / регистрации
  if (!user) {
    return (
      <AuthScreen
        onRegister={register}
        onLogin={login}
        loading={loading}
        error={error}
        onClearError={() => setError('')}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[hsl(var(--background))]">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-[hsl(var(--border))] shrink-0"
        style={{ background: 'linear-gradient(90deg, hsl(var(--card)) 0%, hsl(160,18%,8%) 100%)' }}>
        <div className="flex items-center gap-3">
          <span className="text-[hsl(var(--primary))] text-lg">♠</span>
          <h1 className="font-cormorant font-bold text-xl text-[hsl(var(--foreground))] tracking-wide">Koлбареzz 2012 </h1>
          <div className="hidden sm:flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full bg-[hsl(var(--muted))]">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{players.length} онлайн</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Имя + фишки */}
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs font-semibold text-[hsl(var(--foreground))]">{user.username}</span>
            <span className="text-[10px] text-[hsl(var(--primary))]">{user.chips.toLocaleString()} ₽</span>
          </div>

          {/* Статус за столом */}
          {user.at_table && (
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-full bg-green-900/30 border border-green-800/50">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] text-green-400">За столом</span>
            </div>
          )}

          <button onClick={() => setChatOpen(!chatOpen)}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${chatOpen ? 'bg-[hsl(var(--accent))] text-[hsl(var(--primary))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}>
            <Icon name="MessageSquare" size={13} />Чат
          </button>

          <button onClick={logout}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-[hsl(var(--muted-foreground))] hover:text-red-400 transition-colors"
            title="Выйти">
            <Icon name="LogOut" size={14} />
          </button>
        </div>
      </header>

      {/* Mobile tabs */}
      <div className="sm:hidden flex border-b border-[hsl(var(--border))] shrink-0 bg-[hsl(var(--card))]">
        {(['poker', 'canvas', 'chat'] as const).map(tab => (
          <button key={tab} onClick={() => setMobileTab(tab)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${mobileTab === tab ? 'text-[hsl(var(--primary))] border-b-2 border-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'}`}>
            {tab === 'poker' ? '♠ Покер' : tab === 'canvas' ? '🎨 Холст' : '💬 Чат'}
          </button>
        ))}
      </div>

      {/* Layout */}
      <div className="flex-1 flex overflow-hidden">

        {/* Desktop */}
        <div className="hidden sm:flex flex-1 overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden p-3 gap-3 min-w-0 bg-slate-600">
            <div className="flex-[1.4] min-h-0 overflow-auto">
              <PokerTable
                myId={user.id}
                joined={true}
                atTable={user.at_table}
                onSit={sit}
                onStand={stand}
              />
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex-1 h-px bg-[hsl(var(--border))]" />
              <span className="text-[10px] uppercase tracking-widest text-[hsl(var(--muted-foreground))] font-semibold flex items-center gap-1.5">
                🎨 Совместный холст
              </span>
              <div className="flex-1 h-px bg-[hsl(var(--border))]" />
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <DrawingCanvas />
            </div>
          </div>

          {chatOpen && (
            <div className="w-72 shrink-0 border-l border-[hsl(var(--border))] flex flex-col bg-[hsl(var(--card))] animate-fade-in">
              <Chat myName={user.username} players={players} />
            </div>
          )}
        </div>

        {/* Mobile */}
        <div className="sm:hidden flex-1 overflow-hidden">
          {mobileTab === 'poker' && (
            <div className="h-full p-3 overflow-auto">
              <PokerTable myId={user.id} joined={true} atTable={user.at_table} onSit={sit} onStand={stand} />
            </div>
          )}
          {mobileTab === 'canvas' && (
            <div className="h-full p-3 overflow-hidden flex flex-col">
              <DrawingCanvas />
            </div>
          )}
          {mobileTab === 'chat' && (
            <div className="h-full flex flex-col">
              <Chat myName={user.username} players={players} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}