import CredentialsProvider from 'next-auth/providers/credentials'
import type { NextAuthOptions } from 'next-auth'
import { ensureProfileForAuthUser, normalizeEmail } from '@/lib/mpu-profiles'
import { signInWithSupabasePassword } from '@/lib/supabase-auth'

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
          throw new Error('Email und Passwort sind erforderlich')
        }

        try {
          const emailNormalized = normalizeEmail(credentials.email)
          const passwordNormalized = credentials.password.trim()
          const configuredAdminEmail = process.env.ADMIN_EMAIL
            ? normalizeEmail(process.env.ADMIN_EMAIL)
            : ''
          const roleHint = configuredAdminEmail && configuredAdminEmail === emailNormalized
            ? 'admin'
            : 'student'

          const authUser = await signInWithSupabasePassword(emailNormalized, passwordNormalized)
          const metadata = authUser.user_metadata || {}

          const profile = await ensureProfileForAuthUser({
            authUserId: authUser.id,
            email: authUser.email,
            firstName:
              typeof metadata.first_name === 'string' ? metadata.first_name : undefined,
            lastName:
              typeof metadata.last_name === 'string' ? metadata.last_name : undefined,
            roleHint,
          })

          if (!profile.is_active) {
            throw new Error('Benutzerkonto ist deaktiviert')
          }

          return {
            id: authUser.id,
            email: profile.email,
            firstName: profile.first_name,
            lastName: profile.last_name,
            role: profile.role === 'admin' ? 'admin' : 'user',
          }
        } catch (error: any) {
          console.error('Auth error:', error)
          throw new Error(error?.message || 'Anmeldung fehlgeschlagen')
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.firstName = user.firstName
        token.lastName = user.lastName
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as string
        session.user.firstName = token.firstName as string
        session.user.lastName = token.lastName as string
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
}
