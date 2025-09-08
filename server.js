// backend/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Rutas
const authRoutes = require('./routes/auth');
const checkinRoutes = require('./routes/checkin');
const checkoutRoutes = require('./routes/checkout');
const specialCheckRoutes = require('./routes/specialcheck');
const vacacionesRoutes = require('./routes/vacaciones');
const userRoutes = require('./routes/user');
const workHoursRoutes = require('./routes/workHours');
const tiempoExtraRoutes = require('./routes/tiempoextra');

// Función para conectar a MongoDB
const connectDB = require('./db');

// Cargar variables de entorno
dotenv.config();

// Iniciar la app
const app = express();

// Conectar a la base de datos
connectDB();

// Middlewares
app.use(cors({ origin: '*' }));
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/checkin', checkinRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/special', specialCheckRoutes);
app.use('/api/vacaciones', vacacionesRoutes);
app.use('/api/user', userRoutes);
app.use('/api/work-hours', workHoursRoutes);
app.use('/api/tiempoextra', tiempoExtraRoutes);

// Puerto de Render o local
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en puerto: ${PORT}`);
});
