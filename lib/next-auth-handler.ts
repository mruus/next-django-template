import NextAuth from "next-auth";
import { authConfig } from "./auth";

// Create the NextAuth handler (v4 pattern)
const handler = NextAuth(authConfig);

// Export the handler for API routes
export { handler as GET, handler as POST };

// Export auth function for server components (v4 -> v5 bridge)
export const auth = async () => {
  // In NextAuth v4, we need to use getServerSession
  // But we'll create a bridge function that works like v5's auth()
  const { getServerSession } = await import("next-auth");
  return getServerSession(authConfig);
};

// Export signIn and signOut functions
export const signIn = handler.signIn;
export const signOut = handler.signOut;

// Also export the raw handler for any other use
export default handler;
