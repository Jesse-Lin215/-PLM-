import re

with open("src/components/DrawingVersionsView.tsx", "r") as f:
    content = f.read()

# We need to replace the header div and the action buttons block inside the expanded section.
# First, remove the action buttons inside the expanded section:

content = re.sub(
    r'\{\/\* 操作动作 \*\/.*?\<\!-- 选项卡 --\>',
    r'{/* 选项卡 */}',
    content,
    flags=re.DOTALL
)
content = re.sub(
    r'\{\/\* 操作动作 \*\/.*?<div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-700 mb-3">',
    r'<div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-700 mb-3">',
    content,
    flags=re.DOTALL
)

# Wait, let's just do a string replacement.
old_expanded_top = """                {/* 详情内容区 */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4">
                    
                    {/* 操作动作 */}
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      {isDraft && (
                        <button onClick={() => onUpdateVersionStatus(currentMaster.drawingNo, ver.id, 'PENDING_REVIEW')} className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded shadow-sm">
                          提交审核
                        </button>
                      )}
                      {isPending && (
                        <button onClick={() => onUpdateVersionStatus(currentMaster.drawingNo, ver.id, 'PUBLISHED')} className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded shadow-sm">
                          通过并发布
                        </button>
                      )}
                      {isPublished && onSetDefaultVersion && !ver.isDefault && (
                        <button onClick={() => onSetDefaultVersion(currentMaster.drawingNo, ver.id)} className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 rounded">
                          设为默认
                        </button>
                      )}
                      {isPublished && (
                        <button onClick={() => onUpdateVersionStatus(currentMaster.drawingNo, ver.id, 'OBSOLETE')} className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-100 hover:bg-rose-200 rounded">
                          作废该版本
                        </button>
                      )}
                      {isDraft && (
                        <button onClick={() => onDeleteDraftVersion(currentMaster.drawingNo, ver.id)} className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded">
                          删除草稿
                        </button>
                      )}
                    </div>

                    {/* 选项卡 */}
                    <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-700 mb-3">"""

new_expanded_top = """                {/* 详情内容区 */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-3">
                    
                    {/* 选项卡 */}
                    <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-700 mb-3">"""

content = content.replace(old_expanded_top, new_expanded_top)


old_header = """                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="hidden sm:inline-block"><User className="w-3.5 h-3.5 inline mr-1" />{ver.createdBy}</span>
                    <span><Clock className="w-3.5 h-3.5 inline mr-1" />{ver.createdAt.slice(0, 10)}</span>
                  </div>"""

new_header = """                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="hidden sm:inline-block"><User className="w-3.5 h-3.5 inline mr-1" />{ver.createdBy}</span>
                      <span><Clock className="w-3.5 h-3.5 inline mr-1" />{ver.createdAt.slice(0, 10)}</span>
                    </div>

                    {/* 操作动作 */}
                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      {isDraft && (
                        <>
                          <button onClick={() => onUpdateVersionStatus(currentMaster.drawingNo, ver.id, 'PENDING_REVIEW')} className="px-2.5 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded shadow-sm transition-colors">
                            提交审核
                          </button>
                          <button onClick={() => onDeleteDraftVersion(currentMaster.drawingNo, ver.id)} title="删除草稿" className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {isPending && (
                        <button onClick={() => onUpdateVersionStatus(currentMaster.drawingNo, ver.id, 'PUBLISHED')} className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded shadow-sm transition-colors">
                          通过并发布
                        </button>
                      )}
                      {isPublished && onSetDefaultVersion && !ver.isDefault && (
                        <button onClick={() => onSetDefaultVersion(currentMaster.drawingNo, ver.id)} className="px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 rounded transition-colors">
                          设为默认
                        </button>
                      )}
                      {isPublished && (
                        <button onClick={() => onUpdateVersionStatus(currentMaster.drawingNo, ver.id, 'OBSOLETE')} className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-100 hover:bg-rose-200 rounded transition-colors">
                          作废
                        </button>
                      )}
                    </div>
                  </div>"""

content = content.replace(old_header, new_header)

with open("src/components/DrawingVersionsView.tsx", "w") as f:
    f.write(content)
