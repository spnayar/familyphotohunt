import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET votes (with optional filters)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const voterId = searchParams.get('voterId');
    const contestId = searchParams.get('contestId');

    const where: any = {};
    if (categoryId) where.categoryId = categoryId;
    if (voterId) where.voterId = voterId;
    if (contestId) where.contestId = contestId;

    const votes = await prisma.vote.findMany({
      where,
      include: {
        photo: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(votes);
  } catch (error: any) {
    console.error('Get votes error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch votes' },
      { status: 500 }
    );
  }
}

// POST create vote
export async function POST(request: NextRequest) {
  try {
    const { contestId, categoryId, voterId, photoId, rank } = await request.json();

    if (!contestId || !categoryId || !voterId || !photoId || !rank) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Remove existing vote from this voter for this category and rank
    await prisma.vote.deleteMany({
      where: {
        voterId,
        categoryId,
        rank,
      },
    });

    const vote = await prisma.vote.create({
      data: {
        contestId,
        categoryId,
        voterId,
        photoId,
        rank,
      },
      include: {
        photo: true,
      },
    });

    return NextResponse.json(vote);
  } catch (error: any) {
    console.error('Create vote error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create vote' },
      { status: 500 }
    );
  }
}
