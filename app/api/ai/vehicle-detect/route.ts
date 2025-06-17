import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Helper to parse form data (Next.js App Router supports FormData natively)
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('photo') as File;
  if (!file) {
    return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const imageBuffer = Buffer.from(arrayBuffer);

  try {
    const carInfoJson = await getCarInfo(imageBuffer);
    const carInfo = JSON.parse(carInfoJson);
    if (carInfo.error) {
      return NextResponse.json({ error: carInfo.error }, { status: 400 });
    } else {
      return NextResponse.json({ detectedVehicle: carInfo.vehicle });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'AI detection failed.' }, { status: 500 });
  }
}

async function getCarInfo(imageBuffer: Buffer) {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

  const parts = [
    {
      text: `Accurately identify the vehicle type (e.g., SUV, sedan, motorcycle, truck, convertible, van, coupe, wagon, or bus), model, manufacturer, color, and year with your analysis. Please respond in the following JSON format:
{
  "vehicle": {
    "type": "string",
    "manufacturer": "string",
    "model": "string",
    "color": "string",
    "year": "string"
  }
}
If the image does not contain a vehicle, respond in this format:
{
  "error": "The image does not contain a vehicle."
}
If the vehicle's year cannot be exactly determined, provide the range in the format "YYYY-YYYY" (e.g., "2002-2006").`,
    },
    {
      inlineData: {
        mimeType: 'image/jpeg',
        data: imageBuffer.toString('base64'),
      },
    },
  ];

  const result = await model.generateContent({
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: 0.9,
      topK: 32,
      topP: 0.95,
      maxOutputTokens: 1024,
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

  const response = result.response;
  return response.text().replace(/```json/g, '').replace(/```/g, '');
} 