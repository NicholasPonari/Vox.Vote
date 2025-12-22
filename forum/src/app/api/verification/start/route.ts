import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const email = formData.get('email') as string;
    const selfie = formData.get('selfie') as File;
    const idPhoto = formData.get('idPhoto') as File;
    const idType = formData.get('idType') as string; // 'passport' | 'drivers_license' | 'medical_card'
    const manualAddressRaw = formData.get('manualAddress') as string | null;
    
    // Parse manual address if provided (required for passport/medical_card)
    let manualAddress: { street: string; city: string; postalCode: string } | null = null;
    if (manualAddressRaw) {
      try {
        manualAddress = JSON.parse(manualAddressRaw);
      } catch (e) {
        console.error('Failed to parse manual address:', e);
      }
    }

    if (!email || !selfie || !idPhoto || !idType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Upload selfie to Supabase Storage
    const selfieExt = selfie.name.split('.').pop();
    const selfiePath = `verification/${email}/selfie-${Date.now()}.${selfieExt}`;
    
    const { error: selfieError } = await supabase.storage
      .from('verification-images')
      .upload(selfiePath, selfie, {
        contentType: selfie.type,
        upsert: false,
      });

    if (selfieError) {
      console.error('Selfie upload error:', selfieError);
      return NextResponse.json(
        { error: 'Failed to upload selfie' },
        { status: 500 }
      );
    }

    // Upload ID photo to Supabase Storage
    const idExt = idPhoto.name.split('.').pop();
    const idPath = `verification/${email}/id-${Date.now()}.${idExt}`;
    
    const { error: idError } = await supabase.storage
      .from('verification-images')
      .upload(idPath, idPhoto, {
        contentType: idPhoto.type,
        upsert: false,
      });

    if (idError) {
      console.error('ID photo upload error:', idError);
      return NextResponse.json(
        { error: 'Failed to upload ID photo' },
        { status: 500 }
      );
    }

    // Get public URLs for the Python function
    const { data: selfieUrlData } = supabase.storage
      .from('verification-images')
      .getPublicUrl(selfiePath);
    
    const { data: idUrlData } = supabase.storage
      .from('verification-images')
      .getPublicUrl(idPath);

    const selfieUrl = selfieUrlData.publicUrl;
    const idPhotoUrl = idUrlData.publicUrl;

    // Create verification attempt record
    const { data: attemptData, error: attemptError } = await supabase
      .from('verification_attempts')
      .insert({
        email,
        selfie_url: selfieUrl,
        id_photo_url: idPhotoUrl,
        id_type: idType,
        status: 'pending',
      })
      .select()
      .single();

    if (attemptError) {
      console.error('Verification attempt creation error:', attemptError);
      return NextResponse.json(
        { error: 'Failed to create verification attempt' },
        { status: 500 }
      );
    }

    // Call Railway Python verification service
    const verificationResponse = await fetch(
      process.env.RAILWAY_VERIFY_SERVICE_URL || 'http://localhost:8080/verify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({
          selfie_url: selfieUrl,
          id_photo_url: idPhotoUrl,
          id_type: idType,
          manual_address: manualAddress,
        }),
      }
    );

    if (!verificationResponse.ok) {
      const errorText = await verificationResponse.text();
      console.error('Python verification error:', errorText);
      
      // Update attempt status to failed
      await supabase
        .from('verification_attempts')
        .update({
          status: 'failed',
          failure_reason: 'Verification service error',
        })
        .eq('id', attemptData.id);

      return NextResponse.json(
        { error: 'Verification service failed' },
        { status: 500 }
      );
    }

    const verificationResult = await verificationResponse.json();

    // Update verification attempt with results
    const updateData: {
      face_match_score: number;
      ocr_data: Record<string, unknown>;
      status: string;
      failure_reason: string | null;
      verified_at?: string;
    } = {
      face_match_score: verificationResult.face_match_score,
      ocr_data: verificationResult.ocr_data,
      status: verificationResult.verified ? 'verified' : 'failed',
      failure_reason: verificationResult.verified ? null : verificationResult.reason,
    };

    if (verificationResult.verified) {
      updateData.verified_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from('verification_attempts')
      .update(updateData)
      .eq('id', attemptData.id);

    if (updateError) {
      console.error('Failed to update verification attempt:', updateError);
    }

    return NextResponse.json({
      verified: verificationResult.verified,
      attemptId: attemptData.id,
      faceMatchScore: verificationResult.face_match_score,
      reason: verificationResult.reason,
      ocr_data: verificationResult.ocr_data,
    });

  } catch (error) {
    console.error('Verification start error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
