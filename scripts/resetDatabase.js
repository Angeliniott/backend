/*
  Reset database script
  - Keeps users
  - Deletes test data: vacations, overtime, checkins, work sessions, hours, special checks
  - Optionally clears uploads
  - Optionally creates a JSON backup per collection
  - Resets users' pending vacation fields to current entitlement
*/

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const connectDB = require('../db');

// Models
const User = require('../models/user');
const Vacaciones = require('../models/vacaciones');
const SolicitudVacaciones = require('../models/solicitudvacaciones');
const SolicitudTiempoExtra = require('../models/solicitudTiempoExtra');
const Checkin = require('../models/checkin');
const SpecialCheck = require('../models/specialcheck');
const DailyWorkHours = require('../models/DailyWorkHours');
const WeeklyWorkHours = require('../models/WeeklyWorkHours');
const WorkSession = require('../models/WorkSession');

// CLI flags
const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const CONFIRM = args.has('--confirm');
const WITH_UPLOADS = args.has('--with-uploads');
const WITH_BACKUP = args.has('--backup');

function ts() {
  return new Date().toISOString();
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function backupCollection(model, outDir) {
  const name = model.collection.collectionName;
  const data = await model.find({}).lean();
  const outPath = path.join(outDir, `${name}.json`);
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');
  return { name, count: data.length, file: outPath };
}

function calcCurrentEntitlement(fechaIngreso) {
  const hoy = new Date();
  const hire = new Date(fechaIngreso);
  // Compute "aniversario" for the current cycle (same as in routes/vacaciones.js)
  const aniversario = new Date(hire);
  aniversario.setFullYear(hoy.getFullYear());
  if (hoy < aniversario) aniversario.setFullYear(hoy.getFullYear() - 1);

  // Antigüedad simple por año calendario (matching actualizarDiasPendientes)
  const antiguedad = hoy.getFullYear() - hire.getFullYear();
  let dias = 12;
  if (antiguedad >= 1 && antiguedad <= 4) {
    dias += antiguedad * 2;
  } else if (antiguedad >= 5) {
    dias += 8 + Math.floor((antiguedad - 5) / 5) * 2;
  }

  const vigenciaActual = new Date(aniversario);
  vigenciaActual.setFullYear(vigenciaActual.getFullYear() + 1);

  return { dias, vigenciaActual };
}

async function main() {
  // Safety guard: block in production unless explicitly allowed
  const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';
  const allowReset = (process.env.ALLOW_RESET || '').toLowerCase() === 'true';
  if (isProd && !allowReset) {
    console.error('❌ Bloqueado: NODE_ENV=production y ALLOW_RESET != true');
    process.exit(1);
  }

  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI no está definido en el entorno (.env)');
    process.exit(1);
  }

  console.log(`[${ts()}] Conectando a la base de datos...`);
  await connectDB();

  const targets = [
    { label: 'Vacaciones', model: Vacaciones },
    { label: 'SolicitudVacaciones', model: SolicitudVacaciones },
    { label: 'SolicitudTiempoExtra', model: SolicitudTiempoExtra },
    { label: 'Checkin', model: Checkin },
    { label: 'SpecialCheck', model: SpecialCheck },
    { label: 'WorkSession', model: WorkSession },
    { label: 'DailyWorkHours', model: DailyWorkHours },
    { label: 'WeeklyWorkHours', model: WeeklyWorkHours },
  ];

  // Counts
  const counts = {};
  for (const t of targets) {
    counts[t.label] = await t.model.countDocuments();
  }
  const userCount = await User.countDocuments();

  console.log('================ PLAN DE RESETEO ================');
  console.log(`Usuarios a conservar: ${userCount}`);
  for (const [label, count] of Object.entries(counts)) {
    console.log(`Borrar colección ${label}: ${count} documentos`);
  }
  console.log(`Eliminar archivos en uploads: ${WITH_UPLOADS ? 'Sí' : 'No'}`);
  console.log(`Crear respaldo JSON: ${WITH_BACKUP ? 'Sí' : 'No'}`);
  console.log(`Modo simulación (dry-run): ${DRY_RUN ? 'Sí' : 'No'}`);
  console.log('=================================================');

  if (DRY_RUN) {
    console.log('✔️ Dry-run finalizado. No se realizó ningún cambio.');
    await mongoose.connection.close();
    return;
  }

  if (!CONFIRM) {
    console.error('❌ Falta --confirm. Ejecute con --confirm para proceder.');
    await mongoose.connection.close();
    process.exit(1);
  }

  // Backup (optional)
  let backupDir = null;
  if (WITH_BACKUP) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    backupDir = path.join(__dirname, '..', 'backups', `backup-${stamp}`);
    ensureDir(backupDir);
    console.log(`[${ts()}] Creando respaldo en ${backupDir}`);
    // Backup all relevant collections, including users for seguridad
    const allModels = [{ label: 'User', model: User }, ...targets];
    for (const entry of allModels) {
      const info = await backupCollection(entry.model, backupDir);
      console.log(`  • ${info.name}: ${info.count} → ${path.relative(process.cwd(), info.file)}`);
    }
  }

  // Delete data collections
  console.log(`[${ts()}] Borrando colecciones de datos de prueba...`);
  for (const t of targets) {
    const res = await t.model.deleteMany({});
    console.log(`  • ${t.label}: eliminados ${res.deletedCount || 0}`);
  }

  // Clear uploads (optional)
  if (WITH_UPLOADS) {
    const uploadsPath = path.join(__dirname, '..', 'uploads');
    try {
      if (fs.existsSync(uploadsPath)) {
        const files = fs.readdirSync(uploadsPath);
        for (const f of files) {
          const fp = path.join(uploadsPath, f);
          try { fs.unlinkSync(fp); } catch (_) {}
        }
        console.log(`  • uploads limpiado (${files.length} archivos)`);
      } else {
        console.log('  • uploads no existe, nada que borrar');
      }
    } catch (e) {
      console.warn('⚠️ Error limpiando uploads:', e.message);
    }
  }

  // Reset users' pending vacations to current entitlement
  console.log(`[${ts()}] Actualizando saldos de vacaciones de usuarios...`);
  const users = await User.find({});
  let updated = 0;
  for (const u of users) {
    if (!u.fechaIngreso) continue;
    const { dias, vigenciaActual } = calcCurrentEntitlement(u.fechaIngreso);
    const setFields = {
      diasPendientesPrevios: 0,
      diasPendientesActuales: dias,
      vigenciaActuales: vigenciaActual
    };
    const unsetFields = { vigenciaPrevios: "" };
    await User.updateOne(
      { _id: u._id },
      { $set: setFields, $unset: unsetFields },
      { runValidators: false, strict: false }
    );
    updated++;
  }
  console.log(`  • Usuarios actualizados: ${updated}/${users.length}`);

  console.log('✔️ Reset completo.');
  await mongoose.connection.close();
}

main().catch(async (err) => {
  console.error('❌ Error durante el reset:', err);
  try { await mongoose.connection.close(); } catch (_) {}
  process.exit(1);
});
