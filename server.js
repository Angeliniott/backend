// backend/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const express = require('express');
const checkoutRoutes = require('./routes/checkout');


app.use('/api/checkout', checkoutRoutes);


// Importar función para conectar a MongoDB
const connectDB = require('./db'); // Asegúrate de tener este archivo

// Cargar variables de entorno desde .env
dotenv.config();

// Conectar a MongoDB
connectDB();

const app = express();

// Configurar CORS
app.use(cors({
  origin: '*', // Puedes restringir esto más adelante a solo tu frontend
}));

// Middleware para parsear JSON
app.use(express.json());

// Rutas
app.use('/api/checkin', require('./routes/checkin'));

// Puerto de Render o local
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en puerto: ${PORT}`);
});

app.use('/api/auth', authRoutes);
