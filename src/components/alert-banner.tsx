"use client";

import { AlertTriangle, X } from "lucide-react";
import Link from "next/link";
import type { Alert } from "@/types/database";

interface AlertBannerProps {
  alert: Alert | null;
  onDismiss?: () => void;
}

export function AlertBanner({ alert, onDismiss }: AlertBannerProps) {
  if (!alert) return null;

  return (
    <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 flex items-center gap-3">
      <AlertTriangle className="h-5 w-5 shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium">{alert.title}</span>
        {alert.description && (
          <span className="text-sm ml-2 text-destructive/80">
            — {alert.description}
          </span>
        )}
      </div>
      <Link
        href="/alerts"
        className="text-sm font-medium underline underline-offset-2 shrink-0"
      >
        View
      </Link>
      {onDismiss && (
        <button onClick={onDismiss} className="shrink-0">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
