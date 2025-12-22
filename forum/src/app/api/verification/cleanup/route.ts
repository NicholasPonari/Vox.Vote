import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

async function listAllPathsInFolder(supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>, folder: string) {
  const paths: string[] = [];

  const walk = async (prefix: string) => {
    const { data, error } = await supabaseAdmin.storage
      .from('verification-images')
      .list(prefix, { limit: 1000 });

    if (error) {
      throw new Error(error.message);
    }

    for (const entry of data || []) {
      const fullPath = `${prefix}/${entry.name}`;
      if ((entry as { id?: string | null }).id) {
        paths.push(fullPath);
      } else {
        await walk(fullPath);
      }
    }
  };

  await walk(folder);
  return paths;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Server misconfigured: missing Supabase environment variables' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createSupabaseAdminClient();

    const { attemptId } = await request.json();
    if (!attemptId) {
      return NextResponse.json({ error: 'Missing attemptId' }, { status: 400 });
    }

    const { data: attempt, error: attemptErr } = await supabaseAdmin
      .from('verification_attempts')
      .select('email,selfie_url,id_photo_url')
      .eq('id', attemptId)
      .single();

    if (attemptErr || !attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    // Remove ALL files under verification/<email>/ in the bucket
    const folder = `verification/${attempt.email}`;
    const removed: string[] = [];

    const pathsToRemove = await listAllPathsInFolder(supabaseAdmin, folder);

    for (let i = 0; i < pathsToRemove.length; i += 100) {
      const chunk = pathsToRemove.slice(i, i + 100);
      const { error } = await supabaseAdmin.storage
        .from('verification-images')
        .remove(chunk);

      if (error) {
        return NextResponse.json(
          { error: `Failed to delete verification images: ${error.message}` },
          { status: 500 }
        );
      }

      removed.push(...chunk);
    }

    const { error: scrubError } = await supabaseAdmin
      .from('verification_attempts')
      .update({ ocr_data: null, selfie_url: null, id_photo_url: null })
      .eq('id', attemptId);

    if (scrubError) {
      return NextResponse.json(
        { error: `Deleted images, but failed to scrub OCR data: ${scrubError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, removed, removedCount: removed.length });
  } catch (error) {
    console.error('Verification cleanup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
