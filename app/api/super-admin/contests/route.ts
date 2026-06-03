import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getContestStageLabel } from '@/lib/contest-status';
import {
  getSuperAdminSessionFromRequest,
  unauthorizedSuperAdminResponse,
} from '@/lib/super-admin-auth';

export async function GET(request: NextRequest) {
  if (!getSuperAdminSessionFromRequest(request)) {
    return unauthorizedSuperAdminResponse();
  }

  try {
    const contests = await prisma.contest.findMany({
      orderBy: { createdAt: 'desc' },
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
        _count: {
          select: {
            photos: true,
          },
        },
      },
    });

    const submittedPhotoCounts = await prisma.photo.groupBy({
      by: ['contestId'],
      where: { submitted: true },
      _count: { _all: true },
    });
    const submittedCountByContest = Object.fromEntries(
      submittedPhotoCounts.map((row) => [row.contestId, row._count._all])
    );

    return NextResponse.json(
      contests.map((contest) => ({
        id: contest.id,
        location: contest.location,
        date: contest.date,
        status: contest.status,
        stageLabel: getContestStageLabel(contest.status),
        joinCode: contest.joinCode,
        createdAt: contest.createdAt.toISOString(),
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
      }))
    );
  } catch (error: unknown) {
    console.error('Super admin contests error:', error);
    return NextResponse.json({ error: 'Failed to load contests' }, { status: 500 });
  }
}
