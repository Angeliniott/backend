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
  if (!req.user || req.user.role !== "admin" && req.user.role !== "admin2") {
    return res.status(403).json({ error: "Acceso denegado: solo administradores." });
  }
  next();
};

const verifyTiempoExtraAdmin = (req, res, next) => {
  if (!req.user || !req.user.role) {
    return res.status(401).json({ message: 'No autenticado' });
  }
  const role = req.user.role;
  if (role === 'admin' || role === 'admin2') {
    return next();
  }
  return res.status(403).json({ message: 'No autorizado' });
};

module.exports = {
  authMiddleware,
  verifyAdmin,
  verifyTiempoExtraAdmin
};

router.get('/admin/solicitudes', authMiddleware, verifyTiempoExtraAdmin, async (req, res) => {
  try {
    const solicitudes = await SolicitudTiempoExtra.find(); // Asegúrate de que no haya filtros restrictivos aquí
    res.json(solicitudes);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener solicitudes' });
  }
});