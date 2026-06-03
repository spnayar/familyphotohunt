import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getContestStageInfo } from '@/lib/contest-status';
import {
  getSuperAdminSessionFromRequest,
  unauthorizedSuperAdminResponse,
} from '@/lib/super-admin-auth';

function maxDate(...values: (Date | null | undefined)[]): Date | null {
  const timestamps = values
    .filter((value): value is Date => value instanceof Date)
    .map((value) => value.getTime());
  if (timestamps.length === 0) return null;
  return new Date(Math.max(...timestamps));
}

export async function GET(request: NextRequest) {
  if (!getSuperAdminSessionFromRequest(request)) {
    return unauthorizedSuperAdminResponse();
  }

  try {
    const contests = await prisma.contest.findMany({
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        participants: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        categories: {
          select: {
            id: true,
            name: true,
            description: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: {
            photos: true,
          },
        },
      },
    });

    const [submittedPhotoCounts, latestPhotos, latestVotes, latestParticipants, latestCategories] = await Promise.all([
      prisma.photo.groupBy({
        by: ['contestId'],
        where: { submitted: true },
        _count: { _all: true },
      }),
      prisma.photo.groupBy({
        by: ['contestId'],
        _max: { createdAt: true },
      }),
      prisma.vote.groupBy({
        by: ['contestId'],
        _max: { createdAt: true },
      }),
      prisma.participant.groupBy({
        by: ['contestId'],
        _max: { createdAt: true },
      }),
      prisma.category.groupBy({
        by: ['contestId'],
        _max: { createdAt: true },
      }),
    ]);

    const submittedCountByContest = Object.fromEntries(
      submittedPhotoCounts.map((row) => [row.contestId, row._count._all])
    );
    const latestPhotoByContest = Object.fromEntries(
      latestPhotos.map((row) => [row.contestId, row._max.createdAt])
    );
    const latestVoteByContest = Object.fromEntries(
      latestVotes.map((row) => [row.contestId, row._max.createdAt])
    );
    const latestParticipantByContest = Object.fromEntries(
      latestParticipants.map((row) => [row.contestId, row._max.createdAt])
    );
    const latestCategoryByContest = Object.fromEntries(
      latestCategories.map((row) => [row.contestId, row._max.createdAt])
    );

    const payload = contests.flatMap((contest) => {
      try {
        const lastActivityAt = maxDate(
          contest.createdAt,
          latestPhotoByContest[contest.id],
          latestVoteByContest[contest.id],
          latestParticipantByContest[contest.id],
          latestCategoryByContest[contest.id]
        );
        const stage = getContestStageInfo(contest.status);

        return [
          {
            id: contest.id,
            location: contest.location,
            date: contest.date,
            status: contest.status,
            stageLabel: stage.label,
            stageShortLabel: stage.shortLabel,
            joinCode: contest.joinCode,
            createdAt: contest.createdAt.toISOString(),
            lastActivityAt: lastActivityAt?.toISOString() ?? contest.createdAt.toISOString(),
            creator: contest.creator
              ? {
                  id: contest.creator.id,
                  name: contest.creator.name,
                  email: contest.creator.email,
                }
              : null,
            participantCount: contest.participants.length,
            participants: contest.participants.map((participant) => ({
              id: participant.id,
              name: participant.name,
              email: participant.email,
              joinedAt: participant.createdAt.toISOString(),
            })),
            submittedPhotoCount: submittedCountByContest[contest.id] ?? 0,
            totalPhotoCount: contest._count.photos,
            categories: contest.categories.map((category) => ({
              id: category.id,
              name: category.name,
              description: category.description,
            })),
          },
        ];
      } catch (error: unknown) {
        console.warn('Skipping contest in super admin list:', contest.id, error);
        return [];
      }
    });

    payload.sort(
      (a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
    );

    return NextResponse.json(payload);
  } catch (error: unknown) {
    console.error('Super admin contests error:', error);
    return NextResponse.json({ error: 'Failed to load contests' }, { status: 500 });
  }
}
