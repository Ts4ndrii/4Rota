import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { appointmentsAPI } from '../api';

// ДОПОМІЖНІ КОМПОНЕНТИ

/* Спінер */
function Spinner() {
  return (
    <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
  );
}

/* Бейдж статусу */
function StatusBadge({ status }) {
  const config = {
    pending:     { label: 'Очікує',   cls: 'bg-yellow-900/40 text-yellow-300 border-yellow-700/50' },
    in_progress: { label: 'В роботі', cls: 'bg-blue-900/40 text-blue-300 border-blue-700/50' },
    done:        { label: 'Готово',   cls: 'bg-green-900/40 text-green-300 border-green-700/50' },
  };
  const { label, cls } = config[status] || config.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {label}
    </span>
  );
}

/* Картка одного наряду */
function AppointmentCard({ appointment, onStatusChange, updating }) {
  const { client, repairDetails, total_price, status, date, notes } = appointment;

  const nextStatus = {
    pending:     { value: 'in_progress', label: '▶ Розпочати роботу',  cls: 'btn-primary' },
    in_progress: { value: 'done',        label: '✓ Позначити готовим', cls: 'bg-green-700 hover:bg-green-600 text-white font-medium text-sm px-4 py-2.5 rounded-lg transition-all active:scale-95 inline-flex items-center justify-center gap-2 w-full' },
    done:        null,
  };

  const next = nextStatus[status];

  const formattedDate = new Date(date).toLocaleDateString('uk-UA', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  return (
    <div className={`card border-dark-700 space-y-4 animate-fadeIn transition-all ${
      status === 'in_progress' ? 'border-blue-700/50 shadow-blue-900/20 shadow-lg' : ''
    }`}>

      {/* Хедер картки */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-bold text-dark-50 uppercase tracking-wide truncate">
            {client?.fullName || 'Клієнт'}
          </h3>
          <p className="text-dark-400 text-sm mt-0.5">{client?.email}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Авто клієнта */}
      {client?.cars?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {client.cars.map((car, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-dark-900 border border-dark-700 rounded-lg">
              <svg className="w-4 h-4 text-brand-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
              <div>
                <p className="text-dark-200 text-xs font-medium">{car.make}</p>
                {car.vin && <p className="text-dark-500 text-xs font-mono">{car.vin}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Дата */}
      <div className="flex items-center gap-2 text-dark-400 text-sm">
        <svg className="w-4 h-4 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {formattedDate}
      </div>

      {/* Список послуг */}
      <div className="space-y-2">
        <p className="text-xs text-dark-400 uppercase tracking-wider font-medium">
          Роботи та запчастини
        </p>
        {repairDetails?.length > 0 ? (
          <div className="space-y-1.5">
            {repairDetails.map((rd, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-2 border-b border-dark-700/50 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    rd.inventoryItem?.type === 'service' ? 'bg-purple-400' : 'bg-cyan-400'
                  }`} />
                  <span className="text-dark-200 text-sm truncate">{rd.inventoryItem?.name || '—'}</span>
                  {rd.quantity > 1 && (
                    <span className="text-dark-500 text-xs flex-shrink-0">×{rd.quantity}</span>
                  )}
                </div>
                <span className="text-dark-300 text-sm font-mono flex-shrink-0">
                  {(rd.savedPrice * rd.quantity).toLocaleString('uk-UA')} грн
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-dark-500 text-sm">Позиції не додано</p>
        )}
      </div>

      {/* Примітки */}
      {notes && (
        <div className="p-3 bg-dark-900 border border-dark-700 rounded-lg">
          <p className="text-xs text-dark-400 uppercase tracking-wider font-medium mb-1">Примітки</p>
          <p className="text-dark-300 text-sm leading-relaxed">{notes}</p>
        </div>
      )}

      {/* Підсумок вартості */}
      <div className="flex items-center justify-between pt-1 border-t border-dark-700">
        <span className="text-dark-400 text-sm">Загальна вартість</span>
        <span className="text-brand-400 font-mono font-bold text-xl">
          {total_price?.toLocaleString('uk-UA')} грн
        </span>
      </div>

      {/* Кнопка зміни статусу */}
      {next && (
        <button
          onClick={() => onStatusChange(appointment._id, next.value)}
          disabled={updating === appointment._id}
          className={next.cls + (updating === appointment._id ? ' opacity-60 cursor-not-allowed' : '')}
        >
          {updating === appointment._id ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Оновлення...
            </>
          ) : (
            next.label
          )}
        </button>
      )}

      {/* Статус "готово" */}
      {status === 'done' && (
        <div className="flex items-center gap-2 p-3 bg-green-900/20 border border-green-800/40 rounded-lg">
          <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-green-300 text-sm font-medium">Наряд виконано</p>
        </div>
      )}
    </div>
  );
}

// MECHANIC DASHBOARD

function MechanicDashboard() {
  const { user, logout } = useAuth();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [updating, setUpdating]         = useState(null); // id наряду що оновлюється
  const [error, setError]               = useState('');
  const [filterStatus, setFilterStatus] = useState('active'); // active | all

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await appointmentsAPI.getAll();
      setAppointments(data);
    } catch (err) {
      setError('Помилка завантаження: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  /* Зміна статусу наряду */
  const handleStatusChange = async (id, newStatus) => {
    setUpdating(id);
    try {
      const { data } = await appointmentsAPI.updateStatus(id, newStatus);
      setAppointments(prev => prev.map(a => a._id === id ? data : a));
    } catch {
      alert('Помилка оновлення статусу. Спробуйте ще раз.');
    } finally {
      setUpdating(null);
    }
  };

  // Фільтрація: "active" = pending + in_progress, "all"
  const filtered = filterStatus === 'active'
    ? appointments.filter(a => a.status !== 'done')
    : appointments;

  const stats = {
    pending:     appointments.filter(a => a.status === 'pending').length,
    inProgress:  appointments.filter(a => a.status === 'in_progress').length,
    done:        appointments.filter(a => a.status === 'done').length,
  };

  return (
    <div className="min-h-screen bg-dark-950">

      {/* НАВБАР (мобільний) */}
      <header className="bg-dark-900 border-b border-dark-700 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-brand-500/20 border border-brand-500/40 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
              </svg>
            </div>
            <div>
              <span className="font-display font-bold text-dark-100 tracking-wide uppercase text-sm">
                4 <span className="text-brand-400">Rota</span>
              </span>
              <span className="text-dark-600 text-xs font-mono ml-2 hidden sm:inline">/ майстер</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Кнопка оновити */}
            <button
              onClick={fetchAppointments}
              disabled={loading}
              className="p-2 text-dark-400 hover:text-dark-100 hover:bg-dark-800 rounded-lg transition-all"
              title="Оновити"
            >
              <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button onClick={logout} className="btn-secondary text-xs py-1.5 px-3">
              Вийти
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-5">

        {/* ПРИВІТАННЯ */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-500/20 border border-brand-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-brand-400 font-display font-bold text-lg">
              {user?.fullName?.charAt(0) || 'М'}
            </span>
          </div>
          <div>
            <p className="text-dark-100 font-medium">{user?.fullName}</p>
            <p className="text-dark-500 text-xs">
              {new Date().toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>

        {/* КАРТКИ СТАТИСТИКИ */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Очікує',   value: stats.pending,    color: 'text-yellow-300', dot: 'bg-yellow-400' },
            { label: 'В роботі', value: stats.inProgress, color: 'text-blue-300',   dot: 'bg-blue-400' },
            { label: 'Готово',   value: stats.done,       color: 'text-green-300',  dot: 'bg-green-400' },
          ].map(s => (
            <div key={s.label} className="card border-dark-700 p-3 text-center">
              <div className={`w-2 h-2 rounded-full ${s.dot} mx-auto mb-1.5`} />
              <p className={`font-display text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-dark-500 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ФІЛЬТР */}
        <div className="flex gap-2 bg-dark-900 border border-dark-700 p-1 rounded-xl">
          {[
            { value: 'active', label: '🔥 Активні' },
            { value: 'all',    label: 'Всі наряди' },
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setFilterStatus(f.value)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                filterStatus === f.value
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-dark-400 hover:text-dark-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* ПОМИЛКА */}
        {error && (
          <div className="p-4 bg-red-900/30 border border-red-800/50 rounded-xl text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* СПИСОК НАРЯДІВ */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card border-dark-700 text-center py-16">
            <p className="text-5xl mb-4">
              {filterStatus === 'active' ? '🎉' : '🔧'}
            </p>
            <p className="text-dark-200 font-medium text-lg">
              {filterStatus === 'active' ? 'Немає активних завдань!' : 'Нарядів не знайдено'}
            </p>
            <p className="text-dark-500 text-sm mt-2">
              {filterStatus === 'active'
                ? 'Всі роботи виконано. Відпочивайте 😊'
                : 'Адміністратор ще не призначив вам нарядів'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Індикатор "в роботі" вгорі якщо є */}
            {filtered.some(a => a.status === 'in_progress') && (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-900/20 border border-blue-800/40 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <p className="text-blue-300 text-xs font-medium">
                  {filtered.filter(a => a.status === 'in_progress').length} наряд(и) в роботі
                </p>
              </div>
            )}

            {/* Сортування: in_progress → pending → done */}
            {[...filtered]
              .sort((a, b) => {
                const order = { in_progress: 0, pending: 1, done: 2 };
                return order[a.status] - order[b.status];
              })
              .map(appt => (
                <AppointmentCard
                  key={appt._id}
                  appointment={appt}
                  onStatusChange={handleStatusChange}
                  updating={updating}
                />
              ))
            }
          </div>
        )}

        {/* Відступ знизу для мобільних */}
        <div className="h-6" />
      </main>
    </div>
  );
}

export default MechanicDashboard;