import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { supabase } from '@/lib/supabase'

// Detectar empresa desde el dominio del email
function detectCompanyFromEmail(email: string): string {
  if (email.includes('@rymaceros.cl') || email.includes('@rym.')) return 'rym'
  if (email.includes('@vimal.cl') || email.includes('@vimal.')) return 'vimal'
  return 'fasercon' // Default para @fasercon.cl
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log('No email or password provided')
          return null
        }

        // Detectar empresa desde el dominio del email
        const company = detectCompanyFromEmail(credentials.email)
        const tableName = `${company}_users`

        console.log('[AUTH] Intento de login:', {
          email: credentials.email,
          company,
          tableName
        })

        const { data: user, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('email', credentials.email)
          .eq('is_active', true)
          .single()

        console.log('Login intento:', {
          email: credentials.email,
          user,
          error,
          tableName
        })

        if (error || !user) {
          console.log("[AUTH] Usuario no encontrado en", tableName, credentials.email)
          throw new Error("El correo no existe")
        }

        console.log('Comparando password')

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        console.log('¿Password válido?', isPasswordValid)

        if (!isPasswordValid) {
          throw new Error("Contraseña incorrecta")
        }

        // Actualizar last_login
        await supabase
          .from(tableName)
          .update({ last_login: new Date().toISOString() })
          .eq('id', user.id)

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          company: company, // ← AGREGAR COMPANY
          screens: Array.isArray(user.screens) ? user.screens : [],
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        return {
          ...token,
          role: user.role,
          company: user.company, // ← AGREGAR COMPANY
          screens: Array.isArray(user.screens) ? user.screens : [],
        }
      }
      return token
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          role: token.role,
          company: token.company, // ← AGREGAR COMPANY
          screens: Array.isArray(token.screens) ? token.screens : [],
        }
      }
    }
  },
  pages: {
    signIn: '/auth/login',
  }
}