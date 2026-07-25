import type { NextAuthConfig } from "next-auth";
import type { SystemRole } from "@/generated/prisma/client";

export const authConfig = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id!;
        token.systemRole = user.systemRole;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.systemRole = token.systemRole as any;
      }
      return session;
    },
    authorized({ auth, request }: any) {
      const isLoggedIn = !!auth?.user;
      const path = request.nextUrl.pathname;
      const isAuthPage = path.startsWith("/login");
      const isPublic =
        path === "/" ||
        path.startsWith("/api/auth") ||
        path.startsWith("/client") ||
        path.startsWith("/api/client");

      if (isPublic) return true;
      if (!isLoggedIn && !isAuthPage) return false;
      if (isLoggedIn && isAuthPage) {
        return Response.redirect(new URL("/dashboard", request.nextUrl));
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
