import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { appointmentsAPI, authAPI } from '../api';
import api from '../api';

function Spinner() {
  return <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />;
}

function IconX() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function StatusBadge({ status }) {
  const config = {
    pending:     { label: 'Очікує розгляду', cls: 'bg-yellow-900/40 text-yellow-300 border-yellow-700/50' },
    in_progress: { label: 'В роботі',        cls: 'bg-blue-900/40 text-blue-300 border-blue-700/50' },
    done:        { label: 'Готово',          cls: 'bg-green-900/40 text-green-300 border-green-700/50' },
  };
  const { label, cls } = config[status] || config.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {label}
    </span>
  );
}

function CarIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}

// МОДАЛКА ЗАПИСУ НА СТО
function BookingModal({ onClose, onCreated, cars }) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().slice(0, 10);

  const [selectedCar, setSelectedCar] = useState(cars?.length === 1 ? cars[0] : null);
  const [date,  setDate]  = useState(minDate);
  const [notes, setNotes] = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (cars?.length > 0 && !selectedCar) {
      setError('Будь ласка, оберіть автомобіль.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/appointments/request', {
        date, notes,
        car: selectedCar || null,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Помилка запису. Спробуйте ще раз.');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-dark-800 border border-dark-600 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-dark-700">
          <div>
            <h2 className="font-display text-xl font-bold text-dark-50 uppercase tracking-wide">📅 Запис на СТО</h2>
            <p className="text-dark-400 text-xs mt-0.5">Оберіть зручну дату</p>
          </div>
          <button onClick={onClose} className="text-dark-400 hover:text-dark-100 transition-colors p-1"><IconX /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="p-3 bg-red-900/30 border border-red-800/50 rounded-lg text-red-300 text-sm">{error}</div>}

          {/* ВИБІР АВТО */}
          {cars?.length > 0 && (
            <div>
              <label className="form-label">Автомобіль</label>

              {cars.length === 1 ? (
                <div className="flex items-center gap-3 p-3 bg-brand-500/10 border border-brand-500/30 rounded-xl">
                  <div className="w-9 h-9 bg-brand-500/20 border border-brand-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CarIcon className="w-5 h-5 text-brand-400" />
                  </div>
                  <div>
                    <p className="text-brand-200 font-medium text-sm">{cars[0].make}</p>
                    {cars[0].vin && <p className="text-brand-400/60 text-xs font-mono">{cars[0].vin}</p>}
                  </div>
                  <span className="ml-auto text-xs text-brand-400/70">Обрано автоматично</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {cars.map((car, i) => {
                    const isSelected = selectedCar?.make === car.make && selectedCar?.vin === car.vin;
                    return (
                      <button key={i} type="button" onClick={() => setSelectedCar(car)}
                        className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-brand-500/15 border-brand-500/50 text-brand-200'
                            : 'bg-dark-900 border-dark-700 text-dark-300 hover:border-dark-500'
                        }`}>
                        <div className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 transition-all ${
                          isSelected ? 'bg-brand-500/20 border-brand-500/40' : 'bg-dark-800 border-dark-600'
                        }`}>
                          <CarIcon className={`w-5 h-5 ${isSelected ? 'text-brand-400' : 'text-dark-500'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{car.make}</p>
                          {car.vin && <p className="text-xs font-mono opacity-50 mt-0.5">{car.vin}</p>}
                        </div>
                        {isSelected && (
                          <svg className="w-5 h-5 text-brand-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Дата */}
          <div>
            <label className="form-label">Бажана дата візиту</label>
            <input type="date" value={date} min={minDate} onChange={e => setDate(e.target.value)} required className="input-field" />
          </div>

          {/* Опис проблеми */}
          <div>
            <label className="form-label">Опис проблеми</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4}
              placeholder="Опишіть що турбує: дивні звуки, запах, несправність..."
              className="input-field resize-none" />
            <p className="text-dark-500 text-xs mt-1.5">Детальний опис допоможе майстру підготуватись заздалегідь</p>
          </div>

          {/* Інфо */}
          <div className="p-3 bg-brand-500/10 border border-brand-500/20 rounded-lg flex items-start gap-2">
            <svg className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-brand-300 text-xs leading-relaxed">
              Після подачі заявки адміністратор підтвердить запис та призначить майстра.
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Скасувати</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Відправка...</> : '📅 Записатись'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// КАРТКА НАРЯДУ
function AppointmentCard({ appointment }) {
  const { status, date, mechanic, car, repairDetails, total_price, notes } = appointment;
  const [expanded, setExpanded] = useState(false);

  const formattedDate = new Date(date).toLocaleDateString('uk-UA', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const progressSteps = [
    { key: 'pending',     label: 'Заявку прийнято' },
    { key: 'in_progress', label: 'Ремонт розпочато' },
    { key: 'done',        label: 'Готово до видачі' },
  ];
  const currentStep = progressSteps.findIndex(s => s.key === status);

  return (
    <div className={`card border-dark-700 space-y-4 animate-fadeIn ${
      status === 'in_progress' ? 'border-blue-700/40' :
      status === 'done'        ? 'border-green-700/40' : ''
    }`}>

      {/* Хедер */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-dark-400 text-xs font-mono">{formattedDate}</p>
          <p className="text-dark-200 text-sm mt-0.5">
            Майстер: <span className="text-dark-100 font-medium">{mechanic?.fullName || 'Призначається'}</span>
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* АВТО НАРЯДУ */}
      {car?.make && (
        <div className="flex items-center gap-3 p-3 bg-brand-500/10 border border-brand-500/25 rounded-xl">
          <div className="w-9 h-9 bg-brand-500/20 border border-brand-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <CarIcon className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <p className="text-brand-200 font-medium text-sm">{car.make}</p>
            {car.vin && <p className="text-brand-400/60 text-xs font-mono mt-0.5">{car.vin}</p>}
          </div>
        </div>
      )}

      {/* Прогрес-бар */}
      <div className="space-y-2">
        <div className="flex items-center">
          {progressSteps.map((step, i) => {
            const isDone    = i <= currentStep;
            const isCurrent = i === currentStep;
            return (
              <div key={step.key} className="flex items-center flex-1 last:flex-none">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                  isDone
                    ? isCurrent && status !== 'done' ? 'bg-blue-500 shadow-blue-500/50 shadow-md' : 'bg-green-600'
                    : 'bg-dark-700 border border-dark-600'
                }`}>
                  {isDone ? (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : <span className="w-1.5 h-1.5 rounded-full bg-dark-500" />}
                </div>
                {i < progressSteps.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-1 ${i < currentStep ? 'bg-green-600' : 'bg-dark-700'}`} />
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-between">
          {progressSteps.map((step, i) => (
            <p key={step.key} className={`text-xs leading-tight ${i === currentStep ? 'text-dark-200 font-medium' : 'text-dark-500'}`}>
              {step.label}
            </p>
          ))}
        </div>
      </div>

      {/* Примітки */}
      {notes && (
        <div className="p-3 bg-dark-900 border border-dark-700 rounded-lg">
          <p className="text-xs text-dark-400 uppercase tracking-wider mb-1">Опис проблеми</p>
          <p className="text-dark-300 text-sm">{notes}</p>
        </div>
      )}

      {/* Деталі робіт */}
      {repairDetails?.length > 0 && (
        <div>
          <button onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-sm text-dark-400 hover:text-dark-200 transition-colors">
            <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {expanded ? 'Сховати деталі' : `Деталі робіт (${repairDetails.length} позицій)`}
          </button>
          {expanded && (
            <div className="mt-3 space-y-1.5 animate-fadeIn">
              {repairDetails.map((rd, i) => (
                <div key={i} className="flex items-center justify-between gap-3 py-1.5 border-b border-dark-700/50 last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${rd.inventoryItem?.type === 'service' ? 'bg-purple-400' : 'bg-cyan-400'}`} />
                    <span className="text-dark-200 text-sm truncate">{rd.inventoryItem?.name || '—'}</span>
                    {rd.quantity > 1 && <span className="text-dark-500 text-xs">×{rd.quantity}</span>}
                  </div>
                  <span className="text-dark-300 text-sm font-mono flex-shrink-0">
                    {(rd.savedPrice * rd.quantity).toLocaleString('uk-UA')} грн
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Вартість */}
      {total_price > 0 && (
        <div className="flex items-center justify-between pt-2 border-t border-dark-700">
          <span className="text-dark-400 text-sm">Вартість</span>
          <span className="text-brand-400 font-mono font-bold text-lg">{total_price.toLocaleString('uk-UA')} грн</span>
        </div>
      )}

      {status === 'done' && (
        <div className="flex items-center gap-2 p-3 bg-green-900/20 border border-green-800/40 rounded-lg">
          <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-green-300 text-sm">Ваш автомобіль готовий! Можете забирати 🎉</p>
        </div>
      )}
    </div>
  );
}

// СЕКЦІЯ МОЇ АВТО
function MyCarsSection({ cars }) {
  if (!cars || cars.length === 0) {
    return (
      <div className="card border-dark-700 text-center py-8">
        <p className="text-3xl mb-2">🚗</p>
        <p className="text-dark-400 text-sm">Автомобілів не додано</p>
        <p className="text-dark-600 text-xs mt-1">Зверніться до адміністратора для додавання авто</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {cars.map((car, i) => (
        <div key={i} className="card border-dark-700 flex items-center gap-4 animate-slideIn">
          <div className="w-12 h-12 bg-brand-500/10 border border-brand-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <CarIcon className="w-6 h-6 text-brand-400" />
          </div>
          <div className="min-w-0">
            <p className="text-dark-100 font-medium text-sm truncate">{car.make}</p>
            {car.vin
              ? <p className="text-dark-500 text-xs font-mono mt-0.5">{car.vin}</p>
              : <p className="text-dark-600 text-xs mt-0.5 italic">VIN не вказано</p>
            }
          </div>
        </div>
      ))}
    </div>
  );
}

// ГОЛОВНИЙ КОМПОНЕНТ
function ClientDashboard() {
  const { user: authUser, logout } = useAuth();

  const [profile,      setProfile]      = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [activeTab,    setActiveTab]    = useState('appointments');
  const [showBooking,  setShowBooking]  = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, apptRes] = await Promise.all([
        authAPI.getMe(),
        appointmentsAPI.getAll(),
      ]);
      setProfile(meRes.data.user);
      setAppointments(apptRes.data);
    } catch (err) {
      console.error('Помилка завантаження:', err);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const cars  = profile?.cars || [];
  const active = appointments.filter(a => a.status !== 'done').length;
  const done   = appointments.filter(a => a.status === 'done').length;

  const sorted = [...appointments].sort((a, b) => {
    const order = { in_progress: 0, pending: 1, done: 2 };
    return order[a.status] - order[b.status];
  });

  return (
    <div className="min-h-screen bg-dark-950">
      <header className="bg-dark-900 border-b border-dark-700 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-brand-500/20 border border-brand-500/40 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
              </svg>
            </div>
            <span className="font-display font-bold text-dark-100 tracking-wide uppercase text-sm">CRM <span className="text-brand-400">СТО</span></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:block text-dark-400 text-sm">{authUser?.fullName}</span>
            <button onClick={logout} className="btn-secondary text-xs py-1.5 px-3">Вийти</button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-5">

        {/* Привітання + кнопка запису */}
        <div className="card border-dark-700 bg-gradient-to-r from-brand-500/10 to-transparent flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-brand-500/20 border border-brand-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-brand-400 font-display font-bold text-xl">{authUser?.fullName?.charAt(0) || 'К'}</span>
            </div>
            <div>
              <p className="text-dark-100 font-medium">{authUser?.fullName}</p>
              <p className="text-dark-500 text-xs">{authUser?.email}</p>
            </div>
          </div>
          <button onClick={() => setShowBooking(true)} className="btn-primary text-sm flex-shrink-0">
            📅 Записатись
          </button>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Всього',   value: appointments.length, color: 'text-dark-100' },
            { label: 'Активних', value: active,              color: 'text-blue-300' },
            { label: 'Виконано', value: done,                color: 'text-green-300' },
          ].map(s => (
            <div key={s.label} className="card border-dark-700 text-center p-3">
              <p className={`font-display text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-dark-500 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Таби */}
        <div className="flex gap-2 bg-dark-900 border border-dark-700 p-1 rounded-xl">
          {[
            { value: 'appointments', label: `📋 Мої наряди` },
            { value: 'cars',         label: `🚗 Мої авто` },
          ].map(tab => (
            <button key={tab.value} onClick={() => setActiveTab(tab.value)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === tab.value ? 'bg-brand-500 text-white shadow-sm' : 'text-dark-400 hover:text-dark-200'
              }`}>{tab.label}</button>
          ))}
        </div>

        {/* Вміст */}
        {activeTab === 'appointments' && (
          loading ? (
            <div className="flex items-center justify-center py-20"><Spinner /></div>
          ) : sorted.length === 0 ? (
            <div className="card border-dark-700 text-center py-14">
              <p className="text-5xl mb-3">🔧</p>
              <p className="text-dark-200 font-medium">Нарядів ще немає</p>
              <p className="text-dark-500 text-sm mt-2">Натисніть "📅 Записатись" щоб подати заявку</p>
              <button onClick={() => setShowBooking(true)} className="btn-primary mt-4 mx-auto">Записатись на СТО</button>
            </div>
          ) : (
            <div className="space-y-4">
              {sorted.map(appt => <AppointmentCard key={appt._id} appointment={appt} />)}
            </div>
          )
        )}

        {activeTab === 'cars' && (
          loading ? (
            <div className="flex items-center justify-center py-10"><Spinner /></div>
          ) : (
            <MyCarsSection cars={cars} />
          )
        )}

        <div className="h-6" />
      </main>

      {showBooking && (
        <BookingModal onClose={() => setShowBooking(false)} onCreated={fetchData} cars={cars} />
      )}
    </div>
  );
}

export default ClientDashboard;