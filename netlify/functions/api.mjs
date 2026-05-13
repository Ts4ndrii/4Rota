import { db } from '@netlify/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const respond = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

const err = (message, status = 400) => respond({ message }, status);

const parseBody = async (req) => {
  try {
    const text = await req.text();
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
};

const verifyToken = (req) => {
  const auth = req.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(auth.slice(7), JWT_SECRET);
  } catch {
    return null;
  }
};

const getCurrentUser = async (req) => {
  const decoded = verifyToken(req);
  if (!decoded) return null;
  const rows = await db.sql`
    SELECT id, full_name, email, role, cars FROM users WHERE id = ${decoded.id}
  `;
  return rows[0] || null;
};

const generateToken = (id) => jwt.sign({ id }, JWT_SECRET, { expiresIn: '7d' });

const parseJson = (val) => {
  if (!val) return val;
  if (typeof val === 'string') { try { return JSON.parse(val); } catch { return val; } }
  return val;
};

const formatUser = (u) => ({
  _id: u.id,
  id: u.id,
  fullName: u.full_name,
  email: u.email,
  role: u.role,
  cars: parseJson(u.cars) || [],
});

const formatInventory = (item) => ({
  _id: item.id,
  id: item.id,
  name: item.name,
  type: item.type,
  price: parseFloat(item.price),
  createdAt: item.created_at,
  updatedAt: item.updated_at,
});

const formatAppointment = (apt) => ({
  _id: apt.id,
  id: apt.id,
  date: apt.date,
  status: apt.status,
  total_price: parseFloat(apt.total_price || 0),
  repairDetails: parseJson(apt.repair_details) || [],
  car: parseJson(apt.car) || null,
  notes: apt.notes,
  createdAt: apt.created_at,
  updatedAt: apt.updated_at,
});

const populateAppointment = async (apt) => {
  const [clientRows, mechRows] = await Promise.all([
    db.sql`SELECT id, full_name, email, cars FROM users WHERE id = ${apt.client_id}`,
    db.sql`SELECT id, full_name, email FROM users WHERE id = ${apt.mechanic_id}`,
  ]);
  return {
    ...formatAppointment(apt),
    client: clientRows[0] ? formatUser(clientRows[0]) : null,
    mechanic: mechRows[0] ? formatUser(mechRows[0]) : null,
  };
};

export const config = { path: '/api/*' };

export default async (req) => {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method.toUpperCase();

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  try {
    // GET /api/health
    if (method === 'GET' && path === '/api/health') {
      return respond({ status: 'ok', timestamp: new Date().toISOString() });
    }

    // POST /api/seed — first-time DB initialization
    if (method === 'POST' && path === '/api/seed') {
      const admins = await db.sql`SELECT id FROM users WHERE role = 'admin'`;
      if (admins.length > 0) {
        return err('БД уже ініціалізована. Адміністратор вже існує.', 400);
      }
      const hash = await bcrypt.hash('admin', 10);
      const adminRows = await db.sql`
        INSERT INTO users (full_name, email, password, role, cars)
        VALUES ('Адміністратор', 'admin@sto.ua', ${hash}, 'admin', '[]'::jsonb)
        RETURNING id, full_name, email, role
      `;
      await db.sql`
        INSERT INTO inventory (name, type, price) VALUES
        ('Заміна моторного масла', 'service', 500),
        ('Заміна повітряного фільтра', 'service', 300),
        ('Заміна гальмівних колодок', 'service', 800),
        ('Діагностика підвіски', 'service', 600),
        ('Шиномонтаж (4 колеса)', 'service', 400),
        ('Масляний фільтр', 'part', 150),
        ('Повітряний фільтр', 'part', 120),
        ('Гальмівна рідина', 'part', 200)
      `;
      const admin = adminRows[0];
      return respond({
        message: 'БД успішно ініціалізована!',
        data: {
          adminCreated: { fullName: admin.full_name, email: admin.email, role: admin.role },
          servicesCreated: 8,
          credentials: { email: 'admin@sto.ua', password: 'admin' },
        },
      }, 201);
    }

    // POST /api/auth/register
    if (method === 'POST' && path === '/api/auth/register') {
      const { fullName, email, password, role, cars } = await parseBody(req);
      if (!fullName || !email || !password) {
        return err("ПІБ, email та пароль є обов'язковими.", 400);
      }
      const existing = await db.sql`SELECT id FROM users WHERE email = ${email.toLowerCase().trim()}`;
      if (existing.length > 0) {
        return err('Користувач з таким email вже існує.', 400);
      }
      const hash = await bcrypt.hash(password, 10);
      const validRole = ['admin', 'mechanic', 'client'].includes(role) ? role : 'client';
      const carsJson = JSON.stringify(cars || []);
      const rows = await db.sql`
        INSERT INTO users (full_name, email, password, role, cars)
        VALUES (${fullName.trim()}, ${email.toLowerCase().trim()}, ${hash}, ${validRole}, ${carsJson}::jsonb)
        RETURNING id, full_name, email, role, cars
      `;
      const user = rows[0];
      return respond({
        message: 'Користувача успішно створено.',
        token: generateToken(user.id),
        user: formatUser(user),
      }, 201);
    }

    // POST /api/auth/login
    if (method === 'POST' && path === '/api/auth/login') {
      const { email, password } = await parseBody(req);
      if (!email || !password) {
        return err("Email та пароль є обов'язковими.", 400);
      }
      const rows = await db.sql`SELECT * FROM users WHERE email = ${email.toLowerCase().trim()}`;
      const user = rows[0];
      if (!user) return err('Невірний email або пароль.', 401);
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return err('Невірний email або пароль.', 401);
      return respond({
        message: 'Вхід виконано успішно.',
        token: generateToken(user.id),
        user: formatUser(user),
      });
    }

    // GET /api/auth/me
    if (method === 'GET' && path === '/api/auth/me') {
      const user = await getCurrentUser(req);
      if (!user) return err('Доступ заборонено. Токен відсутній.', 401);
      return respond({ user: formatUser(user) });
    }

    // All remaining routes require auth
    const currentUser = await getCurrentUser(req);
    if (!currentUser) return err('Доступ заборонено. Токен відсутній.', 401);

    // ─── INVENTORY ────────────────────────────────────────────────────────────

    if (method === 'GET' && path === '/api/inventory') {
      const items = await db.sql`SELECT * FROM inventory ORDER BY created_at DESC`;
      return respond(items.map(formatInventory));
    }

    if (method === 'POST' && path === '/api/inventory') {
      if (currentUser.role !== 'admin') return err('Доступ заборонено.', 403);
      const { name, type, price } = await parseBody(req);
      if (!name || !type || price == null) return err("Назва, тип та ціна є обов'язковими.", 400);
      const rows = await db.sql`
        INSERT INTO inventory (name, type, price)
        VALUES (${name}, ${type}, ${parseFloat(price)})
        RETURNING *
      `;
      return respond(formatInventory(rows[0]), 201);
    }

    let m;

    m = path.match(/^\/api\/inventory\/([^/]+)$/);
    if (m) {
      const id = m[1];
      if (method === 'PUT') {
        if (currentUser.role !== 'admin') return err('Доступ заборонено.', 403);
        const body = await parseBody(req);
        const rows = await db.sql`
          UPDATE inventory SET
            name = COALESCE(${body.name ?? null}, name),
            type = COALESCE(${body.type ?? null}, type),
            price = COALESCE(${body.price != null ? parseFloat(body.price) : null}, price),
            updated_at = NOW()
          WHERE id = ${id}
          RETURNING *
        `;
        if (rows.length === 0) return err('Позицію не знайдено.', 404);
        return respond(formatInventory(rows[0]));
      }
      if (method === 'DELETE') {
        if (currentUser.role !== 'admin') return err('Доступ заборонено.', 403);
        const rows = await db.sql`DELETE FROM inventory WHERE id = ${id} RETURNING id`;
        if (rows.length === 0) return err('Позицію не знайдено.', 404);
        return respond({ message: 'Позицію успішно видалено.' });
      }
    }

    // ─── APPOINTMENTS ─────────────────────────────────────────────────────────

    // POST /api/appointments/request — client self-booking (must be before :id routes)
    if (method === 'POST' && path === '/api/appointments/request') {
      if (currentUser.role !== 'client') return err('Доступ заборонено.', 403);
      const { date, notes, car } = await parseBody(req);
      if (!date) return err("Дата є обов'язковою.", 400);
      if (!notes?.trim()) return err("Опис проблеми є обов'язковим.", 400);

      const mechanics = await db.sql`SELECT id FROM users WHERE role = 'mechanic'`;
      if (mechanics.length === 0) return err('Наразі немає доступних майстрів.', 400);

      let selectedMechanic = mechanics[0];
      let minCount = Infinity;
      for (const mech of mechanics) {
        const countRows = await db.sql`
          SELECT COUNT(*) AS cnt FROM appointments
          WHERE mechanic_id = ${mech.id} AND status IN ('pending', 'in_progress')
        `;
        const cnt = parseInt(countRows[0]?.cnt ?? 0, 10);
        if (cnt < minCount) { minCount = cnt; selectedMechanic = mech; }
      }

      const carJson = JSON.stringify(car || null);
      const rows = await db.sql`
        INSERT INTO appointments (client_id, mechanic_id, date, notes, car, status, repair_details, total_price)
        VALUES (${currentUser.id}, ${selectedMechanic.id}, ${date}, ${notes}, ${carJson}::jsonb, 'pending', '[]'::jsonb, 0)
        RETURNING *
      `;
      return respond(await populateAppointment(rows[0]), 201);
    }

    // GET /api/appointments
    if (method === 'GET' && path === '/api/appointments') {
      let rows;
      if (currentUser.role === 'mechanic') {
        rows = await db.sql`
          SELECT * FROM appointments WHERE mechanic_id = ${currentUser.id} AND status != 'done'
          ORDER BY created_at DESC
        `;
      } else if (currentUser.role === 'client') {
        rows = await db.sql`
          SELECT * FROM appointments WHERE client_id = ${currentUser.id}
          ORDER BY created_at DESC
        `;
      } else {
        rows = await db.sql`SELECT * FROM appointments ORDER BY created_at DESC`;
      }
      const populated = await Promise.all(rows.map(populateAppointment));
      return respond(populated);
    }

    // POST /api/appointments — admin creates appointment
    if (method === 'POST' && path === '/api/appointments') {
      if (currentUser.role !== 'admin') return err('Доступ заборонено.', 403);
      const { client, mechanic, date, notes, repairItems, car } = await parseBody(req);

      const clientRows = await db.sql`SELECT id FROM users WHERE id = ${client} AND role = 'client'`;
      if (clientRows.length === 0) return err('Клієнта не знайдено.', 400);

      const mechRows = await db.sql`SELECT id FROM users WHERE id = ${mechanic} AND role = 'mechanic'`;
      if (mechRows.length === 0) return err('Майстра не знайдено.', 400);

      const repairDetails = [];
      let totalPrice = 0;
      for (const item of (repairItems || [])) {
        const invRows = await db.sql`SELECT * FROM inventory WHERE id = ${item.inventoryId}`;
        if (invRows.length === 0) return err(`Позицію з ID ${item.inventoryId} не знайдено.`, 400);
        const inv = invRows[0];
        const qty = item.quantity || 1;
        const savedPrice = parseFloat(inv.price);
        repairDetails.push({
          inventoryItem: { _id: inv.id, name: inv.name, type: inv.type },
          savedPrice,
          quantity: qty,
        });
        totalPrice += savedPrice * qty;
      }

      const carJson = JSON.stringify(car || null);
      const rdJson = JSON.stringify(repairDetails);
      const rows = await db.sql`
        INSERT INTO appointments (client_id, mechanic_id, date, notes, car, status, repair_details, total_price)
        VALUES (${client}, ${mechanic}, ${date || new Date().toISOString()}, ${notes || ''}, ${carJson}::jsonb, 'pending', ${rdJson}::jsonb, ${totalPrice})
        RETURNING *
      `;
      return respond(await populateAppointment(rows[0]), 201);
    }

    // PATCH /api/appointments/:id/status
    m = path.match(/^\/api\/appointments\/([^/]+)\/status$/);
    if (m && method === 'PATCH') {
      if (!['admin', 'mechanic'].includes(currentUser.role)) return err('Доступ заборонено.', 403);
      const id = m[1];
      const { status } = await parseBody(req);
      if (!['pending', 'in_progress', 'done'].includes(status)) return err('Невалідний статус.', 400);

      const aptRows = await db.sql`SELECT * FROM appointments WHERE id = ${id}`;
      if (aptRows.length === 0) return err('Наряд не знайдено.', 404);
      const apt = aptRows[0];

      if (currentUser.role === 'mechanic' && apt.mechanic_id !== currentUser.id) {
        return err('Доступ заборонено.', 403);
      }

      const updated = await db.sql`
        UPDATE appointments SET status = ${status}, updated_at = NOW()
        WHERE id = ${id} RETURNING *
      `;
      return respond(await populateAppointment(updated[0]));
    }

    m = path.match(/^\/api\/appointments\/([^/]+)$/);
    if (m) {
      const id = m[1];

      // GET /api/appointments/:id
      if (method === 'GET') {
        if (!['admin', 'mechanic'].includes(currentUser.role)) return err('Доступ заборонено.', 403);
        const aptRows = await db.sql`SELECT * FROM appointments WHERE id = ${id}`;
        if (aptRows.length === 0) return err('Наряд не знайдено.', 404);
        const apt = aptRows[0];
        if (currentUser.role === 'mechanic' && apt.mechanic_id !== currentUser.id) {
          return err('Доступ заборонено.', 403);
        }
        return respond(await populateAppointment(apt));
      }

      // PUT /api/appointments/:id — full update (admin only)
      if (method === 'PUT') {
        if (currentUser.role !== 'admin') return err('Доступ заборонено.', 403);
        const { client, mechanic, date, notes, repairItems, status, car } = await parseBody(req);

        const aptRows = await db.sql`SELECT * FROM appointments WHERE id = ${id}`;
        if (aptRows.length === 0) return err('Наряд не знайдено.', 404);
        const existing = aptRows[0];

        let repairDetails = parseJson(existing.repair_details) || [];
        let totalPrice = parseFloat(existing.total_price || 0);

        if (repairItems && repairItems.length > 0) {
          repairDetails = [];
          totalPrice = 0;
          for (const item of repairItems) {
            const invRows = await db.sql`SELECT * FROM inventory WHERE id = ${item.inventoryId}`;
            if (invRows.length === 0) return err(`Позицію ${item.inventoryId} не знайдено.`, 400);
            const inv = invRows[0];
            const qty = item.quantity || 1;
            const savedPrice = item.savedPrice ?? parseFloat(inv.price);
            repairDetails.push({
              inventoryItem: { _id: inv.id, name: inv.name, type: inv.type },
              savedPrice,
              quantity: qty,
            });
            totalPrice += savedPrice * qty;
          }
        }

        const newClientId = client || existing.client_id;
        const newMechanicId = mechanic || existing.mechanic_id;
        const newDate = date || existing.date;
        const newNotes = notes !== undefined ? notes : existing.notes;
        const newCar = car !== undefined ? car : parseJson(existing.car);
        const newStatus = status || existing.status;
        const carJson = JSON.stringify(newCar);
        const rdJson = JSON.stringify(repairDetails);

        const updated = await db.sql`
          UPDATE appointments SET
            client_id = ${newClientId},
            mechanic_id = ${newMechanicId},
            date = ${newDate},
            notes = ${newNotes},
            car = ${carJson}::jsonb,
            status = ${newStatus},
            repair_details = ${rdJson}::jsonb,
            total_price = ${totalPrice},
            updated_at = NOW()
          WHERE id = ${id}
          RETURNING *
        `;
        return respond(await populateAppointment(updated[0]));
      }

      // DELETE /api/appointments/:id
      if (method === 'DELETE') {
        if (currentUser.role !== 'admin') return err('Доступ заборонено.', 403);
        const rows = await db.sql`DELETE FROM appointments WHERE id = ${id} RETURNING id`;
        if (rows.length === 0) return err('Наряд не знайдено.', 404);
        return respond({ message: 'Наряд успішно видалено.' });
      }
    }

    // ─── USERS ────────────────────────────────────────────────────────────────

    if (method === 'GET' && path === '/api/users') {
      if (currentUser.role !== 'admin') return err('Доступ заборонено.', 403);
      const role = url.searchParams.get('role');
      const rows = role
        ? await db.sql`SELECT id, full_name, email, role, cars, created_at, updated_at FROM users WHERE role = ${role} ORDER BY full_name`
        : await db.sql`SELECT id, full_name, email, role, cars, created_at, updated_at FROM users ORDER BY full_name`;
      return respond(rows.map(formatUser));
    }

    m = path.match(/^\/api\/users\/([^/]+)$/);
    if (m) {
      const id = m[1];

      if (method === 'PUT') {
        if (currentUser.role !== 'admin') return err('Доступ заборонено.', 403);
        const { fullName, email, role, cars, password } = await parseBody(req);

        const userRows = await db.sql`SELECT * FROM users WHERE id = ${id}`;
        if (userRows.length === 0) return err('Користувача не знайдено.', 404);
        const existing = userRows[0];

        const newFullName = fullName ?? existing.full_name;
        const newEmail = email ? email.toLowerCase().trim() : existing.email;
        const newRole = role ?? existing.role;
        const newCars = cars !== undefined ? cars : (parseJson(existing.cars) || []);
        const newPassword = password ? await bcrypt.hash(password, 10) : existing.password;
        const carsJson = JSON.stringify(newCars);

        const updated = await db.sql`
          UPDATE users SET
            full_name = ${newFullName},
            email = ${newEmail},
            role = ${newRole},
            cars = ${carsJson}::jsonb,
            password = ${newPassword},
            updated_at = NOW()
          WHERE id = ${id}
          RETURNING id, full_name, email, role, cars
        `;
        return respond(formatUser(updated[0]));
      }

      if (method === 'DELETE') {
        if (currentUser.role !== 'admin') return err('Доступ заборонено.', 403);
        if (id === currentUser.id) {
          return err('Не можна видалити власний обліковий запис.', 400);
        }
        const rows = await db.sql`DELETE FROM users WHERE id = ${id} RETURNING id`;
        if (rows.length === 0) return err('Користувача не знайдено.', 404);
        return respond({ message: 'Користувача видалено.' });
      }
    }

    return err(`Маршрут ${path} не знайдено.`, 404);

  } catch (e) {
    console.error('API error:', e);
    return respond({ message: 'Внутрішня помилка сервера.' }, 500);
  }
};
