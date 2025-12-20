import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Helper: compute next 4-digit correlative
async function computeNextCorrelative() {
  try {
    const { data: quotes } = await supabase.from('fasercon_quotes').select('correlative');
    let maxNum = 0;
    const correlatives: string[] = [];
    
    if (Array.isArray(quotes)) {
      for (const r of quotes) {
        const val = r?.correlative;
        if (!val) continue;
        const str = String(val).trim();
        correlatives.push(str);
        if (/^\d{4}$/.test(str)) {
          const n = parseInt(str, 10);
          if (!isNaN(n) && n > maxNum) maxNum = n;
        }
      }
    }
    
    const nextCorrelative = String(maxNum + 1).padStart(4, '0');
    
    return {
      current_max: String(maxNum).padStart(4, '0'),
      next: nextCorrelative,
      total_correlatives: correlatives.length,
      all_correlatives: correlatives.sort(),
    };
  } catch (err) {
    console.warn('computeNextCorrelative failed:', err);
    return {
      current_max: '0000',
      next: '0001',
      total_correlatives: 0,
      all_correlatives: [],
      error: String(err),
    };
  }
}

export async function GET() {
  try {
    const result = await computeNextCorrelative();
    return NextResponse.json(result);
  } catch (err) {
    console.error('Error in correlative/next route:', err);
    return NextResponse.json({ error: 'Error calculating next correlative' }, { status: 500 });
  }
}
