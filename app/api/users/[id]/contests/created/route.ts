import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET contests created by a user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const contests = await prisma.contest.findMany({
      where: {
        creatorId: id,
      },
      include: {
        categories: true,
        participants: true,
        creator: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(contests);
  } catch (error: any) {
    console.error('Get created contests error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch created contests' },
      { status: 500 }
    );
  }
}
