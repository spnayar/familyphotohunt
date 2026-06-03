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
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdContests: {
          select: {
            id: true,
            location: true,
            date: true,
            status: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        participants: {
          include: {
            contest: {
              select: {
                id: true,
                location: true,
                date: true,
                status: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return NextResponse.json(
      users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        registeredAt: user.createdAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        createdContests: user.createdContests.map((contest) => ({
          id: contest.id,
          location: contest.location,
          date: contest.date,
          status: contest.status,
          stageLabel: getContestStageLabel(contest.status),
        })),
        joinedContests: user.participants.map((participant) => ({
          id: participant.contest.id,
          location: participant.contest.location,
          date: participant.contest.date,
          status: participant.contest.status,
          stageLabel: getContestStageLabel(participant.contest.status),
          joinedAt: participant.createdAt.toISOString(),
        })),
      }))
    );
  } catch (error: unknown) {
    console.error('Super admin users error:', error);
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
  }
}
