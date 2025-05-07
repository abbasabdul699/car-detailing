import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions, Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";

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
      (session.user as any).role = token.role;
      return session;
    },
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) (token as any).role = (user as any).role;
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