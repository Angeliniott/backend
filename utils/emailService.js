const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Test Resend connection on startup
resend.emails.send({
  from: 'onboarding@resend.dev',
  to: 'test@example.com',
  subject: 'Test',
  html: '<p>Test</p>'
}).then(() => {
  console.log('✅ Resend API key is valid and working');
}).catch((error) => {
  console.log('⚠️  Resend API key validation failed:', error.message);
  console.log('📧 Make sure your domain is verified in Resend dashboard');
});


// Send notification email to admin2
const sendTiempoExtraNotification = async (
  admin2Email,
  admin2Name,
  requesterName,
  employeeName,
  startDate,
  endDate,
  cliente,
  motivo,
  reportePath
) => {
  const attachments = [];
  if (reportePath) {
    const fileBuffer = fs.readFileSync(reportePath);
    const base64File = fileBuffer.toString('base64');
    attachments.push({
      filename: path.basename(reportePath),
      content: base64File
    });
  }

  const data = {
    from: 'Mazak Soporte <notificaciones@resend.dev>',
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
          <p><strong>Cliente:</strong> ${cliente}</p>
          <p><strong>Motivo:</strong></p>
          <ul>
            ${motivo.trabajoFinSemana.selected ? `<li>TRABAJO EN FIN DE SEMANA: ${motivo.trabajoFinSemana.cantidad}</li>` : ''}
            ${motivo.estadiaFinSemana.selected ? `<li>ESTADIA EN FIN DE SEMANA: ${motivo.estadiaFinSemana.cantidad}</li>` : ''}
            ${motivo.viajesFinSemana.selected ? `<li>VIAJES DE FIN DE SEMANA: ${motivo.viajesFinSemana.cantidad}</li>` : ''}
            ${motivo.diasFestivosLaborados.selected ? `<li>DIAS FESTIVOS LABORADOS: ${motivo.diasFestivosLaborados.cantidad}</li>` : ''}
          </ul>
          ${reportePath ? `<p><strong>Reporte adjunto:</strong> Sí</p>` : ''}
        </div>
        <p>Por favor, revisa la solicitud en el sistema y aprueba o rechaza según corresponda.</p>
        <p>Saludos,<br>Sistema de Gestión de Empleados</p>
      </div>
    `,
    attachments: attachments
  };

  try {
    const result = await resend.emails.send(data);
    console.log(`✅ Email enviado a ${admin2Email}`, result);
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
  cliente,
  motivo,
  reportePath
) => {
  const attachments = [];
  if (reportePath) {
    const fileBuffer = fs.readFileSync(reportePath);
    const base64File = fileBuffer.toString('base64');
    attachments.push({
      filename: path.basename(reportePath),
      content: base64File
    });
  }

  const data = {
    from: 'Mazak Soporte <notificaciones@resend.dev>',
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
          <p><strong>Cliente:</strong> ${cliente}</p>
          <p><strong>Motivo:</strong></p>
          <ul>
            ${motivo.trabajoFinSemana.selected ? `<li>TRABAJO EN FIN DE SEMANA: ${motivo.trabajoFinSemana.cantidad}</li>` : ''}
            ${motivo.estadiaFinSemana.selected ? `<li>ESTADIA EN FIN DE SEMANA: ${motivo.estadiaFinSemana.cantidad}</li>` : ''}
            ${motivo.viajesFinSemana.selected ? `<li>VIAJES DE FIN DE SEMANA: ${motivo.viajesFinSemana.cantidad}</li>` : ''}
            ${motivo.diasFestivosLaborados.selected ? `<li>DIAS FESTIVOS LABORADOS: ${motivo.diasFestivosLaborados.cantidad}</li>` : ''}
          </ul>
          ${reportePath ? `<p><strong>Reporte adjunto:</strong> Sí</p>` : ''}
        </div>
        <p>Puedes revisar el estado de aprobación en el dashboard del sistema.</p>
        <p>Saludos,<br>Sistema de Gestión de Empleados</p>
      </div>
    `,
    attachments: attachments
  };

  try {
    const result = await resend.emails.send(data);
    console.log(`✅ Email enviado a ${employeeEmail}`, result);
  } catch (error) {
    console.error(`❌ Error enviando email a ${employeeEmail}:`, error);
  }
};

// Send vacation reminder email to employee
const sendVacationReminder = async (employeeEmail, employeeName, expirationDate, availableDays) => {
  const data = {
    from: 'Mazak Soporte <notificaciones@resend.dev>',
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
    const result = await resend.emails.send(data);
    console.log(`✅ Recordatorio de vacaciones enviado a ${employeeEmail}`, result);
  } catch (error) {
    console.error(`❌ Error enviando recordatorio a ${employeeEmail}:`, error);
  }
};

module.exports = {
  sendTiempoExtraNotification,
  sendEmployeeTiempoExtraNotification,
  sendVacationReminder
};
