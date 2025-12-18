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

// Configurar CORS con orígenes dinámicos
const allowedOrigins = (process.env.CORS_ORIGINS || 'https://www.portalmmx.com,https://portalmmx.com,https://checkin-mazak.vercel.app,https://*.vercel.app')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const corsOptionsDelegate = (req, callback) => {
  const requestOrigin = req.header('Origin');
  let corsOptions;

  if (!requestOrigin) {
    // Non-CORS or same-origin requests
    corsOptions = { origin: false };
  } else if (allowedOrigins.includes(requestOrigin)) {
    corsOptions = {
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true
    };
  } else {
    // Support wildcard entries like https://*.vercel.app
    const patterns = allowedOrigins
      .filter(p => p.includes('*'))
      .map(p => new RegExp('^' + p
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace('\\*', '.*') + '$'));

    const matchesWildcard = patterns.some(rx => rx.test(requestOrigin));

    if (matchesWildcard) {
      corsOptions = {
        origin: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true
      };
    } else {
      corsOptions = { origin: false };
    }
  }
  callback(null, corsOptions);
};

// Middlewares
app.use(express.json());
app.use(cors(corsOptionsDelegate));
// Preflight support
// Express 5 / path-to-regexp v6: use (.*) instead of *
// Express 5 + path-to-regexp v6: use a star param for catch-all
app.options('/:path(*)', cors(corsOptionsDelegate));

// Rutas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/checkin', checkinRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/vacaciones', vacacionesRoutes);
app.use('/api/user', userRoutes);
app.use('/api/work-hours', workHoursRoutes);
app.use('/api/work-sessions', workSessionsRoutes);
app.use('/api/tiempoextra', tiempoExtraRoutes);

// Ruta de salud para Render
app.get('/', (req, res) => {
  res.status(200).send('OK');
});

// Puerto de Render o local
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en puerto: ${PORT}`);
});

