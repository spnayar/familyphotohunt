import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH update participant
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates = await request.json();

    const participant = await prisma.participant.update({
      where: { id },
      data: {
        ...(typeof updates.submissionFinalized === 'boolean'
          ? { submissionFinalized: updates.submissionFinalized }
          : {}),
        ...(typeof updates.name === 'string' ? { name: updates.name } : {}),
        ...(typeof updates.phone === 'string' ? { phone: updates.phone } : {}),
      },
    });

    return NextResponse.json(participant);
  } catch (error: any) {
    console.error('Update participant error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update participant' },
      { status: 500 }
    );
  }
}

// DELETE participant
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Delete all photos and votes from this participant first
    await prisma.photo.deleteMany({
      where: { participantId: id },
    });

    await prisma.vote.deleteMany({
      where: { voterId: id },
    });

    // Delete the participant
    await prisma.participant.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete participant error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete participant' },
      { status: 500 }
    );
  }
}
