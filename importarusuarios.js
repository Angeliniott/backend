const mongoose = require('mongoose');
const xlsx = require('xlsx');
const bcrypt = require('bcrypt');
const User = require('./models/user'); // Asegúrate que esté bien el path a tu modelo

const MONGO_URI= 'mongodb+srv://Angeliniott:0npf3IwGA3mt0DUL@cluster0.ekz4btd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'


async function importarUsuarios() {
  try {
    // 1. Conectar a MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    // 2. Leer Excel
    const workbook = xlsx.readFile('Book1.xlsx');
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const datos = xlsx.utils.sheet_to_json(sheet);

    let insertados = 0;

    for (const fila of datos) {
      const { correo, contrasena, ingreso, previos, rol } = fila;

      // Validaciones básicas
      if (!correo || !contrasena || !ingreso) {
        console.log(`❌ Fila incompleta para: ${correo}`);
        continue;
      }

      const existente = await User.findOne({ email: correo });
      if (existente) {
        console.log(`⚠️ Ya existe: ${correo}`);
        continue;
      }

      const hash = await bcrypt.hash(contrasena.toString(), 10);

      const nuevoUsuario = new User({
        name: correo.split('@')[0],
        email: correo,
        password: hash,
        role: rol === 'admin' ? 'admin' : 'empleado',
        fechaIngreso: new Date(ingreso),
        diasPendientesPrevios: parseInt(previos || 0)
      });

      await nuevoUsuario.save();
      console.log(`✅ Insertado: ${correo}`);
      insertados++;
    }

    console.log(`\n🎉 Proceso completo. Usuarios insertados: ${insertados}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error al importar:', err);
    process.exit(1);
  }
}

importarUsuarios();
