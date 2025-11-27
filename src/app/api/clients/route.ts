import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get('q') || '').trim();
    if (!q) return NextResponse.json([], { status: 200 });

    // Search across many client fields (case-insensitive)
    const ilikeQ = `%${q}%`;
    const orExpr = [
      `company.ilike.${ilikeQ}`,
      `contact_name.ilike.${ilikeQ}`,
      `email.ilike.${ilikeQ}`,
      `phone.ilike.${ilikeQ}`,
      `document.ilike.${ilikeQ}`,
      `company_address.ilike.${ilikeQ}`,
      `region.ilike.${ilikeQ}`,
      `city.ilike.${ilikeQ}`,
      `country.ilike.${ilikeQ}`,
      `postal_code.ilike.${ilikeQ}`,
      `notes.ilike.${ilikeQ}`,
    ].join(',');

    const { data, error } = await supabaseAdmin
      .from('fasercon_clients')
      .select('*')
      .or(orExpr)
      .limit(20);

    if (error) {
      console.error('clients search error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data ?? []);
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const client = {
      company: body.company || body.name || '',
      contact_name: body.contact_name || null,
      email: body.email || null,
      phone: body.phone || null,
      document: body.document || null,
      company_address: body.company_address || null,
      city: body.city || null,
      region: body.region || null,
      country: body.country || null,
      postal_code: body.postal_code || null,
      notes: body.notes || null,
      is_active: typeof body.is_active === 'boolean' ? body.is_active : true,
      metadata: body.metadata || {}
    };

    // Try to find existing client by email or document
    if (client.email || client.document) {
      // use maybeSingle to avoid throwing when no rows are found
      const { data: foundByEmail, error: emailErr } = await supabaseAdmin.from('fasercon_clients').select('*').eq('email', client.email).maybeSingle();
      if (emailErr) {
        console.warn('Error searching client by email:', emailErr.message || emailErr);
      }
      if (foundByEmail && foundByEmail.id) {
        const { data: updated, error: updErr } = await supabaseAdmin.from('fasercon_clients').update(client).eq('id', foundByEmail.id).select().maybeSingle();
        if (updErr) {
          console.error('Error updating client by email:', updErr);
          return NextResponse.json({ error: updErr.message }, { status: 500 });
        }
        return NextResponse.json(updated);
      }
      const { data: foundByDoc, error: docErr } = await supabaseAdmin.from('fasercon_clients').select('*').eq('document', client.document).maybeSingle();
      if (docErr) {
        console.warn('Error searching client by document:', docErr.message || docErr);
      }
      if (foundByDoc && foundByDoc.id) {
        const { data: updated, error: updErr2 } = await supabaseAdmin.from('fasercon_clients').update(client).eq('id', foundByDoc.id).select().maybeSingle();
        if (updErr2) {
          console.error('Error updating client by document:', updErr2);
          return NextResponse.json({ error: updErr2.message }, { status: 500 });
        }
        return NextResponse.json(updated);
      }
    }

    const { data, error } = await supabaseAdmin.from('fasercon_clients').insert(client).select().single();
    if (error) {
      console.error('client insert error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
