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
    const { id: uploadId } = await params;

    if (!uploadId) {
      return NextResponse.json(
        { error: 'Upload ID is required' },
        { status: 400 }
      );
    }

    // Get upload details from Mux
    const upload = await mux.video.uploads.retrieve(uploadId);

    console.log('Upload status:', upload);

    // If upload is complete and has an asset, get the asset details
    if (upload.status === 'asset_created' && upload.asset_id) {
      try {
        const asset = await mux.video.assets.retrieve(upload.asset_id);
        return NextResponse.json({
          id: upload.id,
          status: upload.status,
          asset_id: upload.asset_id,
          asset_status: asset.status,
          playback_ids: asset.playback_ids,
          duration: asset.duration,
          created_at: asset.created_at,
        });
      } catch (assetError) {
        console.error('Error retrieving asset:', assetError);
        return NextResponse.json({
          id: upload.id,
          status: upload.status,
          asset_id: upload.asset_id,
          asset_status: 'processing',
        });
      }
    }

    return NextResponse.json({
      id: upload.id,
      status: upload.status,
      asset_id: upload.asset_id,
    });
  } catch (error) {
    console.error('Mux upload retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve upload information' },
      { status: 500 }
    );
  }
}
