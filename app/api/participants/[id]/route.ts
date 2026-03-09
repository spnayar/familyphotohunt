import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
