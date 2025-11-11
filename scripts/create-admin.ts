import { config } from 'dotenv'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'

// Cargar variables de entorno
config()

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Variables de entorno faltantes')
  console.log('Asegúrate de tener en tu .env:')
  console.log('NEXT_PUBLIC_SUPABASE_URL=...')
  console.log('SUPABASE_SERVICE_ROLE_KEY=...')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createAdminUser() {
  try {
    // Datos del usuario admin inicial
    const adminData = {
      email: 'jpablobc@outlook.com',
      password: 'admin123', // Cambiar esta contraseña después del primer login
      name: 'Administrador Fasercon',
      role: 'ADMIN'
    }

    // Encriptar la contraseña
    const hashedPassword = await bcrypt.hash(adminData.password, 12)

    // Verificar si ya existe un admin
    const { data: existingAdmin } = await supabase
      .from('fasercon_users')
      .select('id')
      .eq('email', adminData.email)
      .single()

    if (existingAdmin) {
      console.log('❌ El usuario admin ya existe con el email:', adminData.email)
      return
    }

    // Crear el usuario admin
    const { data, error } = await supabase
      .from('fasercon_users')
      .insert([
        {
          email: adminData.email,
          password: hashedPassword,
          name: adminData.name,
          role: adminData.role,
          is_active: true
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('❌ Error al crear usuario admin:', error)
      return
    }

    console.log('✅ Usuario admin creado exitosamente!')
    console.log('📧 Email:', adminData.email)
    console.log('🔑 Contraseña temporal:', adminData.password)
    console.log('⚠️  IMPORTANTE: Cambia la contraseña después del primer login')
    console.log('👤 Usuario ID:', data.id)

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Ejecutar el script
createAdminUser()