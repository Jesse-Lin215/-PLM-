import React, { useState } from 'react';
import { DrawingFile, DrawingVersion } from '../types/plm';
import { getFileTypeBadge, formatFileSize } from '../utils/plmHelpers';
import { X, ZoomIn, ZoomOut, RotateCw, Layers, ShieldCheck, Download, Eye, FileText, Box, Grid } from 'lucide-react';

interface DrawingPreviewModalProps {
  file: DrawingFile | null;
  version: DrawingVersion | null;
  materialName?: string;
  materialSpec?: string;
  onClose: () => void;
}

export const DrawingPreviewModal: React.FC<DrawingPreviewModalProps> = ({
  file,
  version,
  materialName,
  materialSpec,
  onClose,
}) => {
  if (!file || !version) return null;

  const fileBadge = getFileTypeBadge(file.fileType);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [activeLayers, setActiveLayers] = useState<string[]>(file.cadLayers || ['0_OUTLINE', 'DIMENSIONS']);
  const [viewAngle, setViewAngle] = useState<'ISO' | 'TOP' | 'FRONT' | 'SIDE'>('ISO');

  const toggleLayer = (layer: string) => {
    setActiveLayers(prev =>
      prev.includes(layer) ? prev.filter(l => l !== layer) : [...prev, layer]
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 p-2 sm:p-4 backdrop-blur-sm animate-fadeIn">
      <div className="flex flex-col w-full max-w-5xl h-[92vh] bg-slate-900 text-slate-100 rounded-xl shadow-2xl border border-slate-700 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-800/90 border-b border-slate-700">
          <div className="flex items-center gap-3 min-w-0">
            <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${fileBadge.color}`}>
              {fileBadge.short}
            </span>
            <div className="truncate">
              <h3 className="text-sm font-semibold text-white truncate">{file.fileName}</h3>
              <p className="text-xs text-slate-400">
                {version.drawingNo} ({version.versionNo}) · {materialName || '物料'} [{materialSpec || '-'}] · {formatFileSize(file.fileSize)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                alert(`[模拟下载] 已开始下载工程图纸: ${file.fileName}`);
              }}
              className="px-3 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">下载原件</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Canvas Area & Sidebar */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Main Visualizer Stage */}
          <div className="flex-1 bg-slate-950 relative overflow-hidden flex items-center justify-center p-4">
            {/* Toolbar overlay */}
            <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-slate-800/85 backdrop-blur-md px-2 py-1.5 rounded-lg border border-slate-700 shadow-md">
              <button
                onClick={() => setZoomLevel(prev => Math.min(prev + 20, 200))}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded cursor-pointer"
                title="放大"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-300 font-mono px-1">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel(prev => Math.max(prev - 20, 40))}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded cursor-pointer"
                title="缩小"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-slate-700 mx-1" />
              <button
                onClick={() => setRotation(prev => (prev + 90) % 360)}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded cursor-pointer"
                title="旋转90°"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              {file.fileType === 'STEP' && (
                <>
                  <div className="w-px h-4 bg-slate-700 mx-1" />
                  <button
                    onClick={() => setViewAngle('ISO')}
                    className={`px-2 py-0.5 text-xs rounded cursor-pointer ${viewAngle === 'ISO' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
                  >
                    等轴
                  </button>
                  <button
                    onClick={() => setViewAngle('TOP')}
                    className={`px-2 py-0.5 text-xs rounded cursor-pointer ${viewAngle === 'TOP' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
                  >
                    俯视
                  </button>
                  <button
                    onClick={() => setViewAngle('FRONT')}
                    className={`px-2 py-0.5 text-xs rounded cursor-pointer ${viewAngle === 'FRONT' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
                  >
                    主视
                  </button>
                </>
              )}
            </div>

            {/* Simulated Watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
              <span className="text-4xl sm:text-6xl font-bold tracking-widest text-white transform -rotate-12 select-none">
                PLM CONTROLLED · {version.status}
              </span>
            </div>

            {/* Drawing Canvas by Type */}
            <div
              className="transition-transform duration-200 flex items-center justify-center"
              style={{
                transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
              }}
            >
              {file.fileType === 'PDF' && (
                <div className="w-[340px] sm:w-[540px] md:w-[620px] h-[400px] sm:h-[480px] bg-slate-100 dark:bg-slate-900 border-2 border-slate-600 rounded shadow-2xl p-6 flex flex-col justify-between text-slate-800 dark:text-slate-100 font-mono relative">
                  {/* Blueprint Title Block (标题栏) */}
                  <div className="border-b-2 border-slate-500 pb-3 flex justify-between items-start">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-slate-500">PLM Engineering Drawing</div>
                      <div className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400">{version.drawingNo}</div>
                      <div className="text-xs text-slate-400">{materialName} - {materialSpec}</div>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
                        REV: {version.versionNo}
                      </span>
                      <div className="text-[11px] text-slate-400 mt-1">Sheet 1 of {file.sheetCount || 2}</div>
                    </div>
                  </div>

                  {/* Simulated Blueprint Technical Drawings */}
                  <div className="my-auto flex flex-col items-center justify-center py-6">
                    <svg className="w-56 sm:w-80 h-36 sm:h-48 stroke-current text-blue-500 dark:text-blue-400 fill-none stroke-[1.5]" viewBox="0 0 300 180">
                      {/* Box profile */}
                      <rect x="30" y="30" width="240" height="120" rx="8" strokeDasharray="none" />
                      <circle cx="50" cy="50" r="8" />
                      <circle cx="250" cy="50" r="8" />
                      <circle cx="50" cy="130" r="8" />
                      <circle cx="250" cy="130" r="8" />
                      <rect x="70" y="55" width="160" height="70" rx="4" strokeDasharray="4 2" />
                      {/* Dimension lines */}
                      <line x1="30" y1="20" x2="270" y2="20" className="text-amber-500 stroke-[1]" />
                      <line x1="30" y1="15" x2="30" y2="25" className="text-amber-500 stroke-[1]" />
                      <line x1="270" y1="15" x2="270" y2="25" className="text-amber-500 stroke-[1]" />
                      <text x="135" y="16" fill="currentColor" fontSize="10" textAnchor="middle" className="text-amber-500 font-sans">
                        240.00 ±0.15 mm
                      </text>
                      {/* Crosshairs */}
                      <line x1="150" y1="20" x2="150" y2="160" strokeDasharray="6 3 2 3" className="text-slate-400 stroke-[0.8]" />
                      <line x1="20" y1="90" x2="280" y2="90" strokeDasharray="6 3 2 3" className="text-slate-400 stroke-[0.8]" />
                    </svg>
                    <span className="text-[11px] text-slate-400 tracking-wide mt-2">
                      [PDF 矢量工程图高精度预览模式]
                    </span>
                  </div>

                  {/* Blueprint Footer / Approval Grid */}
                  <div className="grid grid-cols-4 border-t-2 border-slate-500 pt-2 text-[10px] text-slate-400">
                    <div>创建人: {version.createdBy || version.designer}</div>
                    <div>审核: {version.reviewer || '待审核'}</div>
                    <div>状态: <span className="text-emerald-400 font-semibold">{version.status}</span></div>
                    <div>发布: {version.publishTime || '未发布'}</div>
                  </div>
                </div>
              )}

              {file.fileType === 'DWG' && (
                <div className="w-[340px] sm:w-[560px] md:w-[660px] h-[400px] sm:h-[480px] bg-black border-2 border-slate-700 rounded shadow-2xl p-4 flex flex-col justify-between font-mono relative">
                  <div className="text-xs text-green-400 flex items-center justify-between border-b border-zinc-800 pb-2">
                    <span className="flex items-center gap-1.5">
                      <Grid className="w-3.5 h-3.5" /> AutoCAD DWG 视口渲染引擎 [AutoLISP/Vector]
                    </span>
                    <span className="text-zinc-500">UCS: WORLD · SCALE: 1:1</span>
                  </div>

                  <div className="my-auto flex items-center justify-center">
                    <svg className="w-64 sm:w-96 h-48 sm:h-64 fill-none" viewBox="0 0 400 250">
                      {/* Grid background */}
                      <defs>
                        <pattern id="cadGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#222" strokeWidth="0.5" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#cadGrid)" />

                      {/* Outline layer */}
                      {activeLayers.includes('0_OUTLINE') && (
                        <g stroke="#00ff66" strokeWidth="1.8">
                          <polygon points="50,40 350,40 370,100 350,200 50,200 30,100" />
                          <circle cx="200" cy="120" r="50" />
                        </g>
                      )}

                      {/* Dimensions layer */}
                      {activeLayers.includes('DIMENSIONS') && (
                        <g stroke="#ffcc00" strokeWidth="1">
                          <line x1="50" y1="220" x2="350" y2="220" />
                          <text x="200" y="235" fill="#ffcc00" fontSize="11" textAnchor="middle">
                            L = 300.00
                          </text>
                          <line x1="50" y1="205" x2="50" y2="225" />
                          <line x1="350" y1="205" x2="350" y2="225" />
                        </g>
                      )}

                      {/* CAD Crosshairs */}
                      <line x1="200" y1="10" x2="200" y2="240" stroke="#ff3333" strokeDasharray="6,4" strokeWidth="0.8" />
                      <line x1="10" y1="120" x2="390" y2="120" stroke="#ff3333" strokeDasharray="6,4" strokeWidth="0.8" />
                    </svg>
                  </div>

                  <div className="text-[11px] text-zinc-400 bg-zinc-900/90 p-2 rounded flex justify-between">
                    <span>图层启用: {activeLayers.join(', ')}</span>
                    <span className="text-green-400 font-semibold">CAD 2D 实体解析正常</span>
                  </div>
                </div>
              )}

              {file.fileType === 'STEP' && (
                <div className="w-[340px] sm:w-[560px] md:w-[660px] h-[400px] sm:h-[480px] bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700 rounded-lg shadow-2xl p-4 flex flex-col justify-between font-mono relative">
                  <div className="flex items-center justify-between text-xs text-violet-400 border-b border-slate-800 pb-2">
                    <span className="flex items-center gap-1.5">
                      <Box className="w-4 h-4" /> WebGL 3D 实体渲染视口 (STEP AP214/AP242)
                    </span>
                    <span className="text-slate-500">视角: {viewAngle}</span>
                  </div>

                  <div className="my-auto flex flex-col items-center justify-center">
                    <div className="relative w-48 sm:w-64 h-48 sm:h-64 flex items-center justify-center animate-pulse">
                      {/* 3D simulated wireframe cube/cylinder */}
                      <svg className="w-full h-full stroke-violet-400 fill-violet-500/10 stroke-[1.5]" viewBox="0 0 200 200">
                        {/* Top Face */}
                        <polygon points="100,30 160,60 100,90 40,60" />
                        {/* Left Face */}
                        <polygon points="40,60 100,90 100,160 40,130" fill="rgba(139, 92, 246, 0.2)" />
                        {/* Right Face */}
                        <polygon points="160,60 100,90 100,160 160,130" fill="rgba(139, 92, 246, 0.3)" />
                        {/* Internal features */}
                        <circle cx="100" cy="60" r="16" strokeDasharray="3 2" className="stroke-violet-300" />
                        <line x1="100" y1="76" x2="100" y2="140" strokeDasharray="3 2" className="stroke-violet-300" />
                      </svg>
                    </div>
                    <span className="text-xs text-slate-400 mt-2">
                      3D 实体模型已加载 · 包含几何拓扑与装配配合基准
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 bg-slate-800/80 p-2 rounded flex justify-between">
                    <span>面数: 1,420 面 · 体积: 184.2 cm³</span>
                    <span className="text-violet-400 font-medium">B-Rep 拓扑完整</span>
                  </div>
                </div>
              )}

              {file.fileType === 'IMAGE' && (
                <div className="w-[340px] sm:w-[500px] h-[360px] bg-slate-900 border border-slate-700 rounded-lg p-4 flex flex-col items-center justify-center">
                  <div className="w-48 h-48 bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700">
                    <Eye className="w-16 h-16 text-emerald-400 opacity-60" />
                  </div>
                  <span className="text-xs text-slate-300 mt-4">{file.fileName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar: Meta Details */}
          <div className="w-full md:w-80 bg-slate-850 border-t md:border-t-0 md:border-l border-slate-700 p-4 flex flex-col justify-between text-xs overflow-y-auto">
            <div className="space-y-4">
              <div>
                <h4 className="text-slate-300 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-400" /> 图纸属性信息
                </h4>
                <div className="space-y-2 bg-slate-800/80 p-3 rounded-lg border border-slate-700 text-slate-300">
                  <div>
                    <span className="text-slate-400">图号:</span>
                    <span className="ml-1.5 font-mono text-white font-medium">{version.drawingNo}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">版本号:</span>
                    <span className="ml-1.5 font-mono text-emerald-400 font-semibold">{version.versionNo}</span>
                    <span className="ml-2 text-[10px] text-slate-400">({version.status})</span>
                  </div>
                  <div>
                    <span className="text-slate-400">文件类型:</span>
                    <span className="ml-1.5 text-white">{file.fileType}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">文件大小:</span>
                    <span className="ml-1.5 text-white">{formatFileSize(file.fileSize)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">创建人:</span>
                    <span className="ml-1.5 text-white">{version.createdBy || file.uploader}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">上传时间:</span>
                    <span className="ml-1.5 text-slate-300">{file.uploadTime}</span>
                  </div>
                </div>
              </div>

              {file.cadLayers && file.cadLayers.length > 0 && (
                <div>
                  <h4 className="text-slate-300 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-400" /> CAD 图层过滤控制
                  </h4>
                  <div className="space-y-1.5 bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                    {file.cadLayers.map(layer => (
                      <label key={layer} className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                        <input
                          type="checkbox"
                          checked={activeLayers.includes(layer)}
                          onChange={() => toggleLayer(layer)}
                          className="rounded border-slate-600 text-blue-600 focus:ring-0 cursor-pointer"
                        />
                        <span className="font-mono text-xs">{layer}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-700 text-[11px] text-slate-400 flex items-center justify-between">
              <span>状态: {version.isActive ? '默认选用版本' : '非默认版本'}</span>
              <span className="text-emerald-400 font-medium">受控工程图</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

