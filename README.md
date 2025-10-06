# Fasercom - Sistema Web para Empresa de Cubiertas Metálicas

Sistema web completo para Fasercom, empresa especializada en cubiertas, techos y revestimientos metálicos, con landing page responsive y panel administrativo.

## 🚀 Características

### Landing Page
- **Diseño Profesional**: Landing page completamente responsive con TailwindCSS
- **Sección Hero**: Presentación impactante de la empresa con estadísticas
- **Galería de Productos**: Muestra de servicios con características detalladas
- **Galería de Proyectos**: Proyectos destacados con filtros por tipo
- **Cotizador Interactivo**: Calculadora que estima precios en tiempo real
- **Formulario de Contacto**: Con validación completa y integración WhatsApp
- **SEO Optimizado**: Metadatos y estructura optimizada para motores de búsqueda

### Panel Administrativo
- **Autenticación Segura**: Sistema de login con NextAuth.js y JWT
- **Dashboard Interactivo**: Métricas y estadísticas en tiempo real
- **Gestión de Cotizaciones**: Visualización y seguimiento de cotizaciones
- **Gestión de Contactos**: Panel para gestionar formularios recibidos
- **Base de Datos Completa**: Esquema para usuarios, cotizaciones, productos y transacciones

## 🛠️ Tecnologías

### Frontend
- **Next.js 15** - Framework de React con App Router
- **TypeScript** - Tipado estático
- **TailwindCSS** - Framework de CSS utility-first
- **React Hook Form** - Gestión de formularios
- **Zod** - Validación de esquemas
- **Heroicons** - Iconografía

### Backend
- **Next.js API Routes** - API REST integrada
- **NextAuth.js** - Autenticación y autorización
- **Prisma ORM** - Object-Relational Mapping
- **Supabase PostgreSQL** - Base de datos en la nube
- **bcryptjs** - Encriptación de contraseñas

## 📦 Instalación y Uso

### Prerrequisitos
- Node.js 18+ 
- npm o yarn

### Inicio Rápido

1. **Instalar dependencias**
```bash
npm install
```

2. **Configurar base de datos**
```bash
# Configurar variables de entorno con datos de Supabase
# Editar .env con la contraseña de tu base de datos

# Ejecutar migraciones en Supabase
npx prisma db push

# Poblar base de datos con datos de ejemplo
npm run db:seed
```

3. **Iniciar servidor de desarrollo**
```bash
npm run dev
```

El proyecto estará disponible en: `http://localhost:3000`

## 👤 Acceso Administrativo

### Credenciales por defecto:
- **Email**: `admin@fasercom.com`
- **Contraseña**: `admin123`

**⚠️ IMPORTANTE**: Cambia estas credenciales en producción y configura la contraseña de Supabase en el archivo .env.

### Acceso al dashboard:
- URL: `http://localhost:3000/auth/login`
- Después del login: `http://localhost:3000/dashboard`

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Iniciar servidor desarrollo
npm run build            # Compilar para producción
npm run start            # Iniciar servidor producción

# Base de datos
npm run db:migrate       # Ejecutar migraciones
npm run db:seed          # Poblar con datos ejemplo
npm run db:setup         # Migrar + seed (configuración completa)
```

## 🎨 Personalización

### Precios del Cotizador
Modifica los precios en `src/components/QuoteCalculator.tsx`:
```typescript
const materialPrices = {
  'lamina-galvanizada': 45000,
  'lamina-termoacustica': 85000,
  'teja-metalica': 65000,
  'panel-sandwich': 120000,
}
```

### Información de la Empresa
Actualiza la información en:
- `src/components/Hero.tsx` - Estadísticas y descripción
- `src/components/Footer.tsx` - Datos de contacto
- `src/app/layout.tsx` - Metadatos SEO

## 📱 Responsive Design

El proyecto está completamente optimizado para:
- **Móviles**: 320px - 768px
- **Tablets**: 768px - 1024px  
- **Desktop**: 1024px+

---

**Desarrollado con ❤️ para empresas de construcción metálica**
