export const dynamic = "force-dynamic";

import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions, Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  pages: {
    signIn: '/signin',
  },
  providers: [
    // Admin credentials provider (used by /signin)
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
    // Detailer credentials provider (used by /detailer-login)
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

        // Temporary validation strategy:
        // - Find detailer by email
        // - Compare against a shared password env (until per-detailer passwords are implemented)
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
      if (token.role === 'admin') {
        if (session.user) {
          session.user.name = 'Admin';
          session.user.email = process.env.ADMIN_EMAIL;
          (session.user as any).role = 'admin';
          (session.user as any).id = 'admin';
        }
        return session;
      }

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
      }
      return token;
    },
    async redirect({ url, baseUrl, token }: { url: string; baseUrl: string; token?: JWT }) {
      try {
        const target = new URL(url, baseUrl);
        // If a callbackUrl is provided, NextAuth passes it in the "callbackUrl" param
        const cb = target.searchParams.get('callbackUrl');
        if (cb) return cb;
      } catch {}
      
      // Check token role to determine default redirect
      if (token?.role === 'detailer') {
        return `${baseUrl}/detailer-dashboard/calendar`;
      }
      
      // Default to admin for admin users
      return `${baseUrl}/admin`;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 