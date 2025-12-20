export interface QuoteService {
  id: string;
  sku?: string;
  title: string;
  description: string;
  unit: string;
  billing_type: 'unit' | 'hour' | 'lump_sum' | 'other';
  price: number;
  images: string[];
  created_at: string;
  active?: boolean;
  metadata?: Record<string, unknown> | null;
  orden?: number;
  unit_measure?: string | null;
}
