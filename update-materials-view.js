const fs = require('fs');

let content = fs.readFileSync('src/components/MaterialsView.tsx', 'utf-8');

// Update imports
content = content.replace(
  "import { Database, Plus, Search, Filter, CheckCircle2, AlertCircle, ArrowUpRight, Upload, Layers, Tag } from 'lucide-react';",
  "import { Database, Plus, Search, Filter, CheckCircle2, AlertCircle, ArrowUpRight, Upload, Layers, Tag, ChevronLeft, ChevronRight, Menu, ListTree } from 'lucide-react';"
);

// Add sidebar state
content = content.replace(
  "const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);",
  "const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);\n  const [isSidebarOpen, setIsSidebarOpen] = useState(true);"
);

// Replace the return block entirely.
const returnStartIndex = content.indexOf('  return (');
const returnEndIndex = content.lastIndexOf('  );') + 4; // '  );\n}'

if (returnStartIndex !== -1 && returnEndIndex !== -1) {
  const newReturn = `  return (
    <div className="flex h-[calc(100vh-theme(spacing.20))] gap-4">
      {/* Collapsible Left Sidebar */}
      <div className={\`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col transition-all duration-300 \${isSidebarOpen ? 'w-56' : 'w-12'} shrink-0\`}>
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          {isSidebarOpen && <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2"><ListTree className="w-4 h-4 text-blue-500" />物料分类</span>}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 mx-auto">
            {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
        
        {isSidebarOpen && (
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <button
              onClick={() => setCategoryFilter('ALL')}
              className={\`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors \${categoryFilter === 'ALL' ? 'bg-blue-50 text-blue-700 font-medium dark:bg-blue-900/40 dark:text-blue-300' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'}\`}
            >
              全部 <span className="float-right text-xs text-slate-400">({materials.length})</span>
            </button>
            {categories.map(c => {
              const count = materials.filter(m => m.category === c).length;
              return (
                <button
                  key={c}
                  onClick={() => setCategoryFilter(c)}
                  className={\`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors \${categoryFilter === c ? 'bg-blue-50 text-blue-700 font-medium dark:bg-blue-900/40 dark:text-blue-300' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'}\`}
                >
                  {c} <span className="float-right text-xs text-slate-400">({count})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        
        {/* Top Header / Actions */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 rounded flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              新增
            </button>
            <button
              onClick={() => setIsBatchModalOpen(true)}
              className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              批量操作
            </button>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="请输入物料编码或物料名称..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button onClick={() => { setSearchTerm(''); setCategoryFilter('ALL'); }} className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer">
              重置
            </button>
          </div>
        </div>

        {/* Table Area */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
            <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th className="py-3 px-4 font-normal">序号</th>
                <th className="py-3 px-4 font-normal">物料编码</th>
                <th className="py-3 px-4 font-normal">物料名称</th>
                <th className="py-3 px-4 font-normal">规格型号</th>
                <th className="py-3 px-4 font-normal">主单位</th>
                <th className="py-3 px-4 font-normal">所属分类</th>
                <th className="py-3 px-4 font-normal">图号</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredMaterials.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    未找到匹配的物料记录
                  </td>
                </tr>
              ) : (
                filteredMaterials.map((mat, index) => {
                  return (
                    <tr key={mat.id} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors group">
                      <td className="py-2.5 px-4 text-slate-400">{index + 1}</td>
                      <td className="py-2.5 px-4 font-mono text-blue-600 dark:text-blue-400 cursor-pointer hover:underline" onClick={() => onSelectDrawing(mat.drawingNo || '')}>{mat.materialCode}</td>
                      <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">{mat.materialName}</td>
                      <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400">{mat.materialSpec || '-'}</td>
                      <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400">{mat.unit}</td>
                      <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400">{mat.category}</td>
                      <td className="py-2.5 px-4">
                        {mat.drawingNo ? (
                           <span className="font-mono text-slate-700 dark:text-slate-300">{mat.drawingNo}</span>
                        ) : (
                          <span className="text-slate-400 italic">未关联</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer Pagination (Mock) */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 bg-white dark:bg-slate-900">
           <div>已选中 0 条</div>
           <div className="flex items-center gap-4">
             <span>共 {filteredMaterials.length} 条</span>
             <div className="flex items-center gap-1">
               <button className="p-1 border border-slate-200 dark:border-slate-700 rounded disabled:opacity-50" disabled><ChevronLeft className="w-3.5 h-3.5" /></button>
               <span className="px-2 py-1 bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 rounded">1</span>
               <button className="p-1 border border-slate-200 dark:border-slate-700 rounded disabled:opacity-50" disabled><ChevronRight className="w-3.5 h-3.5" /></button>
             </div>
           </div>
        </div>
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                新增物料档案
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                &times;
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">物料编码 <span className="text-red-500">*</span></label>
                  <input required value={formData.materialCode} onChange={e => setFormData({...formData, materialCode: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="例如: WL-2023-001" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">物料名称 <span className="text-red-500">*</span></label>
                  <input required value={formData.materialName} onChange={e => setFormData({...formData, materialName: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="例如: 六角螺栓" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">规格型号</label>
                <input value={formData.materialSpec} onChange={e => setFormData({...formData, materialSpec: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="例如: M8x20 304不锈钢" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">物料分类</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="机械标准件">机械标准件</option>
                    <option value="电气标准件">电气标准件</option>
                    <option value="机加原材料">机加原材料</option>
                    <option value="结构件/外壳">结构件/外壳</option>
                    <option value="包装辅料">包装辅料</option>
                    <option value="定制件">定制件</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">主单位</label>
                  <input value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="PCS, KG, 米..." />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">初始关联图号 (可选)</label>
                <input value={formData.drawingNo} onChange={e => setFormData({...formData, drawingNo: e.target.value})} className="w-full px-3 py-2 font-mono bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="例如: DRW-10002" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">备注说明</label>
                <textarea rows={2} value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50">
              <button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer">
                取消
              </button>
              <button onClick={handleAddSubmit} disabled={!formData.materialCode || !formData.materialName} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors cursor-pointer">
                确认新增
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Import Modal */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800">
             <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                批量导入物料档案
              </h3>
              <button onClick={() => setIsBatchModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                &times;
              </button>
            </div>
            <div className="p-6 text-center space-y-4">
               <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto">
                 <ArrowUpRight className="w-8 h-8 text-blue-500" />
               </div>
               <p className="text-sm text-slate-600 dark:text-slate-400">
                 此功能模拟从 ERP 系统或 Excel 文件批量导入物料主数据。<br/>为了演示，点击下方按钮将自动生成 5 条测试数据。
               </p>
               <button onClick={handleMockBatchImport} className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition-colors cursor-pointer">
                 一键导入测试数据 (5条)
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`;

  const newFileContent = content.substring(0, returnStartIndex) + newReturn + '\n';
  fs.writeFileSync('src/components/MaterialsView.tsx', newFileContent);
  console.log('Success');
} else {
  console.log('Failed to find boundaries');
}
