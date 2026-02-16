// src/types/wavespeed.ts

/**
 * Interface pour la réponse de l'API WaveSpeed
 */
export interface WaveSpeedResponse {
  id: string;
  status: 'processing' | 'completed' | 'failed';
  output?: {
    image_url?: string;
    image_base64?: string;
  };
  error?: string;
}

/**
 * Interface pour la requête vers notre API backend
 */
export interface GenerateImageRequest {
  sourceImage: string; // Base64 de l'image source principale
  referenceImage: string; // Base64 de l'image de référence
}

/**
 * Interface pour la réponse de notre API backend
 */
export interface GenerateImageResponse {
  success: boolean;
  imageUrl?: string;
  imageBase64?: string;
  error?: string;
}