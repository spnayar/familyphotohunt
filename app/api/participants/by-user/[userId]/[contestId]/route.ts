import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET participant by userId and contestId
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; contestId: string }> }
) {
  try {
    const { userId, contestId } = await params;
    const participant = await prisma.participant.findFirst({
      where: {
        userId,
        contestId,
      },
      include: {
        user: true,
        contest: {
          include: {
            categories: true,
          },
        },
      },
    });

    if (!participant) {
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(participant);
  } catch (error: any) {
    console.error('Get participant error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch participant' },
      { status: 500 }
    );
  }
}
