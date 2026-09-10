import nodemailer from 'nodemailer';

const getEmailConfig = () => ({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true',
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.SMTP_FROM || process.env.SMTP_USER,
  to: process.env.NOTIFICACION_EMAIL || process.env.SMTP_USER
});

export const enviarAlertaStockBajo = async (producto) => {
  const config = getEmailConfig();

  if (!config.host || !config.user || !config.pass) {
    console.warn('⚠️ SMTP no configurado. Se omite el envío de email de stock bajo.');
    return { enviado: false, motivo: 'SMTP_NO_CONFIGURADO' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass
      }
    });

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #f0c36d; border-radius: 12px; background: #fffdf5;">
        <h2 style="color: #7a5200; margin-bottom: 12px;">⚠️ Alerta de stock bajo</h2>
        <p style="margin: 0 0 10px; color: #444;">El producto <strong>${producto.nombre}</strong> está llegando a su límite de inventario.</p>
        <p style="margin: 0 0 10px; color: #444;"><strong>Unidades disponibles:</strong> ${producto.cantidad_disponible}</p>
        <p style="margin: 0; color: #444;">Revisa la bodega o solicita una nueva compra.</p>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"Inventario Bodega" <${config.from}>`,
      to: config.to,
      subject: `Alerta de stock bajo: ${producto.nombre}`,
      html
    });

    console.log(`📧 Email de alerta enviado para ${producto.nombre}: ${info.messageId}`);
    return { enviado: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error enviando email de alerta de stock bajo:', error);
    return { enviado: false, motivo: error.message };
  }
};
