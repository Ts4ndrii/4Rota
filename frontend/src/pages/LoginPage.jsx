import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api';

function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const roleToRoute = {
    admin: '/admin',
    mechanic: '/mechanic',
    client: '/client',
  };

  if (isAuthenticated) {
    return <Navigate to={roleToRoute[user?.role] || '/login'} replace />;
  }

  /* Обробка сабміту форми */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { data } = await authAPI.login({ email, password });
      login(data.token, data.user);

      let resolvedUser = data.user;
      try {
        const meResponse = await authAPI.getMe();
        if (meResponse?.data?.user) {
          resolvedUser = meResponse.data.user;
          login(data.token, resolvedUser);
        }
      } catch {
      }

      navigate(roleToRoute[resolvedUser.role] || '/login', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Помилка з\'єднання з сервером.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4 relative overflow-hidden">

      {/* Декоративний фон */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(249,115,22,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(249,115,22,0.5) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Світловий акцент зліва */}
      <div className="absolute -left-32 top-1/2 -translate-y-1/2 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -right-32 bottom-0 w-64 h-64 bg-brand-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Картка входу */}
      <div className="relative w-full max-w-md animate-fadeIn">

        {/* Хедер */}
        <div className="text-center mb-8">
          {/* Логотип */}
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-500/10 border border-brand-500/30 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
            </svg>
          </div>

          <h1 className="font-display text-3xl font-bold text-dark-50 tracking-wide uppercase">
            4 <span className="text-brand-400">Rota</span>
          </h1>
          <p className="text-dark-400 text-sm mt-1 font-body">
            Система управління автосервісом
          </p>
        </div>

        {/* Форма */}
        <div className="card border-dark-700">
          <h2 className="font-display text-xl font-semibold text-dark-100 tracking-wide mb-6 uppercase">
            Вхід до системи
          </h2>

          {/* Блок помилки */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-800/50 rounded-lg flex items-center gap-2 animate-fadeIn">
              <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Поле Email */}
            <div>
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@sto.ua"
                  className="input-field pl-10"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              </div>
            </div>

            {/* Поле Пароль */}
            <div>
              <label htmlFor="password" className="form-label">
                Пароль
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pl-10 pr-10"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                {/* Кнопка показати/сховати пароль */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Кнопка входу */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full justify-center py-3 text-base mt-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Вхід...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Увійти
                </>
              )}
            </button>
          </form>

          {/* Підказка тестових даних */}
          <div className="mt-5 pt-4 border-t border-dark-700">
            <p className="text-xs text-dark-500 text-center font-mono mb-2">// Тестові облікові записи</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setEmail('admin@sto.ua'); setPassword('admin123'); }}
                className="text-xs px-3 py-2 bg-dark-900 border border-dark-700 rounded-lg text-dark-400 hover:text-dark-200 hover:border-brand-500/50 transition-all font-mono text-left"
              >
                <span className="text-brand-400">admin</span>@sto.ua
              </button>
              <button
                type="button"
                onClick={() => { setEmail('mechanic@sto.ua'); setPassword('mechanic123'); }}
                className="text-xs px-3 py-2 bg-dark-900 border border-dark-700 rounded-lg text-dark-400 hover:text-dark-200 hover:border-brand-500/50 transition-all font-mono text-left"
              >
                <span className="text-blue-400">mechanic</span>@sto.ua
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-dark-600 text-xs mt-6 font-mono">
          4Rota v0.7 · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

export default LoginPage;