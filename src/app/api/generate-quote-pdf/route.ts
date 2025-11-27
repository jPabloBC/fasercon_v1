import { NextResponse } from 'next/server'
import { generateQuotePDF } from '../../../lib/quotePdf'
import transporter from '../../../lib/email'
import { buildQuoteEmail, buildInternalQuoteEmail } from '../../../lib/quoteEmail'
import { supabase } from '@/lib/supabase'

// Helper: compute next 4-digit correlative by inspecting existing correlative fields
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
    const { correlative, contact, items, createdAt, sendEmail, quote_number } = body;

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

    const pdfBytes = await generateQuotePDF({ correlative: actualCorrelative, contact, items, createdAt, quote_number });

    // Si se solicita enviar por email, intentar enviar tanto al cliente como internamente
    let emailSent = false;
    let internalEmailSent = false;
    if (sendEmail && contact?.email) {
      try {
        const clientMail = buildQuoteEmail({ contact, items });
        const internalMail = buildInternalQuoteEmail({ contact, items });

        // Enviar al cliente
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

        // Enviar copia interna siempre a jpbernal@fasercon.cl
        const internalRecipient = process.env.INTERNAL_QUOTES_EMAIL || 'jpbernal@fasercon.cl';
        try {
          await transporter.sendMail({
            from: { name: 'Fasercon', address: process.env.EMAIL_USER! },
            to: internalRecipient,
            subject: internalMail.subject,
            html: internalMail.html,
            text: internalMail.text,
            attachments: [
              { filename: `Cotizacion_${actualCorrelative}.pdf`, content: Buffer.from(pdfBytes) }
            ]
          });
          internalEmailSent = true;
        } catch (err) {
          console.error('Error sending internal quote email:', err);
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
