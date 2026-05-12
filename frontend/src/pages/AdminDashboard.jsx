import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { appointmentsAPI, inventoryAPI, usersAPI, authAPI } from '../api';
import api from '../api';

// ДОПОМІЖНІ КОМПОНЕНТИ

function IconX() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function IconEdit() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function Spinner({ small }) {
  return (
    <div className={`${small ? 'w-4 h-4 border-2' : 'w-8 h-8 border-2'} border-brand-500 border-t-transparent rounded-full animate-spin`} />
  );
}

// СПІЛЬНА ФОРМА НАРЯДУ

function AppointmentForm({
  appointment,
  onClose, onSaved,
  clients, mechanics, inventory,
}) {
  const isEdit = !!appointment;

  const [clientId,   setClientId]   = useState(appointment?.client?._id   || '');
  const [mechanicId, setMechanicId] = useState(appointment?.mechanic?._id || '');
  const [status,     setStatus]     = useState(appointment?.status        || 'pending');
  const [notes,      setNotes]      = useState(appointment?.notes         || '');
  const [date,       setDate]       = useState(
    appointment?.date
      ? new Date(appointment.date).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  );

  const [selectedItems, setSelectedItems] = useState(
    appointment?.repairDetails?.map(rd => ({
      inventoryId: rd.inventoryItem?._id || rd.inventoryItem,
      quantity:    rd.quantity,
      savedPrice:  rd.savedPrice,
    })) || []
  );

  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  // Управління позиціями

  const addItem = (inventoryId) => {
    if (!inventoryId) return;
    const already = selectedItems.find(i => i.inventoryId === inventoryId);
    if (already) {
      setSelectedItems(prev =>
        prev.map(i => i.inventoryId === inventoryId ? { ...i, quantity: i.quantity + 1 } : i)
      );
    } else {
      const inv = inventory.find(i => i._id === inventoryId);
      setSelectedItems(prev => [...prev, {
        inventoryId,
        quantity:   1,
        savedPrice: inv?.price || 0,
      }]);
    }
  };

  const changeQty = (inventoryId, qty) => {
    const q = parseInt(qty);
    if (q < 1) return;
    setSelectedItems(prev =>
      prev.map(i => i.inventoryId === inventoryId ? { ...i, quantity: q } : i)
    );
  };

  const removeItem = (inventoryId) =>
    setSelectedItems(prev => prev.filter(i => i.inventoryId !== inventoryId));

  // Підрахунок суми
  const totalPrice = selectedItems.reduce((sum, si) => {
    const inv = inventory.find(i => i._id === si.inventoryId);
    const price = si.savedPrice || inv?.price || 0;
    return sum + price * si.quantity;
  }, 0);

  // Сабміт

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!clientId || !mechanicId) {
      setError('Оберіть клієнта та майстра.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        client:   clientId,
        mechanic: mechanicId,
        date,
        notes,
        status,
        repairItems: selectedItems.map(si => ({
          inventoryId: si.inventoryId,
          quantity:    si.quantity,
          savedPrice:  si.savedPrice,
        })),
      };

      if (isEdit) {
        await api.put(`/appointments/${appointment._id}`, payload);
      } else {
        if (selectedItems.length === 0) {
          setError('Додайте хоча б одну послугу.');
          setLoading(false);
          return;
        }
        await appointmentsAPI.create(payload);
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Помилка збереження наряду.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-dark-800 border border-dark-600 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">

        {/* Хедер */}
        <div className="flex items-center justify-between p-5 border-b border-dark-700 sticky top-0 bg-dark-800 z-10">
          <div>
            <h2 className="font-display text-xl font-bold text-dark-50 uppercase tracking-wide">
              {isEdit ? '✏️ Редагувати наряд' : '➕ Новий наряд'}
            </h2>
            {isEdit && (
              <p className="text-dark-500 text-xs mt-0.5 font-mono">
                ID: {appointment._id?.slice(-8)}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-dark-400 hover:text-dark-100 transition-colors p-1">
            <IconX />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">

          {error && (
            <div className="p-3 bg-red-900/30 border border-red-800/50 rounded-lg text-red-300 text-sm animate-fadeIn">
              {error}
            </div>
          )}

          {/* Клієнт + Майстер */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Клієнт</label>
              <select value={clientId} onChange={e => setClientId(e.target.value)} className="input-field" required>
                <option value="">— Оберіть клієнта —</option>
                {clients.map(c => (
                  <option key={c._id} value={c._id}>{c.fullName} ({c.email})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Майстер</label>
              <select value={mechanicId} onChange={e => setMechanicId(e.target.value)} className="input-field" required>
                <option value="">— Оберіть майстра —</option>
                {mechanics.map(m => (
                  <option key={m._id} value={m._id}>{m.fullName}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Авто вибраного клієнта */}
          {clientId && clients.find(c => c._id === clientId)?.cars?.length > 0 && (
            <div className="p-3 bg-dark-900 border border-dark-700 rounded-lg animate-fadeIn">
              <p className="text-xs text-dark-400 uppercase tracking-wider mb-2">Авто клієнта</p>
              <div className="flex flex-wrap gap-2">
                {clients.find(c => c._id === clientId).cars.map((car, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 bg-dark-800 border border-dark-600 rounded-lg text-dark-300 font-mono">
                    🚗 {car.make} {car.vin && `· ${car.vin}`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Дата + Статус */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Дата</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="form-label">Статус</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className="input-field">
                <option value="pending">⏳ Очікує</option>
                <option value="in_progress">🔧 В роботі</option>
                <option value="done">✅ Готово</option>
              </select>
            </div>
          </div>

          {/* Послуги */}
          <div>
            <label className="form-label">Послуги та запчастини</label>
            <select
              onChange={e => { addItem(e.target.value); e.target.value = ''; }}
              className="input-field"
              defaultValue=""
            >
              <option value="">+ Додати позицію...</option>
              {inventory.map(inv => (
                <option key={inv._id} value={inv._id}>
                  [{inv.type === 'service' ? 'Послуга' : 'Запчастина'}] {inv.name} — {inv.price} грн
                </option>
              ))}
            </select>

            {selectedItems.length > 0 && (
              <div className="mt-3 space-y-2">
                {selectedItems.map(si => {
                  const inv   = inventory.find(i => i._id === si.inventoryId);
                  const name  = inv?.name  || '(видалена позиція)';
                  const price = si.savedPrice || inv?.price || 0;
                  return (
                    <div key={si.inventoryId} className="flex items-center gap-3 p-3 bg-dark-900 rounded-lg border border-dark-700 animate-fadeIn">
                      <div className="flex-1 min-w-0">
                        <p className="text-dark-100 text-sm font-medium truncate">{name}</p>
                        <p className="text-dark-400 text-xs">
                          {price} грн × {si.quantity} = <span className="text-brand-400 font-medium">{price * si.quantity} грн</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => changeQty(si.inventoryId, si.quantity - 1)}
                          className="w-7 h-7 flex items-center justify-center bg-dark-700 hover:bg-dark-600 text-dark-200 rounded text-sm transition-colors">−</button>
                        <span className="w-8 text-center text-dark-100 text-sm font-mono">{si.quantity}</span>
                        <button type="button" onClick={() => changeQty(si.inventoryId, si.quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center bg-dark-700 hover:bg-dark-600 text-dark-200 rounded text-sm transition-colors">+</button>
                      </div>
                      <button type="button" onClick={() => removeItem(si.inventoryId)}
                        className="text-dark-500 hover:text-red-400 transition-colors p-1"><IconX /></button>
                    </div>
                  );
                })}
                <div className="flex justify-end pt-1">
                  <span className="text-sm text-dark-300">
                    Разом: <span className="text-brand-400 font-bold font-mono text-base">{totalPrice} грн</span>
                  </span>
                </div>
              </div>
            )}

            {selectedItems.length === 0 && (
              <p className="text-dark-600 text-xs mt-2 italic">
                {isEdit ? 'Позиції видалено — додайте нові або залиште порожнім' : 'Додайте хоча б одну послугу'}
              </p>
            )}
          </div>

          {/* Примітки */}
          <div>
            <label className="form-label">Примітки</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Скарги клієнта, додаткові деталі..."
              className="input-field resize-none"
            />
          </div>

          {/* Кнопки */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
              Скасувати
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading
                ? <><Spinner small /> Збереження...</>
                : isEdit ? '✓ Зберегти зміни' : 'Створити наряд'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// МОДАЛКА РЕЄСТРАЦІЇ КЛІЄНТА

function RegisterClientModal({ onClose, onCreated }) {
  const [fullName, setFullName] = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [cars,     setCars]     = useState([{ vin: '', make: '' }]);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');
  const [loading,  setLoading]  = useState(false);

  const addCar    = () => setCars(prev => [...prev, { vin: '', make: '' }]);
  const removeCar = (idx) => setCars(prev => prev.filter((_, i) => i !== idx));
  const updateCar = (idx, field, value) =>
    setCars(prev => prev.map((car, i) => i === idx ? { ...car, [field]: value } : car));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (password.length < 6) { setError('Пароль мінімум 6 символів.'); return; }
    setLoading(true);
    try {
      await authAPI.register({
        fullName, email, password,
        role: 'client',
        cars: cars.filter(c => c.make.trim()),
      });
      setSuccess(`✅ Клієнта "${fullName}" зареєстровано!`);
      setFullName(''); setEmail(''); setPassword('');
      setCars([{ vin: '', make: '' }]);
      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || 'Помилка реєстрації.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-dark-800 border border-dark-600 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-dark-700 sticky top-0 bg-dark-800 z-10">
          <div>
            <h2 className="font-display text-xl font-bold text-dark-50 uppercase tracking-wide">👤 Новий клієнт</h2>
            <p className="text-dark-400 text-xs mt-0.5">Реєстрація клієнта в системі</p>
          </div>
          <button onClick={onClose} className="text-dark-400 hover:text-dark-100 transition-colors p-1"><IconX /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {error   && <div className="p-3 bg-red-900/30 border border-red-800/50 rounded-lg text-red-300 text-sm">{error}</div>}
          {success && <div className="p-3 bg-green-900/30 border border-green-800/50 rounded-lg text-green-300 text-sm">{success}</div>}

          <div className="space-y-3">
            <p className="text-xs text-dark-400 uppercase tracking-wider font-medium border-b border-dark-700 pb-2">Особисті дані</p>
            <div>
              <label className="form-label">ПІБ</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Іван Петренко" required className="input-field" />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="client@example.com" required className="input-field" />
            </div>
            <div>
              <label className="form-label">Пароль</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="мінімум 6 символів" required className="input-field" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-dark-700 pb-2">
              <p className="text-xs text-dark-400 uppercase tracking-wider font-medium">Автомобілі</p>
              <button type="button" onClick={addCar} className="text-xs text-brand-400 hover:text-brand-300 transition-colors">+ Додати авто</button>
            </div>
            {cars.map((car, idx) => (
              <div key={idx} className="p-3 bg-dark-900 border border-dark-700 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-dark-400 font-medium">Авто #{idx + 1}</p>
                  {cars.length > 1 && (
                    <button type="button" onClick={() => removeCar(idx)} className="text-dark-500 hover:text-red-400 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="form-label">Марка та модель</label>
                    <input value={car.make} onChange={e => updateCar(idx, 'make', e.target.value)} placeholder="Toyota Camry 2022" className="input-field text-sm" />
                  </div>
                  <div>
                    <label className="form-label">VIN (необов'язково)</label>
                    <input value={car.vin} onChange={e => updateCar(idx, 'vin', e.target.value)} placeholder="1HGBH41JXMN109186" className="input-field text-sm font-mono" maxLength={17} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Закрити</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? <><Spinner small /> Реєстрація...</> : '👤 Зареєструвати'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// МОДАЛКА ДОВІДНИКА

function InventoryModal({ onClose, inventory, onRefresh }) {
  const [name, setName]   = useState('');
  const [type, setType]   = useState('service');
  const [price, setPrice] = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    if (!name || !price) { setError('Заповніть всі поля.'); return; }
    setLoading(true);
    try {
      await inventoryAPI.create({ name, type, price: parseFloat(price) });
      setName(''); setPrice(''); setType('service');
      onRefresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Помилка.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Видалити?')) return;
    try { await inventoryAPI.delete(id); onRefresh(); }
    catch { alert('Помилка видалення.'); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-dark-800 border border-dark-600 rounded-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-dark-700 sticky top-0 bg-dark-800 z-10">
          <h2 className="font-display text-xl font-bold text-dark-50 uppercase tracking-wide">Довідник послуг</h2>
          <button onClick={onClose} className="text-dark-400 hover:text-dark-100 transition-colors p-1"><IconX /></button>
        </div>
        <div className="p-5 space-y-5">
          <form onSubmit={handleAdd} className="space-y-3">
            {error && <div className="p-2.5 bg-red-900/30 border border-red-800/50 rounded-lg text-red-300 text-sm">{error}</div>}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="form-label">Назва</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Заміна масла" className="input-field" />
              </div>
              <div>
                <label className="form-label">Тип</label>
                <select value={type} onChange={e => setType(e.target.value)} className="input-field">
                  <option value="service">Послуга</option>
                  <option value="part">Запчастина</option>
                </select>
              </div>
              <div>
                <label className="form-label">Ціна (грн)</label>
                <input type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} placeholder="500" className="input-field" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              {loading ? <><Spinner small /> Додавання...</> : '+ Додати позицію'}
            </button>
          </form>
          <div className="space-y-2">
            {inventory.map(item => (
              <div key={item._id} className="flex items-center gap-3 p-3 bg-dark-900 rounded-lg border border-dark-700">
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${item.type === 'service' ? 'bg-purple-900/40 text-purple-300' : 'bg-cyan-900/40 text-cyan-300'}`}>
                  {item.type === 'service' ? 'Послуга' : 'Запчастина'}
                </span>
                <span className="flex-1 text-dark-100 text-sm">{item.name}</span>
                <span className="text-brand-400 font-mono text-sm">{item.price} грн</span>
                <button onClick={() => handleDelete(item._id)} className="text-dark-500 hover:text-red-400 transition-colors p-1"><IconX /></button>
              </div>
            ))}
            {inventory.length === 0 && <p className="text-dark-500 text-sm text-center py-4">Довідник порожній</p>}
          </div>
        </div>
      </div>
    </div>
  );
}


// МОДАЛКА КЛІЄНТІВ

function ClientsModal({ onClose, clients }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-dark-800 border border-dark-600 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-dark-700 sticky top-0 bg-dark-800 z-10">
          <div>
            <h2 className="font-display text-xl font-bold text-dark-50 uppercase tracking-wide">База клієнтів</h2>
            <p className="text-dark-400 text-xs mt-0.5">Всього: {clients.length}</p>
          </div>
          <button onClick={onClose} className="text-dark-400 hover:text-dark-100 transition-colors p-1"><IconX /></button>
        </div>
        <div className="p-5 space-y-2">
          {clients.length === 0 ? (
            <p className="text-dark-500 text-sm text-center py-8">Клієнтів ще немає</p>
          ) : clients.map(client => (
            <div key={client._id} className="p-4 bg-dark-900 border border-dark-700 rounded-xl space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-brand-500/20 border border-brand-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-brand-400 font-display font-bold">{client.fullName?.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-dark-100 font-medium text-sm">{client.fullName}</p>
                    <p className="text-dark-400 text-xs">{client.email}</p>
                  </div>
                </div>
                <span className="text-xs px-2 py-0.5 bg-dark-800 border border-dark-600 rounded text-dark-400 flex-shrink-0">
                  {new Date(client.createdAt).toLocaleDateString('uk-UA')}
                </span>
              </div>
              {client.cars?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pl-12">
                  {client.cars.map((car, i) => (
                    <span key={i} className="text-xs px-2 py-1 bg-dark-800 border border-dark-600 rounded-lg text-dark-300 font-mono">
                      🚗 {car.make} {car.vin && `· ${car.vin.slice(-6)}`}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


// ГОЛОВНИЙ КОМПОНЕНТ

function AdminDashboard() {
  const { user, logout } = useAuth();

  const [appointments, setAppointments] = useState([]);
  const [inventory,    setInventory]    = useState([]);
  const [clients,      setClients]      = useState([]);
  const [mechanics,    setMechanics]    = useState([]);
  const [loadingData,  setLoadingData]  = useState(true);
  const [error,        setError]        = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Який наряд редагуємо (null = не редагуємо)
  const [editingAppointment, setEditingAppointment] = useState(null);

  // Модалки
  const [showCreate,   setShowCreate]   = useState(false);
  const [showInventory,setShowInventory]= useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showClients,  setShowClients]  = useState(false);

  const fetchAll = useCallback(async () => {
    setLoadingData(true);
    setError('');
    try {
      const [apptRes, invRes, clientRes, mechRes] = await Promise.all([
        appointmentsAPI.getAll(),
        inventoryAPI.getAll(),
        usersAPI.getClients(),
        usersAPI.getMechanics(),
      ]);
      setAppointments(apptRes.data);
      setInventory(invRes.data);
      setClients(clientRes.data);
      setMechanics(mechRes.data);
    } catch (err) {
      setError('Помилка завантаження: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDelete = async (id) => {
    if (!confirm('Видалити цей наряд?')) return;
    try {
      await appointmentsAPI.delete(id);
      setAppointments(prev => prev.filter(a => a._id !== id));
    } catch { alert('Помилка видалення.'); }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const { data } = await appointmentsAPI.updateStatus(id, newStatus);
      setAppointments(prev => prev.map(a => a._id === id ? data : a));
    } catch { alert('Помилка зміни статусу.'); }
  };

  const filtered = filterStatus === 'all'
    ? appointments
    : appointments.filter(a => a.status === filterStatus);

  const stats = {
    total:      appointments.length,
    pending:    appointments.filter(a => a.status === 'pending').length,
    inProgress: appointments.filter(a => a.status === 'in_progress').length,
    done:       appointments.filter(a => a.status === 'done').length,
  };

  return (
    <div className="min-h-screen bg-dark-950">
      {/* НАВБАР */}
      <header className="bg-dark-900 border-b border-dark-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-brand-500/20 border border-brand-500/40 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
              </svg>
            </div>
            <span className="font-display font-bold text-dark-100 tracking-wide uppercase text-sm">
              4 <span className="text-brand-400">Rota</span>
            </span>
            <span className="hidden sm:block text-dark-600 text-xs font-mono">/ admin</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-dark-400 text-sm">{user?.fullName}</span>
            <button onClick={logout} className="btn-secondary text-xs py-1.5 px-3">Вийти</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* СТАТИСТИКА */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Всього нарядів', value: stats.total,      color: 'text-dark-100' },
            { label: 'Очікує',         value: stats.pending,    color: 'text-yellow-300' },
            { label: 'В роботі',       value: stats.inProgress, color: 'text-blue-300' },
            { label: 'Готово',         value: stats.done,       color: 'text-green-300' },
          ].map(s => (
            <div key={s.label} className="card border-dark-700">
              <p className="text-dark-400 text-xs uppercase tracking-wider">{s.label}</p>
              <p className={`font-display text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ПАНЕЛЬ ІНСТРУМЕНТІВ */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            {[
              { value: 'all',         label: 'Всі' },
              { value: 'pending',     label: 'Очікує' },
              { value: 'in_progress', label: 'В роботі' },
              { value: 'done',        label: 'Готово' },
            ].map(f => (
              <button key={f.value} onClick={() => setFilterStatus(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filterStatus === f.value
                    ? 'bg-brand-500 text-white'
                    : 'bg-dark-800 text-dark-300 border border-dark-700 hover:border-brand-500/50'
                }`}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowClients(true)}  className="btn-secondary text-sm">👥 Клієнти ({clients.length})</button>
            <button onClick={() => setShowRegister(true)} className="btn-secondary text-sm">👤 Новий клієнт</button>
            <button onClick={() => setShowInventory(true)} className="btn-secondary text-sm">📋 Довідник</button>
            <button onClick={() => setShowCreate(true)}   className="btn-primary text-sm">+ Новий наряд</button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-900/30 border border-red-800/50 rounded-xl text-red-300 text-sm">{error}</div>
        )}

        {/* ТАБЛИЦЯ */}
        {loadingData ? (
          <div className="flex items-center justify-center py-20"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div className="card border-dark-700 text-center py-16">
            <p className="text-dark-400 text-4xl mb-3">🔧</p>
            <p className="text-dark-300 font-medium">Нарядів не знайдено</p>
            <p className="text-dark-500 text-sm mt-1">Натисніть "+ Новий наряд" щоб створити перший</p>
          </div>
        ) : (
          <div className="card border-dark-700 p-0 overflow-hidden">
            {/* Хедер таблиці */}
            <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_120px_140px_90px] gap-4 px-5 py-3 bg-dark-900 border-b border-dark-700 text-xs text-dark-400 uppercase tracking-wider font-medium">
              <span>Клієнт</span>
              <span>Майстер</span>
              <span>Послуги</span>
              <span>Сума</span>
              <span>Статус</span>
              <span>Дії</span>
            </div>

            <div className="divide-y divide-dark-700/50">
              {filtered.map(appt => (
                <div key={appt._id}
                  className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_120px_140px_90px] gap-2 sm:gap-4 px-5 py-4 hover:bg-dark-700/30 transition-colors">

                  {/* Клієнт */}
                  <div>
                    <p className="text-dark-100 text-sm font-medium">{appt.client?.fullName || '—'}</p>
                    <p className="text-dark-500 text-xs">{appt.client?.email}</p>
                    {appt.client?.cars?.[0] && (
                      <p className="text-dark-500 text-xs font-mono mt-0.5">🚗 {appt.client.cars[0].make}</p>
                    )}
                  </div>

                  {/* Майстер */}
                  <div>
                    <p className="text-dark-200 text-sm">{appt.mechanic?.fullName || '—'}</p>
                    <p className="text-dark-500 text-xs">{new Date(appt.date).toLocaleDateString('uk-UA')}</p>
                  </div>

                  {/* Послуги */}
                  <div className="flex flex-wrap gap-1 items-start">
                    {appt.repairDetails?.slice(0, 2).map((rd, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 bg-dark-900 border border-dark-600 rounded text-dark-300">
                        {rd.inventoryItem?.name || '—'}
                      </span>
                    ))}
                    {appt.repairDetails?.length > 2 && (
                      <span className="text-xs text-dark-500 py-0.5">+{appt.repairDetails.length - 2}</span>
                    )}
                  </div>

                  {/* Сума */}
                  <div className="flex items-center">
                    <span className="text-brand-400 font-mono font-bold text-sm">
                      {appt.total_price?.toLocaleString('uk-UA')} грн
                    </span>
                  </div>

                  {/* Статус */}
                  <div className="flex items-center">
                    <select value={appt.status} onChange={e => handleStatusChange(appt._id, e.target.value)}
                      className="text-xs bg-dark-900 border border-dark-600 rounded-lg px-2 py-1.5 text-dark-200 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer w-full">
                      <option value="pending">Очікує</option>
                      <option value="in_progress">В роботі</option>
                      <option value="done">Готово</option>
                    </select>
                  </div>

                  {/* Дії: редагувати + видалити */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingAppointment(appt)}
                      className="p-1.5 text-dark-400 hover:text-brand-400 hover:bg-brand-500/10 rounded-lg transition-all"
                      title="Редагувати наряд"
                    >
                      <IconEdit />
                    </button>
                    <button
                      onClick={() => handleDelete(appt._id)}
                      className="p-1.5 text-dark-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all"
                      title="Видалити наряд"
                    >
                      <IconX />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* МОДАЛКИ */}

      {/* Створення нового наряду */}
      {showCreate && (
        <AppointmentForm
          onClose={() => setShowCreate(false)}
          onSaved={fetchAll}
          clients={clients}
          mechanics={mechanics}
          inventory={inventory}
        />
      )}

      {/* Редагування існуючого наряду */}
      {editingAppointment && (
        <AppointmentForm
          appointment={editingAppointment}
          onClose={() => setEditingAppointment(null)}
          onSaved={fetchAll}
          clients={clients}
          mechanics={mechanics}
          inventory={inventory}
        />
      )}

      {showInventory && (
        <InventoryModal onClose={() => setShowInventory(false)} inventory={inventory} onRefresh={fetchAll} />
      )}
      {showRegister && (
        <RegisterClientModal onClose={() => setShowRegister(false)} onCreated={fetchAll} />
      )}
      {showClients && (
        <ClientsModal onClose={() => setShowClients(false)} clients={clients} />
      )}
    </div>
  );
}

export default AdminDashboard;