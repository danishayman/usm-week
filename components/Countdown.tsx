"use client";

import { useEffect, useState } from "react";
import { getCountdown, type CountdownParts } from "@/lib/semester";

interface CountdownProps {
    target: Date;
    label: string;
    phase: "pre" | "active" | "post";
}

function Pad({ n }: { n: number }) {
    return <span>{String(n).padStart(2, "0")}</span>;
}

export default function Countdown({ target, label, phase }: CountdownProps) {
    const [parts, setParts] = useState<CountdownParts>(() => getCountdown(target));

    useEffect(() => {
        if (phase === "post") return;

        const id = setInterval(() => {
            setParts(getCountdown(target));
        }, 1000);

        return () => clearInterval(id);
    }, [target, phase]);

    if (phase === "post") {
        return (
            <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
                    Status
                </p>
                <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                    Semester Complete 🎓
                </p>
            </div>
        );
    }

    return (
        <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-5">
                {label}
            </p>
            <div className="flex items-end justify-center gap-3 sm:gap-6">
                <CountdownUnit value={parts.days} unit="days" />
                <Separator />
                <CountdownUnit value={parts.hours} unit="hrs" />
                <Separator />
                <CountdownUnit value={parts.minutes} unit="min" />
                <Separator />
                <CountdownUnit value={parts.seconds} unit="sec" />
            </div>
        </div>
    );
}

function CountdownUnit({ value, unit }: { value: number; unit: string }) {
    return (
        <div className="flex flex-col items-center min-w-[56px]">
            <span className="countdown-number text-4xl sm:text-5xl font-bold tabular-nums leading-none">
                <Pad n={value} />
            </span>
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-1.5 uppercase tracking-wider">
                {unit}
            </span>
        </div>
    );
}

function Separator() {
    return (
        <span className="text-2xl font-light text-slate-300 dark:text-slate-600 mb-5 select-none">
            :
        </span>
    );
}
