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
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.id = user.id;
      }
      if (account?.provider === "google" && profile) {
        token.image = (profile as any).picture;
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
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          const { prisma } = await import("@/lib/prisma");
          // Upsert user in database
          await prisma.user.upsert({
            where: { email: user.email! },
            update: {
              name: user.name,
              image: user.image,
              isOnline: true,
              lastSeen: new Date(),
            },
            create: {
              email: user.email!,
              name: user.name,
              image: user.image,
              isOnline: true,
            },
          });
        } catch (error) {
          console.error("Error upserting user:", error);
        }
      }
      return true;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
});