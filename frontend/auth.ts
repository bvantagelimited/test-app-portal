import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const ALLOWED_DOMAIN = "ipification.com";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('[Auth] signIn callback:', { 
        email: user.email, 
        name: user.name,
        image: user.image,
        profilePicture: (profile as { picture?: string })?.picture 
      });
      // Only allow @ipification.com emails
      if (user.email && user.email.endsWith(`@${ALLOWED_DOMAIN}`)) {
        return true;
      }
      // Reject other emails
      return false;
    },
    async session({ session, token }) {
      console.log('[Auth] session callback:', { 
        tokenPicture: token.picture,
        sessionUserImage: session.user?.image 
      });
      // Pass user image from token to session
      if (token.picture && session.user) {
        session.user.image = token.picture as string;
      }
      console.log('[Auth] session after update:', { 
        sessionUserImage: session.user?.image 
      });
      return session;
    },
    async jwt({ token, user, profile }) {
      console.log('[Auth] jwt callback:', { 
        existingPicture: token.picture,
        userImage: user?.image,
        profilePicture: (profile as { picture?: string })?.picture 
      });
      // Store Google profile picture in token
      if (profile?.picture) {
        token.picture = (profile as { picture?: string }).picture;
      } else if (user?.image) {
        token.picture = user.image;
      }
      console.log('[Auth] jwt after update:', { picture: token.picture });
      return token;
    },
  },
});
