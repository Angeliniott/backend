const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/user');

const MONGO_URI = 'mongodb+srv://Angeliniott:0npf3IwGA3mt0DUL@cluster0.ekz4btd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function insertTestUsers() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    const users = [
      {
        name: 'Admin User',
        email: 'admin@example.com',
        password: await bcrypt.hash('password', 10),
        role: 'admin',
        fechaIngreso: new Date('2020-01-01'),
        dpt: 'hr',
        reporta: ''
      },
      {
        name: 'Admin2 User',
        email: 'admin2@example.com',
        password: await bcrypt.hash('password', 10),
        role: 'admin2',
        fechaIngreso: new Date('2020-01-01'),
        dpt: 'hr',
        reporta: ''
      },
      {
        name: 'Employee1',
        email: 'emp1@example.com',
        password: await bcrypt.hash('password', 10),
        role: 'empleado',
        fechaIngreso: new Date('2020-01-01'),
        dpt: 'apps',
        reporta: 'admin@example.com'
      },
      {
        name: 'Employee2',
        email: 'emp2@example.com',
        password: await bcrypt.hash('password', 10),
        role: 'empleado',
        fechaIngreso: new Date('2020-01-01'),
        dpt: 'apps',
        reporta: 'admin@example.com'
      },
      {
        name: 'Employee3',
        email: 'emp3@example.com',
        password: await bcrypt.hash('password', 10),
        role: 'empleado',
        fechaIngreso: new Date('2020-01-01'),
        dpt: 'finanzas',
        reporta: 'admin2@example.com'
      }
    ];

    for (const userData of users) {
      const existing = await User.findOne({ email: userData.email });
      if (!existing) {
        const user = new User(userData);
        await user.save();
        console.log(`✅ Insertado: ${userData.email}`);
      } else {
        console.log(`⚠️ Ya existe: ${userData.email}`);
      }
    }

    console.log('🎉 Usuarios de prueba insertados');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

insertTestUsers();
