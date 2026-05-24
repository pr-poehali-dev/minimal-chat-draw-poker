import { useState } from 'react';
import Icon from '@/components/ui/icon';

interface AuthScreenProps {
  onRegister: (username: string, password: string) => Promise<boolean>;
  onLogin: (username: string, password: string) => Promise<boolean>;
  loading: boolean;
  error: string;
  onClearError: () => void;
}

export default function AuthScreen({ onRegister, onLogin, loading, error, onClearError }: AuthScreenProps) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const submit = async () => {
    if (!username.trim() || !password.trim()) return;
    if (tab === 'register') {
      await onRegister(username.trim(), password);
    } else {
      await onLogin(username.trim(), password);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') submit();
  };

  const switchTab = (t: 'login' | 'register') => {
    setTab(t);
    onClearError();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))]"
      style={{ backgroundImage: 'radial-gradient(ellipse at 50% 40%, hsl(160,35%,9%) 0%, hsl(var(--background)) 70%)' }}>

      <div className="flex flex-col items-center gap-8 w-full max-w-sm px-4 animate-fade-in">

        {/* Logo */}
        <div className="text-center">
          <div className="flex justify-center gap-4 text-4xl mb-4 opacity-80">
            <span className="text-[hsl(var(--foreground))]">♠</span>
            <span className="text-red-400">♥</span>
            <span className="text-red-400">♦</span>
            <span className="text-[hsl(var(--foreground))]">♣</span>
          </div>
          <h1 className="font-cormorant text-5xl font-bold text-[hsl(var(--foreground))] tracking-wide leading-tight">
            Royal <span className="text-[hsl(var(--primary))]">Table</span>
          </h1>
          <p className="text-[hsl(var(--muted-foreground))] text-sm mt-2 tracking-wider">
            Покер · Рисование · Общение
          </p>
        </div>

        {/* Card */}
        <div className="w-full bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-6 flex flex-col gap-5 shadow-2xl">

          {/* Tabs */}
          <div className="flex bg-[hsl(var(--muted))] rounded-xl p-1">
            <button
              onClick={() => switchTab('login')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'login' ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm' : 'text-[hsl(var(--muted-foreground))]'}`}
            >
              Вход
            </button>
            <button
              onClick={() => switchTab('register')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'register' ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm' : 'text-[hsl(var(--muted-foreground))]'}`}
            >
              Регистрация
            </button>
          </div>

          {/* Fields */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[hsl(var(--muted-foreground))] font-medium tracking-wide uppercase">Никнейм</label>
              <input
                value={username}
                onChange={e => { setUsername(e.target.value); onClearError(); }}
                onKeyDown={handleKey}
                placeholder="Ваш никнейм"
                maxLength={30}
                autoFocus
                className="bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-xl px-4 py-3 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:border-[hsl(var(--primary))] text-sm transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[hsl(var(--muted-foreground))] font-medium tracking-wide uppercase">Пароль</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); onClearError(); }}
                  onKeyDown={handleKey}
                  placeholder={tab === 'register' ? 'Минимум 4 символа' : 'Ваш пароль'}
                  className="w-full bg-[hsl(var(--muted))] border border-[hsl(var(--border))] rounded-xl px-4 py-3 pr-10 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:border-[hsl(var(--primary))] text-sm transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                >
                  <Icon name={showPass ? 'EyeOff' : 'Eye'} size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-xl px-3 py-2.5 animate-fade-in">
              <Icon name="AlertCircle" size={13} className="shrink-0" />
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={submit}
            disabled={!username.trim() || !password.trim() || loading}
            className="w-full py-3 rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-semibold text-sm disabled:opacity-40 hover:opacity-90 transition-opacity gold-glow"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Icon name="Loader" size={15} className="animate-spin" />
                {tab === 'register' ? 'Создаём аккаунт...' : 'Входим...'}
              </span>
            ) : tab === 'register' ? 'Создать аккаунт' : 'Войти в комнату'}
          </button>

          {/* Switch hint */}
          <p className="text-center text-xs text-[hsl(var(--muted-foreground))]">
            {tab === 'login' ? (
              <>Нет аккаунта?{' '}
                <button onClick={() => switchTab('register')} className="text-[hsl(var(--primary))] hover:underline">Зарегистрируйтесь</button>
              </>
            ) : (
              <>Уже есть аккаунт?{' '}
                <button onClick={() => switchTab('login')} className="text-[hsl(var(--primary))] hover:underline">Войдите</button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
