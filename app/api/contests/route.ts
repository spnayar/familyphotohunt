import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Generate a unique 4-digit alphanumeric join code
function generateJoinCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// GET all contests
export async function GET() {
  try {
    const contests = await prisma.contest.findMany({
      include: {
        categories: true,
        participants: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(contests);
  } catch (error: any) {
    console.error('Get contests error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch contests' },
      { status: 500 }
    );
  }
}

// POST create new contest
export async function POST(request: NextRequest) {
  try {
    const { location, date, status = 'draft', creatorId } = await request.json();

    if (!location || !date) {
      return NextResponse.json(
        { error: 'Location and date are required' },
        { status: 400 }
      );
    }

    // Generate unique join code
    let joinCode = generateJoinCode();
    let attempts = 0;
    while (attempts < 100) {
      const existing = await prisma.contest.findUnique({
        where: { joinCode },
      });
      if (!existing) break;
      joinCode = generateJoinCode();
      attempts++;
    }

    const contest = await prisma.contest.create({
      data: {
        location,
        date,
        status,
        joinCode,
        creatorId: creatorId || null,
        categories: {
          create: [],
        },
      },
      include: {
        categories: true,
        participants: true,
        creator: true,
      },
    });

    return NextResponse.json(contest);
  } catch (error: any) {
    console.error('Create contest error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create contest' },
      { status: 500 }
    );
  }
}
