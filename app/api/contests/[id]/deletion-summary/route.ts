import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const contest = await prisma.contest.findUnique({
      where: { id },
      select: {
        id: true,
        location: true,
        _count: {
          select: {
            photos: true,
            votes: true,
            participants: true,
            categories: true,
          },
        },
      },
    });

    if (!contest) {
      return NextResponse.json({ error: 'Contest not found' }, { status: 404 });
    }

    const submittedPhotoCount = await prisma.photo.count({
      where: { contestId: id, submitted: true },
    });

    return NextResponse.json({
      contestId: contest.id,
      location: contest.location,
      photoCount: contest._count.photos,
      submittedPhotoCount,
      voteCount: contest._count.votes,
      participantCount: contest._count.participants,
      categoryCount: contest._count.categories,
      hasUploadedPhotos: contest._count.photos > 0,
    });
  } catch (error: unknown) {
    console.error('Contest deletion summary error:', error);
    return NextResponse.json({ error: 'Failed to load contest summary' }, { status: 500 });
  }
}
