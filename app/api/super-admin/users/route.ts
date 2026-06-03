import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getContestStageInfo } from '@/lib/contest-status';
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

    const payload = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      registeredAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdContests: user.createdContests.flatMap((contest) => {
        try {
          const stage = getContestStageInfo(contest.status);
          return [
            {
              id: contest.id,
              location: contest.location,
              date: contest.date,
              status: contest.status,
              stageLabel: stage.label,
            },
          ];
        } catch {
          return [];
        }
      }),
      joinedContests: user.participants.flatMap((participant) => {
        try {
          const stage = getContestStageInfo(participant.contest.status);
          return [
            {
              id: participant.contest.id,
              location: participant.contest.location,
              date: participant.contest.date,
              status: participant.contest.status,
              stageLabel: stage.label,
              joinedAt: participant.createdAt.toISOString(),
            },
          ];
        } catch {
          return [];
        }
      }),
    }));

    payload.sort((a, b) => {
      if (!a.lastLoginAt && !b.lastLoginAt) {
        return new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime();
      }
      if (!a.lastLoginAt) return 1;
      if (!b.lastLoginAt) return -1;
      return new Date(b.lastLoginAt).getTime() - new Date(a.lastLoginAt).getTime();
    });

    return NextResponse.json(payload);
  } catch (error: unknown) {
    console.error('Super admin users error:', error);
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
  }
}
