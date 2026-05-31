import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isSetupStage } from '@/lib/contest-status';

// GET lookup contest by join code (no auth required)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const joinCode = searchParams.get('code');

    if (!joinCode?.trim()) {
      return NextResponse.json(
        { error: 'Join code is required' },
        { status: 400 }
      );
    }

    const normalizedCode = joinCode.toUpperCase().trim();

    const contest = await prisma.contest.findUnique({
      where: { joinCode: normalizedCode },
      select: {
        id: true,
        location: true,
        date: true,
        status: true,
      },
    });

    if (!contest) {
      return NextResponse.json(
        { error: 'Invalid join code' },
        { status: 404 }
      );
    }

    if (isSetupStage(contest.status)) {
      return NextResponse.json(
        { error: 'This contest is not open for joining yet. Check back when photo collection starts.' },
        { status: 403 }
      );
    }

    return NextResponse.json(contest);
  } catch (error: any) {
    console.error('Lookup join code error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to look up join code' },
      { status: 500 }
    );
  }
}

// POST join contest with join code
export async function POST(request: NextRequest) {
  try {
    const { userId, joinCode } = await request.json();

    if (!userId || !joinCode) {
      return NextResponse.json(
        { error: 'User ID and join code are required' },
        { status: 400 }
      );
    }

    const normalizedCode = joinCode.toUpperCase().trim();

    // Find contest by join code
    const contest = await prisma.contest.findUnique({
      where: { joinCode: normalizedCode },
      include: {
        participants: true,
      },
    });

    if (!contest) {
      return NextResponse.json(
        { error: 'Invalid join code' },
        { status: 404 }
      );
    }

    if (isSetupStage(contest.status)) {
      return NextResponse.json(
        { error: 'This contest is not open for joining yet. Check back when photo collection starts.' },
        { status: 403 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user is already a participant
    const existingParticipant = contest.participants.find(
      (p) => p.userId === userId
    );

    if (existingParticipant) {
      return NextResponse.json(existingParticipant);
    }

    // Create participant
    const participant = await prisma.participant.create({
      data: {
        contestId: contest.id,
        userId: user.id,
        name: user.name,
        email: user.email,
      },
      include: {
        contest: true,
      },
    });

    return NextResponse.json(participant);
  } catch (error: any) {
    console.error('Join contest error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to join contest' },
      { status: 500 }
    );
  }
}
