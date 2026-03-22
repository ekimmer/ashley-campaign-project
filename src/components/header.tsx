"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RefreshCw, User, LogOut, Settings } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

interface HeaderProps {
  campaignName?: string;
  onScanNow?: () => Promise<void>;
}

export function Header({ campaignName, onScanNow }: HeaderProps) {
  const [scanning, setScanning] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function handleScan() {
    if (!onScanNow) return;
    setScanning(true);
    try {
      await onScanNow();
    } finally {
      setScanning(false);
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-4">
          <div className="lg:hidden w-10" /> {/* Space for mobile menu button */}
          {campaignName && (
            <span className="text-sm font-medium text-muted-foreground">
              {campaignName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onScanNow && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleScan}
              disabled={scanning}
            >
              <RefreshCw
                className={cn("h-4 w-4 mr-2", scanning && "animate-spin")}
              />
              {scanning ? "Scanning..." : "Scan Now"}
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full">
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Link href="/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
