import re

with open("src/components/DrawingVersionsView.tsx", "r") as f:
    content = f.read()

old_block = """      {/* 1. 物料选择器与图号核心信息卡片 */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4 flex-wrap">
            {!fixedMaterialId && (
              <button
                onClick={() => setViewMode('list')}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-colors shadow-sm"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                返回列表
              </button>
            )}
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-lg">
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">图号:</span>
              <span className="font-mono font-bold text-sm text-blue-900 dark:text-blue-100">
                {currentMaster?.drawingNo || '未关联图号'}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded font-semibold">
                1物料:1图号
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 rounded-md text-xs font-medium text-amber-800 dark:text-amber-300">
              <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
              <span>当前默认版本: {currentMaster?.currentPublishedVersion || <span className="text-slate-400 italic">暂无默认版本</span>}</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <button onClick={handleCreateDraft} className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /><span>新增版本 (Draft)</span>
            </button>
          </div>
        </div>
        
        <div className="pt-3 text-xs flex flex-wrap items-center gap-x-6 gap-y-2 text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-1.5"><Box className="w-3.5 h-3.5 text-slate-400" /><span>对应物料: <strong className="text-slate-800 dark:text-slate-100">{currentMaterial?.materialCode} - {currentMaterial?.materialName}</strong></span></div>
          <div className="flex items-center gap-1.5"><FolderArchive className="w-3.5 h-3.5 text-slate-400" /><span>历史版本: <strong className="text-slate-800 dark:text-slate-100">{currentMaster?.versions.length || 0} 个</strong></span></div>
        </div>
      </div>"""

new_block = """      {/* 1. 物料选择器与图号核心信息卡片 */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap text-sm">
            {!fixedMaterialId && (
              <button
                onClick={() => setViewMode('list')}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-colors shadow-sm shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                返回列表
              </button>
            )}
            
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-lg shrink-0">
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">图号:</span>
              <span className="font-mono font-bold text-sm text-blue-900 dark:text-blue-100">
                {currentMaster?.drawingNo || '未关联图号'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 rounded-md text-xs font-medium text-amber-800 dark:text-amber-300 shrink-0">
              <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
              <span>当前默认版本: {currentMaster?.currentPublishedVersion || <span className="text-slate-400 italic">暂无默认版本</span>}</span>
            </div>

            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 hidden xl:block mx-1"></div>

            <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300 flex-wrap">
              <div className="flex items-center gap-1.5"><Box className="w-3.5 h-3.5 text-slate-400 shrink-0" /><span>对应物料: <strong className="text-slate-800 dark:text-slate-100">{currentMaterial?.materialCode} - {currentMaterial?.materialName}</strong></span></div>
              <div className="flex items-center gap-1.5"><FolderArchive className="w-3.5 h-3.5 text-slate-400 shrink-0" /><span>历史版本: <strong className="text-slate-800 dark:text-slate-100">{currentMaster?.versions.length || 0} 个</strong></span></div>
            </div>

          </div>
          <div className="flex items-center shrink-0">
            <button onClick={handleCreateDraft} className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /><span>新增版本 (Draft)</span>
            </button>
          </div>
        </div>
      </div>"""

if old_block in content:
    content = content.replace(old_block, new_block)
    with open("src/components/DrawingVersionsView.tsx", "w") as f:
        f.write(content)
    print("Successfully replaced block.")
else:
    print("Block not found!")
