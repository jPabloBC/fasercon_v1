-- Crear tabla para formularios de contacto de Fasercon
CREATE TABLE IF NOT EXISTS public.fasercon_contact_forms (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name varchar(255) NOT NULL,
    email varchar(255) NOT NULL,
    phone varchar(50) NOT NULL,
    message text NOT NULL,
    status varchar(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'REVIEWED', 'CONTACTED', 'CLOSED')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    notes text
);

-- Crear índices para optimizar las consultas
CREATE INDEX IF NOT EXISTS idx_fasercon_contact_forms_status ON public.fasercon_contact_forms(status);
CREATE INDEX IF NOT EXISTS idx_fasercon_contact_forms_created_at ON public.fasercon_contact_forms(created_at);
CREATE INDEX IF NOT EXISTS idx_fasercon_contact_forms_email ON public.fasercon_contact_forms(email);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at automáticamente
DROP TRIGGER IF EXISTS update_fasercon_contact_forms_updated_at ON public.fasercon_contact_forms;
CREATE TRIGGER update_fasercon_contact_forms_updated_at
    BEFORE UPDATE ON public.fasercon_contact_forms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.fasercon_contact_forms ENABLE ROW LEVEL SECURITY;

-- Política para permitir insertar formularios de contacto (público)
CREATE POLICY "Permitir insertar formularios de contacto" ON public.fasercon_contact_forms
    FOR INSERT
    WITH CHECK (true);

-- Política para leer formularios (solo usuarios autenticados/admin)
CREATE POLICY "Permitir leer formularios a usuarios autenticados" ON public.fasercon_contact_forms
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Política para actualizar formularios (solo usuarios autenticados/admin)
CREATE POLICY "Permitir actualizar formularios a usuarios autenticados" ON public.fasercon_contact_forms
    FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Comentarios para documentar la tabla
COMMENT ON TABLE public.fasercon_contact_forms IS 'Tabla para almacenar formularios de contacto del sitio web de Fasercon';
COMMENT ON COLUMN public.fasercon_contact_forms.status IS 'Estado del formulario: PENDING, REVIEWED, CONTACTED, CLOSED';
COMMENT ON COLUMN public.fasercon_contact_forms.notes IS 'Notas internas para seguimiento del contacto';