import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const files = formData.getAll('photos') as File[];

  if (!files || files.length === 0) {
    return NextResponse.json({ error: 'No area photos provided' }, { status: 400 });
  }

  // Convert all files to base64
  const imagesBase64 = await Promise.all(
    files.map(async (file) => {
      const arrayBuffer = await file.arrayBuffer();
      return Buffer.from(arrayBuffer).toString('base64');
    })
  );

  try {
    const recommendedServices = await getRecommendedServices(imagesBase64);
    return NextResponse.json({ recommendedServices });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'AI area analysis failed.' }, { status: 500 });
  }
}

async function getRecommendedServices(imagesBase64: string[]): Promise<string[]> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

  // Compose the prompt
  const prompt = `
You are an expert car detailer. Based on the following images of a car's area(s) to be cleaned, recommend the most appropriate cleaning or detailing services. 
Respond with a JSON array of service names, e.g.:
["Interior Deep Clean", "Stain Removal", "Pet Hair Removal"]

If you cannot see any area that needs cleaning, respond with an empty array: []
`;

  // Build the parts array: first the prompt, then each image
  const parts = [
    { text: prompt },
    ...imagesBase64.map((img) => ({
      inlineData: {
        mimeType: 'image/jpeg',
        data: img,
      },
    })),
  ];

  const result = await model.generateContent({
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: 0.7,
      topK: 32,
      topP: 0.95,
      maxOutputTokens: 512,
    },
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ],
  });

  // Parse the response as a JSON array
  const responseText = result.response.text().replace(/```json/g, '').replace(/```/g, '');
  let services: string[] = [];
  try {
    services = JSON.parse(responseText);
    if (!Array.isArray(services)) services = [];
  } catch {
    services = [];
  }
  return services;
}
