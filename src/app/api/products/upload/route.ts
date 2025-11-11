import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const fileValue = formData.get('file');
    const filename = (formData.get('filename') as string) || undefined;

    if (!fileValue || !(fileValue instanceof Blob)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
  const file = fileValue as Blob & { name?: string; type?: string }
    const resolvedFilename = filename || file.name || `upload-${Date.now()}`;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buf = new Uint8Array(arrayBuffer);
    // Ensure proper content type so Supabase can generate previews
    const contentType = file.type || ((): string => {
      const lower = resolvedFilename.toLowerCase()
      if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
      if (lower.endsWith('.png')) return 'image/png'
      if (lower.endsWith('.webp')) return 'image/webp'
      if (lower.endsWith('.gif')) return 'image/gif'
      if (lower.endsWith('.svg')) return 'image/svg+xml'
      return 'application/octet-stream'
    })()

    const destPath = `images/products/${resolvedFilename}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('fasercon')
      // Use very low cache to avoid stale CDN/browser when overwriting same path
      .upload(destPath, buf, { cacheControl: '0', upsert: true, contentType });

    if (uploadError) {
      console.error('Upload error', uploadError);
      return NextResponse.json({ error: 'Error uploading file' }, { status: 500 });
    }

    // Generate a signed URL (compat) and a public URL (recommended if bucket is public)
    const { data: signed, error: signedErr } = await supabaseAdmin.storage
      .from('fasercon')
      .createSignedUrl(destPath, 60 * 60 * 24 * 7); // 7 days

    const { data: pub } = await supabaseAdmin.storage
      .from('fasercon')
      .getPublicUrl(destPath);

    if (signedErr && !pub?.publicUrl) {
      console.error('Error generating signed/public URL', signedErr);
      return NextResponse.json({ error: 'Error generating URL' }, { status: 500 });
    }

  // Add a cache-busting query to the public URL so replacing the same filename shows the new content immediately
  const version = Date.now()
  const publicUrlVersioned = pub?.publicUrl ? `${pub.publicUrl}?v=${version}` : undefined
  return NextResponse.json({ path: destPath, url: signed?.signedUrl, publicUrl: publicUrlVersioned || pub?.publicUrl });
  } catch (error) {
    console.error('Unexpected upload error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
