import { NextRequest, NextResponse } from 'next/server';
import Mux from '@mux/mux-node';

const mux = new Mux({
  tokenId: process.env.NEXT_PUBLIC_MUX_TOKEN_ID!,
  tokenSecret: process.env.NEXT_PUBLIC_MUX_TOKEN_SECRET!,
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assetId } = await params;

    if (!assetId) {
      return NextResponse.json(
        { error: 'Asset ID is required' },
        { status: 400 }
      );
    }

    // Get asset details from Mux
    const asset = await mux.video.assets.retrieve(assetId);

    return NextResponse.json({
      id: asset.id,
      status: asset.status,
      playback_ids: asset.playback_ids,
      duration: asset.duration,
      created_at: asset.created_at,
    });
  } catch (error) {
    console.error('Mux asset retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve asset information' },
      { status: 500 }
    );
  }
}
