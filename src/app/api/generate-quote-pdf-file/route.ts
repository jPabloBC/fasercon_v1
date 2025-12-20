import { NextResponse } from 'next/server'
import { generateQuotePDF } from '@/lib/quotePdfFile'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { contact, items, createdAt, quote_number, correlative, quote_id, description, execution_time, payment_method } = body;
    
    let actualCorrelative = correlative;
    
    // If quote_id is provided, check if it already has a correlative assigned
    if (quote_id) {
      const { data: qRow } = await supabase
        .from('fasercon_quotes')
        .select('correlative')
        .eq('id', quote_id)
        .single();
      
      if (qRow && qRow.correlative && /^\d{4}$/.test(String(qRow.correlative))) {
        // Use existing correlative if already assigned
        actualCorrelative = qRow.correlative;
      }
    }
    
    // For preview: if no correlative exists, use placeholder "XXXX" instead of generating/saving one
    if (!actualCorrelative || actualCorrelative === '') {
      actualCorrelative = 'XXXX';
    }
    
    const pdfBytes = await generateQuotePDF({ contact, items, createdAt, quote_number, correlative: actualCorrelative, description, execution_time, payment_method });
    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: { 
        'Content-Type': 'application/pdf',
        'X-CORRELATIVE': actualCorrelative,
      },
    });
  } catch (err) {
    console.error('Error in generate-quote-pdf-file route:', err);
    return NextResponse.json({ error: 'Error generating PDF (file)' }, { status: 500 });
  }
}
