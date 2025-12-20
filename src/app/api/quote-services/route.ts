import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')

    let query = supabaseAdmin.from('fasercon_quote_services').select('*')

    if (q) {
      const ilikeQ = `%${q}%`
      // search all text fields including sku, title, description, unit, unit_measure, billing_type
      const orExpr = ['sku', 'title', 'description', 'unit', 'unit_measure', 'billing_type'].map(f => `${f}.ilike.${ilikeQ}`).join(',')
      
      // Query 1: Search text fields
      const { data: textResults, error: textError } = await supabaseAdmin
        .from('fasercon_quote_services')
        .select('*')
        .or(orExpr)
        .limit(500);

      if (textError) {
        console.error('Error searching quote services:', textError)
        return NextResponse.json({ error: 'Error searching quote services' }, { status: 500 })
      }

      // Query 2: Fetch limited set to search by UUID substring (server-side filter)
      let idResults: any[] = [];
      const looksLikeUuidPart = /^[0-9a-f-]+$/i.test(q.trim());
      if (looksLikeUuidPart) {
        const { data: allServices } = await supabaseAdmin
          .from('fasercon_quote_services')
          .select('*')
          .limit(2000);
        
        if (allServices) {
          const qLower = q.trim().toLowerCase();
          idResults = allServices.filter((s: any) => 
            s.id && s.id.toLowerCase().includes(qLower)
          );
        }
      }

      // Merge results and deduplicate by id
      const allResults = [...(textResults || []), ...idResults];
      const seen = new Set<string>();
      const uniqueResults = allResults.filter((s: any) => {
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      });

      query = { data: uniqueResults, error: null } as any;
    } else {
      const result = await supabaseAdmin.from('fasercon_quote_services').select('*');
      query = result as any;
    }

    const { data, error } = query as any;
    if (error) {
      console.error('Error searching quote services:', error)
      return NextResponse.json({ error: 'Error searching quote services' }, { status: 500 })
    }

    const services = (data || []).map((s: any) => {
      // normalize image_url/images like products route
      try {
        const imgs = Array.isArray(s.images) ? s.images : (s.images ? [s.images] : (s.image_url ? (Array.isArray(s.image_url) ? s.image_url : [s.image_url]) : []))
        const cleaned = imgs.map((u: unknown) => (typeof u === 'string' ? u.trim() : '')).filter(Boolean)
        s.images = cleaned.length ? cleaned : null
        s.image_url = cleaned.length ? cleaned[0] : null
      } catch {}
      return s
    })

    return NextResponse.json({ services })
  } catch (err) {
    console.error('Unexpected error in quote-services GET:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
