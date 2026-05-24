import { useState, useRef, useEffect } from 'react';
import Icon from '@/components/ui/icon';

interface Message {
  id: number;
  author: string;
  text: string;
  time: string;
  type: 'user' | 'system' | 'me';
  avatar: string;
}

const AVATARS = ['🎩', '♠', '♥', '♦', '♣', '🃏', '👑', '🎲'];

const INITIAL_MESSAGES: Message[] = [
  { id: 1, author: 'Система', text: 'Добро пожаловать в Royal Table!', time: '21:30', type: 'system', avatar: '♠' },
  { id: 2, author: 'Alex_Pro', text: 'Всем привет, готов к игре 🃏', time: '21:31', type: 'user', avatar: '🎩' },
  { id: 3, author: 'Viktor88', text: 'ва-банк будем?', time: '21:33', type: 'user', avatar: '♦' },
  { id: 4, author: 'Marina_K', text: 'хахаха нет уж, пас', time: '21:35', type: 'user', avatar: '♥' },
  { id: 5, author: 'Alex_Pro', text: 'нарисуй что-нибудь на доске пока ждём', time: '21:38', type: 'user', avatar: '🎩' },
  { id: 6, author: 'Система', text: 'Viktor88 сделал рейз 200 ₽', time: '21:42', type: 'system', avatar: '♠' },
  { id: 7, author: 'Дмитрий', text: 'блеф 100%', time: '21:43', type: 'user', avatar: '♣' },
];

const ONLINE_USERS = ['Alex_Pro', 'Viktor88', 'Marina_K', 'Дмитрий', 'Svetlana', 'Вы'];

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [myName] = useState('Вы');
  const [showOnline, setShowOnline] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const now = new Date();
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    setMessages(prev => [...prev, {
      id: Date.now(),
      author: myName,
      text: input.trim(),
      time,
      type: 'me',
      avatar: '👑',
    }]);
    setInput('');
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))]">
        <div>
          <h3 className="font-cormorant font-semibold text-base text-[hsl(var(--foreground))]">Чат комнаты</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{ONLINE_USERS.length} онлайн</span>
          </div>
        </div>
        <button
          onClick={() => setShowOnline(!showOnline)}
          className={`p-1.5 rounded-lg transition-colors ${showOnline ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'}`}
        >
          <Icon name="Users" size={15} />
        </button>
      </div>

      {showOnline ? (
        /* Online users list */
        <div className="flex-1 p-3 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] font-semibold mb-3">Участники</div>
          <div className="space-y-2">
            {ONLINE_USERS.map((user, i) => (
              <div key={user} className="flex items-center gap-3 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="w-7 h-7 rounded-full bg-[hsl(var(--accent))] flex items-center justify-center text-sm">
                  {AVATARS[i % AVATARS.length]}
                </div>
                <span className={`text-sm ${user === 'Вы' ? 'text-[hsl(var(--primary))] font-medium' : 'text-[hsl(var(--foreground))]'}`}>
                  {user}
                </span>
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-400" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Messages */
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {messages.map((msg, i) => {
            if (msg.type === 'system') {
              return (
                <div key={msg.id} className="text-center animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))] px-2 py-0.5 rounded-full">
                    {msg.text}
                  </span>
                </div>
              );
            }

            const isMe = msg.type === 'me';
            return (
              <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''} animate-fade-in`}
                style={{ animationDelay: `${i * 30}ms` }}>
                <div className="w-6 h-6 rounded-full bg-[hsl(var(--accent))] flex items-center justify-center text-xs shrink-0 mt-0.5">
                  {msg.avatar}
                </div>
                <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                  {!isMe && (
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))] px-1">{msg.author}</span>
                  )}
                  <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                    isMe
                      ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-tr-sm'
                      : 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] rounded-tl-sm'
                  }`}>
                    {msg.text}
                  </div>
                  <span className={`text-[9px] text-[hsl(var(--muted-foreground))] px-1 ${isMe ? 'text-right' : ''}`}>{msg.time}</span>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-[hsl(var(--border))]">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Написать..."
            rows={1}
            className="flex-1 bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-xl px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:border-[hsl(var(--primary))] resize-none leading-snug transition-colors"
            style={{ maxHeight: 80 }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="p-2 rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] disabled:opacity-40 hover:opacity-90 transition-opacity shrink-0"
          >
            <Icon name="Send" size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
