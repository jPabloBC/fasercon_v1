import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { supabase } from '@/lib/supabase'

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

        const { data: user, error } = await supabase
          .from('fasercon_users')
          .select('*')
          .eq('email', credentials.email)
          .eq('is_active', true)
          .single()

        console.log('Login intento:', {
          email: credentials.email,
          user,
          error
        })

          if (error || !user) {
            console.log("[AUTH] Usuario no encontrado", credentials.email);
            throw new Error("El correo no existe");
        }

        console.log('Comparando password:', {
          inputPassword: credentials.password,
          dbHash: user.password
        })

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        console.log('¿Password válido?', isPasswordValid)

          if (!isPasswordValid) {
            throw new Error("Contraseña incorrecta");
        }

        // Actualizar last_login al hacer login exitoso
        await supabase
          .from('fasercon_users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', user.id);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
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
            screens: Array.isArray(token.screens) ? token.screens : [],
        }
      }
    }
  },
  pages: {
    signIn: '/auth/login',
  }
}