import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const { prisma } = await import("@/lib/prisma");
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! },
          });
          if (existingUser) {
            await prisma.user.update({
              where: { email: user.email! },
              data: {
                name: user.name,
                image: user.image,
                isOnline: true,
                lastSeen: new Date(),
              },
            });
            user.id = existingUser.id;
          } else {
            const newUser = await prisma.user.create({
              data: {
                email: user.email!,
                name: user.name,
                image: user.image,
                isOnline: true,
                lastSeen: new Date(),
              },
            });
            user.id = newUser.id;
          }
        } catch (error) {
          console.error("Error saving user:", error);
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }

      // ✅ Always fetch DB id from email on every token refresh
      if (token.email) {
        try {
          const { prisma } = await import("@/lib/prisma");
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email as string },
            select: { id: true, image: true },
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.image = dbUser.image;
          }
        } catch (error) {
          console.error("JWT db lookup error:", error);
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.image = token.image as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
});