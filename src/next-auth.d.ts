import type { DefaultSession, DefaultUser } from 'next-auth'
import type { JWT as DefaultJWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface User extends DefaultUser {
    company?: string
    role?: string
    screens?: string[]
  }

  interface Session extends DefaultSession {
    user: {
      id?: string
      company?: string
      role?: string
      screens?: string[]
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    company?: string
    role?: string
    screens?: string[]
  }
}
