// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/user');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token no proporcionado." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, role, ... }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido o expirado." });
  }
};

const verifyAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Acceso denegado: solo administradores." });
    }

    next();
  } catch (err) {
    return res.status(500).json({ error: "Error al verificar permisos." });
  }
};

module.exports = {
  authMiddleware,
  verifyAdmin
};
