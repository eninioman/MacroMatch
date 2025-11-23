import React from 'react';
import clsx from 'clsx';

interface ProgressBarProps {
  label: string;
  current: number;
  max: number;
  colorClass: string;
  unit?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ label, current, max, colorClass, unit = 'g' }) => {
  const percentage = Math.min(100, Math.max(0, (current / max) * 100));
  const remaining = max - current;
  const isOver = remaining < 0;

  return (
    <div className="mb-4">
      <div className="flex justify-between items-end mb-1">
        <span className="text-sm font-medium text-slate-300">{label}</span>
        <div className="text-right">
            <span className={clsx("text-sm font-bold", isOver ? "text-red-400" : "text-white")}>
                {Math.round(current)}{unit}
            </span>
            <span className="text-xs text-slate-500 mx-1">/</span>
            <span className="text-xs text-slate-400">{max}{unit}</span>
        </div>
      </div>
      <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
        <div
          className={clsx("h-2.5 rounded-full transition-all duration-500", colorClass, isOver && "bg-red-500")}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs text-slate-500">
            {isOver ? "Over by " : "Left: "} 
            <span className={clsx("font-semibold", isOver ? "text-red-400" : "text-emerald-400")}>
                {Math.abs(Math.round(remaining))}{unit}
            </span>
        </span>
      </div>
    </div>
  );
};