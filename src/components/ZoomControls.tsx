import React from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';

interface ZoomControlsProps {
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  isWideMode: boolean;
  onToggleWideMode: () => void;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  isWideMode,
  onToggleWideMode,
}) => {
  return (
    <div className="flex items-center bg-slate-800/90 hover:bg-slate-800 border border-slate-700 rounded-lg p-0.5 text-xs text-slate-300 shadow-sm">
      <button
        onClick={onZoomOut}
        disabled={zoomLevel <= 70}
        className="p-1 hover:text-white hover:bg-slate-700/60 rounded disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
        title="缩小界面比例 (70%~130%)"
        aria-label="缩小"
      >
        <ZoomOut className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={onResetZoom}
        className="px-1.5 py-0.5 font-mono text-[11px] font-semibold text-blue-400 hover:text-blue-300 hover:bg-slate-700/60 rounded cursor-pointer"
        title="点击恢复 100% 原始比例"
      >
        {zoomLevel}%
      </button>

      <button
        onClick={onZoomIn}
        disabled={zoomLevel >= 130}
        className="p-1 hover:text-white hover:bg-slate-700/60 rounded disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
        title="放大界面比例 (70%~130%)"
        aria-label="放大"
      >
        <ZoomIn className="w-3.5 h-3.5" />
      </button>

      <div className="h-3 w-px bg-slate-700 mx-1" />

      <button
        onClick={onToggleWideMode}
        className={`p-1 rounded cursor-pointer transition-colors ${
          isWideMode
            ? 'bg-blue-600/80 text-white'
            : 'hover:text-white hover:bg-slate-700/60 text-slate-400'
        }`}
        title={isWideMode ? '退出满屏宽屏模式 (切换至标准宽度)' : '开启满屏自适应宽屏模式 (适配高低分辨率)'}
        aria-label="切换宽屏模式"
      >
        {isWideMode ? (
          <Minimize2 className="w-3.5 h-3.5" />
        ) : (
          <Maximize2 className="w-3.5 h-3.5" />
        )}
      </button>
    </div>
  );
};
