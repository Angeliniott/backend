// emailService.js
const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');

// Inicializa cliente de Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Configuración de emails
// Soporta clave mal escrita MAIL_FORM como fallback
const MAIL_FROM = process.env.MAIL_FROM || process.env.MAIL_FORM || 'Mazak Soporte <onboarding@resend.dev>';
const HR_EMAIL = process.env.HR_EMAIL || 'mnery@mazakcorp.com';
const LIZ_EMAIL = process.env.LIZ_EMAIL || 'edelgado@mazakcorp.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://checkin-mazak.vercel.app';

// Función auxiliar para evitar rate limit (2 req/segundo)
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Envío genérico con diagnósticos
async function sendEmail({ to, cc, subject, html, attachments }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️ RESEND_API_KEY no está definido. Abortando envío de correo.');
    throw new Error('RESEND_API_KEY ausente');
  }
  if (!to || (Array.isArray(to) && to.length === 0)) {
    console.warn('⚠️ sendEmail llamado sin destinatarios válidos.');
    throw new Error('Destinatario requerido');
  }

  const data = {
    from: MAIL_FROM,
    to,
    cc,
    subject,
    html,
    attachments,
  };

  try {
    console.log('✉️  Intentando enviar email', {
      to: Array.isArray(to) ? to : [to],
      cc: Array.isArray(cc) ? cc : (cc ? [cc] : []),
      subject,
      from: MAIL_FROM,
    });
    await delay(500);
    const result = await resend.emails.send(data);
    // Resend suele devolver { id, ... }
    if (result && result.id) {
      console.log('✅ Email aceptado por Resend', { id: result.id, subject });
    } else {
      console.log('✅ Email enviado (respuesta sin id)', { subject });
    }
    return result;
  } catch (err) {
    console.error('❌ Error al enviar email con Resend:', {
      message: err?.message,
      name: err?.name,
      status: err?.status,
      cause: err?.cause?.message || undefined,
    });
    throw err;
  }
}


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
    from: MAIL_FROM,
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
        <p>Saludos,<br><strong>Portal del Empleado</strong></p>
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
    from: MAIL_FROM,
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
        <p>Saludos,<br><strong>Portal del Empleado</strong></p>
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
    from: MAIL_FROM,
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
        <p>Saludos,<br><strong>Portal del Empleado</strong></p>
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
// 📩 Vacaciones: notificar a admins cuando un empleado solicita
// ===============================
const sendVacationRequestToAdmins = async (adminEmails, employeeName, fechaInicio, fechaFin, diasSolicitados, motivo) => {
  if (!adminEmails || adminEmails.length === 0) return;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Nueva solicitud de vacaciones</h2>
      <p>Se ha recibido una solicitud de vacaciones que requiere revisión:</p>
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Empleado:</strong> ${employeeName}</p>
        <p><strong>Periodo:</strong> ${new Date(fechaInicio).toLocaleDateString()} - ${new Date(fechaFin).toLocaleDateString()}</p>
        <p><strong>Días hábiles solicitados:</strong> ${diasSolicitados}</p>
        ${motivo ? `<p><strong>Motivo:</strong> ${motivo}</p>` : ''}
      </div>
      <p>Gestiona esta solicitud en: <a href="${FRONTEND_URL}" target="_blank">${FRONTEND_URL}</a></p>
      <p>Saludos,<br><strong>Portal del Empleado</strong></p>
    </div>
  `;
  try {
    await sendEmail({ to: adminEmails, subject: 'Nueva solicitud de vacaciones pendiente', html });
  } catch (error) {
    console.error('❌ Error enviando notificación de solicitud de vacaciones:', error);
  }
};

// ===============================
// 📩 Vacaciones: decisión del admin (notificar a empleado; CC RH si aprobado)
// ===============================
const sendVacationDecisionToEmployee = async ({
  employeeEmail,
  employeeName,
  estado,
  comentariosAdmin,
  aprobadoPor
}) => {
  const aprobado = estado === 'aprobado';
  const subject = aprobado ? 'Vacaciones aprobadas' : 'Vacaciones rechazadas';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">${subject}</h2>
      <p>Hola ${employeeName},</p>
      <p>Tu solicitud de vacaciones ha sido <strong>${estado}</strong>${aprobadoPor ? ` por ${aprobadoPor}` : ''}.</p>
      ${comentariosAdmin ? `<p><strong>Comentarios:</strong> ${comentariosAdmin}</p>` : ''}
      <p>Puedes consultar el detalle en: <a href="${FRONTEND_URL}" target="_blank">${FRONTEND_URL}</a></p>
      <p>Saludos,<br><strong>Portal del Empleado</strong></p>
    </div>
  `;
  try {
    await sendEmail({
      to: employeeEmail,
      cc: aprobado ? [HR_EMAIL] : undefined,
      subject,
      html
    });
  } catch (error) {
    console.error('❌ Error enviando decisión de vacaciones al empleado:', error);
  }
};

// ===============================
// 📩 Tiempo extra: decisión del admin (notificar a solicitante, empleado; CC RH y Liz si aprobado)
// ===============================
const sendTiempoExtraDecisionNotification = async ({
  requesterEmail,
  requesterName,
  employeeEmail,
  employeeName,
  status,
  commentsAdmin,
  type,
  startDate,
  endDate,
  workedDates,
  cliente
}) => {
  const aprobado = status === 'aprobado';
  let periodoText = '';
  if (type === 'valor_agregado') {
    periodoText = `<p><strong>Periodo:</strong> ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}</p>`;
  } else if (type === 'tiempo_por_tiempo') {
    const datesList = (workedDates || []).map(date => new Date(date).toLocaleDateString()).join(', ');
    periodoText = `<p><strong>Fechas trabajadas:</strong> ${datesList}</p>`;
  }
  const baseHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Solicitud de tiempo extra ${aprobado ? 'aprobada' : 'rechazada'}</h2>
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Empleado:</strong> ${employeeName}</p>
        ${periodoText}
        <p><strong>Cliente:</strong> ${cliente || '-'}</p>
      </div>
      ${commentsAdmin ? `<p><strong>Comentarios del administrador:</strong> ${commentsAdmin}</p>` : ''}
      <p>Consulta el detalle en: <a href="${FRONTEND_URL}" target="_blank">${FRONTEND_URL}</a></p>
      <p>Saludos,<br><strong>Portal del Empleado</strong></p>
    </div>
  `;
  try {
    // A solicitante
    await sendEmail({
      to: requesterEmail,
      cc: aprobado ? [HR_EMAIL, LIZ_EMAIL] : undefined,
      subject: `Tiempo extra ${aprobado ? 'aprobado' : 'rechazado'}`,
      html: baseHtml
    });
    // Al empleado
    await sendEmail({
      to: employeeEmail,
      cc: aprobado ? [HR_EMAIL, LIZ_EMAIL] : undefined,
      subject: `Tu tiempo extra fue ${aprobado ? 'aprobado' : 'rechazado'}`,
      html: baseHtml
    });
  } catch (error) {
    console.error('❌ Error enviando decisión de tiempo extra:', error);
  }
};

// ===============================
module.exports = {
  sendTiempoExtraNotification,
  sendEmployeeTiempoExtraNotification,
  sendVacationReminder,
  sendVacationRequestToAdmins,
  sendVacationDecisionToEmployee,
  sendTiempoExtraDecisionNotification,
};
