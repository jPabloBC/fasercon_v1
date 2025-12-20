import { NextResponse } from 'next/server'
import { generateQuotePDF } from '../../../lib/quotePdfFile'
import transporter from '../../../lib/email'
import { buildInternalQuoteEmail } from '../../../lib/quoteEmail'
import { supabase, supabaseAdmin } from '@/lib/supabase'

// Helper: compute next 4-digit correlative
async function computeNextCorrelative() {
  try {
    // First, check for a one-time override stored in DB
    try {
      const { data: override, error: ovErr } = await supabase
        .from('fasercon_sequence_overrides')
        .select('name,next')
        .eq('name', 'quotes')
        .limit(1)
        .maybeSingle();
      if (!ovErr && override && typeof override.next === 'number') {
        // consume the override so it's only used once
        await supabase.from('fasercon_sequence_overrides').delete().eq('name', 'quotes');
        return String(override.next).padStart(4, '0');
      }
    } catch (ovEx) {
      console.warn('Failed to read sequence override:', ovEx);
    }
    
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
    const { quote_id, sendEmail } = body;
    let { contact, items, createdAt, execution_time, payment_method } = body;

    // Buscar la cotización por ID y obtener/crear correlativo
    let actualCorrelative = '';

    let description = body.description || '';
    
    if (quote_id) {
      const { data: qRow } = await supabase
        .from('fasercon_quotes')
        .select('*, items:fasercon_quote_items(*)')
        .eq('id', quote_id)
        .single();
      
      if (qRow) {
        // Get description/execution/payment from DB if not provided in body
        if (!description && qRow.description) {
          description = qRow.description;
        }
        if ((!execution_time || execution_time === '') && qRow.execution_time) {
          execution_time = qRow.execution_time;
        }
        if ((!payment_method || payment_method === '') && qRow.payment_method) {
          payment_method = qRow.payment_method;
        }
        
        // Si no se pasó contact/items, obtenerlos de la BD
        if (!contact || !items) {
          const firstItem = qRow.items?.[0];
          contact = contact || {
            company: String(firstItem?.company ?? '').toUpperCase(),
            email: firstItem?.email ?? '',
            phone: firstItem?.phone ?? '',
            document: firstItem?.document ?? '',
            company_address: firstItem?.company_address ?? firstItem?.company ?? 'N/A',
            contact_name: qRow.name ?? '',
          };
          
          // Enriquecer items con datos de fasercon_products y fasercon_quote_services
          const productIds = (qRow.items ?? []).map((it: any) => it.product_id).filter(Boolean);
          let productsById = new Map();
          let servicesById = new Map();
          
          // Obtener productos
          if (productIds.length > 0) {
            const { data: products } = await supabase
              .from('fasercon_products')
              .select('id, sku, name, characteristics, unit_size, measurement_unit')
              .in('id', productIds);
            if (products) {
              productsById = new Map(products.map(p => [String(p.id), p]));
            }
          }
          
          // Obtener servicios (para items que no son productos)
          const serviceIds = productIds.filter((id: any) => !productsById.has(String(id)));
          console.log('[send-quote-response] Service IDs to fetch:', serviceIds);
          if (serviceIds.length > 0) {
            const { data: services, error: servicesError } = await supabase
              .from('fasercon_quote_services')
              .select('id, sku, title, description, unit, unit_measure')
              .in('id', serviceIds);
            console.log('[send-quote-response] Services fetched:', services?.length || 0, 'Error:', servicesError);
            if (services) {
              console.log('[send-quote-response] Services data:', services);
              servicesById = new Map(services.map(s => [String(s.id), s]));
            }
          }
          
          items = items || (qRow.items ?? []).map((item: any) => {
            const basePrice = typeof item.update_price === 'number' ? item.update_price : (item.price ?? null);
            const product = item.product_id ? productsById.get(String(item.product_id)) : null;
            const service = item.product_id && !product ? servicesById.get(String(item.product_id)) : null;
            
            const enrichedItem = {
              name: item.name || product?.name || service?.title || '',
              sku: product?.sku || service?.sku || '-',
              qty: item.qty,
              unit_size: item.unit_size ?? product?.unit_size ?? service?.unit ?? null,
              measurement_unit: item.measurement_unit ?? product?.measurement_unit ?? service?.unit_measure ?? null,
              price: basePrice,
              characteristics: item.characteristics || product?.characteristics || (service?.description ? [service.description] : []),
              description: item.description || '',
              manufacturer: item.manufacturer || '',
              update_price: item.update_price,
              discount: item.discount,
            };
            
            console.log(`[send-quote-response] Item enriched: ${enrichedItem.name}, SKU: ${enrichedItem.sku}, product_id: ${item.product_id}`);
            return enrichedItem;
          });
          
          createdAt = createdAt || qRow.created_at || new Date().toISOString();
        }
        
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

    // Debug: log items before generating PDF
    console.log('[send-quote-response] Items before PDF generation:', JSON.stringify(items.map((it: any) => ({ name: it.name, sku: it.sku })), null, 2));

    // Generar PDF con precios (quotePdfFile.ts incluye columnas de precios)
    const pdfBytes = await generateQuotePDF({
      correlative: actualCorrelative,
      contact,
      items,
      createdAt,
      description,
      execution_time,
      payment_method,
    });

    // Insertar versión en fasercon_quote_versions (snapshot) antes de marcar como SENT
    try {
      if (quote_id) {
        // Obtener la fila actual de la cotización para el payload
        let quoteRow: any = null;
        try {
          const { data: qFresh } = await supabaseAdmin
            .from('fasercon_quotes')
            .select('*')
            .eq('id', quote_id)
            .maybeSingle();
          quoteRow = qFresh || null;
        } catch (qrErr) {
          console.warn('[send-quote-response] failed to fetch fresh quote row for version payload:', qrErr);
        }

        // Calcular siguiente version
        let nextVersion = 1;
        try {
          const { data: last } = await supabaseAdmin
            .from('fasercon_quote_versions')
            .select('version')
            .eq('quote_id', quote_id)
            .order('version', { ascending: false })
            .limit(1)
            .maybeSingle();
          const lastVer = last && (last as any).version ? Number((last as any).version) : 0;
          nextVersion = lastVer + 1;
        } catch (verErr) {
          console.warn('[send-quote-response] failed to compute next version:', verErr);
        }

        const versionPayload = {
          quote: quoteRow || null,
          items: items || [],
          pdf_correlative: actualCorrelative || null,
          metadata: {
            generatedAt: new Date().toISOString(),
            sendRequested: Boolean(sendEmail),
          },
        };

        try {
          const { data: insertedVersion, error: versionErr } = await supabaseAdmin
            .from('fasercon_quote_versions')
            .insert([{
              quote_id: quote_id,
              version: nextVersion,
              payload: versionPayload,
              correlative: actualCorrelative || null,
              created_by: null,
            }])
            .select()
            .maybeSingle();
          if (versionErr) {
            console.error('[send-quote-response] Failed to insert quote version:', versionErr);
          } else {
            console.log('[send-quote-response] Inserted quote version:', insertedVersion?.id ?? insertedVersion);
          }
        } catch (insErr) {
          console.error('[send-quote-response] Exception inserting quote version:', insErr);
        }
      }
    } catch (versCatchErr) {
      console.error('[send-quote-response] Unexpected error while inserting version:', versCatchErr);
    }

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
        console.log('[send-quote-response] internalRecipients:', internalRecipients);

        // Enviar al cliente (sin BCC)
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

        // Enviar correo interno separado (plantilla interna)
        try {
          const internalMail = buildInternalQuoteEmail({ contact, items, isQuote: true });
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
                console.log('[send-quote-response] internal send result:', internalResult);
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
                  console.log('[send-quote-response] explicit info@fasercon.cl send result:', infoResult);
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
          console.error('Error sending internal quote response email:', intErr);
        }
      } catch (emailErr) {
        console.error('Error sending quote response email:', emailErr);
        emailSent = false;
      }
    }

    const allEmailsSent = emailSent && internalEmailSent;
    // If emails were successfully sent, mark the quote as SENT in the DB
    if (allEmailsSent && quote_id) {
      try {
        const clientForUpdate = process.env.SUPABASE_SERVICE_ROLE_KEY ? supabaseAdmin : supabase;
        await clientForUpdate
          .from('fasercon_quotes')
          .update({ status: 'SENT' })
          .eq('id', quote_id);
        console.log('[send-quote-response] quote status updated to SENT for:', quote_id);
      } catch (statusErr) {
        console.error('Failed to update quote status to SENT:', statusErr);
      }
    }
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
