export const dynamic = "force-dynamic";

import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions, Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const detailerAuthOptions: NextAuthOptions = {
  pages: {
    signIn: '/detailer-login',
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days default (keep logged in)
  },
  cookies: {
    sessionToken: {
      name: `next-auth.detailer.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  providers: [
    // Detailer credentials provider only
    CredentialsProvider({
      id: "detailer",
      name: "Detailer Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log("Detailer provider authorize called with:", credentials?.email);
        if (!credentials?.email || !credentials?.password) {
          console.log("Missing credentials");
          return null;
        }
        // Never allow admin email through the detailer provider
        if (credentials.email === process.env.ADMIN_EMAIL) {
          console.log("Admin email blocked from detailer provider");
          return null;
        }

        // Find detailer by email
        const detailer = await prisma.detailer.findFirst({
          where: { email: credentials.email },
          select: { id: true, email: true, businessName: true }
        });
        if (!detailer) {
          console.log("Detailer not found for email:", credentials.email);
          return null;
        }
        const withPass = await prisma.detailer.findUnique({
          where: { id: detailer.id }
        });
        if (!(withPass as any)?.password) {
          console.log("Detailer has no password set");
          return null;
        }
        const bcrypt = await import('bcryptjs');
        const ok = await bcrypt.compare(credentials.password, (withPass as any).password as string);
        if (ok) {
          console.log("Detailer authentication successful for:", detailer.email);
          return {
            id: detailer.id,
            name: detailer.businessName || detailer.email || "Detailer",
            email: detailer.email,
            role: "detailer"
          } as unknown as User;
        }
        console.log("Password mismatch for detailer:", detailer.email);
        return null;
      }
    })
  ],
  callbacks: {
    async session({ session, token }: { session: Session; token: JWT }) {
      if (!token.id) return session;
      const detailer = await prisma.detailer.findUnique({
        where: { id: token.id as string },
        include: {
          images: {
            where: { type: 'profile' },
            take: 1
          }
        }
      });

      if (detailer && session.user) {
        const profileImage = detailer.images[0];

        // Update session with fresh data from the database
        session.user.name = detailer.businessName || detailer.email || 'Detailer';
        session.user.email = detailer.email;
        (session.user as any).role = token.role as string;
        session.user.id = token.id as string;
        session.user.businessName = detailer.businessName;
        session.user.image = profileImage?.url || null;
      }
      return session;
    },
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        (token as any).role = (user as any).role;
        (token as any).id = (user as any).id;
        (token as any).businessName = (user as any).businessName;
        (token as any).imageUrl = (user as any).image;
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
        
        if (url.includes('/api/auth-detailer/signout') || target.pathname.includes('/api/auth-detailer/signout')) {
          const signoutCallback = target.searchParams.get('callbackUrl');
          if (signoutCallback) {
            return decodeURIComponent(signoutCallback);
          }
          return `${baseUrl}/detailer-login`;
        }
      } catch {}
      
      return `${baseUrl}/detailer-dashboard/calendar`;
    },
  },
};

const handler = NextAuth(detailerAuthOptions);
export { handler as GET, handler as POST };
