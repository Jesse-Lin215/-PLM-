import React from 'react';
import { Layers, ShieldCheck, MessageSquareText, HelpCircle, RefreshCw, Menu } from 'lucide-react';
import { ZoomControls } from './ZoomControls';

interface HeaderProps {
  onOpenCustomerReply: () => void;
  onOpenPendingQuestions: () => void;
  onResetData: () => void;
  onToggleMobileMenu: () => void;
  materialsCount: number;
  drawingsCount: number;
  pendingReviewsCount: number;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  isWideMode: boolean;
  onToggleWideMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenCustomerReply,
  onOpenPendingQuestions,
  onResetData,
  onToggleMobileMenu,
  materialsCount,
  drawingsCount,
  pendingReviewsCount,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  isWideMode,
  onToggleWideMode,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Brand Identity */}
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleMobileMenu}
              className="p-2 -ml-2 text-slate-400 hover:text-white md:hidden rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="打开侧边导航"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white/20">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold tracking-tight text-white">轻量 PLM 图纸管理系统</h1>
                  <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full">
                    SOP 标准流
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  物料档案 · 批量图纸导入 · 版本流转 · BOM 唯一性强校验
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar (Desktop) */}
          <div className="hidden lg:flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/80 rounded-md border border-slate-700">
              <span className="text-slate-400">物料档案:</span>
              <span className="font-semibold text-white">{materialsCount}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/80 rounded-md border border-slate-700">
              <span className="text-slate-400">图号主档:</span>
              <span className="font-semibold text-blue-400">{drawingsCount}</span>
            </div>
            {pendingReviewsCount > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-950/50 rounded-md border border-amber-800 text-amber-300">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>待审核版本:</span>
                <span className="font-bold">{pendingReviewsCount}</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-2.5 py-1 rounded-md">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>6重唯一性守卫已生效</span>
            </div>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2">
            {/* 缩放与自适应调整工具 */}
            <ZoomControls
              zoomLevel={zoomLevel}
              onZoomIn={onZoomIn}
              onZoomOut={onZoomOut}
              onResetZoom={onResetZoom}
              isWideMode={isWideMode}
              onToggleWideMode={onToggleWideMode}
            />

            <button
              onClick={onOpenCustomerReply}
              className="px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              title="查看推荐给客户的规范回复话术"
            >
              <MessageSquareText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">客户回复话术</span>
            </button>

            <button
              onClick={onOpenPendingQuestions}
              className="px-2.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              title="查看 Q1~Q6 待确认问题与共识"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Q1-Q6待确认</span>
            </button>

            <button
              onClick={onResetData}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="手动清除缓存并重置演示数据"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
