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
    if (!session || !session.user) {
      console.error("User is not authenticated");
      return;
    }

    await authClient.checkout({
      products: [
        "8c3d2346-d904-4fa8-b5f3-96a2427d134a",
        "ef376a88-cb50-4ff0-8f31-2358c3ad3e2f",
        "2b81c291-b378-415a-aa64-7e8d45b7903e",
      ],
      //slug: "Small-Pack-50-Credits",//Supprimer plus tard****
      //productId: "8c3d2346-d904-4fa8-b5f3-96a2427d134a",
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="group relative ml-2 cursor-pointer overflow-hidden border-orange-400/50 bg-gradient-to-r from-orange-400/10 to-pink-500/10 text-orange-400 transition-all duration-300 hover:border-orange-500/70 hover:bg-gradient-to-r hover:from-orange-500 hover:to-pink-600 hover:text-white hover:shadow-lg hover:shadow-orange-500/25"
      onClick={upgrade}
    >
      <div className="flex items-center gap-2">
        <Crown className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
        <span className="font-medium">Upgrade</span>
        <Sparkles className="h-3 w-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </div>

      {/* Subtle glow effect */}
      <div className="absolute inset-0 rounded-md bg-gradient-to-r from-orange-400/20 to-pink-500/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </Button>
  );
}