import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contestId } = await params;

    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      select: { id: true },
    });

    if (!contest) {
      return NextResponse.json({ error: 'Contest not found' }, { status: 404 });
    }

    const [photos, votes] = await Promise.all([
      prisma.photo.findMany({
        where: {
          contestId,
          submitted: true,
        },
        select: {
          id: true,
          contestId: true,
          categoryId: true,
          participantId: true,
          fileName: true,
          rank: true,
          submitted: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.vote.findMany({
        where: { contestId },
        select: {
          categoryId: true,
          photoId: true,
        },
      }),
    ]);

    return NextResponse.json({
      photos: photos.map((photo) => ({
        ...photo,
        createdAt: photo.createdAt.toISOString(),
      })),
      votes,
    });
  } catch (error: unknown) {
    console.error('Contest results data error:', error);
    return NextResponse.json({ error: 'Failed to load results data' }, { status: 500 });
  }
}
