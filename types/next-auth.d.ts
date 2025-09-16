import NextAuth, { DefaultSession, User } from "next-auth"
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string;
      role: string;
      businessName?: string;
      imageUrl?: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: string;
    businessName?: string;
    imageUrl?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    businessName?: string;
    imageUrl?: string;
  }
} 