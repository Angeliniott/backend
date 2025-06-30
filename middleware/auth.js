const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token no proporcionado." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "clavepordefecto");
    req.user = decoded; // contiene: id, email, role
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido o expirado." });
  }
};

const verifyAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Acceso denegado: solo administradores." });
  }
  next();
};

module.exports = {
  authMiddleware,
  verifyAdmin
};
