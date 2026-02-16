"use server";

import { UserButton } from "@daveyplate/better-auth-ui";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from "../ui/sidebar";
import Credits from "./credits";
import SidebarMenuItems from "./sidebar-menu-items";
import { User, Lock, Settings } from "lucide-react";
import Upgrade from "./upgrade";
import MobileSidebarClose from "./mobile-sidebar-close";
import Link from "next/link";

export async function AppSidebar() {
  return (
    <Sidebar className="border-r border-purple-200/40 bg-gradient-to-b from-white via-purple-50/30 to-blue-50/20">
      <SidebarContent className="px-3">
        <MobileSidebarClose />
        <SidebarGroup>
          <SidebarGroupLabel className="text-purple-600 mt-0 mb-32 flex flex-col items-start justify-start px-5">
            <Link href="/" className="mb-5 flex items-center gap-3 w-full hover:opacity-80 transition-opacity">              
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 border border-purple-200/60">
                <img
                  src="https://ik.imagekit.io/u4odjerit/HijabAISaas/1769806122.png?updatedAt=1769860375771"
                  alt="Hijab TryOn"
                  className="w-8 h-8 object-contain"
                />
              </div>
              <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 bg-clip-text text-transparent font-bold text-sm hidden sm:inline">
                Hijab TryOn
              </span>
            </Link>
            
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              <SidebarMenuItems />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-purple-200/40 bg-white/50 p-3 space-y-3">
        <div className="flex w-full items-center justify-center gap-2 text-xs">
          <Credits />
          <Upgrade />
        </div>
        <UserButton
          variant="outline"
          className="border-purple-300/60 hover:border-purple-400/80 hover:bg-purple-50 w-full transition-all text-gray-700"
          disableDefaultLinks={true}
          additionalLinks={[
            {
              label: "Customer Portal",
              href: "/dashboard/customer-portal",
              icon: <User className="h-4 w-4 text-purple-600" />,
            },
            {
              label: "Settings",
              href: "/dashboard/settings",
              icon: <Settings className="h-4 w-4 text-purple-600" />,
            },
          ]}
        />
      </SidebarFooter>
    </Sidebar>
  );
}