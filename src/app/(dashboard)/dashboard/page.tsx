"use client";

import { RedirectToSignIn, SignedIn } from "@daveyplate/better-auth-ui";
import {
  Loader2,
  Image as ImageIcon,
  Sparkles,
  Zap,
  Calendar,
  TrendingUp,
  Camera,
  Star,
  ArrowRight,
  Plus,
  Eye,
  Lock,
  CheckCircle2,
} from "lucide-react";
import { authClient } from "~/lib/auth-client";
import { useEffect, useState } from "react";
import { getUserProjects } from "~/actions/projects";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { useRouter } from "next/navigation";
//import { Image as ImageKitImage } from "@imagekit/next";
import { env } from "~/env";

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

interface UserStats {
  totalProjects: number;
  thisMonth: number;
  thisWeek: number;
}

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    totalProjects: 0,
    thisMonth: 0,
    thisWeek: 0,
  });
  const [user, setUser] = useState<{ name?: string; createdAt?: string | Date } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        const session = await authClient.getSession();
        if (session?.data?.user) {
          setUser(session.data.user);
        }

        // Fetch user projects
        const projectsResult = await getUserProjects();
        if (projectsResult.success && projectsResult.projects) {
          const projects = projectsResult.projects;
          setUserProjects(projects);

          // Calculate stats
          const now = new Date();
          const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

          setUserStats({
            totalProjects: projects.length,
            thisMonth: projects.filter(
              (p) => new Date(p.createdAt) >= thisMonth,
            ).length,
            thisWeek: projects.filter((p) => new Date(p.createdAt) >= thisWeek)
              .length,
          });
        }
      } catch (error) {
        console.error("Dashboard initialization failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void initializeDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          <p className="text-gray-600 text-sm">
            Loading your dashboard...
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
          <div className="space-y-2">
            <h1 className="bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
              Welcome back{user?.name ? `, ${user.name}` : ""}!
            </h1>
            <p className="text-gray-700 text-base sm:text-lg">
              Manage your virtual try-ons and track your creations
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="relative overflow-hidden border-purple-200/60 bg-white/70 backdrop-blur hover:border-purple-400/60 hover:shadow-lg hover:shadow-purple-200/50 transition-all">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">
                  Total Try-Ons
                </CardTitle>
                <Eye className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {userStats.totalProjects}
                </div>
                <p className="text-gray-600 text-xs">
                  All your creations
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-purple-200/60 bg-white/70 backdrop-blur hover:border-purple-400/60 hover:shadow-lg hover:shadow-purple-200/50 transition-all">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">
                  This Month
                </CardTitle>
                <Calendar className="h-4 w-4 text-pink-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-pink-600">
                  {userStats.thisMonth}
                </div>
                <p className="text-gray-600 text-xs">
                  Try-ons created
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-purple-200/60 bg-white/70 backdrop-blur hover:border-purple-400/60 hover:shadow-lg hover:shadow-purple-200/50 transition-all">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">This Week</CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-600">
                  {userStats.thisWeek}
                </div>
                <p className="text-gray-600 text-xs">Recent activity</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-purple-200/60 bg-white/70 backdrop-blur hover:border-purple-400/60 hover:shadow-lg hover:shadow-purple-200/50 transition-all">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">
                  Member Since
                </CardTitle>
                <Lock className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {user?.createdAt
                    ? new Date(user.createdAt as string | number | Date).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })
                    : "N/A"}
                </div>
                <p className="text-gray-600 text-xs">Account created</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="border-purple-200/60 bg-white/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Zap className="h-5 w-5 text-purple-600" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Button
                  onClick={() => router.push("/dashboard/create")}
                  className="group bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-auto flex-col gap-2 p-6 shadow-md hover:shadow-lg transition-all"
                >
                  <Camera className="h-8 w-8 transition-transform group-hover:scale-110" />
                  <div className="text-center">
                    <div className="font-semibold">Create New Try-On</div>
                    <div className="text-xs opacity-90">
                      Upload and try on hijabs
                    </div>
                  </div>
                </Button>

                <Button
                  onClick={() => router.push("/dashboard/projects")}
                  className="group border-purple-300/60 hover:border-purple-400/80 hover:shadow-md hover:bg-purple-50 h-auto flex-col gap-2 p-6 transition-all"
                  variant="outline"
                >
                  <Eye className="h-8 w-8 text-purple-600 transition-transform group-hover:scale-110" />
                  <div className="text-center">
                    <div className="font-semibold text-gray-900">View All Try-Ons</div>
                    <div className="text-xs text-gray-600 opacity-70">
                      Browse your collection
                    </div>
                  </div>
                </Button>

                <Button
                  onClick={() => router.push("/dashboard/settings")}
                  className="group border-purple-300/60 hover:border-purple-400/80 hover:shadow-md hover:bg-purple-50 h-auto flex-col gap-2 p-6 transition-all"
                  variant="outline"
                >
                  <Lock className="h-8 w-8 text-emerald-600 transition-transform group-hover:scale-110" />
                  <div className="text-center">
                    <div className="font-semibold text-gray-900">Account Settings</div>
                    <div className="text-xs text-gray-600 opacity-70">
                      Manage your profile
                    </div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Projects */}
          <Card className="border-purple-200/60 bg-white/70 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <ImageIcon className="h-5 w-5 text-purple-600" />
                Recent Try-Ons
              </CardTitle>
              {userProjects.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/dashboard/projects")}
                  className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                >
                  View All <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {userProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="relative mb-4">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-purple-300/40 bg-purple-100/40">
                      <Eye className="h-8 w-8 text-purple-600" />
                    </div>

                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-gray-900">
                    No try-ons yet
                  </h3>
                  <p className="text-gray-700 mb-4 text-sm">
                    Start creating virtual try-ons with AI
                  </p>
                  <Button
                    onClick={() => router.push("/dashboard/create")}
                    className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                  >
                    <Plus className="h-4 w-4" />
                    Create Your First Try-On
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {userProjects.slice(0, 8).map((project) => (
                    <div
                      key={project.id}
                      className="group relative cursor-pointer overflow-hidden rounded-lg border border-purple-200/60 bg-white transition-all hover:border-purple-400/60 hover:shadow-lg hover:shadow-purple-200/50"
                      onClick={() => router.push("/dashboard/create")}
                    >
                      {/*}
                      <div className="aspect-square overflow-hidden">
                        <ImageKitImage
                          urlEndpoint={env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT}
                          src={project.filePath}
                          alt={project.name ?? "Project"}
                          width={200}
                          height={200}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          transformation={[
                            {
                              width: 200,
                              height: 200,
                              crop: "maintain_ratio",
                              quality: 85,
                            },
                          ]}
                        />
                      </div>
                      */}
                      <div className="aspect-square bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                        <Eye className="h-8 w-8 text-purple-400" />
                        <img
                                              src={project.imageUrl}
                                              alt={project.name ?? "Virtual try-on"}
                                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                                            />
                      </div>
                      <div className="p-3">
                        <h4 className="truncate text-sm font-semibold text-gray-900">
                          {project.name ?? "Untitled Try-On"}
                        </h4>
                        <p className="text-gray-600 text-xs">
                          {new Date(project.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-purple-600/10" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SignedIn>
    </>
  );
}

