const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail', // puedes cambiarlo si usas Outlook, Yahoo, etc.
  auth: {
    user: process.env.EMAIL_USER || 'notificacionesmazak@gmail.com',
    pass: process.env.EMAIL_PASS || 'ailcfhmabxerperx'
  }
});

// Send notification email to admin2
const sendTiempoExtraNotification = async (
  admin2Email,
  admin2Name,
  requesterName,
  employeeName,
  startDate,
  endDate,
  horasEntreSemana,
  horasFinSemana,
  diasFestivos,
  bonoEstanciaFinSemana,
  bonoViajeFinSemana,
  justification,
  reportePath
) => {
  const attachments = [];
  if (reportePath) {
    const fs = require('fs');
    const path = require('path');
    attachments.push({
      filename: path.basename(reportePath),
      path: reportePath
    });
  }

  const mailOptions = {
    from: process.env.EMAIL_USER || 'notificacionesmazak@gmail.com',
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
          <p><strong>Periodo:</strong> ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}</p>
          <p><strong>Horas entre semana:</strong> ${horasEntreSemana}</p>
          <p><strong>Horas fin de semana:</strong> ${horasFinSemana}</p>
          <p><strong>Días festivos:</strong> ${diasFestivos}</p>
          <p><strong>Bono x Estancia en fin de semana:</strong> ${bonoEstanciaFinSemana}</p>
          <p><strong>Bono x Viaje en fin de semana:</strong> ${bonoViajeFinSemana}</p>
          <p><strong>Justificación:</strong> ${justification}</p>
          ${reportePath ? `<p><strong>Reporte adjunto:</strong> Sí</p>` : ''}
        </div>
        <p>Por favor, revisa la solicitud en el sistema y aprueba o rechaza según corresponda.</p>
        <p>Saludos,<br>Sistema de Gestión de Empleados</p>
      </div>
    `,
    attachments: attachments
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email enviado a ${admin2Email}`);
  } catch (error) {
    console.error(`❌ Error enviando email a ${admin2Email}:`, error);
  }
};

// Send notification email to employee
const sendEmployeeTiempoExtraNotification = async (
  employeeEmail,
  employeeName,
  requesterName,
  startDate,
  endDate,
  horasEntreSemana,
  horasFinSemana,
  diasFestivos,
  bonoEstanciaFinSemana,
  bonoViajeFinSemana,
  justification,
  reportePath
) => {
  const attachments = [];
  if (reportePath) {
    const fs = require('fs');
    const path = require('path');
    attachments.push({
      filename: path.basename(reportePath),
      path: reportePath
    });
  }

  const mailOptions = {
    from: process.env.EMAIL_USER || 'notificacionesmazak@gmail.com',
    to: employeeEmail,
    subject: 'Nueva Solicitud de Tiempo Extra Generada',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Nueva Solicitud de Tiempo Extra</h2>
        <p>Hola ${employeeName},</p>
        <p>Tu jefe ha generado una solicitud de tiempo extra para ti. Aquí están los detalles:</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Solicitante:</strong> ${requesterName}</p>
          <p><strong>Periodo:</strong> ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}</p>
          <p><strong>Horas entre semana:</strong> ${horasEntreSemana}</p>
          <p><strong>Horas fin de semana:</strong> ${horasFinSemana}</p>
          <p><strong>Días festivos:</strong> ${diasFestivos}</p>
          <p><strong>Bono x Estancia en fin de semana:</strong> ${bonoEstanciaFinSemana}</p>
          <p><strong>Bono x Viaje en fin de semana:</strong> ${bonoViajeFinSemana}</p>
          <p><strong>Justificación:</strong> ${justification}</p>
          ${reportePath ? `<p><strong>Reporte adjunto:</strong> Sí</p>` : ''}
        </div>
        <p>Puedes revisar el estado de aprobación en el dashboard del sistema.</p>
        <p>Saludos,<br>Sistema de Gestión de Empleados</p>
      </div>
    `,
    attachments: attachments
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email enviado a ${employeeEmail}`);
  } catch (error) {
    console.error(`❌ Error enviando email a ${employeeEmail}:`, error);
  }
};

// Send vacation reminder email to employee
const sendVacationReminder = async (employeeEmail, employeeName, expirationDate, availableDays) => {
  const mailOptions = {
    from: process.env.EMAIL_USER || 'notificacionesmazak@gmail.com',
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
        <p>Saludos,<br>Sistema de Gestión de Empleados</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Recordatorio de vacaciones enviado a ${employeeEmail}`);
  } catch (error) {
    console.error(`❌ Error enviando recordatorio a ${employeeEmail}:`, error);
  }
};

module.exports = {
  sendTiempoExtraNotification,
  sendEmployeeTiempoExtraNotification,
  sendVacationReminder
};
