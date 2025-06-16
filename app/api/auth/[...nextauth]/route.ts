export const dynamic = "force-dynamic";

import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions, Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import dbConnect from "@/lib/dbConnect";
import Detailer from "@/app/models/Detailer";
import bcrypt from "bcryptjs";
import ImageModel from "@/app/models/Image";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log("ENV EMAIL", process.env.ADMIN_EMAIL);
        console.log("ENV PASSWORD", process.env.ADMIN_PASSWORD);
        console.log("FORM EMAIL", credentials?.email);
        console.log("FORM PASSWORD", credentials?.password);
        // Admin login
        if (
          credentials &&
          credentials.email === process.env.ADMIN_EMAIL &&
          credentials.password === process.env.ADMIN_PASSWORD
        ) {
          return { id: "admin", name: "Admin", email: credentials.email, role: "admin" };
        }
        // Detailer login
        if (credentials) {
          await dbConnect();
          const detailer = await Detailer.findOne({ email: credentials.email });
          if (detailer && await bcrypt.compare(credentials.password, detailer.password)) {
            // Fetch profile image
            const profileImage = await ImageModel.findOne({ detailerId: detailer._id, type: 'profile' });
            return {
              id: detailer._id.toString(),
              name: detailer.firstName ? `${detailer.firstName} ${detailer.lastName}` : detailer.email,
              email: detailer.email,
              role: "detailer",
              businessName: detailer.businessName,
              imageUrl: profileImage?.url || "",
            };
          }
        }
        return null;
      }
    })
  ],
  callbacks: {
    async session({ session, token }: { session: Session; token: JWT }) {
      (session.user as any).role = token.role;
      (session.user as any).id = token.id;
      (session.user as any).businessName = token.businessName;
      (session.user as any).imageUrl = token.imageUrl;
      return session;
    },
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        (token as any).role = (user as any).role;
        (token as any).id = (user as any).id;
        (token as any).businessName = (user as any).businessName;
        (token as any).imageUrl = (user as any).imageUrl;
      }
      return token;
    },
    async redirect({ url, baseUrl, token }: { url: string; baseUrl: string; token?: JWT }) {
      // Handle logout: if the url contains '/logout', redirect to home
      if (url.includes('/logout')) {
        return baseUrl;
      }
      // Role-based redirect after login
      if (token?.role === 'admin') {
        return `${baseUrl}/admin`;
      }
      if (token?.role === 'detailer' && token?.id) {
        return `${baseUrl}/detailer-dashboard/dashboard/${token.id}`;
      }
      // Default fallback
      return baseUrl;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 