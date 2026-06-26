import type { ActivityType } from "@/lib/calendar/types";

export interface ActivityTypeMeta {
  accentTextClass: string;
  countdownColor: string;
}

export const ACTIVITY_TYPE_METADATA: Record<ActivityType, ActivityTypeMeta> = {
  teaching: {
    accentTextClass: "text-purple-950",
    countdownColor: "#501f7d",
  },
  revision: {
    accentTextClass: "text-purple-950",
    countdownColor: "#501f7d",
  },
  exam: {
    accentTextClass: "text-purple-950",
    countdownColor: "#501f7d",
  },
  break: {
    accentTextClass: "text-purple-800",
    countdownColor: "#3D007A",
  },
  industrial: {
    accentTextClass: "text-purple-950",
    countdownColor: "#501f7d",
  },
};

export const FALLBACK_ACTIVITY_TYPE_META: ActivityTypeMeta = {
  accentTextClass: "text-purple-950",
  countdownColor: "#501f7d",
};
