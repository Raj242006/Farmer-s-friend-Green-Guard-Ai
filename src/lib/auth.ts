import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma) as any,
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    console.log('Missing credentials');
                    return null;
                }

                console.log('Attempting to find user:', credentials.email);

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                });

                if (!user || !user.password) {
                    console.log('User not found or no password set');
                    return null;
                }

                console.log('User found, comparing passwords');
                const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

                if (!isPasswordValid) {
                    console.log('Password comparison failed');
                    return null;
                }

                console.log('Authentication successful for:', user.email);
                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                };
            },
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: {
                    prompt: 'consent',
                    access_type: 'offline',
                    response_type: 'code',
                },
            },
        }),
    ],
    // Use JWT strategy — but we MUST NOT use PrismaAdapter with JWT for OAuth
    // The adapter handles Account/Session creation; JWT handles the token.
    // This combo works when session strategy is 'database' OR when adapter is omitted.
    // Fix: keep adapter for Account linking but use JWT for session tokens.
    session: {
        strategy: 'jwt',
    },
    pages: {
        signIn: '/login',
    },
    callbacks: {
        async signIn({ user, account, profile }) {
            // For Google OAuth sign-ins, ensure the user record has a role set
            if (account?.provider === 'google') {
                try {
                    const existingUser = await prisma.user.findUnique({
                        where: { email: user.email! },
                    });
                    if (existingUser && !existingUser.role) {
                        await prisma.user.update({
                            where: { id: existingUser.id },
                            data: { role: 'FARMER' },
                        });
                    }
                } catch (error) {
                    console.error('Error in signIn callback:', error);
                    // Don't block sign-in for role update failures
                }
            }
            return true;
        },
        async jwt({ token, user, account }) {
            // On initial sign-in, user object is present
            if (user) {
                token.id = user.id;
                token.role = (user as any).role || 'FARMER';
            }

            // On Google OAuth, user.id might be undefined (adapter assigns id)
            // Fetch from DB using email as fallback
            if (account?.provider === 'google' && token.email && !token.id) {
                try {
                    const dbUser = await prisma.user.findUnique({
                        where: { email: token.email as string },
                        select: { id: true, role: true },
                    });
                    if (dbUser) {
                        token.id = dbUser.id;
                        token.role = dbUser.role;
                    }
                } catch (error) {
                    console.error('Error fetching user in jwt callback:', error);
                }
            }

            // On subsequent requests, refresh role from DB if we have an id
            if (token.id && !user && !account) {
                try {
                    const dbUser = await prisma.user.findUnique({
                        where: { id: token.id as string },
                        select: { role: true },
                    });
                    if (dbUser) {
                        token.role = dbUser.role;
                    }
                } catch (error) {
                    console.error('Error refreshing role in jwt callback:', error);
                }
            }

            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id;
                (session.user as any).role = token.role;
            }
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
};

// Register User function moved to @/lib/auth/registerUser

// Delete user
export async function deleteUser(email: string): Promise<boolean> {
    console.log('Deleting user:', email);
    try {
        await prisma.user.delete({
            where: { email },
        });
        console.log('User deleted from database');
        return true;
    } catch (error) {
        console.log('User not found for deletion');
        return false;
    }
}
