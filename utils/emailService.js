// emailService.js
const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');

// Inicializa cliente de Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Función auxiliar para evitar rate limit (2 req/segundo)
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


// ===============================
// 📩 Enviar correo de notificación a admin
// ===============================
const sendTiempoExtraNotification = async (
  admin2Email,
  admin2Name,
  requesterName,
  employeeName,
  type,
  startDate,
  endDate,
  workedDates,
  cliente,
  motivo,
  reportePath
) => {
  const attachments = [];

  if (reportePath && fs.existsSync(reportePath)) {
    const fileBuffer = fs.readFileSync(reportePath);
    attachments.push({
      filename: path.basename(reportePath),
      content: fileBuffer.toString('base64'),
    });
  }

  let periodoText = '';
  let motivoText = '';

  if (type === 'valor_agregado') {
    periodoText = `<p><strong>Periodo:</strong> ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}</p>`;
    motivoText = `
      <p><strong>Motivo:</strong></p>
      <ul>
        ${motivo?.trabajoFinSemana?.selected ? `<li>TRABAJO EN FIN DE SEMANA: ${motivo.trabajoFinSemana.cantidad}</li>` : ''}
        ${motivo?.estadiaFinSemana?.selected ? `<li>ESTADIA EN FIN DE SEMANA: ${motivo.estadiaFinSemana.cantidad}</li>` : ''}
        ${motivo?.viajesFinSemana?.selected ? `<li>VIAJES DE FIN DE SEMANA: ${motivo.viajesFinSemana.cantidad}</li>` : ''}
        ${motivo?.diasFestivosLaborados?.selected ? `<li>DIAS FESTIVOS LABORADOS: ${motivo.diasFestivosLaborados.cantidad}</li>` : ''}
      </ul>
    `;
  } else if (type === 'tiempo_por_tiempo') {
    const datesList = workedDates.map(date => new Date(date).toLocaleDateString()).join(', ');
    periodoText = `<p><strong>Fechas trabajadas:</strong> ${datesList}</p>`;
    motivoText = '<p><strong>Tipo:</strong> Tiempo por Tiempo</p>';
  }

  const data = {
    from: 'Mazak Soporte <onboarding@resend.dev>',
    to: admin2Email,
    subject: 'Nueva Solicitud de Tiempo Extra Pendiente de Aprobación',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Nueva Solicitud de Tiempo Extra</h2>
        <p>Hola ${admin2Name},</p>
        <p>Se ha recibido una nueva solicitud de tiempo extra que requiere tu aprobación:</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Solicitante:</strong> ${requesterName}</p>
          <p><strong>Empleado:</strong> ${employeeName}</p>
          ${periodoText}
          <p><strong>Cliente:</strong> ${cliente}</p>
          ${motivoText}
          ${reportePath ? `<p><strong>Reporte adjunto:</strong> Sí</p>` : ''}
        </div>
        <p>Por favor, revisa la solicitud en el sistema y aprueba o rechaza según corresponda.</p>
        <p>Saludos,<br><strong>Sistema de Gestión de Empleados</strong></p>
      </div>
    `,
    attachments,
  };

  try {
    await delay(500);
    const result = await resend.emails.send(data);
    console.log(`✅ Email enviado a ${admin2Email}`, result);
  } catch (error) {
    console.error(`❌ Error enviando email a ${admin2Email}:`, error);
  }
};

// ===============================
// 📩 Enviar correo al empleado
// ===============================
const sendEmployeeTiempoExtraNotification = async (
  employeeEmail,
  employeeName,
  requesterName,
  type,
  startDate,
  endDate,
  workedDates,
  cliente,
  motivo,
  reportePath
) => {
  const attachments = [];

  if (reportePath && fs.existsSync(reportePath)) {
    const fileBuffer = fs.readFileSync(reportePath);
    attachments.push({
      filename: path.basename(reportePath),
      content: fileBuffer.toString('base64'),
    });
  }

  let periodoText = '';
  let motivoText = '';

  if (type === 'valor_agregado') {
    periodoText = `<p><strong>Periodo:</strong> ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}</p>`;
    motivoText = `
      <p><strong>Motivo:</strong></p>
      <ul>
        ${motivo?.trabajoFinSemana?.selected ? `<li>TRABAJO EN FIN DE SEMANA: ${motivo.trabajoFinSemana.cantidad}</li>` : ''}
        ${motivo?.estadiaFinSemana?.selected ? `<li>ESTADIA EN FIN DE SEMANA: ${motivo.estadiaFinSemana.cantidad}</li>` : ''}
        ${motivo?.viajesFinSemana?.selected ? `<li>VIAJES DE FIN DE SEMANA: ${motivo.viajesFinSemana.cantidad}</li>` : ''}
        ${motivo?.diasFestivosLaborados?.selected ? `<li>DIAS FESTIVOS LABORADOS: ${motivo.diasFestivosLaborados.cantidad}</li>` : ''}
      </ul>
    `;
  } else if (type === 'tiempo_por_tiempo') {
    const datesList = workedDates.map(date => new Date(date).toLocaleDateString()).join(', ');
    periodoText = `<p><strong>Fechas trabajadas:</strong> ${datesList}</p>`;
    motivoText = '<p><strong>Tipo:</strong> Tiempo por Tiempo</p>';
  }

  const data = {
    from: 'Mazak Soporte <onboarding@resend.dev>',
    to: employeeEmail,
    subject: 'Nueva Solicitud de Tiempo Extra Generada',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Nueva Solicitud de Tiempo Extra</h2>
        <p>Hola ${employeeName},</p>
        <p>Tu jefe ha generado una solicitud de tiempo extra para ti. Aquí están los detalles:</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Solicitante:</strong> ${requesterName}</p>
          ${periodoText}
          <p><strong>Cliente:</strong> ${cliente}</p>
          ${motivoText}
          ${reportePath ? `<p><strong>Reporte adjunto:</strong> Sí</p>` : ''}
        </div>
        <p>Puedes revisar el estado de aprobación en el dashboard del sistema.</p>
        <p>Saludos,<br><strong>Sistema de Gestión de Empleados</strong></p>
      </div>
    `,
    attachments,
  };

  try {
    await delay(500);
    const result = await resend.emails.send(data);
    console.log(`✅ Email enviado a ${employeeEmail}`, result);
  } catch (error) {
    console.error(`❌ Error enviando email a ${employeeEmail}:`, error);
  }
};

// ===============================
// 📩 Recordatorio de vacaciones
// ===============================
const sendVacationReminder = async (employeeEmail, employeeName, expirationDate, availableDays) => {
  const data = {
    from: 'Mazak Soporte <onboarding@resend.dev>',
    to: employeeEmail,
    subject: 'Recordatorio: Tus días de vacaciones están por vencer',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Recordatorio de Vacaciones</h2>
        <p>Hola ${employeeName},</p>
        <p>Te recordamos que tienes días de vacaciones pendientes que vencerán pronto. Aprovecha para usarlos antes de que expiren.</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Días disponibles:</strong> ${availableDays}</p>
          <p><strong>Fecha de vencimiento:</strong> ${new Date(expirationDate).toLocaleDateString()}</p>
        </div>
        <p>Por favor, solicita tus vacaciones a través del sistema para no perder estos días.</p>
        <p>Saludos,<br><strong>Sistema de Gestión de Empleados</strong></p>
      </div>
    `,
  };

  try {
    await delay(500);
    const result = await resend.emails.send(data);
    console.log(`✅ Recordatorio de vacaciones enviado a ${employeeEmail}`, result);
  } catch (error) {
    console.error(`❌ Error enviando recordatorio a ${employeeEmail}:`, error);
  }
};

// ===============================
module.exports = {
  sendTiempoExtraNotification,
  sendEmployeeTiempoExtraNotification,
  sendVacationReminder,
};
