import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { users } from './schema';
import { eq } from 'drizzle-orm';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const user = await db
          .select()
          .from(users)
          .where(eq(users.username, credentials.username as string))
          .limit(1);

        if (user.length === 0) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user[0].password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user[0].id,
          name: user[0].username,
          email: null,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt' as const,
  },
  pages: {
    signIn: '/auth/login',
  },
  callbacks: {
    async jwt({ token, user }: { token: Record<string, unknown>; user?: Record<string, unknown> }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }: { session: Record<string, unknown>; token: Record<string, unknown> }) {
      if (token) {
        (session as { user: { id: string } }).user.id = token.id as string;
      }
      return session;
    },
  },
};

export default NextAuth(authOptions);
