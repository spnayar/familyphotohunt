import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET all contests for a user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contests = await prisma.contest.findMany({
      where: {
        participants: {
          some: {
            userId: id,
          },
        },
      },
      include: {
        categories: true,
        participants: {
          include: {
            user: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(contests);
  } catch (error: any) {
    console.error('Get user contests error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch contests' },
      { status: 500 }
    );
  }
}
