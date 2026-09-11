import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/user/me
 * Fetches the currently logged-in user's information
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json(
                { error: 'Unauthorized - Please login' },
                { status: 401 }
            );
        }

        const userId = (session.user as any).id;
        const dbUser = userId && prisma ? await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, email: true, role: true, createdAt: true, image: true }
        }) : null;

        return NextResponse.json({
            id: dbUser?.id || userId || '',
            name: dbUser?.name || session.user.name || 'Farmer',
            email: dbUser?.email || session.user.email || '',
            role: dbUser?.role || (session.user as any).role || 'FARMER',
            createdAt: dbUser?.createdAt || null,
        });
    } catch (error) {
        console.error('Error fetching user data:', error);
        return NextResponse.json(
            { error: 'Failed to fetch user data' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/user/me
 * Updates the user's name
 */
export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = (session.user as any).id;
        if (!userId) {
            return NextResponse.json({ error: 'User ID missing' }, { status: 400 });
        }

        const body = await req.json();
        const { name } = body;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json({ error: 'Valid name is required' }, { status: 400 });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { name: name.trim() },
            select: { id: true, name: true, email: true, role: true }
        });

        return NextResponse.json({
            success: true,
            user: updatedUser
        });
    } catch (error: any) {
        console.error('Error updating user profile:', error);
        return NextResponse.json(
            { error: error?.message || 'Failed to update user profile' },
            { status: 500 }
        );
    }
}

