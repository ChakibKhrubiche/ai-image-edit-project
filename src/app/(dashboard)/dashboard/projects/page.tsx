"use client";

import { RedirectToSignIn, SignedIn } from "@daveyplate/better-auth-ui";
import {
  Loader2,
  Search,
  Grid3X3,
  List,
  Calendar,
  Eye,
  MoreVertical,
  Edit,
  Trash2,
  Download,
  Plus,
  X,
  AlertCircle,
} from "lucide-react";
import { authClient } from "~/lib/auth-client";
import { useEffect, useState } from "react";
// Server Actions
import {
  deleteProject,
  getUserProjects,
} from "~/actions/projects";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
//import { Image as ImageKitImage } from "@imagekit/next";
import { env } from "~/env";

interface TryOn {
  id: string;
  name: string | null;
  imageUrl: string;
  imageKitId: string;
  filePath: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

type ViewMode = "grid" | "list";
type SortBy = "newest" | "oldest" | "name";

export default function TryOnsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [userTryOns, setUserTryOns] = useState<TryOn[]>([]);
  const [filteredTryOns, setFilteredTryOns] = useState<TryOn[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [selectedTryOn, setSelectedTryOn] = useState<TryOn | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const initializeTryOns = async () => {
      try {
        await authClient.getSession();

        // Fetch user try-ons
        const projectsResult = await getUserProjects();
        if (projectsResult.success && projectsResult.projects) {
          setUserTryOns(projectsResult.projects);
          setFilteredTryOns(projectsResult.projects);
        }
      } catch (error) {
        console.error("Try-ons initialization failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void initializeTryOns();
  }, []);

  // Filter and sort try-ons
  useEffect(() => {
    let filtered = userTryOns.filter((tryOn) =>
      (tryOn.name ?? "Untitled Try-On")
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
    );

    // Sort try-ons
    switch (sortBy) {
      case "newest":
        filtered = filtered.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        break;
      case "oldest":
        filtered = filtered.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        break;
      case "name":
        filtered = filtered.sort((a, b) =>
          (a.name ?? "Untitled Try-On").localeCompare(
            b.name ?? "Untitled Try-On",
          ),
        );
        break;
    }

    setFilteredTryOns(filtered);
  }, [userTryOns, searchQuery, sortBy]);

  const handleTryOnClick = (tryOn: TryOn) => {
    setSelectedTryOn(tryOn);
    setDeleteConfirm(false);
  };

  const handleDeleteTryOn = async () => {
    if (!selectedTryOn) return;
    
    setIsDeleting(true);
    try {
      // ✅ NOUVEAU: Utiliser la server action deleteProject
      const result = await deleteProject(selectedTryOn.id);

      // ✅ NOUVEAU: Vérifier le résultat avec result.success
      if (result.success) {
        // Supprimer de la liste locale (UI update immédiat)
        setUserTryOns(userTryOns.filter((t) => t.id !== selectedTryOn.id));
        setSelectedTryOn(null);
        setDeleteConfirm(false);
        
        // ✅ NOUVEAU: Toast de succès
        toast.success("Try-on deleted successfully!");
      } else {
        // ✅ NOUVEAU: Afficher le message d'erreur du serveur
        toast.error(result.error ?? "Failed to delete try-on");
        console.error("Delete error:", result.error);
      }
    } catch (error) {
      console.error("Error deleting try-on:", error);
      // ✅ NOUVEAU: Toast d'erreur générique
      toast.error("An error occurred while deleting");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadTryOn = async (tryOn: TryOn) => {
    try {
      // Créer un lien de téléchargement
      const link = document.createElement("a");
      link.href = tryOn.imageUrl;
      link.download = `${tryOn.name ?? "tryon"}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // ✅ NOUVEAU: Toast de succès pour download
      toast.success("Download started!");
    } catch (error) {
      console.error("Error downloading try-on:", error);
      // ✅ NOUVEAU: Toast d'erreur pour download
      toast.error("Failed to download");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          <p className="text-gray-600 text-sm">
            Loading your try-ons...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <RedirectToSignIn />
      <SignedIn>
        <div className="space-y-6">
          {/* Header Section */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <h1 className="bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
                Your Try-Ons
              </h1>
              <p className="text-gray-700 text-base">
                View and manage all your virtual hijab try-ons (
                {filteredTryOns.length}{" "}
                {filteredTryOns.length === 1 ? "try-on" : "try-ons"})
              </p>
            </div>
            <Button
              onClick={() => router.push("/dashboard/create")}
              className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-md hover:shadow-lg transition-all self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              New Try-On
            </Button>
          </div>

          {/* Controls Bar */}
          <Card className="border-purple-200/60 bg-white/70 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {/* Search */}
                <div className="relative max-w-md flex-1">
                  <Search className="text-purple-600 absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                  <Input
                    placeholder="Search try-ons..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 border-purple-200/60 focus:border-purple-400/80"
                  />
                </div>

                <div className="flex items-center gap-2">
                  {/* Sort Dropdown */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortBy)}
                    className="border-purple-300/60 bg-white rounded-md border px-3 py-2 text-sm text-gray-700 hover:border-purple-400/80 transition-colors"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="name">Name A-Z</option>
                  </select>

                  {/* View Mode Toggle */}
                  <div className="border-purple-300/60 flex rounded-md border">
                    <Button
                      variant={viewMode === "grid" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("grid")}
                      className={`rounded-r-none ${
                        viewMode === "grid"
                          ? "bg-purple-600 text-white"
                          : "text-purple-600 hover:bg-purple-50"
                      }`}
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === "list" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("list")}
                      className={`rounded-l-none ${
                        viewMode === "list"
                          ? "bg-purple-600 text-white"
                          : "text-purple-600 hover:bg-purple-50"
                      }`}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Try-Ons Content */}
          {filteredTryOns.length === 0 ? (
            <Card className="border-purple-200/60 bg-white/70 backdrop-blur">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="relative mb-6">
                  <div className="border-purple-300/40 bg-purple-100/40 flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed">
                    <Eye className="text-purple-600 h-10 w-10" />
                  </div>
                </div>
                <h3 className="mb-2 text-xl font-semibold text-gray-900">
                  {searchQuery ? "No try-ons found" : "No try-ons yet"}
                </h3>
                <p className="text-gray-700 mb-6 max-w-md text-sm">
                  {searchQuery
                    ? `No try-ons match "${searchQuery}". Try adjusting your search terms.`
                    : "Start creating virtual hijab try-ons to see them here."}
                </p>
                {!searchQuery && (
                  <Button
                    onClick={() => router.push("/dashboard/create")}
                    className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                  >
                    <Plus className="h-4 w-4" />
                    Create Your First Try-On
                  </Button>
                )}
                {searchQuery && (
                  <Button
                    variant="outline"
                    onClick={() => setSearchQuery("")}
                    className="gap-2 border-purple-300/60 text-purple-600 hover:bg-purple-50"
                  >
                    Clear Search
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                  : "space-y-4"
              }
            >
              {filteredTryOns.map((tryOn) =>
                viewMode === "grid" ? (
                  <Card
                    key={tryOn.id}
                    className="group cursor-pointer overflow-hidden border-purple-200/60 bg-white transition-all hover:border-purple-400/60 hover:shadow-lg hover:shadow-purple-200/50"
                    onClick={() => handleTryOnClick(tryOn)}
                  >
                    <div className="aspect-square bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center overflow-hidden relative">
                      <img
                        src={tryOn.imageUrl}
                        alt={tryOn.name ?? "Virtual try-on"}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                    </div>

                    <CardContent className="p-3">
                      <h3 className="truncate text-sm font-semibold text-gray-900">
                        {tryOn.name ?? "Untitled Try-On"}
                      </h3>
                      <div className="mt-1 flex items-center justify-between">
                        <p className="text-gray-600 text-xs">
                          {new Date(tryOn.createdAt).toLocaleDateString()}
                        </p>
                        <div className="opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTryOnClick(tryOn);
                            }}
                          >
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card
                    key={tryOn.id}
                    className="group cursor-pointer transition-all border-purple-200/60 bg-white hover:border-purple-400/60 hover:shadow-lg hover:shadow-purple-200/50"
                    onClick={() => handleTryOnClick(tryOn)}
                  >
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-purple-200/60 bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                        <img
                          src={tryOn.imageUrl}
                          alt={tryOn.name ?? "Virtual try-on"}
                          className="h-full w-full object-cover"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold text-gray-900">
                          {tryOn.name ?? "Untitled Try-On"}
                        </h3>
                        <div className="text-gray-600 mt-1 flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(tryOn.createdAt).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            Try-On
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTryOnClick(tryOn);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadTryOn(tryOn);
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTryOn(tryOn);
                            setDeleteConfirm(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ),
              )}
            </div>
          )}

          {/* Load More Button */}
          {filteredTryOns.length >= 20 && (
            <div className="text-center">
              <Button variant="outline" className="gap-2 border-purple-300/60 text-purple-600 hover:bg-purple-50">
                Load More Try-Ons
                <Loader2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Modal - View & Delete Try-On */}
        {selectedTryOn && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Close Button */}
              <div className="sticky top-0 flex items-center justify-between p-6 border-b border-purple-200/40 bg-white/95 backdrop-blur">
                <h2 className="text-lg font-bold text-gray-900">
                  {selectedTryOn.name ?? "Untitled Try-On"}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedTryOn(null);
                    setDeleteConfirm(false);
                  }}
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Modal Content */}
              {!deleteConfirm ? (
                <>
                  {/* Image Display */}
                  <div className="p-6">
                    <div className="aspect-square bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl overflow-hidden flex items-center justify-center mb-6 border border-purple-200/60">
                      <img
                        src={selectedTryOn.imageUrl}
                        alt={selectedTryOn.name ?? "Virtual try-on"}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    {/* Try-On Details */}
                    <div className="space-y-4 mb-6">
                      <div className="rounded-lg border border-purple-200/60 bg-purple-50/50 p-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">
                          Try-On Details
                        </h3>
                        <div className="space-y-2 text-sm text-gray-700">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Created:</span>
                            <span className="font-medium">
                              {new Date(selectedTryOn.createdAt).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Last Updated:</span>
                            <span className="font-medium">
                              {new Date(selectedTryOn.updatedAt).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">ID:</span>
                            <span className="font-mono text-xs text-gray-600">
                              {selectedTryOn.id.substring(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="sticky bottom-0 flex gap-3 p-6 border-t border-purple-200/40 bg-white/95 backdrop-blur">
                    <Button
                      onClick={() => handleDownloadTryOn(selectedTryOn)}
                      className="flex-1 gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-md hover:shadow-lg transition-all"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                    <Button
                      onClick={() => setDeleteConfirm(true)}
                      variant="outline"
                      className="flex-1 gap-2 border-red-300/60 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                    <Button
                      onClick={() => setSelectedTryOn(null)}
                      className="flex-1 border-purple-300/60 text-purple-600 hover:bg-purple-50"
                      variant="outline"
                    >
                      Close
                    </Button>
                  </div>
                </>
              ) : (
                /* Delete Confirmation */
                <div className="p-6">
                  <div className="rounded-lg border border-red-200/60 bg-red-50/50 p-4 mb-6 flex items-start gap-4">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-red-900 mb-1">Delete Try-On?</h3>
                      <p className="text-sm text-red-800">
                        This action cannot be undone. The try-on {selectedTryOn.name ?? "Untitled"} and all associated data will be permanently deleted.
                      </p>
                    </div>
                  </div>

                  {/* Confirmation Buttons */}
                  <div className="flex gap-3">
                    <Button
                      onClick={() => setDeleteConfirm(false)}
                      className="flex-1 border-purple-300/60 text-purple-600 hover:bg-purple-50"
                      variant="outline"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleDeleteTryOn}
                      disabled={isDeleting}
                      className="flex-1 gap-2 bg-red-600 hover:bg-red-700 text-white"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4" />
                          Delete Permanently
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </SignedIn>
    </>
  );
}