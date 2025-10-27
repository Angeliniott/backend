const mongoose = require('mongoose');
const SolicitudVacaciones = require('./models/solicitudvacaciones');

const MONGO_URI = 'mongodb+srv://Angeliniott:0npf3IwGA3mt0DUL@cluster0.ekz4btd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function insertTestSolicitudes() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    const solicitudes = [
      {
        email: 'emp1@example.com',
        fechaIngreso: new Date('2020-01-01'),
        fechaInicio: new Date('2024-12-01'),
        fechaFin: new Date('2024-12-05'),
        diasSolicitados: 5,
        motivo: 'Vacaciones de Navidad',
        supervisor: 'elizabeth',
        estado: 'pendiente'
      },
      {
        email: 'emp2@example.com',
        fechaIngreso: new Date('2020-01-01'),
        fechaInicio: new Date('2024-12-10'),
        fechaFin: new Date('2024-12-15'),
        diasSolicitados: 6,
        motivo: 'Vacaciones de fin de año',
        supervisor: 'francisco',
        estado: 'pendiente'
      },
      {
        email: 'emp3@example.com',
        fechaIngreso: new Date('2020-01-01'),
        fechaInicio: new Date('2024-12-20'),
        fechaFin: new Date('2024-12-25'),
        diasSolicitados: 6,
        motivo: 'Vacaciones familiares',
        supervisor: 'servicio',
        estado: 'pendiente'
      }
    ];

    for (const solData of solicitudes) {
      const existing = await SolicitudVacaciones.findOne({
        email: solData.email,
        fechaInicio: solData.fechaInicio
      });
      if (!existing) {
        const solicitud = new SolicitudVacaciones(solData);
        await solicitud.save();
        console.log(`✅ Insertada solicitud para: ${solData.email}`);
      } else {
        console.log(`⚠️ Ya existe solicitud para: ${solData.email}`);
      }
    }

    console.log('🎉 Solicitudes de prueba insertadas');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

insertTestSolicitudes();
