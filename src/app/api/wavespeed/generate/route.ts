// src/app/api/wavespeed/generate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import type { GenerateImageResponse } from '~/types/wavespeed';

/**
 * Configuration de la route API
 * maxDuration: temps maximum d'exécution (important pour la génération d'image)
 */
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max pour attendre la génération

/**
 * Interface pour la réponse initiale WaveSpeed API v3
 */
interface WaveSpeedV3InitialResponse {
  code: number;
  message: string;
  data: {
    id: string;
    model: string;
    outputs: string[];
    urls: {
      get: string; // URL pour récupérer le résultat
    };
    status: string; // "created", "processing", "succeeded", "failed"
    created_at: string;
    error?: string;
  };
}

/**
 * Interface pour la réponse de résultat (polling)
 */
interface WaveSpeedV3ResultResponse {
  code: number;
  message: string;
  data: {
    id: string;
    outputs: string[]; // URLs des images générées
    status: string;
    error?: string;
  };
}

/**
 * Attend un délai en millisecondes
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Interroge l'API WaveSpeed pour récupérer le résultat
 */
async function pollForResult(
  resultUrl: string, 
  apiKey: string,
  maxAttempts: number = 60, // 60 tentatives
  delayMs: number = 5000     // 5 secondes entre chaque tentative
): Promise<string> {
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`🔄 Polling attempt ${attempt}/${maxAttempts}...`);
    
    const response = await fetch(resultUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to poll result: ${response.status}`);
    }

    const data: WaveSpeedV3ResultResponse = await response.json();
    
    console.log(`📊 Status: ${data.data.status}`);

    // Vérification du statut
    if (data.data.status === 'succeeded' || data.data.status === 'completed') {
      // Récupération de la première image générée
      if (data.data.outputs && data.data.outputs.length > 0) {
        const imageUrl = data.data.outputs[0];
        if (!imageUrl) {
          throw new Error('Image URL is empty or undefined');
        }
        console.log('✅ Image ready:', imageUrl);
        return imageUrl;
      } else {
        throw new Error('No outputs in succeeded response');
      }
    }

    if (data.data.status === 'failed') {
      throw new Error(data.data.error || 'Generation failed');
    }

    // Si toujours en traitement, attendre avant de réessayer
    if (attempt < maxAttempts) {
      await sleep(delayMs);
    }
  }

  throw new Error('Timeout: Image generation took too long');
}

/**
 * Endpoint POST pour générer une image via WaveSpeed API
 * 
 * @param request - Requête Next.js contenant 2 images en base64
 * @returns Image générée (URL)
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Validation de la clé API
    const apiKey = process.env.WAVESPEED_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key not configured' },
        { status: 500 }
      );
    }

    // 2. Récupération des paramètres depuis l'environnement
    const prompt = process.env.WAVESPEED_PROMPT || '';
    const lora = process.env.WAVESPEED_LORA || '';
    const scale = parseFloat(process.env.WAVESPEED_SCALE || '1.0');

    // 3. Parsing du body de la requête (2 images)
    const body = await request.json();
    const { sourceImage, referenceImage } = body;

    if (!sourceImage || !referenceImage) {
      return NextResponse.json(
        { success: false, error: 'Both source and reference images are required' },
        { status: 400 }
      );
    }

    // 4. Construction de la requête WaveSpeed
    const wavespeedPayload = {
          
      "enable_base64_output": false,
      "enable_sync_mode": false,
  /*
  "output_format": "jpeg"
  */
      "images": [
        sourceImage,      // Image 1 (source)
        referenceImage    // Image 2 (référence)
      ],
      "loras": [
        {"path" : lora,
         "scale" : scale,
        }

      ],
      "output_format": "jpeg",
      "prompt": prompt,
      "seed": -1,
      "size": "1536*1536"
    };

    console.log('🚀 Sending request to WaveSpeed API v3...');
    console.log('📦 Payload:', {
      images_count: wavespeedPayload.images.length,
      has_prompt: !!prompt,
      has_lora: !!lora,
      scale: scale
    });

    // 5. Appel initial à l'API WaveSpeed v3
    const wavespeedResponse = await fetch(
      'https://api.wavespeed.ai/api/v3/wavespeed-ai/qwen-image/edit-plus-lora',
      {
        method: 'POST',
        headers: {
          "Content-Type": 'application/json',
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(wavespeedPayload),
      }
    );

    if (!wavespeedResponse.ok) {
      const errorText = await wavespeedResponse.text();
      console.error('❌ WaveSpeed API error:', errorText);
      return NextResponse.json(
        { 
          success: false, 
          error: `WaveSpeed API error: ${wavespeedResponse.status} - ${errorText}` 
        },
        { status: wavespeedResponse.status }
      );
    }

    // 6. Parsing de la réponse initiale
    const initialData: WaveSpeedV3InitialResponse = await wavespeedResponse.json();

    console.log('✅ Task created:', {
      id: initialData.data.id,
      status: initialData.data.status,
      result_url: initialData.data.urls.get
    });

    // 7. Vérification des erreurs immédiates
    if (initialData.code !== 200) {
      return NextResponse.json(
        { 
          success: false, 
          error: initialData.message || 'Failed to create generation task' 
        },
        { status: 500 }
      );
    }

    // 8. Polling pour récupérer le résultat
    console.log('⏳ Waiting for image generation...');
    
    const imageUrl = await pollForResult(
      initialData.data.urls.get,
      apiKey,
      60,   // 60 tentatives max
      5000  // 5 secondes entre chaque tentative
    );

    // 9. Retour de la réponse au frontend
    const response: GenerateImageResponse = {
      success: true,
      imageUrl: imageUrl,
    };

    console.log('✨ Success! Image URL:', imageUrl);

    return NextResponse.json(response);

  } catch (error) {
    console.error('💥 Unexpected error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}