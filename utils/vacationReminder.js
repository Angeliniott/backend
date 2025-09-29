const User = require('../models/user');
const SolicitudVacaciones = require('../models/solicitudvacaciones');
const { sendVacationReminder } = require('./emailService');

// Function to calculate vacation periods based on hire date
function calcularDiasPorAniversario(fechaIngreso) {
  const hoy = new Date();
  const periodos = [];

  for (let año = 0; año < 50; año++) {
    const inicio = new Date(fechaIngreso);
    inicio.setFullYear(inicio.getFullYear() + año);
    const fin = new Date(inicio);
    fin.setMonth(fin.getMonth() + 18); // expires 18 months later

    if (fin < hoy) continue; // expired
    if (inicio > hoy) break; // future

    let dias = 12;
    if (año >= 1 && año <= 4) {
      dias += año * 2;
    } else if (año >= 5) {
      dias += 8 + Math.floor((año - 5) / 5) * 2;
    }

    periodos.push({ inicio, fin, dias });
  }

  return periodos;
}

// Function to check and send reminders
async function checkAndSendVacationReminders() {
  try {
    console.log('🔍 Verificando recordatorios de vacaciones...');

    const users = await User.find({ fechaIngreso: { $exists: true } });

    for (const user of users) {
      const periodos = calcularDiasPorAniversario(user.fechaIngreso);
      const solicitudes = await SolicitudVacaciones.find({ email: user.email });

      for (const periodo of periodos) {
        // Calculate 2 months before expiration
        const reminderDate = new Date(periodo.fin);
        reminderDate.setMonth(reminderDate.getMonth() - 2);

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0); // reset time for date comparison
        reminderDate.setHours(0, 0, 0, 0);

        // Check if today is the reminder date
        if (hoy.getTime() === reminderDate.getTime()) {
          // Calculate used days in this period
          const usados = solicitudes
            .filter(s => s.estado === 'aprobado' && new Date(s.fechaFin) >= periodo.inicio && new Date(s.fechaFin) <= periodo.fin)
            .reduce((sum, s) => sum + s.diasSolicitados, 0);

          const disponibles = periodo.dias - usados;

          if (disponibles > 0) {
            // Send reminder email
            await sendVacationReminder(user.email, user.name, periodo.fin, disponibles);
          }
        }
      }
    }

    console.log('✅ Verificación de recordatorios completada.');
  } catch (error) {
    console.error('❌ Error en checkAndSendVacationReminders:', error);
  }
}

module.exports = {
  checkAndSendVacationReminders
};
