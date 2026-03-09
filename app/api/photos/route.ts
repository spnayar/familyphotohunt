import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET photos (with optional filters)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const participantId = searchParams.get('participantId');
    const categoryId = searchParams.get('categoryId');
    const contestId = searchParams.get('contestId');

    const where: any = {};
    if (participantId) where.participantId = participantId;
    if (categoryId) where.categoryId = categoryId;
    if (contestId) where.contestId = contestId;

    const photos = await prisma.photo.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(photos);
  } catch (error: any) {
    console.error('Get photos error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch photos' },
      { status: 500 }
    );
  }
}

// POST create photo
export async function POST(request: NextRequest) {
  try {
    const { contestId, categoryId, participantId, url, fileName, rank, submitted } = await request.json();

    if (!contestId || !categoryId || !participantId || !url || !fileName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const photo = await prisma.photo.create({
      data: {
        contestId,
        categoryId,
        participantId,
        url,
        fileName,
        rank: rank || null,
        submitted: submitted || false,
      },
    });

    return NextResponse.json(photo);
  } catch (error: any) {
    console.error('Create photo error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create photo' },
      { status: 500 }
    );
  }
}
