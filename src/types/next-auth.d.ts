import 'next-auth'

declare module 'next-auth' {
  interface User {
    role: string;
    screens?: string[];
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: string;
      screens?: string[];
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string;
    screens?: string[];
  }
}