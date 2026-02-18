"use client";

import { authClient } from "~/lib/auth-client";

import { Button } from "../ui/button";
import { Crown, Sparkles } from "lucide-react";

export default function Upgrade() {
  const upgrade = async () => {
    
    //const productId = "8c3d2346-d904-4fa8-b5f3-96a2427d134a";
    //window.location.href = `/api/auth/polar/checkout?productId=${productId}`;
    // Debug: Vérifiez si le plugin est chargé
  
    console.log("🔍 ********************Plugins disponibles :", authClient.polar);
  

    // On s'assure que la session est bien initialisée et à jour
    const { data: session } = await authClient.getSession();
    if (!session?.user) {
      console.error("User is not authenticated");
      return;
    }

    const result = await authClient.checkout({
      slug: "Creator Pack 30 Credits", // ✅ le slug exact défini dans ton auth.ts
    });

    console.log("Checkout result:", result);

    if (result?.error) {
      console.error("Checkout error:", result.error);
    }
  };

   /* await authClient.checkout({
      products: [
        "b1a37096-0af7-4c9d-be68-d021df848a22",
        "17a39420-9694-441a-b90a-35a76b452e51",
        "377947ea-1265-42d1-bf11-70921c7f58d2",
      ],
   
    });
  };*/

  return (
    <Button
      variant="outline"
      size="sm"
      className="group relative ml-2 cursor-pointer overflow-hidden bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
      onClick={upgrade}
    >
      <div className="flex items-center gap-2">
        <Crown className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
        <span className="font-medium">Add Credits</span>
        <Sparkles className="h-3 w-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </div>

      {/* Subtle glow effect */}
      <div className="absolute inset-0 rounded-md bg-gradient-to-r from-orange-400/20 to-pink-500/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </Button>
  );
}