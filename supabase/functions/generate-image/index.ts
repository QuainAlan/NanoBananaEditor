// LEGACY endpoint kept for the v1 frontend. New clients use nano-image.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { GoogleGenAI } from 'npm:@google/genai@2.21.0';
import { chargeUser, corsHeaders, json, LEGACY_MODEL } from './credits.ts';

interface GenerationRequest {
  prompt: string;
  referenceImages?: string[];
  temperature?: number;
  seed?: number;
  aspectRatio?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const { prompt, referenceImages, temperature, seed, aspectRatio }: GenerationRequest = await req.json();
  if (!prompt) return json({ error: 'Prompt is required' }, 400);

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) return json({ error: 'No API key available' }, 500);

  const charge = await chargeUser(req);
  if (!charge.ok) return charge.response;

  try {
    const parts: unknown[] = [{ text: prompt }];
    for (const image of referenceImages ?? []) parts.push({ inlineData: { mimeType: 'image/png', data: image } });
    const contents = [{ role: 'user', parts }];
    const config: Record<string, unknown> = {
      responseModalities: ['IMAGE'],
      temperature: temperature ?? 1.0,
      candidateCount: 1,
      ...(seed !== undefined && { seed }),
      ...(aspectRatio && { imageConfig: { aspectRatio } }),
    };

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({ model: LEGACY_MODEL, contents, config });
    const images: string[] = [];
    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) images.push(part.inlineData.data);
    }
    if (!images.length) {
      await charge.refund();
      return json({ error: 'The model returned no image. Try rephrasing.' }, 422);
    }
    return json({
      images,
      debugInfo: {
        requestPayload: { model: LEGACY_MODEL, contents: [{ role: 'user', parts: [{ text: prompt }, `${(referenceImages ?? []).length} reference image(s)`] }], config },
        responseMetadata: { candidatesCount: response.candidates?.length ?? 0, model: LEGACY_MODEL, timestamp: new Date().toISOString() },
      },
    });
  } catch (error) {
    await charge.refund();
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error generating image:', message);
    return json({ error: 'Failed to generate image', details: message }, 500);
  }
});
