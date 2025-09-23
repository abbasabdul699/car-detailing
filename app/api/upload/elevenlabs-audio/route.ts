import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Upload endpoint for ElevenLabs audio files
export async function POST(request: NextRequest) {
  try {
    console.log('=== ELEVENLABS AUDIO UPLOAD START ===');
    
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }
    
    console.log('Audio file received:', {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size
    });
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'elevenlabs');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const filename = `elevenlabs-${timestamp}.mp3`;
    const filepath = join(uploadsDir, filename);
    
    // Convert File to Buffer and save
    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);
    
    // Return the public URL
    const audioUrl = `${process.env.NEXTAUTH_URL}/uploads/elevenlabs/${filename}`;
    
    console.log('Audio file saved:', {
      filepath,
      audioUrl,
      size: buffer.length
    });
    
    return NextResponse.json({ 
      success: true,
      url: audioUrl,
      filename: filename,
      size: buffer.length
    });
    
  } catch (error) {
    console.error('=== ELEVENLABS AUDIO UPLOAD ERROR ===');
    console.error('Error details:', error);
    
    return NextResponse.json({ 
      error: 'Failed to upload audio file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
