// LEGACY endpoint kept for the v1 frontend. New clients use nano-image.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { GoogleGenAI } from 'npm:@google/genai@2.21.0';
import { chargeUser, corsHeaders, json, LEGACY_MODEL } from './credits.ts';

interface EditRequest {
  instruction: string;
  originalImage: string;
  referenceImages?: string[];
  maskImage?: string;
  temperature?: number;
  seed?: number;
  aspectRatio?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const { instruction, originalImage, referenceImages, maskImage, temperature, seed, aspectRatio }: EditRequest = await req.json();
  if (!instruction || !originalImage) return json({ error: 'Instruction and original image are required' }, 400);

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) return json({ error: 'No API key available' }, 500);

  const charge = await chargeUser(req);
  if (!charge.ok) return charge.response;

  try {
    const maskInstruction = maskImage
      ? '\n\nIMPORTANT: Apply changes ONLY where the mask image shows white pixels. Leave all other areas completely unchanged and blend the edges seamlessly.'
      : '';
    const editPrompt = `Edit this image according to the following instruction: ${instruction}\n\nMaintain the original image's lighting, perspective, and overall composition. Make the changes look natural and seamlessly integrated.${maskInstruction}`;

    const parts: unknown[] = [{ text: editPrompt }, { inlineData: { mimeType: 'image/png', data: originalImage } }];
    for (const image of referenceImages ?? []) parts.push({ inlineData: { mimeType: 'image/png', data: image } });
    if (maskImage) parts.push({ inlineData: { mimeType: 'image/png', data: maskImage } });
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
        requestPayload: { model: LEGACY_MODEL, instruction, config, inputs: { references: (referenceImages ?? []).length, mask: Boolean(maskImage) } },
        responseMetadata: { candidatesCount: response.candidates?.length ?? 0, model: LEGACY_MODEL, timestamp: new Date().toISOString() },
      },
    });
  } catch (error) {
    await charge.refund();
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error editing image:', message);
    return json({ error: 'Failed to edit image', details: message }, 500);
  }
});
