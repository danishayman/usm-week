import type { ActivityType } from "@/lib/calendar/types";

export interface ActivityTypeMeta {
  accentTextClass: string;
  countdownColor: string;
}

export const ACTIVITY_TYPE_METADATA: Record<ActivityType, ActivityTypeMeta> = {
  teaching: {
    accentTextClass: "text-indigo-600",
    countdownColor: "#4f46e5",
  },
  revision: {
    accentTextClass: "text-amber-600",
    countdownColor: "#d97706",
  },
  exam: {
    accentTextClass: "text-rose-600",
    countdownColor: "#e11d48",
  },
  break: {
    accentTextClass: "text-purple-800",
    countdownColor: "#3D007A",
  },
  industrial: {
    accentTextClass: "text-sky-600",
    countdownColor: "#0284c7",
  },
};

export const FALLBACK_ACTIVITY_TYPE_META: ActivityTypeMeta = {
  accentTextClass: "text-indigo-500",
  countdownColor: "#4f46e5",
};
