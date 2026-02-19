import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { detailerAuthOptions } from '@/app/api/auth-detailer/[...nextauth]/route';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function stripHtmlToText(html: string): string {
  let text = html;
  text = text.replace(/<(script|style|nav|footer|header|svg|noscript)[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  text = text.replace(/<!--[\s\S]*?-->/g, ' ');
  text = text.replace(/<\/(div|p|li|tr|h[1-6]|section|article|td|th|br\s*\/?)>/gi, '\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&#?\w+;/g, ' ');
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n\s*\n/g, '\n');
  text = text.trim();
  if (text.length > 8000) text = text.substring(0, 8000);
  return text;
}

async function fetchWithJinaReader(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    const response = await fetch(`https://r.jina.ai/${url}`, {
      signal: controller.signal,
      headers: {
        'Accept': 'text/plain',
        'X-No-Cache': 'true',
      },
    });
    clearTimeout(timeout);
    if (!response.ok) return null;
    const text = await response.text();
    if (text.length > 10000) return text.substring(0, 10000);
    return text.length > 50 ? text : null;
  } catch {
    return null;
  }
}

async function fetchPageContent(url: string): Promise<{ content: string; method: string } | null> {
  // Strategy 1: Direct fetch + HTML parsing
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
    clearTimeout(timeout);

    if (response.ok) {
      const html = await response.text();
      const pageText = stripHtmlToText(html);

      if (pageText.length >= 200) {
        return { content: pageText, method: 'direct' };
      }
    }
  } catch {
    // Direct fetch failed, continue to fallback
  }

  // Strategy 2: Use Jina Reader to render JS-heavy pages
  const renderedText = await fetchWithJinaReader(url);
  if (renderedText) {
    return { content: renderedText, method: 'rendered' };
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(detailerAuthOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const rawUrl = body.url?.trim();

    if (!rawUrl) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Normalize URL - strip tracking parameters for cleaner fetch
    let url = rawUrl.includes('://') ? rawUrl : `https://${rawUrl}`;
    try {
      const parsed = new URL(url);
      // Remove common tracking params that can cause issues
      ['utm_source', 'utm_medium', 'utm_content', 'utm_campaign', 'fbclid', 'gclid'].forEach(p => parsed.searchParams.delete(p));
      url = parsed.toString();
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Fetch page content (tries direct fetch, then Jina Reader fallback)
    const result = await fetchPageContent(url);

    if (!result) {
      return NextResponse.json(
        { error: 'Could not read this website. Check the URL and try again, or enter services manually.' },
        { status: 422 }
      );
    }

    // Use OpenAI to extract services
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      max_tokens: 2000,
      messages: [
        {
          role: 'system',
          content: `You are a data extraction assistant for a car detailing business management platform. Extract services/packages from the provided website text.

Return a JSON object with a "services" key containing an array. Each service should have:
- "name": The service or package name (e.g. "Express Detail", "Full Interior", "Ceramic Coating")
- "price": The price as a number string without $ sign (e.g. "150"). Use empty string "" if no price is listed.
- "duration": The service duration in minutes as a number string (e.g. "90" for 1 hr 30 mins, "45" for 45 mins). Use empty string "" if no duration is listed.
- "description": A brief description of what's included (1-2 sentences max). Use empty string "" if no details are available.

Rules:
- Only extract actual detailing/car care services, not unrelated content
- If you find packages with tiers (e.g. Small/Medium/Large vehicle), list the base price or most common tier
- If prices show a range (e.g. "$150-$250"), use the starting price
- Convert all durations to total minutes (e.g. "2 hrs 30 mins" = "150", "1 hr 30 mins" = "90", "45 mins" = "45")
- If add-on services are listed separately, include them as separate entries
- If no services are found on this page, return {"services": []}
- Return ONLY valid JSON, no other text`
        },
        {
          role: 'user',
          content: `Extract all car detailing services and pricing from this website content:\n\n${result.content}`
        }
      ],
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: 'Could not analyze website content. Try entering services manually.' },
        { status: 422 }
      );
    }

    let parsed: { services?: Array<{ name: string; price: string; description: string }> };
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: 'Could not parse services from website. Try entering services manually.' },
        { status: 422 }
      );
    }

    const services = Array.isArray(parsed) ? parsed : (parsed.services || []);

    if (!Array.isArray(services) || services.length === 0) {
      return NextResponse.json(
        { error: 'No services found on this page. Try a different URL or enter services manually.' },
        { status: 422 }
      );
    }

    const cleanServices = services.map((s: { name?: string; price?: string | number; duration?: string | number; description?: string }) => ({
      name: String(s.name || '').trim().substring(0, 100),
      price: String(s.price || '').replace(/[^0-9.]/g, '').substring(0, 10),
      duration: String(s.duration || '').replace(/[^0-9]/g, '').substring(0, 5),
      description: String(s.description || '').trim().substring(0, 300),
    })).filter((s: { name: string }) => s.name.length > 0);

    return NextResponse.json({ services: cleanServices });
  } catch (error) {
    console.error('Error extracting services:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Try again or enter services manually.' },
      { status: 500 }
    );
  }
}
