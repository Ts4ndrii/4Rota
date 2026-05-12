import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usersAPI, authAPI } from '../api';

// ДОПОМІЖНІ КОМПОНЕНТИ
function Spinner({ small }) {
  return (
    <div className={`${small ? 'w-4 h-4 border-2' : 'w-8 h-8 border-2'} border-brand-500 border-t-transparent rounded-full animate-spin`} />
  );
}

function IconX() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

/* Бейдж ролі користувача */
function RoleBadge({ role }) {
  const config = {
    admin:    { label: 'Адмін',   cls: 'bg-brand-900/40 text-brand-300 border-brand-700/50' },
    mechanic: { label: 'Майстер', cls: 'bg-blue-900/40 text-blue-300 border-blue-700/50' },
    client:   { label: 'Клієнт',  cls: 'bg-purple-900/40 text-purple-300 border-purple-700/50' },
  };
  const { label, cls } = config[role] || config.client;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  );
}

// МОДАЛКА СТВОРЕННЯ / РЕДАГУВАННЯ КОРИСТУВАЧА
function UserFormModal({ user: editUser, onClose, onSaved }) {
  const isEdit = !!editUser;

  const [fullName, setFullName] = useState(editUser?.fullName || '');
  const [email,    setEmail]    = useState(editUser?.email    || '');
  const [password, setPassword] = useState('');
  const [role,     setRole]     = useState(editUser?.role     || 'client');
  const [cars, setCars] = useState(editUser?.cars?.length > 0 ? editUser.cars : [{ vin: '', make: '' }]);

  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const addCar    = () => setCars(prev => [...prev, { vin: '', make: '' }]);
  const removeCar = (idx) => setCars(prev => prev.filter((_, i) => i !== idx));
  const updateCar = (idx, field, value) =>
    setCars(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isEdit && password.length < 6) {
      setError('Пароль повинен містити мінімум 6 символів.');
      return;
    }
    if (isEdit && password && password.length < 6) {
      setError('Новий пароль повинен містити мінімум 6 символів.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        fullName, email, role,
        cars: role === 'client' ? cars.filter(c => c.make.trim()) : [],
      };
      // Додаємо пароль лише якщо введено
      if (password) payload.password = password;

      if (isEdit) {
        await usersAPI.update(editUser._id, payload);
      } else {
        await authAPI.register({ ...payload, password });
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Помилка збереження.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-dark-800 border border-dark-600 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">

        {/* Хедер */}
        <div className="flex items-center justify-between p-5 border-b border-dark-700 sticky top-0 bg-dark-800 z-10">
          <div>
            <h2 className="font-display text-xl font-bold text-dark-50 uppercase tracking-wide">
              {isEdit ? '✏️ Редагувати користувача' : '➕ Новий користувач'}
            </h2>
            {isEdit && (
              <p className="text-dark-500 text-xs mt-0.5 font-mono">ID: {editUser._id?.slice(-8)}</p>
            )}
          </div>
          <button onClick={onClose} className="text-dark-400 hover:text-dark-100 p-1 transition-colors">
            <IconX />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-800/50 rounded-lg text-red-300 text-sm animate-fadeIn">
              {error}
            </div>
          )}

          {/* Основні дані */}
          <div className="space-y-3">
            <p className="text-xs text-dark-400 uppercase tracking-wider font-medium border-b border-dark-700 pb-2">
              Основні дані
            </p>

            <div>
              <label className="form-label">ПІБ</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)}
                placeholder="Іван Петренко" required className="input-field" />
            </div>

            <div>
              <label className="form-label">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="user@sto.ua" required className="input-field" />
            </div>

            <div>
              <label className="form-label">
                {isEdit ? 'Новий пароль (залиште порожнім щоб не змінювати)' : 'Пароль'}
              </label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder={isEdit ? 'Введіть новий пароль...' : 'мінімум 6 символів'}
                required={!isEdit}
                className="input-field" />
            </div>

            <div>
              <label className="form-label">Роль</label>
              <select value={role} onChange={e => setRole(e.target.value)} className="input-field">
                <option value="client">👤 Клієнт</option>
                <option value="mechanic">🔧 Майстер</option>
                <option value="admin">⚙️ Адміністратор</option>
              </select>
            </div>
          </div>

          {/* Автомобілі (лише для клієнтів) */}
          {role === 'client' && (
            <div className="space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-dark-700 pb-2">
                <p className="text-xs text-dark-400 uppercase tracking-wider font-medium">Автомобілі</p>
                <button type="button" onClick={addCar}
                  className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
                  + Додати авто
                </button>
              </div>

              {cars.map((car, idx) => (
                <div key={idx} className="p-3 bg-dark-900 border border-dark-700 rounded-lg space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-dark-400 font-medium">Авто #{idx + 1}</p>
                    {cars.length > 1 && (
                      <button type="button" onClick={() => removeCar(idx)}
                        className="text-dark-500 hover:text-red-400 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="form-label">Марка та модель</label>
                      <input value={car.make} onChange={e => updateCar(idx, 'make', e.target.value)}
                        placeholder="Toyota Camry 2022" className="input-field text-sm" />
                    </div>
                    <div>
                      <label className="form-label">VIN</label>
                      <input value={car.vin} onChange={e => updateCar(idx, 'vin', e.target.value)}
                        placeholder="необов'язково" className="input-field text-sm font-mono" maxLength={17} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Кнопки */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
              Скасувати
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading
                ? <><Spinner small /> Збереження...</>
                : isEdit ? '✓ Зберегти зміни' : '➕ Створити'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

//  USERS PAGE
function UsersPage() {
  const { user: currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const [users,        setUsers]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [filterRole,   setFilterRole]   = useState('all'); 
  const [search,       setSearch]       = useState('');
  const [editingUser,  setEditingUser]  = useState(null); 
  const [showCreate,   setShowCreate]   = useState(false); 

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await usersAPI.getAll();
      setUsers(data);
    } catch (err) {
      setError('Помилка завантаження: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleDelete = async (id, name) => {
    if (!confirm(`Видалити користувача "${name}"? Цю дію неможливо скасувати.`)) return;
    try {
      await usersAPI.delete(id);
      setUsers(prev => prev.filter(u => u._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Помилка видалення.');
    }
  };

  const filtered = users.filter(u => {
    const matchRole   = filterRole === 'all' || u.role === filterRole;
    const searchLower = search.toLowerCase();
    const matchSearch = !search ||
      u.fullName.toLowerCase().includes(searchLower) ||
      u.email.toLowerCase().includes(searchLower);
    return matchRole && matchSearch;
  });

  const stats = {
    total:    users.length,
    admin:    users.filter(u => u.role === 'admin').length,
    mechanic: users.filter(u => u.role === 'mechanic').length,
    client:   users.filter(u => u.role === 'client').length,
  };

  const roleFilters = [
    { value: 'all',      label: 'Всі',       count: stats.total    },
    { value: 'admin',    label: 'Адміни',    count: stats.admin    },
    { value: 'mechanic', label: 'Майстри',   count: stats.mechanic },
    { value: 'client',   label: 'Клієнти',   count: stats.client   },
  ];

  return (
    <div className="min-h-screen bg-dark-950">

      {/* ── НАВБАР ── */}
      <header className="bg-dark-900 border-b border-dark-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Логотип */}
            <div className="w-7 h-7 bg-brand-500/20 border border-brand-500/40 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
              </svg>
            </div>
            <span className="font-display font-bold text-dark-100 tracking-wide uppercase text-sm">
              CRM <span className="text-brand-400">СТО</span>
            </span>

            {/* Навігація між сторінками */}
            <div className="hidden sm:flex items-center gap-1 ml-2">
              <button onClick={() => navigate('/admin')}
                className="text-xs px-3 py-1.5 text-dark-400 hover:text-dark-100 hover:bg-dark-800 rounded-lg transition-all">
                ← Наряди
              </button>
              <span className="text-dark-600 text-xs font-mono">/ користувачі</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-dark-400 text-sm">{currentUser?.fullName}</span>
            <button onClick={logout} className="btn-secondary text-xs py-1.5 px-3">Вийти</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ЗАГОЛОВОК */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-dark-50 uppercase tracking-wide">
              👥 Управління користувачами
            </h1>
            <p className="text-dark-400 text-sm mt-0.5">
              Перегляд, створення, редагування та видалення облікових записів
            </p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            ➕ Новий користувач
          </button>
        </div>

        {/* СТАТИСТИКА */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Всього',    value: stats.total,    color: 'text-dark-100' },
            { label: 'Адміни',   value: stats.admin,    color: 'text-brand-300' },
            { label: 'Майстри',  value: stats.mechanic, color: 'text-blue-300' },
            { label: 'Клієнти',  value: stats.client,   color: 'text-purple-300' },
          ].map(s => (
            <div key={s.label} className="card border-dark-700">
              <p className="text-dark-400 text-xs uppercase tracking-wider">{s.label}</p>
              <p className={`font-display text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ФІЛЬТРИ + ПОШУК */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Фільтр за роллю */}
          <div className="flex gap-2 flex-wrap">
            {roleFilters.map(f => (
              <button key={f.value} onClick={() => setFilterRole(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  filterRole === f.value
                    ? 'bg-brand-500 text-white'
                    : 'bg-dark-800 text-dark-300 border border-dark-700 hover:border-brand-500/50'
                }`}>
                {f.label}
                <span className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                  filterRole === f.value ? 'bg-white/20' : 'bg-dark-700 text-dark-400'
                }`}>{f.count}</span>
              </button>
            ))}
          </div>

          {/* Пошук */}
          <div className="relative sm:ml-auto sm:w-64">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Пошук за ім'ям або email..."
              className="input-field pl-9 text-sm"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400"
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300 transition-colors">
                <IconX />
              </button>
            )}
          </div>
        </div>

        {/* ПОМИЛКА */}
        {error && (
          <div className="p-4 bg-red-900/30 border border-red-800/50 rounded-xl text-red-300 text-sm">{error}</div>
        )}

        {/* ТАБЛИЦЯ КОРИСТУВАЧІВ */}
        {loading ? (
          <div className="flex items-center justify-center py-20"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div className="card border-dark-700 text-center py-16">
            <p className="text-4xl mb-3">👤</p>
            <p className="text-dark-300 font-medium">
              {search ? `Нічого не знайдено за "${search}"` : 'Користувачів не знайдено'}
            </p>
            {search && (
              <button onClick={() => setSearch('')}
                className="text-brand-400 text-sm mt-2 hover:text-brand-300 transition-colors">
                Очистити пошук
              </button>
            )}
          </div>
        ) : (
          <div className="card border-dark-700 p-0 overflow-hidden">
            {/* Хедер таблиці */}
            <div className="hidden sm:grid grid-cols-[2fr_2fr_1fr_1fr_100px] gap-4 px-5 py-3 bg-dark-900 border-b border-dark-700 text-xs text-dark-400 uppercase tracking-wider font-medium">
              <span>Користувач</span>
              <span>Email</span>
              <span>Роль</span>
              <span>Авто</span>
              <span>Дії</span>
            </div>

            <div className="divide-y divide-dark-700/50">
              {filtered.map((u, idx) => (
                <div key={u._id}
                  className={`grid grid-cols-1 sm:grid-cols-[2fr_2fr_1fr_1fr_100px] gap-2 sm:gap-4 px-5 py-4 transition-colors animate-fadeIn ${
                    u._id === currentUser?.id
                      ? 'bg-brand-500/5 hover:bg-brand-500/10'
                      : 'hover:bg-dark-700/30'
                  }`}
                  style={{ animationDelay: `${idx * 20}ms` }}
                >
                  {/* Ім'я + аватар */}
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 ${
                      u.role === 'admin'    ? 'bg-brand-500/20 border-brand-500/30' :
                      u.role === 'mechanic' ? 'bg-blue-500/20 border-blue-500/30'  :
                                             'bg-purple-500/20 border-purple-500/30'
                    }`}>
                      <span className={`font-display font-bold text-sm ${
                        u.role === 'admin'    ? 'text-brand-400' :
                        u.role === 'mechanic' ? 'text-blue-400'  : 'text-purple-400'
                      }`}>
                        {u.fullName?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="text-dark-100 text-sm font-medium">
                        {u.fullName}
                        {u._id === currentUser?.id && (
                          <span className="ml-2 text-xs text-brand-400 font-mono">(це ви)</span>
                        )}
                      </p>
                      <p className="text-dark-500 text-xs">
                        {new Date(u.createdAt).toLocaleDateString('uk-UA')}
                      </p>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-center">
                    <span className="text-dark-300 text-sm font-mono truncate">{u.email}</span>
                  </div>

                  {/* Роль */}
                  <div className="flex items-center">
                    <RoleBadge role={u.role} />
                  </div>

                  {/* Авто (лише для клієнтів) */}
                  <div className="flex items-center">
                    {u.role === 'client' && u.cars?.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {u.cars.slice(0, 2).map((car, i) => (
                          <span key={i} className="text-xs text-dark-400 font-mono">
                            🚗 {car.make}
                          </span>
                        ))}
                        {u.cars.length > 2 && (
                          <span className="text-xs text-dark-600">+{u.cars.length - 2} авто</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-dark-600 text-xs italic">—</span>
                    )}
                  </div>

                  {/* Дії: редагувати + видалити */}
                  <div className="flex items-center gap-1">
                    {/* Редагувати */}
                    <button
                      onClick={() => setEditingUser(u)}
                      className="p-1.5 text-dark-400 hover:text-brand-400 hover:bg-brand-500/10 rounded-lg transition-all"
                      title="Редагувати"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>

                    {/* Видалити (не можна видалити себе) */}
                    <button
                      onClick={() => handleDelete(u._id, u.fullName)}
                      disabled={u._id === currentUser?.id}
                      className={`p-1.5 rounded-lg transition-all ${
                        u._id === currentUser?.id
                          ? 'text-dark-700 cursor-not-allowed'
                          : 'text-dark-500 hover:text-red-400 hover:bg-red-900/20'
                      }`}
                      title={u._id === currentUser?.id ? 'Не можна видалити себе' : 'Видалити'}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Футер таблиці */}
            <div className="px-5 py-3 bg-dark-900 border-t border-dark-700 flex items-center justify-between">
              <p className="text-dark-500 text-xs">
                Показано: <span className="text-dark-300">{filtered.length}</span> з <span className="text-dark-300">{users.length}</span> користувачів
              </p>
              {(filterRole !== 'all' || search) && (
                <button
                  onClick={() => { setFilterRole('all'); setSearch(''); }}
                  className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                >
                  Скинути фільтри
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* МОДАЛКИ */}
      {showCreate && (
        <UserFormModal onClose={() => setShowCreate(false)} onSaved={fetchUsers} />
      )}
      {editingUser && (
        <UserFormModal user={editingUser} onClose={() => setEditingUser(null)} onSaved={fetchUsers} />
      )}
    </div>
  );
}

export default UsersPage;