import { NextRequest, NextResponse } from 'next/server';
import Mux from '@mux/mux-node';

const mux = new Mux({
  tokenId: process.env.NEXT_PUBLIC_MUX_TOKEN_ID!,
  tokenSecret: process.env.NEXT_PUBLIC_MUX_TOKEN_SECRET!,
});

export async function POST(request: NextRequest) {
  try {
    const { filename, contentType } = await request.json();

    if (!filename || !contentType) {
      return NextResponse.json(
        { error: 'Filename and content type are required' },
        { status: 400 }
      );
    }

    // Create a direct upload
    const upload = await mux.video.uploads.create({
      cors_origin: process.env.NEXT_PUBLIC_REDIRECT_URL || 'http://localhost:3000',
      new_asset_settings: {
        playback_policy: ['public'],
        encoding_tier: 'baseline',
      },
    });

    console.log('Mux upload created:', upload);

    return NextResponse.json({
      uploadUrl: upload.url,
      uploadId: upload.id,
    });
  } catch (error) {
    console.error('Mux upload creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create upload URL' },
      { status: 500 }
    );
  }
}
