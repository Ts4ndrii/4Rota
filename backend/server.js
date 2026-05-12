const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// MONGODB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB підключено успішно'))
  .catch((err) => {
    console.error('Помилка підключення до MongoDB:', err.message);
    process.exit(1);
  });

// MONGOOSE

/**
 * Модель User
 * Ролі: admin, mechanic, client
 */
const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "ПІБ є обов'язковим"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email є обов'язковим"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Пароль є обов'язковим"],
      minlength: 5,
    },
    role: {
      type: String,
      enum: ['admin', 'mechanic', 'client'],
      default: 'client',
    },
    cars: [
      {
        vin: { type: String, trim: true },
        make: { type: String, trim: true }, // Марка/модель авто
      },
    ],
  },
  { timestamps: true }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);


/**
 * Модель Inventory
 * Тип: service або part
 */
const inventorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Назва є обов'язковою"],
      trim: true,
    },
    type: {
      type: String,
      enum: ['service', 'part'],
      required: [true, "Тип є обов'язковим"],
    },
    price: {
      type: Number,
      required: [true, "Ціна є обов'язковою"],
      min: [0, 'Ціна не може бути від\'ємною'],
    },
  },
  { timestamps: true }
);

const Inventory = mongoose.model('Inventory', inventorySchema);


/**
 * Модель Appointment
 * Статуси: pending, in_progress, done
 */
const appointmentSchema = new mongoose.Schema(
  {
    // Клієнт, якому належить наряд
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, "Клієнт є обов'язковим"],
    },
    // Майстер, який виконує роботу
    mechanic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, "Майстер є обов'язковим"],
    },
    car: {
      vin:  { type: String, trim: true },
      make: { type: String, trim: true },
    },
    date: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'done'],
      default: 'pending',
    },
    total_price: {
      type: Number,
      default: 0,
    },
    repairDetails: [
      {
        inventoryItem: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Inventory',
          required: true,
        },
        savedPrice: {
          type: Number,
          required: true,
        },
        quantity: {
          type: Number,
          default: 1,
          min: 1,
        },
      },
    ],
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

appointmentSchema.pre('save', function () {
  this.total_price = this.repairDetails.reduce((sum, item) => {
    return sum + item.savedPrice * item.quantity;
  }, 0);
});

const Appointment = mongoose.model('Appointment', appointmentSchema);

// МІДЛВАР: ПЕРЕВІРКА JWT ТОКЕНА
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Доступ заборонено. Токен відсутній.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ message: 'Користувача не знайдено.' });
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Невалідний або прострочений токен.' });
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Доступ заборонено. Потрібна роль: ${roles.join(' або ')}.`,
      });
    }
    next();
  };
};

// ГЕНЕРАЦІЯ JWT

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// AUTH

/**
 * POST /api/auth/register — Реєстрація нового користувача
 */
app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, email, password, role, cars } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Користувач з таким email вже існує.' });
    }

    const user = await User.create({ fullName, email, password, role, cars });

    res.status(201).json({
      message: 'Користувача успішно створено.',
      token: generateToken(user._id),
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        cars: user.cars || [],
      },
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * POST /api/auth/login — Вхід користувача
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email та пароль є обов\'язковими.' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Невірний email або пароль.' });
    }

    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: 'Невірний email або пароль.' });
    }

    res.json({
      message: 'Вхід виконано успішно.',
      token: generateToken(user._id),
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        cars: user.cars || [],
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/auth/me — Отримати поточного авторизованого користувача
 */
app.get('/api/auth/me', protect, async (req, res) => {
  res.json({ user: req.user });
});

// INVENTORY

/**
 * GET /api/inventory — Отримати всі позиції довідника
 */
app.get('/api/inventory', protect, async (req, res) => {
  try {
    const items = await Inventory.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/inventory — Додати нову позицію (лише адмін)
 */
app.post('/api/inventory', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { name, type, price } = req.body;
    const item = await Inventory.create({ name, type, price });
    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * PUT /api/inventory/:id — Оновити позицію (лише адмін)
 */
app.put('/api/inventory/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    const item = await Inventory.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!item) return res.status(404).json({ message: 'Позицію не знайдено.' });
    res.json(item);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * DELETE /api/inventory/:id — Видалити позицію (лише адмін)
 */
app.delete('/api/inventory/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    const item = await Inventory.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Позицію не знайдено.' });
    res.json({ message: 'Позицію успішно видалено.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// APPOINTMENTS

/**
 * GET /api/appointments — Отримати наряди
 */
app.get('/api/appointments', protect, restrictTo('admin', 'mechanic', 'client'), async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'mechanic') {
      query = { mechanic: req.user._id, status: { $ne: 'done' } };
    }
    if (req.user.role === 'client') {
      query = { client: req.user._id };
    }

    const appointments = await Appointment.find(query)
      .populate('client', 'fullName email cars')
      .populate('mechanic', 'fullName email')
      .populate('repairDetails.inventoryItem', 'name type')
      .sort({ createdAt: -1 });

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/appointments/:id — Отримати один наряд
 */
app.get('/api/appointments/:id', protect, restrictTo('admin', 'mechanic'), async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('client', 'fullName email cars')
      .populate('mechanic', 'fullName email')
      .populate('repairDetails.inventoryItem', 'name type price');

    if (!appointment) {
      return res.status(404).json({ message: 'Наряд не знайдено.' });
    }

    if (
      req.user.role === 'mechanic' &&
      appointment.mechanic._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Доступ заборонено.' });
    }

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/appointments — Створити новий наряд (лише адмін)
 */
app.post('/api/appointments', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { client, mechanic, date, notes, repairItems } = req.body;

    const clientUser = await User.findOne({ _id: client, role: 'client' });
    if (!clientUser) {
      return res.status(400).json({ message: 'Клієнта не знайдено.' });
    }

    const mechanicUser = await User.findOne({ _id: mechanic, role: 'mechanic' });
    if (!mechanicUser) {
      return res.status(400).json({ message: 'Майстра не знайдено.' });
    }

    const repairDetails = [];
    for (const item of repairItems) {
      const inventoryItem = await Inventory.findById(item.inventoryId);
      if (!inventoryItem) {
        return res.status(400).json({
          message: `Позицію з ID ${item.inventoryId} не знайдено в довіднику.`,
        });
      }
      repairDetails.push({
        inventoryItem: inventoryItem._id,
        savedPrice: inventoryItem.price,
        quantity: item.quantity || 1,
      });
    }

    const appointment = await Appointment.create({
      client,
      mechanic,
      date: date || Date.now(),
      notes,
      repairDetails,
      car: req.body.car || null, 
    });

    const populated = await Appointment.findById(appointment._id)
      .populate('client', 'fullName email')
      .populate('mechanic', 'fullName email')
      .populate('repairDetails.inventoryItem', 'name type');

    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * PATCH /api/appointments/:id/status — Змінити статус наряду
 */
app.patch(
  '/api/appointments/:id/status',
  protect,
  restrictTo('admin', 'mechanic'),
  async (req, res) => {
    try {
      const { status } = req.body;
      const allowedStatuses = ['pending', 'in_progress', 'done'];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ message: 'Невалідний статус.' });
      }

      const appointment = await Appointment.findById(req.params.id);
      if (!appointment) {
        return res.status(404).json({ message: 'Наряд не знайдено.' });
      }

      if (
        req.user.role === 'mechanic' &&
        appointment.mechanic.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({ message: 'Доступ заборонено.' });
      }

      appointment.status = status;
      await appointment.save();

      const updated = await Appointment.findById(appointment._id)
        .populate('client', 'fullName email')
        .populate('mechanic', 'fullName email')
        .populate('repairDetails.inventoryItem', 'name type');

      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * PUT /api/appointments/:id — Повне оновлення наряду (лише адмін)
 */
app.put('/api/appointments/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { client, mechanic, date, notes, repairItems, status } = req.body;

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Наряд не знайдено.' });
    }

    // Оновлюємо базові поля
    if (client)   appointment.client   = client;
    if (mechanic) appointment.mechanic = mechanic;
    if (date)     appointment.date     = date;
    if (notes !== undefined) appointment.notes = notes;
    if (req.body.car !== undefined) appointment.car = req.body.car;
    if (status)   appointment.status   = status;

    if (repairItems && repairItems.length > 0) {
      const newDetails = [];
      for (const item of repairItems) {
        const invItem = await Inventory.findById(item.inventoryId);
        if (!invItem) {
          return res.status(400).json({ message: `Позицію ${item.inventoryId} не знайдено.` });
        }
        newDetails.push({
          inventoryItem: invItem._id,
          savedPrice:    item.savedPrice ?? invItem.price,
          quantity:      item.quantity || 1,
        });
      }
      appointment.repairDetails = newDetails;
    }

    await appointment.save();

    const updated = await Appointment.findById(appointment._id)
      .populate('client',   'fullName email cars')
      .populate('mechanic', 'fullName email')
      .populate('repairDetails.inventoryItem', 'name type');

    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * DELETE /api/appointments/:id — Видалити наряд (лише адмін)
 */
app.delete('/api/appointments/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndDelete(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Наряд не знайдено.' });
    }
    res.json({ message: 'Наряд успішно видалено.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/appointments/request — Клієнт самостійно записується на СТО
 */
app.post('/api/appointments/request', protect, restrictTo('client'), async (req, res) => {
  try {
    const { date, notes, carVin } = req.body;

    if (!date) {
      return res.status(400).json({ message: 'Дата є обов\'язковою.' });
    }

    const mechanic = await User.findOne({ role: 'mechanic' });
    if (!mechanic) {
      return res.status(400).json({ message: 'Наразі немає доступних майстрів.' });
    }

    const appointment = await Appointment.create({
      client:        req.user._id,
      mechanic:      mechanic._id,
      date,
      notes,
      status:        'pending',
      repairDetails: [],
    });

    const populated = await Appointment.findById(appointment._id)
      .populate('client',   'fullName email cars')
      .populate('mechanic', 'fullName email');

    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// РОУТИ — USERS

/**
 * GET /api/users — Отримати список користувачів за роллю (лише адмін)
 */
app.get('/api/users', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { role } = req.query;
    const filter = role ? { role } : {};
    const users = await User.find(filter).select('-password').sort({ fullName: 1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * PUT /api/users/:id — Редагувати користувача (лише адмін)
 */
app.put('/api/users/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { fullName, email, role, cars } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Користувача не знайдено.' });

    if (fullName) user.fullName = fullName;
    if (email)    user.email    = email;
    if (role)     user.role     = role;
    if (cars)     user.cars     = cars;
    // Змінюємо пароль лише якщо передано
    if (req.body.password) user.password = req.body.password;

    await user.save();
    const updated = await User.findById(user._id).select('-password');
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/**
 * DELETE /api/users/:id — Видалити користувача (лише адмін)
 */
app.delete('/api/users/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    // Не дозволяємо адміну видалити самого себе
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'Не можна видалити власний обліковий запис.' });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'Користувача не знайдено.' });
    res.json({ message: 'Користувача видалено.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// SEED — ПОЧАТКОВІ ДАНІ

/**
 * POST /api/seed — Заповнити БД тестовими даними
 */
app.post('/api/seed', async (req, res) => {
  try {
    await User.deleteMany({});
    await Inventory.deleteMany({});
    await Appointment.deleteMany({});

    const admin = await User.create({
      fullName: 'Адміністратор',
      email: 'admin@sto.ua',
      password: 'admin',
      role: 'admin',
    });

    const mechanic = await User.create({
      fullName: 'Микола Колінвал',
      email: 'mechanic@sto.ua',
      password: 'mechanic',
      role: 'mechanic',
    });

    const mechanic2 = await User.create({
      fullName: 'Олександр Петров',
      email: 'oleksandr@sto.ua',
      password: 'oleksandr',
      role: 'mechanic',
    });

    const client = await User.create({
      fullName: 'Андрій Ціпкайло',
      email: 'andrii@sto.ua',
      password: 'andrii',
      role: 'client',
      cars: [
        { vin: 'WBA3A5C55FK123456', make: 'BMW 3 Series 2015' },
        { vin: '1HGBH41JXMN109186', make: 'Honda Civic 2020' },
      ],
    });

    const oil = await Inventory.create({ name: 'Заміна моторного масла', type: 'service', price: 500 });
    const filter = await Inventory.create({ name: 'Масляний фільтр', type: 'part', price: 150 });
    const brake = await Inventory.create({ name: 'Заміна гальмівних колодок', type: 'service', price: 800 });
    const tires = await Inventory.create({ name: 'Шиномонтаж (4 колеса)', type: 'service', price: 400 });

    await Appointment.create({
      client: client._id,
      mechanic: mechanic._id,
      status: 'in_progress',
      notes: 'Клієнт скаржиться на шум при гальмуванні',
      repairDetails: [
        { inventoryItem: brake._id, savedPrice: brake.price, quantity: 1 },
        { inventoryItem: filter._id, savedPrice: filter.price, quantity: 1 },
      ],
    });

    res.json({
      message: 'Тестові дані успішно створено!',
      credentials: {
        admin: { email: 'admin@sto.ua', password: 'admin' },
        mechanic: { email: 'mechanic@sto.ua', password: 'mechanic' },
        mechanic2: { email: 'oleksandr@sto.ua', password: 'oleksandr' },
        client: { email: 'andrii@sto.ua', password: 'andrii' },
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ОБРОБКА 404 ТА ПОМИЛОК

app.use((req, res) => {
  res.status(404).json({ message: `Маршрут ${req.originalUrl} не знайдено.` });
});

app.use((err, req, res, next) => {
  console.error('Серверна помилка:', err.stack);
  res.status(500).json({ message: 'Внутрішня помилка сервера.' });
});

// ЗАПУСК СЕРВЕРА

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Сервер запущено на порту ${PORT}`);
  console.log(`Середовище: ${process.env.NODE_ENV || 'development'}`);
});