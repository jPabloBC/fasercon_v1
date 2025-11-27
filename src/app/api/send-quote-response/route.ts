import { NextResponse } from 'next/server'
import { generateQuotePDF } from '../../../lib/quotePdfFile'
import transporter from '../../../lib/email'
import { supabase, supabaseAdmin } from '@/lib/supabase'

// Helper: compute next 4-digit correlative
async function computeNextCorrelative() {
  try {
    const { data: quotes } = await supabase.from('fasercon_quotes').select('correlative');
    let maxNum = 0;
    if (Array.isArray(quotes)) {
      for (const r of quotes) {
        const val = r?.correlative;
        if (!val) continue;
        const str = String(val).trim();
        if (/^\d{4}$/.test(str)) {
          const n = parseInt(str, 10);
          if (!isNaN(n) && n > maxNum) maxNum = n;
        }
      }
    }
    return String(maxNum + 1).padStart(4, '0');
  } catch (err) {
    console.warn('computeNextCorrelative failed:', err);
    return '0001';
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { quote_id, contact, items, createdAt, sendEmail } = body;

    // Buscar la cotización por ID y obtener/crear correlativo
    let actualCorrelative = '';

    if (quote_id) {
      const { data: qRow } = await supabase
        .from('fasercon_quotes')
        .select('*')
        .eq('id', quote_id)
        .single();
      
      if (qRow) {
        // Si ya tiene correlativo, usarlo; si no, crear uno nuevo
        if (qRow.correlative && /^\d{4}$/.test(String(qRow.correlative))) {
          actualCorrelative = qRow.correlative;
        } else {
          actualCorrelative = await computeNextCorrelative();
          // Actualizar la BD con el nuevo correlativo usando supabaseAdmin
          if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
            await supabaseAdmin
              .from('fasercon_quotes')
              .update({ correlative: actualCorrelative })
              .eq('id', quote_id);
          }
        }
      }
    }

    if (!actualCorrelative) {
      actualCorrelative = await computeNextCorrelative();
    }

    // Generar PDF con precios (quotePdfFile.ts incluye columnas de precios)
    const pdfBytes = await generateQuotePDF({
      correlative: actualCorrelative,
      contact,
      items,
      createdAt,
    });

    // Enviar correos (cliente e interno)
    let emailSent = false;
    let internalEmailSent = false;

    if (sendEmail && contact?.email) {
      try {
        // Correo al cliente
        const clientSubject = `Cotización Nº ${actualCorrelative} - Fasercon`;
        const clientHtml = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
            <h2 style="background:#e53e3e;color:white;padding:16px 0;text-align:center;">Cotización Fasercon</h2>
            <p>Estimado/a <b>${contact.company}</b>,</p>
            <p>Adjunto encontrarás la cotización solicitada con el número <b>${actualCorrelative}</b>.</p>
            <p>Los precios y condiciones están detallados en el documento adjunto.</p>
            <p>Quedamos atentos a cualquier consulta.</p>
            <hr style="margin:24px 0;border:none;border-top:1px solid #eee;">
            <p style="font-size:12px;color:#888;text-align:center;">Este correo es automático. Responde a ventas@fasercon.cl para consultas.</p>
          </div>
        `;

        await transporter.sendMail({
          from: { name: 'Fasercon', address: process.env.EMAIL_USER! },
          to: contact.email,
          subject: clientSubject,
          html: clientHtml,
          text: `Cotización Nº ${actualCorrelative} - Fasercon\n\nEstimado/a ${contact.company},\n\nAdjunto encontrarás la cotización solicitada.\n\nSaludos,\nEquipo Fasercon`,
          attachments: [
            { filename: `Cotizacion_${actualCorrelative}.pdf`, content: Buffer.from(pdfBytes) }
          ]
        });
        emailSent = true;

        // Correo interno
        const internalRecipient = process.env.INTERNAL_QUOTES_EMAIL || 'jpbernal@fasercon.cl';
        const internalSubject = `Copia Interna: Cotización Nº ${actualCorrelative} enviada`;
        const internalHtml = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
            <h2 style="background:#2d3748;color:white;padding:16px 0;text-align:center;">Cotización Enviada (Interno)</h2>
            <p>Se ha enviado la cotización <b>Nº ${actualCorrelative}</b> al cliente:</p>
            <ul>
              <li><b>Empresa:</b> ${contact.company}</li>
              <li><b>Email:</b> ${contact.email}</li>
              <li><b>Teléfono:</b> ${contact.phone}</li>
            </ul>
            <hr style="margin:24px 0;border:none;border-top:1px solid #eee;">
            <p style="font-size:12px;color:#888;text-align:center;">Correo interno de respaldo.</p>
          </div>
        `;

        try {
          await transporter.sendMail({
            from: { name: 'Fasercon', address: process.env.EMAIL_USER! },
            to: internalRecipient,
            subject: internalSubject,
            html: internalHtml,
            text: `Cotización Nº ${actualCorrelative} enviada a ${contact.company} (${contact.email})`,
            attachments: [
              { filename: `Cotizacion_${actualCorrelative}.pdf`, content: Buffer.from(pdfBytes) }
            ]
          });
          internalEmailSent = true;
        } catch (err) {
          console.error('Error sending internal quote response email:', err);
        }
      } catch (emailErr) {
        console.error('Error sending quote response email:', emailErr);
        emailSent = false;
      }
    }

    const allEmailsSent = emailSent && internalEmailSent;
    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'X-EMAIL-SENT': allEmailsSent ? 'true' : 'false',
        'X-EMAIL-CLIENT': emailSent ? 'true' : 'false',
        'X-EMAIL-INTERNAL': internalEmailSent ? 'true' : 'false',
        'X-CORRELATIVE': actualCorrelative,
      },
    });
  } catch (err) {
    console.error('Error in send-quote-response:', err);
    return NextResponse.json({ error: 'Error sending quote response' }, { status: 500 });
  }
}
