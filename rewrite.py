code = """import React, { useState, useEffect } from 'react';
import { DrawingMaster, DrawingVersion, DrawingFile, VersionStatus, Material, FileType, VersionLog } from '../types/plm';
import { getStatusBadge, getFileTypeBadge, formatFileSize } from '../utils/plmHelpers';
import { DrawingPreviewModal } from './DrawingPreviewModal';
import { Eye, Plus, ShieldCheck, FileCode, History, FileText, ToggleLeft, ToggleRight, Box, Download, ChevronRight, Upload, CheckCircle2, FolderArchive, Trash2, Clock, User, AlertCircle, Check, Activity, Star, Search, ArrowLeft } from 'lucide-react';

interface DrawingVersionsViewProps {
  drawingMasters: DrawingMaster[];
  materials: Material[];
  selectedDrawingNo?: string;
  onUpdateVersionStatus: (drawingNo: string, versionId: string, newStatus: VersionStatus, extraData?: Partial<DrawingVersion>) => void;
  onToggleVersionActive: (drawingNo: string, versionId: string, isActive: boolean) => void;
  onSetDefaultVersion?: (drawingNo: string, versionId: string) => void;
  onCreateNewDraftVersion: (drawingNo: string, baseVersionNo?: string) => void;
  onDeleteDraftVersion: (drawingNo: string, versionId: string) => void;
  onAddFileToDraft: (drawingNo: string, versionId: string, file: DrawingFile) => void;
  onDeleteFileFromVersion?: (drawingNo: string, versionId: string, fileId: string, fileName: string, fileType: string) => void;
  fixedMaterialId?: string;
}

export const DrawingVersionsView: React.FC<DrawingVersionsViewProps> = (props) => {
  const { drawingMasters, materials, selectedDrawingNo, fixedMaterialId, onUpdateVersionStatus, onToggleVersionActive, onSetDefaultVersion, onCreateNewDraftVersion, onDeleteDraftVersion, onAddFileToDraft, onDeleteFileFromVersion } = props;

  const initialMaster = drawingMasters.find(d => d.drawingNo === selectedDrawingNo) || drawingMasters[0];
  const initialMaterialId = fixedMaterialId || initialMaster?.materialId || materials.find(m => m.drawingNo === selectedDrawingNo)?.id || materials[0]?.id || '';
  
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>(initialMaterialId);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>(fixedMaterialId ? 'detail' : 'list');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null);
  const [versionSubTab, setVersionSubTab] = useState<Record<string, 'files' | 'logs'>>({});
  const [uploadModalVersion, setUploadModalVersion] = useState<DrawingVersion | null>(null);
  const [newFormatType, setNewFormatType] = useState<FileType>('STEP');
  const [newFileName, setNewFileName] = useState<string>('');
  const [previewFile, setPreviewFile] = useState<{ file: DrawingFile; version: DrawingVersion } | null>(null);

  const currentMaterial = materials.find(m => m.id === selectedMaterialId) || materials[0];
  const currentMaster = drawingMasters.find(d => d.materialId === currentMaterial?.id || d.drawingNo === currentMaterial?.drawingNo) || drawingMasters[0];

  useEffect(() => {
    if (viewMode === 'detail' && currentMaster && !expandedVersionId) {
      if (currentMaster.versions.length > 0) {
        const pub = currentMaster.versions.find(v => v.status === 'PUBLISHED' && v.isActive) || currentMaster.versions[0];
        setExpandedVersionId(pub.id);
      }
    }
  }, [currentMaster, expandedVersionId, viewMode]);

  const handleCreateDraft = () => {
    if (!currentMaster) return;
    const published = currentMaster.versions.find(v => v.status === 'PUBLISHED' && v.isActive);
    onCreateNewDraftVersion(currentMaster.drawingNo, published?.versionNo);
  };

  const handleUploadFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadModalVersion || !currentMaster) return;
    const newFile: DrawingFile = {
      id: `file-${Date.now()}`,
      fileName: newFileName || `未命名图纸_${Date.now()}.${newFormatType.toLowerCase()}`,
      fileType: newFormatType,
      fileSize: Math.floor(Math.random() * 5000000) + 500000,
      uploadTime: new Date().toISOString().slice(0, 16).replace('T', ' '),
      uploadedBy: '当前登录用户',
    };
    onAddFileToDraft(currentMaster.drawingNo, uploadModalVersion.id, newFile);
    alert(`成功为版本 ${uploadModalVersion.versionNo} 补充上传 ${newFormatType} 格式图纸文件！`);
    setUploadModalVersion(null);
    setNewFileName('');
  };

  if (viewMode === 'list' && !fixedMaterialId) {
    const filteredMasters = drawingMasters.filter(master => {
      const q = searchQuery.toLowerCase();
      return (
        master.drawingNo.toLowerCase().includes(q) ||
        master.materialCode.toLowerCase().includes(q) ||
        master.materialName.toLowerCase().includes(q) ||
        (master.materialSpec && master.materialSpec.toLowerCase().includes(q)) ||
        (master.category && master.category.toLowerCase().includes(q))
      );
    });

    return (
      <div className="space-y-4 font-sans text-slate-800 dark:text-slate-100 h-full flex flex-col">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs shrink-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold">图号与版本中心</h2>
              <p className="text-xs text-slate-500 mt-1">全局管理所有物料关联的图号及图纸升版记录</p>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="搜索图号、物料编码、名称或规格..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex-1 overflow-hidden shadow-xs flex flex-col">
          <div className="overflow-auto flex-1 p-2">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 sticky top-0 z-10 rounded-lg">
                <tr>
                  <th className="px-4 py-3 font-semibold rounded-tl-lg">图号</th>
                  <th className="px-4 py-3 font-semibold">物料编码</th>
                  <th className="px-4 py-3 font-semibold">物料名称</th>
                  <th className="px-4 py-3 font-semibold">规格型号</th>
                  <th className="px-4 py-3 font-semibold">物料分类</th>
                  <th className="px-4 py-3 font-semibold text-center">最新版本</th>
                  <th className="px-4 py-3 font-semibold text-center">版本总数</th>
                  <th className="px-4 py-3 font-semibold text-right rounded-tr-lg">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredMasters.length > 0 ? (
                  filteredMasters.map(master => (
                    <tr key={master.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="px-4 py-3.5 font-mono font-bold text-blue-600 dark:text-blue-400">{master.drawingNo}</td>
                      <td className="px-4 py-3.5 font-mono text-slate-600 dark:text-slate-300">{master.materialCode}</td>
                      <td className="px-4 py-3.5 font-medium">{master.materialName}</td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs">{master.materialSpec}</td>
                      <td className="px-4 py-3.5"><span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded text-[11px] font-medium">{master.category}</span></td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="font-mono font-bold px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs">{master.latestVersion}</span>
                      </td>
                      <td className="px-4 py-3.5 text-center text-slate-500 font-mono text-xs">{master.versions.length}</td>
                      <td className="px-4 py-3.5 text-right">
                        <button 
                          onClick={() => {
                            setSelectedMaterialId(master.materialId);
                            setViewMode('detail');
                            if (master.versions.length > 0) {
                              const pub = master.versions.find(v => v.status === 'PUBLISHED' && v.isActive) || master.versions[0];
                              setExpandedVersionId(pub.id);
                            }
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                        >
                          查看详情
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                        <p>没有找到匹配的图纸记录</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-sans text-slate-800 dark:text-slate-100">
      {/* 1. 物料选择器与图号核心信息卡片 */}
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
      </div>

      {/* 2. 版本时间轴列表 */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2"><History className="w-4 h-4 text-slate-500" />图纸版本演进记录</h3>
        </div>
        <div className="p-4 space-y-4">
          {currentMaster?.versions.slice().reverse().map(ver => {
            const badge = getStatusBadge(ver.status);
            const isPublished = ver.status === 'PUBLISHED';
            const isDraft = ver.status === 'DRAFT';
            const isPending = ver.status === 'PENDING_REVIEW';
            const isObsolete = ver.status === 'OBSOLETE';
            const isExpanded = expandedVersionId === ver.id;
            const currentTab = versionSubTab[ver.id] || 'files';

            return (
              <div key={ver.id} className={`border rounded-xl transition-all ${isExpanded ? 'border-blue-300 dark:border-blue-700 shadow-sm ring-1 ring-blue-100 dark:ring-blue-900/30' : 'border-slate-200 dark:border-slate-800'}`}>
                {/* 头部点击展开 */}
                <div 
                  className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                  onClick={() => setExpandedVersionId(isExpanded ? null : ver.id)}
                >
                  <div className="flex items-center gap-3">
                    <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-lg text-slate-800 dark:text-slate-100">{ver.versionNo}</span>
                      {ver.isDefault && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 text-[10px] font-bold rounded-md">
                          <Star className="w-3 h-3 fill-amber-500" />当前默认
                        </span>
                      )}
                    </div>
                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded border ${badge.className}`}>{badge.label}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="hidden sm:inline-block"><User className="w-3.5 h-3.5 inline mr-1" />{ver.createdBy}</span>
                    <span><Clock className="w-3.5 h-3.5 inline mr-1" />{ver.createdAt.slice(0, 10)}</span>
                  </div>
                </div>

                {/* 详情内容区 */}
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
                    <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-700 mb-3">
                      <button onClick={() => setVersionSubTab(prev => ({...prev, [ver.id]: 'files'}))} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${currentTab === 'files' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                        图纸文件 ({ver.files?.length || 0})
                      </button>
                      <button onClick={() => setVersionSubTab(prev => ({...prev, [ver.id]: 'logs'}))} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${currentTab === 'logs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                        操作日志
                      </button>
                    </div>

                    {/* 文件列表 */}
                    {currentTab === 'files' && (
                      <div className="space-y-3">
                        {!isObsolete && !isPublished && !isPending && (
                          <button onClick={() => setUploadModalVersion(ver)} className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center gap-1">
                            <Upload className="w-3.5 h-3.5" /> 上传图纸
                          </button>
                        )}
                        
                        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                          <table className="w-full text-left text-xs whitespace-nowrap">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                              <tr>
                                <th className="px-3 py-2 text-center w-10">#</th>
                                <th className="px-3 py-2 w-24">格式</th>
                                <th className="px-3 py-2">文件名</th>
                                <th className="px-3 py-2">大小</th>
                                <th className="px-3 py-2">上传时间</th>
                                <th className="px-3 py-2 text-center">操作</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {ver.files && ver.files.length > 0 ? ver.files.map((file, idx) => (
                                <tr key={file.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                  <td className="px-3 py-2.5 text-center text-slate-400">{idx + 1}</td>
                                  <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded font-mono font-bold ${getFileTypeBadge(file.fileType).color}`}>{file.fileType}</span></td>
                                  <td className="px-3 py-2.5 font-medium">{file.fileName}</td>
                                  <td className="px-3 py-2.5 font-mono text-slate-500">{formatFileSize(file.fileSize)}</td>
                                  <td className="px-3 py-2.5 font-mono text-slate-500">{file.uploadTime}</td>
                                  <td className="px-3 py-2.5 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                      <button onClick={() => setPreviewFile({file, version: ver})} className="text-blue-600 hover:text-blue-700 font-medium">预览</button>
                                      <button className="text-slate-600 hover:text-slate-800 font-medium">下载</button>
                                      {!isPublished && !isObsolete && onDeleteFileFromVersion && (
                                        <button onClick={() => onDeleteFileFromVersion(currentMaster.drawingNo, ver.id, file.id, file.fileName, file.fileType)} className="text-rose-600 hover:text-rose-700 font-medium">删除</button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )) : (
                                <tr>
                                  <td colSpan={6} className="px-3 py-6 text-center text-slate-400 italic">
                                    该版本暂无图纸文件{!isObsolete && !isPublished && !isPending ? '，请点击上方“上传图纸”添加。' : '。'}
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* 日志列表 */}
                    {currentTab === 'logs' && (
                      <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                        <table className="w-full text-left text-xs whitespace-nowrap">
                          <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                            <tr>
                              <th className="px-3 py-2">操作时间</th>
                              <th className="px-3 py-2">操作人</th>
                              <th className="px-3 py-2">动作类型</th>
                              <th className="px-3 py-2 w-full">日志详情</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {ver.logs && ver.logs.length > 0 ? ver.logs.map((log) => (
                              <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <td className="px-3 py-2.5 font-mono text-slate-500">{log.timestamp}</td>
                                <td className="px-3 py-2.5">{log.operator}</td>
                                <td className="px-3 py-2.5 font-medium">{log.actionType}</td>
                                <td className="px-3 py-2.5 text-slate-600">{log.details}</td>
                              </tr>
                            )) : (
                              <tr>
                                <td colSpan={4} className="px-3 py-6 text-center text-slate-400 italic">暂无操作日志</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 上传模态框 */}
      {uploadModalVersion && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-bold flex items-center gap-2"><Upload className="w-4 h-4 text-blue-600" /> 上传图纸文件</h3>
            </div>
            <form onSubmit={handleUploadFile} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">图纸格式:</label>
                <select value={newFormatType} onChange={e => setNewFormatType(e.target.value as FileType)} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm">
                  <option value="STEP">STEP (三维实体)</option>
                  <option value="DWG">DWG (二维工程图)</option>
                  <option value="PDF">PDF (签署归档图)</option>
                  <option value="DXF">DXF (二维交换格式)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">文件名:</label>
                <input type="text" value={newFileName} onChange={e => setNewFileName(e.target.value)} placeholder="留空则自动生成" className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setUploadModalVersion(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
                <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-500">上传</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 预览模态框 */}
      {previewFile && (
        <DrawingPreviewModal
          file={previewFile.file}
          version={previewFile.version}
          materialName={currentMaterial?.materialName}
          materialSpec={currentMaterial?.materialSpec}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
};
"""

with open("src/components/DrawingVersionsView.tsx", "w") as f:
    f.write(code)

