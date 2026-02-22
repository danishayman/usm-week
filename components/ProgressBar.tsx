interface ProgressBarProps {
    percent: number;
    currentWeek: number;
    totalWeeks: number;
}

export default function ProgressBar({
    percent,
    currentWeek,
    totalWeeks,
}: ProgressBarProps) {
    const clamped = Math.min(100, Math.max(0, percent));

    return (
        <div className="w-full">
            {/* Labels */}
            <div className="flex justify-between items-baseline mb-2.5">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Week {currentWeek} of {totalWeeks}
                </span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {clamped.toFixed(1)}%
                </span>
            </div>

            {/* Track */}
            <div className="relative w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                {/* Fill */}
                <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out progress-fill"
                    style={{ width: `${clamped}%` }}
                />
            </div>

            {/* Edge labels */}
            <div className="flex justify-between mt-2">
                <span className="text-xs text-slate-400 dark:text-slate-500">Start</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">End</span>
            </div>
        </div>
    );
}
