# Configuración de Supabase para Fasercom

## Pasos para configurar la base de datos:

### 1. Crear las tablas en Supabase
1. Ve a tu dashboard de Supabase
2. Navega a SQL Editor 
3. Ejecuta el archivo `database-schema.sql` completo
4. Ejecuta las migraciones adicionales de este repo (si aplica):
   - `database/migrations/20251029_add_fasercon_quotes.sql`
   - `database/migrations/20251029_add_fasercon_quote_items.sql`

### 2. Crear usuario administrador
1. Ejecuta el script para generar el hash de contraseña:
   ```bash
   node hash-password.js
   ```
2. Usa el hash generado para actualizar la contraseña del usuario admin en Supabase

### 3. Verificar configuración del .env
Asegúrate de que tu archivo `.env.local` tenga:
```
SUPABASE_URL=tu_url_de_supabase
SUPABASE_ANON_KEY=tu_clave_anonima
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=tu_secreto_muy_seguro
```

### 4. Probar la aplicación
```bash
npm run dev
```

## Estructura de la base de datos:

### Tablas principales:
- **users**: Administradores del sistema
- **contact_forms**: Formularios de contacto del sitio web
- **quotes**: Cotizaciones solicitadas por clientes
- **fasercon_quote_items**: Ítems de productos por cotización (pre-venta)
- **products**: Catálogo de productos de techos metálicos
- **stock_movements**: Movimientos de inventario

### Características:
- ✅ UUIDs como claves primarias
- ✅ Timestamps automáticos (created_at, updated_at)
- ✅ Row Level Security (RLS) habilitado
- ✅ Políticas de seguridad configuradas
- ✅ Índices para optimización de consultas

## Ventajas de esta configuración:
- Sin complejidad de Prisma
- Acceso directo a Supabase como en tus otros proyectos
- Sin necesidad de migraciones complejas
- Autenticación simple con NextAuth + Supabase
- Escalable y fácil de mantener