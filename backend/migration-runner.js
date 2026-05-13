const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@sto.ua';
const BCRYPT_PREFIXES = ['$2a$', '$2b$', '$2y$'];

const migrationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    executedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { collection: 'migrations' }
);

const MigrationRecord = mongoose.model('MigrationRecord', migrationSchema);

async function ensureAdminPasswordIsHashed() {
  const User = mongoose.models.User;
  if (!User) {
    return;
  }

  const admin = await User.findOne({ email: ADMIN_EMAIL }).select('+password');
  if (!admin) {
    return;
  }

  const passwordValue = String(admin.password || '');
  const looksHashed = BCRYPT_PREFIXES.some(prefix => passwordValue.startsWith(prefix));

  if (!looksHashed) {
    admin.password = passwordValue;
    admin.markModified('password');
    await admin.save();
    console.log('Адміністратора перевірено і пароль оновлено');
  }
}


async function runMigrations() {
  try {
    console.log('\nMigration Runner');

    const migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log('Папка migrations не знайдена. Пропускаємо.');
      return;
    }

    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.js'))
      .sort();

    if (migrationFiles.length === 0) {
      console.log('Нема міграцій для запуску.');
      return;
    }

    console.log(`Знайдено ${migrationFiles.length} міграцій`);

    const executedMigrations = await MigrationRecord.find();
    const executedNames = new Set(executedMigrations.map(m => m.name));

    let executedCount = 0;
    for (const file of migrationFiles) {
      const migrationName = path.basename(file, '.js');
      
      if (executedNames.has(migrationName)) {
        console.log(`${migrationName} — уже виконана, пропускаємо`);
        continue;
      }

      try {
        const migration = require(path.join(migrationsDir, file));
        console.log(`\nЗапускаємо: ${migration.description || migrationName}`);

        // Виконуємо міграцію
        await migration.up(mongoose.connection.db);

        // Записуємо в історію
        await MigrationRecord.create({
          name: migrationName,
          executedAt: new Date(),
        });

        console.log(`${migrationName} успішно виконана`);
        executedCount++;
      } catch (error) {
        console.error(`Помилка при запуску ${migrationName}:`, error.message);
        throw error;
      }
    }

    console.log(`\n Migration Runner завершено`);
    console.log(`   Виконано: ${executedCount} нова(их) міграцій\n`);

    await ensureAdminPasswordIsHashed();
  } catch (error) {
    console.error('Критична помилка Migration Runner:', error);
    throw error;
  }
}

async function rollbackLastMigration() {
  try {
    console.log('\n Migration Rollback ');

    const lastMigration = await MigrationRecord.findOne().sort({ executedAt: -1 });
    if (!lastMigration) {
      console.log('Нема міграцій для відкочування.');
      return;
    }

    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFile = path.join(migrationsDir, `${lastMigration.name}.js`);

    if (!fs.existsSync(migrationFile)) {
      console.error(`Файл міграції не знайдено: ${migrationFile}`);
      return;
    }

    const migration = require(migrationFile);
    console.log(`Відкочування: ${migration.description || lastMigration.name}`);

    await migration.down(mongoose.connection.db);
    await MigrationRecord.deleteOne({ _id: lastMigration._id });

    console.log(`Rollback завершено\n`);
  } catch (error) {
    console.error('Помилка при rollback:', error);
    throw error;
  }
}

module.exports = {
  runMigrations,
  rollbackLastMigration,
};
