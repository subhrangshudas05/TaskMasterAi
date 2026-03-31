import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { connectToDB } from "@/app/lib/mongoose";
import User from "@/app/models/User";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  session: {
    strategy: "jwt", // Fast, stateless sessions
  },
  pages: {
    signIn: '/',
  },
  callbacks: {
    // 1. Triggered exactly when the user clicks "Sign In"
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          await connectToDB();
          
          // Check if user already exists in your database
          const existingUser = await User.findOne({ email: user.email });
          
          // If not, create a new document for them
          if (!existingUser) {
            await User.create({
              email: user.email,
              name: user.name,
              image: user.image,
            });
          }
          return true; // Allow the sign-in to complete
        } catch (error) {
          console.error("Error checking/creating user:", error);
          return false; // Block sign-in if database fails
        }
      }
      return true;
    },

    // 2. Triggered when the JWT token is created or updated
    async jwt({ token, user }) {
      // 'user' is only passed in the very first time they log in
      if (user) {
        await connectToDB();
        // Fetch the user from the DB to get their official MongoDB _id
        const dbUser = await User.findOne({ email: user.email });
        if (dbUser) {
          token.id = dbUser._id.toString(); // Attach Mongo ID to token
        }
      }
      return token;
    },

    // 3. Triggered whenever the client calls useSession()
    async session({ session, token }) {
      if (session?.user) {
        // Attach the MongoDB ID to the session object
        (session.user as any).id = token.id;
      }
      return session;
    },
  }
});

export { handler as GET, handler as POST };