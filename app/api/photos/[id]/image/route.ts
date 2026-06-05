import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getImageBuffer, getImageContentType } from '@/lib/photo-image';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const photo = await prisma.photo.findUnique({
      where: { id },
      select: {
        url: true,
        fileName: true,
      },
    });

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    const buffer = await getImageBuffer(photo.url);
    if (!buffer) {
      return NextResponse.json({ error: 'Photo data unavailable' }, { status: 404 });
    }

    const contentType = getImageContentType(photo.fileName, photo.url);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: unknown) {
    console.error('Photo image error:', error);
    return NextResponse.json({ error: 'Failed to load photo' }, { status: 500 });
  }
}
