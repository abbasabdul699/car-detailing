export const dynamic = "force-dynamic";

import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions, Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";

export const adminAuthOptions: NextAuthOptions = {
  pages: {
    signIn: '/signin',
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `next-auth.admin.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  providers: [
    // Admin credentials provider only
    CredentialsProvider({
      id: "credentials",
      name: "Admin Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log("ENV EMAIL", process.env.ADMIN_EMAIL);
        console.log("ENV PASSWORD", process.env.ADMIN_PASSWORD);
        console.log("FORM EMAIL", credentials?.email);
        // Validate admin only
        if (
          credentials &&
          credentials.email === process.env.ADMIN_EMAIL &&
          credentials.password === process.env.ADMIN_PASSWORD
        ) {
          return { id: "admin", name: "Admin", email: credentials.email, role: "admin" } as unknown as User;
        }
        return null;
      }
    }),
  ],
  callbacks: {
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token.role === 'admin') {
        if (session.user) {
          session.user.name = 'Admin';
          session.user.email = process.env.ADMIN_EMAIL;
          (session.user as any).role = 'admin';
          (session.user as any).id = 'admin';
        }
      }
      return session;
    },
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        (token as any).role = (user as any).role;
        (token as any).id = (user as any).id;
        token.exp = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days
      }
      return token;
    },
    async redirect({ url, baseUrl, token }: { url: string; baseUrl: string; token?: JWT }) {
      try {
        const target = new URL(url, baseUrl);
        const cb = target.searchParams.get('callbackUrl');
        if (cb) {
          return decodeURIComponent(cb);
        }
        
        if (url.includes('/api/auth-admin/signout') || target.pathname.includes('/api/auth-admin/signout')) {
          const signoutCallback = target.searchParams.get('callbackUrl');
          if (signoutCallback) {
            return decodeURIComponent(signoutCallback);
          }
          return `${baseUrl}/signin`;
        }
      } catch {}
      
      return `${baseUrl}/admin`;
    },
  },
};

const handler = NextAuth(adminAuthOptions);
export { handler as GET, handler as POST };
