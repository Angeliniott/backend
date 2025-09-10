const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail', // puedes cambiarlo si usas Outlook, Yahoo, etc.
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});

// Send notification email
const sendTiempoExtraNotification = async (
  admin2Email,
  admin2Name,
  requesterName,
  employeeName,
  date,
  hours
) => {
  const mailOptions = {
    from: process.env.EMAIL_USER || 'your-email@gmail.com',
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
          <p><strong>Fecha:</strong> ${new Date(date).toLocaleDateString()}</p>
          <p><strong>Horas solicitadas:</strong> ${hours}</p>
        </div>
        <p>Por favor, revisa la solicitud en el sistema y aprueba o rechaza según corresponda.</p>
        <p>Saludos,<br>Sistema de Gestión de Empleados</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email enviado a ${admin2Email}`);
  } catch (error) {
    console.error(`❌ Error enviando email a ${admin2Email}:`, error);
  }
};

module.exports = {
  sendTiempoExtraNotification
};
