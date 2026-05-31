import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { prisma } from '@/lib/prisma';
import { countVotesByPhoto, getTopVotedPhotoIds } from '@/lib/vote-results';
import { buildPhotoDownloadFilename, sanitizeDownloadFilename } from '@/lib/photo-download';

async function getImageBuffer(url: string): Promise<Buffer | null> {
  if (url.startsWith('data:')) {
    const base64 = url.split(',')[1];
    if (!base64) return null;
    return Buffer.from(base64, 'base64');
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      return Buffer.from(await response.arrayBuffer());
    } catch {
      return null;
    }
  }

  return null;
}

function getContentType(fileName: string, url: string): string {
  if (url.startsWith('data:image/')) {
    const match = url.match(/^data:(image\/[^;]+);/);
    if (match) return match[1];
  }
  const ext = fileName.toLowerCase();
  if (ext.endsWith('.png')) return 'image/png';
  if (ext.endsWith('.webp')) return 'image/webp';
  if (ext.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contestId } = await params;
    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get('photoId');
    const scope = searchParams.get('scope') || 'all';

    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      include: {
        categories: true,
        participants: true,
      },
    });

    if (!contest) {
      return NextResponse.json({ error: 'Contest not found' }, { status: 404 });
    }

    const categoryNames = Object.fromEntries(contest.categories.map((c) => [c.id, c.name]));
    const participantNames = Object.fromEntries(contest.participants.map((p) => [p.id, p.name]));

    if (photoId) {
      const photo = await prisma.photo.findFirst({
        where: { id: photoId, contestId, submitted: true },
      });

      if (!photo) {
        return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
      }

      const buffer = await getImageBuffer(photo.url);
      if (!buffer) {
        return NextResponse.json({ error: 'Could not read photo file' }, { status: 500 });
      }

      const downloadName = buildPhotoDownloadFilename(
        categoryNames[photo.categoryId] || 'Uncategorized',
        participantNames[photo.participantId] || 'Unknown',
        photo.fileName
      );

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': getContentType(photo.fileName, photo.url),
          'Content-Disposition': `attachment; filename="${downloadName}"`,
        },
      });
    }

    let photos = await prisma.photo.findMany({
      where: { contestId, submitted: true },
    });

    if (scope === 'winners') {
      const winningPhotoIds = new Set<string>();
      for (const category of contest.categories) {
        const votes = await prisma.vote.findMany({ where: { categoryId: category.id } });
        const voteCounts = countVotesByPhoto(
          votes.map((v) => ({
            id: v.id,
            contestId: v.contestId,
            categoryId: v.categoryId,
            voterId: v.voterId,
            photoId: v.photoId,
            rank: v.rank,
            createdAt: v.createdAt.toISOString(),
          }))
        );
        const { photoIds } = getTopVotedPhotoIds(voteCounts);
        photoIds.forEach((id) => winningPhotoIds.add(id));
      }
      photos = photos.filter((p) => winningPhotoIds.has(p.id));
    }

    if (photos.length === 0) {
      return NextResponse.json(
        { error: scope === 'winners' ? 'No winning photos to download' : 'No submitted photos to download' },
        { status: 404 }
      );
    }

    const zip = new JSZip();

    for (const photo of photos) {
      const buffer = await getImageBuffer(photo.url);
      if (!buffer) continue;

      const downloadName = buildPhotoDownloadFilename(
        categoryNames[photo.categoryId] || 'Uncategorized',
        participantNames[photo.participantId] || 'Unknown',
        photo.fileName
      );

      zip.file(downloadName, buffer);
    }

    if (Object.keys(zip.files).length === 0) {
      return NextResponse.json({ error: 'Could not read any photo files' }, { status: 500 });
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    const zipLabel =
      scope === 'winners'
        ? `${sanitizeDownloadFilename(contest.location)}-winners.zip`
        : `${sanitizeDownloadFilename(contest.location)}-all-photos.zip`;

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipLabel}"`,
      },
    });
  } catch (error: any) {
    console.error('Download photos error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create photo download' },
      { status: 500 }
    );
  }
}
