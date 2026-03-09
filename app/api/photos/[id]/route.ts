import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH update photo
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates = await request.json();

    const photo = await prisma.photo.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json(photo);
  } catch (error: any) {
    console.error('Update photo error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update photo' },
      { status: 500 }
    );
  }
}

// DELETE photo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.photo.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete photo error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete photo' },
      { status: 500 }
    );
  }
}
