import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import type { NextAuthOptions } from 'next-auth'

const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        console.log('🔐 Authorization attempt started')
        console.log('📧 Email:', credentials?.email)
        console.log('🔑 Password provided:', !!credentials?.password)
        
        if (!credentials?.email || !credentials?.password) {
          console.log('❌ Missing email or password')
          throw new Error('Email und Passwort sind erforderlich')
        }

        try {
          console.log('🔌 Connecting to database...')
          await connectDB()
          console.log('✅ Database connected')
          
          console.log('🔍 Looking for user with email:', credentials.email)
          const user = await User.findOne({ 
            email: credentials.email,
            isActive: true 
          }).select('+password')

          console.log('👤 User found:', !!user)
          if (user) {
            console.log('📋 User details:', {
              id: user._id,
              email: user.email,
              role: user.role,
              isActive: user.isActive,
              hasPassword: !!user.password
            })
          }

          if (!user) {
            console.log('❌ No user found with email:', credentials.email)
            throw new Error('Ungültige Anmeldedaten')
          }

          console.log('🔐 Comparing passwords...')
          const isPasswordValid = await user.comparePassword(credentials.password)
          console.log('🔑 Password valid:', isPasswordValid)
          
          if (!isPasswordValid) {
            console.log('❌ Invalid password for user:', credentials.email)
            throw new Error('Ungültige Anmeldedaten')
          }

          console.log('✅ Authentication successful for:', credentials.email)
          return {
            id: user._id.toString(),
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
          }
        } catch (error) {
          console.error('💥 Auth error:', error)
          if (error instanceof Error && error.message.includes('Ungültige Anmeldedaten')) {
            throw error
          }
          throw new Error('Anmeldung fehlgeschlagen')
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

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }