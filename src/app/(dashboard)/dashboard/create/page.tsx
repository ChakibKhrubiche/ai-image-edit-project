'use client';

// src/app/(dashboard)/dashboard/create/page.tsx

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { GenerateImageResponse } from '~/types/wavespeed';

// Auth & UI Components
import { RedirectToSignIn, SignedIn } from "@daveyplate/better-auth-ui";
import { authClient } from "~/lib/auth-client";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";

// Anthropic Content Moderation
import { moderateImage } from "~/lib/content-moderation";

// Icons
import {
  Loader2,
  Upload,
  X,
  Download,
  Save,
  RotateCcw,
  Image as ImageIcon,
  Sparkles,
  Eye,
  Wand2,
  Shield,
  CheckCircle2,
  ZoomIn,
} from "lucide-react";

// External Services
import { toast } from "sonner";

// Server Actions
import {
  createProject,
  getUserProjects,
  deductCredits,
} from "~/actions/projects";

// Types
interface Project {
  id: string;
  name: string | null;
  imageUrl: string;
  imageKitId: string;
  filePath: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Hijab Collection
const HIJAB_COLLECTION = [
  "https://ik.imagekit.io/u4odjerit/HijabAISaas/20.png",
  "https://ik.imagekit.io/u4odjerit/HijabAISaas/2.png",
  "https://ik.imagekit.io/u4odjerit/HijabAISaas/9.jpg",
  "https://ik.imagekit.io/u4odjerit/HijabAISaas/14.jpg",
  "https://ik.imagekit.io/u4odjerit/HijabAISaas/32.png",
  "https://ik.imagekit.io/u4odjerit/HijabAISaas/26.png",
];

// Photo Models Collection
const PHOTO_MODELS = [
  "https://ik.imagekit.io/u4odjerit/HijabAISaas/model_1.png",
  "https://ik.imagekit.io/u4odjerit/HijabAISaas/model_22.png",
  "https://ik.imagekit.io/u4odjerit/HijabAISaas/model_3.png",
  "https://ik.imagekit.io/u4odjerit/HijabAISaas/model_4.png",
];

type ViewMode = "upload" | "collection" | "models";

/**
 * Page de génération d'image avec WaveSpeed API
 */
export default function CreatePage() {
  const router = useRouter();

  // États pour les 2 images sources
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [selectedModal, setSelectedModal] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceFileName, setSourceFileName] = useState<string>('');
  const [referenceFileName, setReferenceFileName] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hijabViewMode, setHijabViewMode] = useState<ViewMode>("collection");
  const [photoViewMode, setPhotoViewMode] = useState<ViewMode>("upload");
  
  // Projects management
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  
  // Image dimensions
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  
  const sourceInputRef = useRef<HTMLInputElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // Initialize data on mount
  useEffect(() => {
    const initializeData = async () => {
      try {
        await authClient.getSession();
        
        const projectsResult = await getUserProjects();
        if (projectsResult.success && projectsResult.projects) {
          setUserProjects(projectsResult.projects);
        }
      } catch (error) {
        console.error("Initialization error:", error);
      } finally {
        setIsLoading(false);
        setIsLoadingProjects(false);
      }
    };

    void initializeData();
  }, []);

  // Simulation de progression pendant le chargement
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isGenerating) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev < 95) {
            return prev + Math.random() * 3;
          }
          return prev;
        });
      }, 500);

      // Auto-scroll to progress bar
      setTimeout(() => {
        progressRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } else {
      setProgress(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isGenerating]);

  /**
   * Récupère les dimensions de l'image
   */
  const getImageDimensions = (base64: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = reject;
      img.src = base64;
    });
  };

  /**
   * Gère l'upload de l'image source principale
   */
  const handleSourceFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file');
      toast.error('Please upload a valid image file');
      return;
    }

    setSourceFileName(file.name);
    setError(null);
    setGeneratedImage(null);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setSourceImage(base64);
      
      // Récupérer les dimensions
      try {
        const dims = await getImageDimensions(base64);
        setImageDimensions(dims);
        toast.success(`Source image uploaded! (${dims.width}x${dims.height})`);
      } catch (err) {
        toast.error('Failed to read image dimensions');
      }
    };
    reader.onerror = () => {
      setError('Failed to read the source image file');
      toast.error('Failed to read the source image file');
    };
    reader.readAsDataURL(file);
  };

  /**
   * Gère l'upload de l'image de référence
   */
  const handleReferenceFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file');
      toast.error('Please upload a valid image file');
      return;
    }

    setReferenceFileName(file.name);
    setError(null);
    setGeneratedImage(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setReferenceImage(reader.result as string);
      toast.success('Reference hijab uploaded!');
    };
    reader.onerror = () => {
      setError('Failed to read the reference image file');
      toast.error('Failed to read the reference image file');
    };
    reader.readAsDataURL(file);
  };

  /**
   * Sélectionne une hijab de la collection
   */
  const handleSelectHijabFromCollection = (imageUrl: string) => {
    setReferenceImage(imageUrl);
    setReferenceFileName(`Collection Hijab - ${HIJAB_COLLECTION.indexOf(imageUrl) + 1}`);
    setError(null);
    setGeneratedImage(null);
    toast.success('Hijab selected from collection!');
  };

  /**
   * Sélectionne un modèle de photo
   */
  const handleSelectPhotoModel = (imageUrl: string) => {
    setSourceImage(imageUrl);
    setSourceFileName(`Model ${PHOTO_MODELS.indexOf(imageUrl) + 1}`);
    setError(null);
    setGeneratedImage(null);
    toast.success('Photo model selected!');
  };

  /**
   * Déclenche la sélection de fichier source
   */
  const handleSourceUploadClick = () => {
    sourceInputRef.current?.click();
  };

  /**
   * Déclenche la sélection de fichier référence
   */
  const handleReferenceUploadClick = () => {
    referenceInputRef.current?.click();
  };

  /**
   * Envoie les 2 images à l'API backend pour génération
   */
const handleGenerate = async () => {
  if (!sourceImage || !referenceImage) {
    setError('Please upload both your photo and hijab reference');
    toast.error('Please upload both images first');
    return;
  }

  setIsGenerating(true);
  setError(null);
  setGeneratedImage(null);
  setProgress(0);

  try {
    // ✅ MODERATION CHECK - avant tout le reste
    toast.info("Checking image content...");
    
    const [sourceCheck, referenceCheck] = await Promise.all([
      // Only moderate uploaded images (not collection URLs)
      sourceFileName.startsWith("Model") 
        ? Promise.resolve({ safe: true }) 
        : moderateImage(sourceImage),
      referenceFileName.startsWith("Collection")
        ? Promise.resolve({ safe: true })
        : moderateImage(referenceImage),
    ]);

    if (!sourceCheck.safe) {
      const msg = `❌ Your photo cannot be processed.
      To ensure accurate results, please upload a clear portrait of a fully clothed person (with or without a hijab). 
      Photos containing inappropriate content or unsuitable clothing cannot be processed by our AI system.`;
      setError(msg);
      toast.error(msg);
      setIsGenerating(false);
      return;
    }

    if (!referenceCheck.safe) {
      const msg = "❌ The hijab image content cannot be used.";
      setError(msg);
      toast.error(msg);
      setIsGenerating(false);
      return;
    }

    // ✅ Images are safe, continue with generation
    const creditResult = await deductCredits(1, "Virtual hijab try-on");
    if (!creditResult.success) {
      toast.error(creditResult.error ?? "Insufficient credits");
      setIsGenerating(false);
      return;
    }

    const response = await fetch('/api/wavespeed/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceImage,
        referenceImage,
      }),
    });

    const data = (await response.json()) as GenerateImageResponse;

    if (!data.success) throw new Error(data.error ?? 'Virtual try-on failed');

    const resultImage = data.imageUrl ?? data.imageBase64;
    if (!resultImage) throw new Error('No preview received from server');

    setProgress(100);
    setTimeout(() => {
      setGeneratedImage(resultImage);
      toast.success(`Virtual try-on complete! ${creditResult.remainingCredits} credits remaining.`);
      router.refresh();
    }, 300);

  } catch (err) {
    console.error('Generation error:', err);
    const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
    setError(errorMsg);
    toast.error(errorMsg);
  } finally {
    setTimeout(() => setIsGenerating(false), 300);
  }
};

  /**
   * Télécharge l'image générée en local
   */
  const handleDownloadImage = async () => {
    if (!generatedImage) return;

    setIsDownloading(true);

    try {
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      link.download = `hijab-virtual-tryon-${timestamp}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      
      toast.success('Image downloaded successfully!');
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to download image');
    } finally {
      setIsDownloading(false);
    }
  };

  /**
   * Sauvegarde le projet en base de données
   */
  const handleSaveProject = async () => {
    if (!generatedImage) {
      toast.error('No image to save');
      return;
    }

    setIsSaving(true);

    try {
      const projectName = `Virtual Try-On ${new Date().toLocaleDateString()}`;
      
      const projectResult = await createProject({
        imageUrl: generatedImage,
        imageKitId: `hijab-tryon-${Date.now()}`,
        filePath: generatedImage,
        name: projectName,
      });

      if (projectResult.success) {
        const updatedProjects = await getUserProjects();
        if (updatedProjects.success && updatedProjects.projects) {
          setUserProjects(updatedProjects.projects);
        }
        toast.success('Virtual try-on saved to your collection!');
      } else {
        toast.error(projectResult.error ?? 'Failed to save');
      }
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Charge un projet existant
   */
  const loadProject = (project: Project) => {
    setGeneratedImage(project.imageUrl);
    setSourceImage(null);
    setReferenceImage(null);
    setSourceFileName('');
    setReferenceFileName('');
    setImageDimensions(null);
    toast.success(`Loaded: ${project.name ?? 'Project'}`);
  };

  /**
   * Réinitialise l'application
   */
  const handleReset = () => {
    setSourceImage(null);
    setReferenceImage(null);
    setGeneratedImage(null);
    setError(null);
    setSourceFileName('');
    setReferenceFileName('');
    setProgress(0);
    setImageDimensions(null);
    setSelectedModal(null);
    if (sourceInputRef.current) sourceInputRef.current.value = '';
    if (referenceInputRef.current) referenceInputRef.current.value = '';
    toast.success('All cleared!');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-white via-blue-50/20 to-purple-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your virtual studio...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <RedirectToSignIn />
      <SignedIn>
        <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/20 to-purple-50">
          
          {/* Header */}
          <div className="sticky top-0 z-50 border-b border-purple-200/60 bg-white/95 backdrop-blur">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
                    Virtual Try-On Studio
                  </h1>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Shield className="h-4 w-4 text-emerald-600" />
                  <span>100% Private & Secure</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            
            {/* Three Steps - Compact */}
            {!generatedImage && (
              <div className="mb-8 grid gap-4 md:grid-cols-3">
                {[
                  {
                    step: "01",
                    title: "Your Photo",
                    description: "Upload a clear, front-facing photo, or choose one of our AI-generated models",
                  },
                  {
                    step: "02",
                    title: "Hijab Design",
                    description: "Upload your own hijab photo or select one from our collection",
                  },
                  {
                    step: "03",
                    title: "Get Preview",
                    description: "AI generates your try-on",
                  },
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-sm font-bold text-white shadow-lg">
                      {item.step}
                    </div>
                    <div className="pt-1">
                      <h3 className="font-semibold text-gray-900">{item.title}</h3>
                      <p className="text-xs text-gray-600">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Main Layout: Upload or Results */}
            {!generatedImage ? (
              // Upload Section
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                
                {/* Your Photo */}
                <Card className="border-2 border-purple-200/60 bg-white/70 backdrop-blur transition-all hover:border-purple-400/80 hover:shadow-lg">
                  <CardContent className="p-6">
                    <div className="mb-4 flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                        <Upload className="h-4 w-4 text-purple-600" />
                      </div>
                      
                      <h3 className="font-semibold text-gray-900">Your Photo</h3>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex gap-2 mb-4">
                      <Button
                        variant={photoViewMode === "models" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPhotoViewMode("models")}
                        className={`flex-1 text-xs h-8 ${
                          photoViewMode === "models"
                            ? "bg-purple-600 hover:bg-purple-700 text-white"
                            : "border-purple-300/60 text-purple-600 hover:bg-purple-50"
                        }`}
                      >
                        AI-generated models
                      </Button>
                      <Button
                        variant={photoViewMode === "upload" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPhotoViewMode("upload")}
                        className={`flex-1 text-xs h-8 ${
                          photoViewMode === "upload"
                            ? "bg-purple-600 hover:bg-purple-700 text-white"
                            : "border-purple-300/60 text-purple-600 hover:bg-purple-50"
                        }`}
                      >
                        Upload
                      </Button>
                    </div>

                    {photoViewMode === "models" ? (
                      // Models View
                      <div>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          {PHOTO_MODELS.map((imageUrl, index) => (
                            <div
                              key={index}
                              className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all aspect-square flex items-center justify-center bg-purple-50 ${
                                sourceImage === imageUrl
                                  ? "border-purple-600 shadow-lg"
                                  : "border-purple-200/60 hover:border-purple-400/80"
                              }`}
                              onClick={() => handleSelectPhotoModel(imageUrl)}
                            >
                              <img
                                src={imageUrl}
                                alt={`Model ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                              {sourceImage === imageUrl && (
                                <div className="absolute inset-0 bg-purple-600/20 flex items-center justify-center">
                                  <CheckCircle2 className="h-6 w-6 text-white" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPhotoViewMode("upload")}
                          className="w-full text-xs h-8 border-purple-300/60 text-purple-600 hover:bg-purple-50"
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Or Upload Your Own
                        </Button>
                      </div>
                    ) : (
                      // Upload View
                      <div 
                        className="border-2 border-dashed border-purple-300 rounded-xl p-6 text-center hover:border-purple-500 transition-all cursor-pointer bg-purple-50/50 min-h-[280px] flex items-center justify-center"
                        onClick={handleSourceUploadClick}
                      >
                        {sourceImage && !sourceFileName.startsWith("Model") ? (
                          <div className="space-y-3 w-full">
                            <div className="relative w-full rounded-lg overflow-hidden shadow-md">
                              <img
                                src={sourceImage}
                                alt="Your photo"
                                className="w-full h-auto max-h-[180px] object-contain mx-auto"
                              />
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-gray-700 font-medium truncate">{sourceFileName}</p>
                              <Button variant="outline" size="sm" className="w-full text-xs h-8">
                                <Upload className="h-3 w-3 mr-1" />
                                Change
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="w-12 h-12 mx-auto rounded-full bg-purple-100 flex items-center justify-center">
                              <ImageIcon className="h-6 w-6 text-purple-600" />
                            </div>
                            <p className="font-semibold text-purple-700 text-sm">Upload Your Photo</p>
                            <p className="text-xs text-gray-600">JPG, PNG • Max 10MB</p>
                          </div>
                        )}
                        <input
                          ref={sourceInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleSourceFileChange}
                          className="hidden"
                        />
                      </div>
                    )}
                    <p className="mt-2 text-xs text-purple-700 flex items-start gap-2">
                      <Shield className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>Processed securely, never shared</span>
                    </p>
                  </CardContent>
                </Card>

                {/* Hijab Design - With Collection & Upload */}
                <Card className="border-2 border-pink-200/60 bg-white/70 backdrop-blur transition-all hover:border-pink-400/80 hover:shadow-lg">
                  <CardContent className="p-6">
                    <div className="mb-4 flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-100">
                        <Wand2 className="h-4 w-4 text-pink-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900">Hijab Design</h3>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex gap-2 mb-4">
                      <Button
                        variant={hijabViewMode === "collection" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setHijabViewMode("collection")}
                        className={`flex-1 text-xs h-8 ${
                          hijabViewMode === "collection"
                            ? "bg-pink-600 hover:bg-pink-700 text-white"
                            : "border-pink-300/60 text-pink-600 hover:bg-pink-50"
                        }`}
                      >
                        Collection
                      </Button>
                      <Button
                        variant={hijabViewMode === "upload" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setHijabViewMode("upload")}
                        className={`flex-1 text-xs h-8 ${
                          hijabViewMode === "upload"
                            ? "bg-pink-600 hover:bg-pink-700 text-white"
                            : "border-pink-300/60 text-pink-600 hover:bg-pink-50"
                        }`}
                      >
                        Upload
                      </Button>
                    </div>

                    {hijabViewMode === "collection" ? (
                      // Collection View
                      <div>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          {HIJAB_COLLECTION.map((imageUrl, index) => (
                            <div
                              key={index}
                              className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all aspect-square flex items-center justify-center bg-pink-50 ${
                                referenceImage === imageUrl
                                  ? "border-pink-600 shadow-lg"
                                  : "border-pink-200/60 hover:border-pink-400/80"
                              }`}
                              onClick={() => handleSelectHijabFromCollection(imageUrl)}
                            >
                              <img
                                src={imageUrl}
                                alt={`Hijab ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                              {referenceImage === imageUrl && (
                                <div className="absolute inset-0 bg-pink-600/20 flex items-center justify-center">
                                  <CheckCircle2 className="h-6 w-6 text-white" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setHijabViewMode("upload")}
                          className="w-full text-xs h-8 border-pink-300/60 text-pink-600 hover:bg-pink-50"
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Or Upload Your Own
                        </Button>
                      </div>
                    ) : (
                      // Upload View
                      <div 
                        className="border-2 border-dashed border-pink-300 rounded-xl p-6 text-center hover:border-pink-500 transition-all cursor-pointer bg-pink-50/50 min-h-[280px] flex items-center justify-center"
                        onClick={handleReferenceUploadClick}
                      >
                        {referenceImage && !referenceFileName.startsWith("Collection") ? (
                          <div className="space-y-3 w-full">
                            <div className="relative w-full rounded-lg overflow-hidden shadow-md">
                              <img
                                src={referenceImage}
                                alt="Hijab design"
                                className="w-full h-auto max-h-[180px] object-contain mx-auto"
                              />
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-gray-700 font-medium truncate">{referenceFileName}</p>
                              <Button variant="outline" size="sm" className="w-full text-xs h-8">
                                <Upload className="h-3 w-3 mr-1" />
                                Change
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="w-12 h-12 mx-auto rounded-full bg-pink-100 flex items-center justify-center">
                              <Wand2 className="h-6 w-6 text-pink-600" />
                            </div>
                            <p className="font-semibold text-pink-700 text-sm">Upload Hijab Design</p>
                            <p className="text-xs text-gray-600">Any hijab photo or design</p>
                          </div>
                        )}
                        <input
                          ref={referenceInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleReferenceFileChange}
                          className="hidden"
                        />
                      </div>
                    )}

                    <p className="mt-2 text-xs text-pink-700 flex items-start gap-2">
                      <Sparkles className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>Choose from collection or upload</span>
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : null}

            {/* Action Buttons - Center */}
            <div className="flex flex-col items-center gap-3 mb-8">
              {!generatedImage ? (
                <>
                  <Button
                    onClick={handleGenerate}
                    disabled={!sourceImage || !referenceImage || isGenerating}
                    size="lg"
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 shadow-lg disabled:opacity-60"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Generate Try-On
                      </>
                    )}
                  </Button>
                  
                  {(sourceImage ?? referenceImage) && (
                    <Button
                      onClick={handleReset}
                      disabled={isGenerating}
                      variant="outline"
                      size="sm"
                      className="border-purple-300/60 text-purple-600 hover:bg-purple-50"
                    >
                      <RotateCcw className="h-3 w-3 mr-2" />
                      Clear
                    </Button>
                  )}
                </>
              ) : null}
            </div>

            {/* Loading State - Compact */}
            {isGenerating && (
              <Card ref={progressRef} className="border-2 border-purple-200/60 bg-white/70 backdrop-blur mb-8 max-w-sm mx-auto">
                <CardContent className="p-8">
                  <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-purple-600 mx-auto mb-4" />
                    <h3 className="font-bold text-gray-900 mb-2">Creating Your Try-On</h3>
                    <p className="text-sm text-gray-600 mb-4">Adapting hijab to your features...</p>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-purple-600 font-semibold">{Math.round(progress)}%</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Result Section - Compact Horizontal Layout */}
            {generatedImage && !isGenerating && (
              <div className="space-y-6">
                <Card className="border-2 border-emerald-200/60 bg-white/70 backdrop-blur">
                  <CardContent className="p-6">
                    <div className="grid md:grid-cols-3 gap-6">
                      {/* Left: Input Images */}
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-2">Your Photo</p>
                          {sourceImage ? (
                            <div className="rounded-lg overflow-hidden border border-purple-200/60 bg-purple-50 cursor-pointer hover:shadow-md transition-all" onClick={() => setSelectedModal(sourceImage)}>
                              <img
                                src={sourceImage}
                                alt="Your photo"
                                className="w-full h-auto max-h-[200px] object-contain"
                              />
                            </div>
                          ) : (
                            <div className="rounded-lg border-2 border-dashed border-gray-300 aspect-square flex items-center justify-center">
                              <ImageIcon className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-2">Hijab Design</p>
                          {referenceImage ? (
                            <div className="rounded-lg overflow-hidden border border-pink-200/60 bg-pink-50 cursor-pointer hover:shadow-md transition-all" onClick={() => setSelectedModal(referenceImage)}>
                              <img
                                src={referenceImage}
                                alt="Hijab design"
                                className="w-full h-auto max-h-[200px] object-contain"
                              />
                            </div>
                          ) : (
                            <div className="rounded-lg border-2 border-dashed border-gray-300 aspect-square flex items-center justify-center">
                              <Wand2 className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Center/Right: Result */}
                      <div className="md:col-span-2">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            <h3 className="font-bold text-gray-900">Your Virtual Try-On</h3>
                          </div>
                        </div>

                        <div className="relative rounded-xl overflow-hidden shadow-lg border border-emerald-200/60 bg-white group cursor-pointer" onClick={() => setSelectedModal(generatedImage)}>
                          <img
                            src={generatedImage}
                            alt="Virtual try-on result"
                            className="w-full h-auto max-h-[400px] object-contain"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <ZoomIn className="h-8 w-8 text-white" />
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2 text-center">Click to view full size</p>

                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-4">
                          <Button
                            onClick={handleDownloadImage}
                            disabled={isDownloading}
                            className="flex-1 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white text-sm h-9"
                          >
                            {isDownloading ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <Download className="h-3 w-3 mr-2" />
                                Download
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={handleSaveProject}
                            disabled={isSaving}
                            variant="outline"
                            className="flex-1 border-purple-300/60 text-purple-600 hover:bg-purple-50 text-sm h-9"
                          >
                            {isSaving ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <Save className="h-3 w-3 mr-2" />
                                Save
                              </>
                            )}
                          </Button>
                        </div>

                        <Button
                          onClick={handleReset}
                          variant="outline"
                          className="w-full border-purple-300/60 text-purple-600 hover:bg-purple-50 text-sm h-9 mt-2"
                        >
                          <RotateCcw className="h-3 w-3 mr-2" />
                          Try Another
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <Card className="border-2 border-red-200/60 bg-red-50 mb-8 max-w-sm mx-auto">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <X className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-900 text-sm">Error</p>
                      <p className="text-xs text-red-700 mt-1">{error}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Previous Try-Ons Section */}
          {userProjects.length > 0 && (
            <div className="border-t border-purple-200/60 bg-white/50 backdrop-blur px-4 py-8">
              <div className="mx-auto max-w-7xl">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Your Try-Ons</h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {userProjects.slice(0, 12).map((project) => (
                    <div
                      key={project.id}
                      className="group relative cursor-pointer"
                      onClick={() => loadProject(project)}
                    >
                      <div className="relative aspect-square overflow-hidden rounded-lg border border-purple-200/60 bg-white shadow-sm transition-all hover:shadow-lg hover:border-purple-400/60">
                        <img
                          src={project.imageUrl}
                          alt={project.name ?? "Virtual try-on"}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <Eye className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <p className="text-xs text-gray-700 mt-2 truncate font-medium">
                        {project.name ?? "Untitled"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Trust Banner */}
          <div className="border-t border-purple-200/60 bg-white/50 backdrop-blur py-6">
            <div className="mx-auto max-w-7xl px-4">
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-600" />
                  <span>100% Private</span>
                </div>
                <div className="h-4 w-px bg-gray-300" />
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <span>AI-Powered</span>
                </div>
                <div className="h-4 w-px bg-gray-300" />
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Realistic Results</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal - View Image Full Size */}
        {selectedModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {/* Close Button */}
              <div className="sticky top-0 flex items-center justify-between p-4 border-b border-purple-200/40 bg-white/95 backdrop-blur">
                <h2 className="text-lg font-bold text-gray-900">
                  Image Preview
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedModal(null)}
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Image Display */}
              <div className="p-6">
                <div className="rounded-xl overflow-hidden flex items-center justify-center bg-gray-50">
                  <img
                    src={selectedModal}
                    alt="Full size preview"
                    className="w-full h-auto max-h-[600px] object-contain"
                  />
                </div>
              </div>

              {/* Close Button at Bottom */}
              <div className="sticky bottom-0 flex gap-3 p-6 border-t border-purple-200/40 bg-white/95 backdrop-blur">
                {selectedModal === generatedImage && (
                  <>
                    <Button
                      onClick={handleDownloadImage}
                      disabled={isDownloading}
                      className="flex-1 gap-2 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white"
                    >
                      {isDownloading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Download className="h-4 w-4" />
                          Download
                        </>
                      )}
                    </Button>
                  </>
                )}
                <Button
                  onClick={() => setSelectedModal(null)}
                  className="flex-1 border-purple-300/60 text-purple-600 hover:bg-purple-50"
                  variant="outline"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </SignedIn>
    </>
  );
}