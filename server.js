// backend/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Rutas
const authRoutes = require('./routes/auth');
const checkinRoutes = require('./routes/checkin');
const checkoutRoutes = require('./routes/checkout');
const vacacionesRoutes = require('./routes/vacaciones');
const userRoutes = require('./routes/user');
const workHoursRoutes = require('./routes/workHours');
const workSessionsRoutes = require('./routes/workSessions');
const tiempoExtraRoutes = require('./routes/tiempoextra');

// Función para conectar a MongoDB
const connectDB = require('./db');

// Vacation reminder job
const { checkAndSendVacationReminders } = require('./utils/vacationReminder');

// Cargar variables de entorno
dotenv.config();

// Iniciar la app
const app = express();

// Conectar a la base de datos
connectDB();

// Initialize vacation reminder job (runs daily)
setInterval(checkAndSendVacationReminders, 24 * 60 * 60 * 1000); // 24 hours

// Configurar CORS
const corsOptions = {
  origin: 'https://www.portalmmx.com/', // Reemplaza con el dominio de tu frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Métodos permitidos
  allowedHeaders: ['Content-Type', 'Authorization'], // Encabezados permitidos
  credentials: true // Permitir cookies y encabezados de autorización
};

// Middlewares
app.use(express.json());
app.use(cors(corsOptions));

// Rutas
app.use('/api/auth', cors(corsOptions), require('./routes/auth'));
app.use('/api/checkin', checkinRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/vacaciones', vacacionesRoutes);
app.use('/api/user', userRoutes);
app.use('/api/work-hours', workHoursRoutes);
app.use('/api/work-sessions', workSessionsRoutes);
app.use('/api/tiempoextra', tiempoExtraRoutes);

// Puerto de Render o local
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en puerto: ${PORT}`);
});

