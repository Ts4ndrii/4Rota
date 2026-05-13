module.exports = {
  name: '001-init',
  description: 'Ініціальна конфігурація БД з базовими послугами',

  async up(db) {
    console.log('[Migration 001] Запуск...');

    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    console.log('Індекс email у users створено');

    const adminExists = await db.collection('users').findOne({ role: 'admin' });
    
    if (!adminExists) {
      await db.collection('users').insertOne({
        fullName: 'Адміністратор',
        email: 'admin@sto.ua',
        password: 'admin',
        role: 'admin',
        cars: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('Адміністратор створено');
    }

    const servicesCount = await db.collection('inventories').countDocuments();
    
    if (servicesCount === 0) {
      const services = [
        { name: 'Заміна моторного масла', type: 'service', price: 500 },
        { name: 'Заміна повітряного фільтра', type: 'service', price: 300 },
        { name: 'Заміна гальмівних колодок', type: 'service', price: 800 },
        { name: 'Діагностика підвіски', type: 'service', price: 600 },
        { name: 'Шиномонтаж (4 колеса)', type: 'service', price: 400 },
        { name: 'Масляний фільтр', type: 'part', price: 150 },
        { name: 'Повітряний фільтр', type: 'part', price: 120 },
        { name: 'Гальмівна рідина', type: 'part', price: 200 },
      ];

      const now = new Date();
      const servicesWithTimestamps = services.map(s => ({
        ...s,
        createdAt: now,
        updatedAt: now,
      }));

      await db.collection('inventories').insertMany(servicesWithTimestamps);
      console.log(`${services.length} послуг/запчастин створено`);
    }

    await db.collection('appointments').createIndex({ client: 1 });
    await db.collection('appointments').createIndex({ mechanic: 1 });
    await db.collection('appointments').createIndex({ status: 1 });
    console.log('Індекси для appointments створено');

    console.log('[Migration 001] Завершено\n');
  },

  async down(db) {
    console.log('[Migration 001] Rollback...');
    
    await db.collection('users').dropIndex('email_1').catch(() => {});
    await db.collection('appointments').dropIndex('client_1').catch(() => {});
    await db.collection('appointments').dropIndex('mechanic_1').catch(() => {});
    await db.collection('appointments').dropIndex('status_1').catch(() => {});
    
    await db.collection('users').deleteOne({ email: 'admin@sto.ua' });
    await db.collection('inventories').deleteMany({});
    
    console.log('[Migration 001] Rollback завершено\n');
  },
};
