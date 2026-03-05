import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'The Scribe',
      credentials: {
        password: { label: "Master Password", type: "password", placeholder: "Enter the royal decree..." }
      },
      async authorize(credentials) {
        // Check if the entered password matches your local .env password
        if (credentials?.password === process.env.ADMIN_PASSWORD) {
          // We return a hardcoded user ID so your database knows who owns the scrolls
          return { id: "local-admin", name: "Master Scribe" };
        }
        return null;
      }
    })
  ],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };