import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = 're_2J24tU1m_88A9i9T9d73zi7d5GSQgq3GA';
const OWNER_EMAIL   = 'michelinenailbar@gmail.com'; // email de la dueña (ajustar si es diferente)
const FROM_EMAIL    = 'Micheline Nail Bar <no-reply@micheline.com>';

const MONTHS_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function formatDate(dateStr: string): string {
  const [y, m, d] = (dateStr || '').split('-');
  if (!d) return dateStr;
  return `${parseInt(d)} de ${MONTHS_ES[parseInt(m) - 1]} de ${y}`;
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('Resend error:', err);
  }
  return res.ok;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }});
  }

  try {
    const { name, email, phone, service, stylist, date, time, price } = await req.json();

    const serviceName  = service?.name  || 'Servicio';
    const stylistName  = stylist?.full_name || 'Cualquiera disponible';
    const dateFormatted = formatDate(date);
    const priceFormatted = `$${parseFloat(price || 0).toFixed(2)}`;

    // ── EMAIL AL CLIENTE ──────────────────────────────────────────────────────
    if (email) {
      const clientHtml = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Reserva Confirmada · Micheline Nail Bar</title></head>
<body style="margin:0;padding:0;background:#FDFCFB;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FDFCFB;padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:24px;overflow:hidden;border:1px solid #E8E4E1;max-width:600px;width:100%">
        <!-- Header -->
        <tr><td style="background:#141413;padding:32px 40px">
          <h1 style="margin:0;font-family:Georgia,serif;font-style:italic;font-weight:300;font-size:28px;color:white">Micheline Nail Bar</h1>
          <p style="margin:6px 0 0;font-size:11px;letter-spacing:0.25em;color:#9997AB;text-transform:uppercase;font-family:monospace">Reserva tu momento de belleza</p>
        </td></tr>
        <!-- Hero -->
        <tr><td style="padding:40px 40px 24px;text-align:center">
          <div style="width:72px;height:72px;background:linear-gradient(135deg,#D8A7B1,#B08D57);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:32px;margin-bottom:20px">✓</div>
          <h2 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;color:#141413">¡Reserva Confirmada!</h2>
          <p style="margin:0;color:#9997AB;font-size:14px">Hola <strong>${name}</strong>, te esperamos con mucho gusto 💅</p>
        </td></tr>
        <!-- Details card -->
        <tr><td style="padding:0 40px 32px">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#FDFCFB;border:1px solid #E8E4E1;border-radius:16px;overflow:hidden">
            <tr style="border-bottom:1px solid #E8E4E1">
              <td style="padding:16px 20px;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#9997AB;font-family:monospace;width:40%">Servicio</td>
              <td style="padding:16px 20px;font-size:14px;color:#141413;font-weight:600">${serviceName}</td>
            </tr>
            <tr style="border-bottom:1px solid #E8E4E1;background:white">
              <td style="padding:16px 20px;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#9997AB;font-family:monospace">Estilista</td>
              <td style="padding:16px 20px;font-size:14px;color:#141413;font-weight:600">${stylistName}</td>
            </tr>
            <tr style="border-bottom:1px solid #E8E4E1">
              <td style="padding:16px 20px;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#9997AB;font-family:monospace">Fecha</td>
              <td style="padding:16px 20px;font-size:14px;color:#141413;font-weight:600">${dateFormatted}</td>
            </tr>
            <tr style="border-bottom:1px solid #E8E4E1;background:white">
              <td style="padding:16px 20px;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#9997AB;font-family:monospace">Hora</td>
              <td style="padding:16px 20px;font-size:14px;color:#141413;font-weight:600">${time} hs.</td>
            </tr>
            <tr>
              <td style="padding:16px 20px;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#9997AB;font-family:monospace">Total</td>
              <td style="padding:16px 20px;font-size:16px;color:#D8A7B1;font-weight:700">${priceFormatted}</td>
            </tr>
          </table>
        </td></tr>
        <!-- CTA WhatsApp -->
        <tr><td style="padding:0 40px 40px;text-align:center">
          <p style="font-size:13px;color:#9997AB;margin:0 0 16px">¿Necesitas cambiar o cancelar tu cita? Escríbenos por WhatsApp.</p>
          <a href="https://wa.me/18096277471" style="display:inline-block;background:#25D366;color:white;text-decoration:none;padding:14px 32px;border-radius:100px;font-size:14px;font-weight:600">📲 Contactar por WhatsApp</a>
        </td></tr>
        <!-- Footer -->
        <tr><td style="border-top:1px solid #E8E4E1;padding:24px 40px;text-align:center">
          <p style="margin:0;font-size:11px;letter-spacing:0.2em;color:#9997AB;text-transform:uppercase;font-family:monospace">© 2024 Micheline Nail Bar · @michelinenailbar</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
      await sendEmail(email, `✅ Reserva confirmada — ${serviceName} el ${dateFormatted}`, clientHtml);
    }

    // ── EMAIL AL ESTILISTA / DUEÑA ────────────────────────────────────────────
    const ownerHtml = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Nueva Reserva · Micheline</title></head>
<body style="margin:0;padding:0;background:#FDFCFB;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FDFCFB;padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:24px;overflow:hidden;border:1px solid #E8E4E1;max-width:600px;width:100%">
        <tr><td style="background:#141413;padding:28px 40px">
          <h1 style="margin:0;font-family:Georgia,serif;font-style:italic;font-weight:300;font-size:22px;color:white">💅 Nueva Reserva Recibida</h1>
        </td></tr>
        <tr><td style="padding:32px 40px">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#FDFCFB;border:1px solid #E8E4E1;border-radius:16px;overflow:hidden">
            ${[
              ['Cliente', name],
              ['Teléfono', phone || 'N/A'],
              ['Email', email || 'No proporcionado'],
              ['Servicio', serviceName],
              ['Estilista', stylistName],
              ['Fecha', dateFormatted],
              ['Hora', `${time} hs.`],
              ['Total', priceFormatted],
            ].map(([label, value], i) => `
            <tr style="${i % 2 === 0 ? '' : 'background:white;'}border-bottom:1px solid #E8E4E1">
              <td style="padding:14px 20px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#9997AB;font-family:monospace;width:35%">${label}</td>
              <td style="padding:14px 20px;font-size:14px;color:#141413;font-weight:600">${value}</td>
            </tr>`).join('')}
          </table>
        </td></tr>
        <tr><td style="border-top:1px solid #E8E4E1;padding:20px 40px;text-align:center">
          <p style="margin:0;font-size:11px;color:#9997AB;font-family:monospace;letter-spacing:0.15em;text-transform:uppercase">Micheline Nail Bar · Sistema de reservas</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
    await sendEmail(OWNER_EMAIL, `🗓️ Nueva reserva: ${name} · ${serviceName} el ${dateFormatted} a las ${time}`, ownerHtml);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    console.error('send-confirmation error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});
