import { NextResponse } from 'next/server'
import { generateQuotePDF } from '../../../lib/quotePdfFile'
import transporter from '../../../lib/email'
import { buildQuoteEmail, buildInternalQuoteEmail } from '../../../lib/quoteEmail'
import { supabase } from '@/lib/supabase'

// Helper: compute next 4-digit correlative by inspecting existing correlative fields
// NOTE: This is a preview endpoint, so it does NOT consume the sequence override
async function computeNextCorrelative() {
  try {
    const { data: quotesCorrelatives } = await supabase.from('fasercon_quotes').select('correlative');
    const { data: versionsCorrelatives } = await supabase.from('fasercon_quote_versions').select('correlative');
    const all: Array<string | null | undefined> = [];
    if (Array.isArray(quotesCorrelatives)) all.push(...quotesCorrelatives.map((r: { correlative: string }) => r.correlative));
    if (Array.isArray(versionsCorrelatives)) all.push(...versionsCorrelatives.map((r: { correlative: string }) => r.correlative));
    let maxNum = 0;
    for (const s of all) {
      if (!s) continue;
      const str = String(s).trim();
      if (/^\d{4}$/.test(str)) {
        const n = parseInt(str, 10);
        if (!isNaN(n) && n > maxNum) maxNum = n;
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
    const { correlative, contact, items, createdAt, sendEmail, quote_number, description, execution_time, payment_method } = body;

    // If correlative not provided, but quote_number was passed, try to fetch stored correlative
    let actualCorrelative = correlative;
    if ((!actualCorrelative || actualCorrelative === '') && quote_number) {
      try {
        const { data: qRow, error: qErr } = await supabase
          .from('fasercon_quotes')
          .select('correlative')
          .eq('quote_number', quote_number)
          .limit(1)
          .maybeSingle();
        if (!qErr && qRow && qRow.correlative) {
          actualCorrelative = qRow.correlative;
        }
      } catch (err) {
        console.warn('Could not lookup correlative by quote_number:', err);
      }
    }

    // If still missing, compute next correlative reliably
    if (!actualCorrelative || actualCorrelative === '') {
      actualCorrelative = await computeNextCorrelative();
    }

    // Debug: log items to verify SKU is present
    console.log('[PDF Endpoint] Generating PDF with items:', JSON.stringify(items.map((it: any) => ({ name: it.name, sku: it.sku })), null, 2));

    const pdfBytes = await generateQuotePDF({ correlative: actualCorrelative, contact, items, createdAt, quote_number, description, execution_time, payment_method });

    // Si se solicita enviar por email, intentar enviar tanto al cliente como internamente
    let emailSent = false;
    let internalEmailSent = false;
    if (sendEmail && contact?.email) {
      try {
        const clientMail = buildQuoteEmail({ contact, items });

        // Prepare internal recipients: env may contain comma-separated emails.
        const internalEnv = process.env.INTERNAL_QUOTES_EMAIL || '';
        const internalRecipients = internalEnv
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        // Ensure jpbernal@fasercon.cl is included
        if (!internalRecipients.includes('jpbernal@fasercon.cl')) {
          internalRecipients.push('jpbernal@fasercon.cl');
        }
        // Also include the sending account (EMAIL_USER) so the sender receives the internal copy
        const senderEmail = process.env.EMAIL_USER?.trim();
        if (senderEmail && !internalRecipients.includes(senderEmail)) {
          internalRecipients.push(senderEmail);
        }
        // Log internal recipients for debugging delivery issues
        console.log('[generate-quote-pdf] internalRecipients:', internalRecipients);

        // Enviar al cliente (sin BCC)
        await transporter.sendMail({
          from: { name: 'Fasercon', address: process.env.EMAIL_USER! },
          to: contact.email,
          subject: clientMail.subject,
          html: clientMail.html,
          text: clientMail.text,
          attachments: [
            { filename: `Cotizacion_${actualCorrelative}.pdf`, content: Buffer.from(pdfBytes) }
          ]
        });
        emailSent = true;

        // Enviar correo interno separado (plantilla interna)
        try {
          const internalMail = buildInternalQuoteEmail({ contact, items });
          if (internalRecipients.length > 0) {
            try {
              const internalResult = await transporter.sendMail({
                from: { name: 'Fasercon', address: process.env.EMAIL_USER! },
                to: internalRecipients,
                subject: internalMail.subject,
                html: internalMail.html,
                text: internalMail.text,
                attachments: [
                  { filename: `Cotizacion_${actualCorrelative}.pdf`, content: Buffer.from(pdfBytes) }
                ]
              });
              console.log('[generate-quote-pdf] internal send result:', internalResult);
              internalEmailSent = true;

              // Additionally, send an explicit copy to info@fasercon.cl to ensure alias receives it
              try {
                const infoResult = await transporter.sendMail({
                  from: { name: 'Fasercon', address: process.env.EMAIL_USER! },
                  to: 'jpbernal@fasercon.cl',
                  subject: internalMail.subject + ' (Copia Interna)',
                  html: internalMail.html,
                  text: internalMail.text,
                  attachments: [
                    { filename: `Cotizacion_${actualCorrelative}.pdf`, content: Buffer.from(pdfBytes) }
                  ]
                });
                console.log('[generate-quote-pdf] explicit info@fasercon.cl send result:', infoResult);
              } catch (infoErr) {
                console.error('Error sending explicit copy to info@fasercon.cl:', infoErr);
              }
            } catch (innerSendErr) {
              console.error('Error sending internal email (transport):', innerSendErr);
              internalEmailSent = false;
            }
          } else {
            internalEmailSent = false;
          }
        } catch (intErr) {
          console.error('Error sending internal quote email:', intErr);
          internalEmailSent = false;
        }
      } catch (emailErr) {
        console.error('Error sending quote email:', emailErr);
        emailSent = false;
      }
    }

    // Solo mostrar éxito si ambos correos fueron enviados
    const allEmailsSent = emailSent && internalEmailSent;
    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'X-EMAIL-SENT': allEmailsSent ? 'true' : 'false',
        'X-EMAIL-CLIENT': emailSent ? 'true' : 'false',
        'X-EMAIL-INTERNAL': internalEmailSent ? 'true' : 'false',
      },
    });
  } catch (err) {
    console.error('Error in generate-quote-pdf:', err);
    return NextResponse.json({ error: 'Error generating PDF' }, { status: 500 });
  }
}
