import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contestId } = await params;
    const voterId = request.nextUrl.searchParams.get('voterId');

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
      voterId
        ? prisma.vote.findMany({
            where: {
              contestId,
              voterId,
            },
            select: {
              categoryId: true,
              photoId: true,
            },
          })
        : Promise.resolve([]),
    ]);

    const votesByCategory = Object.fromEntries(
      votes.map((vote) => [vote.categoryId, vote.photoId])
    );

    return NextResponse.json({
      photos: photos.map((photo) => ({
        ...photo,
        createdAt: photo.createdAt.toISOString(),
      })),
      votesByCategory,
    });
  } catch (error: unknown) {
    console.error('Contest voting data error:', error);
    return NextResponse.json({ error: 'Failed to load voting data' }, { status: 500 });
  }
}
