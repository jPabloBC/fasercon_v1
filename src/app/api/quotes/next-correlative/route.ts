import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Fetch all existing correlatives from fasercon_quotes
    const { data: quotes } = await supabase
      .from('fasercon_quotes')
      .select('correlative');

    let maxNum = 0;
    if (Array.isArray(quotes)) {
      for (const q of quotes) {
        const val = q?.correlative;
        if (!val) continue;
        const str = String(val).trim();
        // Match 4-digit groups
        const match = str.match(/(\d{4})/);
        if (match) {
          const n = parseInt(match[1], 10);
          if (!isNaN(n) && n > maxNum) maxNum = n;
        }
      }
    }

    const nextCorrelative = String(maxNum + 1).padStart(4, '0');
    return NextResponse.json({ correlative: nextCorrelative });
  } catch (err) {
    console.error('Error computing next correlative:', err);
    return NextResponse.json({ error: 'Error computing correlative' }, { status: 500 });
  }
}
