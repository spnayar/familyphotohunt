import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET single contest
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contest = await prisma.contest.findUnique({
      where: { id },
      include: {
        categories: true,
        participants: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!contest) {
      return NextResponse.json(
        { error: 'Contest not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(contest);
  } catch (error: any) {
    console.error('Get contest error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch contest' },
      { status: 500 }
    );
  }
}

// PATCH update contest
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates = await request.json();

    const contest = await prisma.contest.update({
      where: { id },
      data: updates,
      include: {
        categories: true,
        participants: true,
      },
    });

    return NextResponse.json(contest);
  } catch (error: any) {
    console.error('Update contest error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update contest' },
      { status: 500 }
    );
  }
}

// DELETE contest
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.contest.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete contest error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete contest' },
      { status: 500 }
    );
  }
}
