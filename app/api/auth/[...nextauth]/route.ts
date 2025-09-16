export const dynamic = "force-dynamic";

import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions, Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";

export const authOptions: NextAuthOptions = {
  pages: {
    signIn: '/signin',
  },
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
        if (
          credentials &&
          credentials.email === process.env.ADMIN_EMAIL &&
          credentials.password === process.env.ADMIN_PASSWORD
        ) {
          return { id: "admin", name: "Admin", email: credentials.email, role: "admin" };
        }
        return null;
      }
    })
  ],
  callbacks: {
    async session({ session, token }: { session: Session; token: JWT }) {
<<<<<<< Updated upstream
      (session.user as any).role = token.role;
      return session;
    },
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) (token as any).role = (user as any).role;
=======
      if (token.role === 'admin') {
        if (session.user) {
          session.user.name = 'Admin';
          session.user.email = process.env.ADMIN_EMAIL;
          (session.user as any).role = 'admin';
          (session.user as any).id = 'admin';
        }
        return session;
      }

      await dbConnect();
      const detailer = await Detailer.findById(token.id);
      if (detailer && session.user) {
        const profileImage = await ImageModel.findOne({ detailerId: detailer._id, type: 'profile' });

        // Update session with fresh data from the database
        session.user.name = detailer.businessName || `${detailer.firstName} ${detailer.lastName}` || detailer.email;
        session.user.email = detailer.email;
        session.user.role = token.role as string;
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
>>>>>>> Stashed changes
      return token;
    },
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      // Always redirect to /admin after login
      return `${baseUrl}/admin`;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 