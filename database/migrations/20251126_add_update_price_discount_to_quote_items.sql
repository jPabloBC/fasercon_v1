-- Migration: Añade columnas para valor unitario y descuento en los items de cotización
-- Fecha: 2025-11-26

ALTER TABLE public.fasercon_quote_items
  ADD COLUMN IF NOT EXISTS update_price numeric(12,2),
  ADD COLUMN IF NOT EXISTS discount numeric(5,2) DEFAULT 0;

-- Opcional: actualizar filas existentes si quieres dejar un valor por defecto explícito
-- UPDATE public.fasercon_quote_items SET update_price = price WHERE update_price IS NULL;
