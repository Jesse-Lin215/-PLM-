import React, { useState, useMemo } from 'react';
import { Material, DrawingMaster, ImportCandidate, DrawingFile, FileType, BOM } from '../types/plm';
import { parseDrawingFileName, formatFileSize, getFileTypeBadge } from '../utils/plmHelpers';
import { MOCK_SAMPLE_IMPORT_FILES } from '../data/mockData';
import {
  UploadCloud,
  FileCheck,
  AlertTriangle,
  FileX2,
  CheckCircle2,
  GitBranch,
  CopyCheck,
  Layers,
  ArrowRight,
  Info,
  Trash2,
  Sparkles,
  Link2,
} from 'lucide-react';

interface DrawingImportViewProps {
  materials: Material[];
  drawingMasters: DrawingMaster[];
  boms?: BOM[];
  onCommitImport: (candidates: ImportCandidate[]) => void;
  onNavigateToDrawings: () => void;
}

export const DrawingImportView: React.FC<DrawingImportViewProps> = ({
  materials,
  drawingMasters,
  boms = [],
  onCommitImport,
  onNavigateToDrawings,
}) => {
  const [candidates, setCandidates] = useState<ImportCandidate[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'MATCHED' | 'NEEDS_CONFIRM' | 'DUPLICATE'>('ALL');
  const [importSuccessBanner, setImportSuccessBanner] = useState<string | null>(null);
  const [syncMode, setSyncMode] = useState<'NEW_BOM' | 'APPEND_VERSION' | 'OVERWRITE_VERSION'>('APPEND_VERSION');
  const [selectedDraftBOMId, setSelectedDraftBOMId] = useState<string>('BOM-DEMO-DRAFT-01');

  // 为演示目的自动注入并补全草稿状态的模拟 BOM 与图号版本数据
  const enrichedDraftBoms = useMemo(() => {
    const list = [...boms];
    // 确保存在至少一个草稿状态的演示 BOM
    if (!list.some(b => b.id === 'BOM-DEMO-DRAFT-01')) {
      list.unshift({
        id: 'BOM-DEMO-DRAFT-01',
        bomCode: 'BOM202609079999',
        productCode: 'CD-09999',
        productName: '智能六轴协同自动化产线机组 (草稿演示)',
        specName: 'HY-LINE-V2.5-DRAFT',
        unit: '台',
        status: 'DRAFT',
        versionNo: 'V2',
        mechanicalOwner: '王工 (结构)',
        electricalOwner: '赵工 (电气)',
        remark: '用于一键同步追加与覆盖演示的草稿 BOM',
        createdAt: '2026-09-06 10:00:00',
        updatedAt: '2026-09-07 08:00:00',
        updatedBy: '系统管理员',
        items: [
          {
            id: 'bi-1',
            itemNo: 1,
            materialCode: 'M1001-ELC',
            materialName: '电气安装盒',
            materialSpec: 'G14',
            quantity: 2,
            unit: 'PCS',
            drawingNo: 'X0610-C004-G14',
            drawingVersion: 'V1',
          },
          {
            id: 'bi-2',
            itemNo: 2,
            materialCode: 'M1002-DRV',
            materialName: '工业级伺服驱动器',
            materialSpec: 'SV-200',
            quantity: 4,
            unit: '台',
            drawingNo: 'DRV-8820-SV200',
            drawingVersion: 'V1',
          },
        ],
        versions: [
          {
            id: 'VER-DEMO-1',
            versionNo: 'V1',
            status: 'PUBLISHED',
            creator: '李总监',
            updateTime: '2026-09-01 09:00:00',
            isDefault: false,
            itemsCount: 2,
            notes: '历史基准审批版本',
          },
          {
            id: 'VER-DEMO-2',
            versionNo: 'V2',
            status: 'DRAFT',
            creator: '王工',
            updateTime: '2026-09-07 08:00:00',
            isDefault: true,
            itemsCount: 2,
            notes: '当前用于同步追加与覆盖测试的草稿版本',
          },
        ]
      });
    }
    return list;
  }, [boms]);

  // 仅保留含有 DRAFT (草稿) 状态版本的产品 BOM
  const draftBoms = useMemo(() => {
    return enrichedDraftBoms
      .map(b => {
        const versions = b.versions && b.versions.length > 0
          ? b.versions.filter(v => v.status === 'DRAFT')
          : (b.status === 'DRAFT' ? [{ id: `v-${b.id}`, versionNo: b.versionNo, status: 'DRAFT', isDefault: true, creator: b.updatedBy, updateTime: b.updatedAt }] : []);
        return {
          ...b,
          draftVersions: versions
        };
      })
      .filter(b => b.draftVersions.length > 0 || b.status === 'DRAFT');
  }, [enrichedDraftBoms]);

  // 为每个导入的明细行提供图号版本操作状态管理（默认追加草稿或新建版本）
  const [rowStrategies, setRowStrategies] = useState<Record<string, { mode: 'APPEND_VER' | 'NEW_VER' | 'OVERWRITE'; targetVer: string; carryOverFiles: boolean }>>({});

  // 解析并生成待导入项队列
  const processFiles = (fileList: Array<{ name: string; size: number; hash?: string; fileType?: FileType }>) => {
    setIsProcessing(true);

    setTimeout(() => {
      const newCandidates: ImportCandidate[] = fileList.map((file, idx) => {
        const parsed = parseDrawingFileName(file.name);
        const fileHash = file.hash || `sha256:${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
        const id = `IMP-${Date.now()}-${idx}`;

        if (!parsed.isValid) {
          return {
            id,
            rawFileName: file.name,
            fileSize: file.size,
            fileHash,
            parsedName: '',
            parsedSpec: '',
            parsedFileType: (parsed.fileType as FileType) || 'PDF',
            matchStatus: 'PARSE_ERROR',
            hasExistingDraft: false,
            resolutionAction: 'MANUAL_BIND',
            errorMessage: parsed.errorMessage || '文件名解析失败',
            selected: false,
          };
        }

        // 3.3 规则：检查是否存在完全相同 Hash 的文件
        let isDuplicateHash = false;
        for (const master of drawingMasters) {
          for (const ver of master.versions) {
            if (ver.files.some(f => f.fileHash === fileHash)) {
              isDuplicateHash = true;
              break;
            }
          }
          if (isDuplicateHash) break;
        }

        if (isDuplicateHash) {
          return {
            id,
            rawFileName: file.name,
            fileSize: file.size,
            fileHash,
            parsedName: parsed.materialName || '',
            parsedSpec: parsed.materialSpec || '',
            parsedDrawingNo: parsed.drawingNo,
            parsedFileType: parsed.fileType!,
            matchStatus: 'DUPLICATE_HASH',
            hasExistingDraft: false,
            resolutionAction: 'SKIP_DUPLICATE',
            errorMessage: '系统检测到完全相同 Hash 的图纸已存在，自动去重拦截',
            selected: false,
          };
        }

        // 尝试匹配已有物料主数据 (按 物料名称 + 规格型号)
        const matchedMat = materials.find(
          m =>
            m.materialName.trim() === parsed.materialName?.trim() &&
            m.materialSpec.trim() === parsed.materialSpec?.trim()
        );

        if (!matchedMat) {
          return {
            id,
            rawFileName: file.name,
            fileSize: file.size,
            fileHash,
            parsedName: parsed.materialName || '',
            parsedSpec: parsed.materialSpec || '',
            parsedDrawingNo: parsed.drawingNo,
            parsedFileType: parsed.fileType!,
            matchStatus: 'UNMATCHED',
            hasExistingDraft: false,
            resolutionAction: 'MANUAL_BIND',
            errorMessage: `未找到物料: "${parsed.materialName}" [${parsed.materialSpec}]，需人工指定物料`,
            selected: false,
          };
        }

        // 检查该物料是否已有图号主档
        const master = drawingMasters.find(
          d => d.materialId === matchedMat.id || d.drawingNo === (matchedMat.drawingNo || parsed.drawingNo)
        );

        const existingDraft = master?.versions.find(v => v.status === 'DRAFT');

        let resolutionAction: ImportCandidate['resolutionAction'] = 'NEW_DRAFT_NEXT_VER';
        if (!master) {
          resolutionAction = 'CREATE_MASTER_AND_DRAFT_V1';
        } else if (existingDraft) {
          // 同一图号已有未发布草稿
          resolutionAction = 'MERGE_TO_EXISTING_DRAFT';
        } else {
          resolutionAction = 'NEW_DRAFT_NEXT_VER';
        }

        return {
          id,
          rawFileName: file.name,
          fileSize: file.size,
          fileHash,
          parsedName: parsed.materialName || '',
          parsedSpec: parsed.materialSpec || '',
          parsedDrawingNo: parsed.drawingNo || master?.drawingNo,
          parsedFileType: parsed.fileType!,
          matchStatus: 'MATCHED',
          matchedMaterialId: matchedMat.id,
          matchedMaterialCode: matchedMat.materialCode,
          matchedMaterialName: matchedMat.materialName,
          matchedMaterialSpec: matchedMat.materialSpec,
          matchedDrawingNo: master?.drawingNo || parsed.drawingNo,
          existingDraftVersionId: existingDraft?.id,
          hasExistingDraft: !!existingDraft,
          resolutionAction,
          selected: true,
        };
      });

      setCandidates(prev => [...prev, ...newCandidates]);
      setIsProcessing(false);
    }, 400);
  };

  const handleLoadSampleFiles = () => {
    processFiles(
      MOCK_SAMPLE_IMPORT_FILES.map(f => ({
        name: f.fileName,
        size: f.size,
        hash: f.hash,
        fileType: f.type,
      }))
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files).map((f: File) => ({
        name: f.name,
        size: f.size,
      }));
      processFiles(files);
      e.target.value = '';
    }
  };

  const handleManualBindMaterial = (candidateId: string, materialId: string) => {
    const selectedMat = materials.find(m => m.id === materialId);
    if (!selectedMat) return;

    setCandidates(prev =>
      prev.map(c => {
        if (c.id !== candidateId) return c;
        const master = drawingMasters.find(d => d.materialId === selectedMat.id);
        const existingDraft = master?.versions.find(v => v.status === 'DRAFT');

        let resolutionAction: ImportCandidate['resolutionAction'] = 'NEW_DRAFT_NEXT_VER';
        if (!master) {
          resolutionAction = 'CREATE_MASTER_AND_DRAFT_V1';
        } else if (existingDraft) {
          resolutionAction = 'MERGE_TO_EXISTING_DRAFT';
        }

        return {
          ...c,
          matchStatus: 'MATCHED',
          matchedMaterialId: selectedMat.id,
          matchedMaterialCode: selectedMat.materialCode,
          matchedMaterialName: selectedMat.materialName,
          matchedMaterialSpec: selectedMat.materialSpec,
          matchedDrawingNo: master?.drawingNo || c.parsedDrawingNo,
          hasExistingDraft: !!existingDraft,
          existingDraftVersionId: existingDraft?.id,
          resolutionAction,
          errorMessage: undefined,
          selected: true,
        };
      })
    );
  };

  const handleToggleSelect = (id: string) => {
    setCandidates(prev =>
      prev.map(c => (c.id === id ? { ...c, selected: !c.selected } : c))
    );
  };

  const handleRemoveCandidate = (id: string) => {
    setCandidates(prev => prev.filter(c => c.id !== id));
  };

  const handleCommit = () => {
    const readyItems = candidates.filter(c => c.selected && c.matchStatus === 'MATCHED');
    if (readyItems.length === 0) {
      alert('请至少勾选一项已成功匹配物料的图纸！');
      return;
    }

    onCommitImport(readyItems);
    setImportSuccessBanner(`成功将 ${readyItems.length} 个图纸文件导入并生成图号草稿版本！`);
    setCandidates(prev => prev.filter(c => !c.selected || c.matchStatus !== 'MATCHED'));
  };

  const filteredCandidates = candidates.filter(c => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'MATCHED') return c.matchStatus === 'MATCHED';
    if (activeFilter === 'NEEDS_CONFIRM') return c.matchStatus === 'UNMATCHED' || c.matchStatus === 'PARSE_ERROR';
    if (activeFilter === 'DUPLICATE') return c.matchStatus === 'DUPLICATE_HASH';
    return true;
  });

  const matchedCount = candidates.filter(c => c.matchStatus === 'MATCHED').length;
  const needsConfirmCount = candidates.filter(c => c.matchStatus === 'UNMATCHED' || c.matchStatus === 'PARSE_ERROR').length;
  const duplicateCount = candidates.filter(c => c.matchStatus === 'DUPLICATE_HASH').length;

  return (
    <div className="space-y-6">
      {/* Overview & Rule Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-bold rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                CAD / PLM 一键同步中心
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">SolidWorks 3D/2D 与 BOM 一键同步向导</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-4xl">
              系统智能解析文件名与 CAD 结构树，支持针对 BOM 与物料图号版本的<strong>新增、追加、覆盖</strong>，并严格执行质量生命周期治理（已审批/已下发版本禁止直接修改，须经 ECN 变更单审批）。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleLoadSampleFiles}
              className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              测试同步
            </button>
          </div>
        </div>

        {/* Sync Strategy and Lifecycle Rule Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="font-semibold text-slate-700 dark:text-slate-300 shrink-0">BOM 同步策略:</span>
            <select
              value={syncMode}
              onChange={e => setSyncMode(e.target.value as any)}
              className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium px-2 py-1 rounded border border-slate-300 dark:border-slate-700 text-xs focus:outline-none"
            >
              <option value="APPEND_VERSION">追加版本 (在现有草稿BOM下追加变更)</option>
              <option value="NEW_BOM">新增BOM (创建全新草稿BOM与图号档案)</option>
              <option value="OVERWRITE_VERSION">覆盖版本 (更新当前草稿BOM结构与文件)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-amber-50/70 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800/80 text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
            <span className="text-[11px] leading-tight">
              <strong>治理提示：</strong>已审批/已下发状态禁止直接变更，须走 ECN。当前策略: <strong>{syncMode === 'NEW_BOM' ? '新增BOM' : syncMode === 'APPEND_VERSION' ? '追加版本' : '覆盖版本'}</strong>
            </span>
          </div>
        </div>

        {/* 目标草稿 BOM 对象选择 (严格限定只能选中草稿状态 DRAFT) */}
        {(syncMode === 'APPEND_VERSION' || syncMode === 'OVERWRITE_VERSION') && (
          <div className="bg-blue-50/50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200 font-medium">
              <Layers className="w-4 h-4 text-blue-600 shrink-0" />
              <span>选择目标草稿状态的产品 BOM 与版本:</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedDraftBOMId}
                onChange={e => setSelectedDraftBOMId(e.target.value)}
                className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium px-3 py-1.5 rounded border border-blue-300 dark:border-blue-700 text-xs w-full sm:w-96 focus:outline-none"
              >
                <option value="">-- 请选择草稿状态的产品 BOM --</option>
                {draftBoms.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.bomCode} · {b.productName} ({b.productCode}) [草稿版本: {b.draftVersions.map(v => v.versionNo).join(', ') || b.versionNo}]
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold shrink-0 bg-emerald-50 dark:bg-emerald-950 px-2 py-1 rounded">
                🔒 仅限 DRAFT 草稿
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Success Notification Banner */}
      {importSuccessBanner && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded-xl p-4 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-200 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{importSuccessBanner}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateToDrawings}
              className="px-3 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors cursor-pointer"
            >
              前往版本中心审核 ➔
            </button>
            <button
              onClick={() => setImportSuccessBanner(null)}
              className="text-emerald-700 dark:text-emerald-300 text-xs hover:underline cursor-pointer"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {/* Naming Specification Cheat-sheet */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-xs space-y-2">
          <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            推荐文件命名格式 (精准建档)
          </div>
          <div className="font-mono bg-white dark:bg-slate-900 p-2.5 rounded border border-slate-200 dark:border-slate-800 text-blue-600 dark:text-blue-400 select-all">
            物料名称_规格型号_图号_文件类型.ext
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            示例: <code className="text-slate-700 dark:text-slate-300">电气安装盒_G14_X0610-C004-G14_PDF.pdf</code>
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-xs space-y-2">
          <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-indigo-500" />
            最低文件命名格式 (自动匹配物料)
          </div>
          <div className="font-mono bg-white dark:bg-slate-900 p-2.5 rounded border border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 select-all">
            物料名称_规格型号_文件类型.ext
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            示例: <code className="text-slate-700 dark:text-slate-300">绝缘密封橡胶垫圈_EPDM-50_PDF.pdf</code>
          </p>
        </div>
      </div>

      {/* Upload & Parser Stage */}
      {candidates.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
            <UploadCloud className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">暂无待处理导入文件</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            点击上方按钮上传图纸文件，或载入典型测试图纸包，系统将自动进行物料匹配、Hash去重与草稿规划。
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Status Tabs Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
              <button
                onClick={() => setActiveFilter('ALL')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  activeFilter === 'ALL'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                全部解析项 ({candidates.length})
              </button>

              <button
                onClick={() => setActiveFilter('MATCHED')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeFilter === 'MATCHED'
                    ? 'bg-emerald-600 text-white'
                    : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                }`}
              >
                <FileCheck className="w-3.5 h-3.5" />
                匹配成功可生成 ({matchedCount})
              </button>

              {needsConfirmCount > 0 && (
                <button
                  onClick={() => setActiveFilter('NEEDS_CONFIRM')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeFilter === 'NEEDS_CONFIRM'
                      ? 'bg-amber-600 text-white'
                      : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  待确认异常区 ({needsConfirmCount})
                </button>
              )}

              {duplicateCount > 0 && (
                <button
                  onClick={() => setActiveFilter('DUPLICATE')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeFilter === 'DUPLICATE'
                      ? 'bg-rose-600 text-white'
                      : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                  }`}
                >
                  <CopyCheck className="w-3.5 h-3.5" />
                  Hash重复拦截 ({duplicateCount})
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={() => setCandidates([])}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                清空队列
              </button>

              <button
                onClick={handleCommit}
                disabled={matchedCount === 0}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-colors ${
                  matchedCount > 0
                    ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer'
                    : 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'
                }`}
              >
                <span>确认并生成草稿版本 ({candidates.filter(c => c.selected && c.matchStatus === 'MATCHED').length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Import Candidates Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={candidates.length > 0 && candidates.every(c => c.selected || c.matchStatus !== 'MATCHED')}
                        onChange={e => {
                          const checked = e.target.checked;
                          setCandidates(prev =>
                            prev.map(c => (c.matchStatus === 'MATCHED' ? { ...c, selected: checked } : c))
                          );
                        }}
                        className="rounded border-slate-300 text-blue-600 focus:ring-0"
                      />
                    </th>
                    <th className="py-3 px-4">原始文件名 / 大小</th>
                    <th className="py-3 px-4">解析结果 (物料/规格/类型)</th>
                    <th className="py-3 px-4">物料主数据匹配状态</th>
                    <th className="py-3 px-4">系统规划动作</th>
                    <th className="py-3 px-4 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredCandidates.map(c => {
                    const typeBadge = getFileTypeBadge(c.parsedFileType);

                    return (
                      <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            disabled={c.matchStatus !== 'MATCHED'}
                            checked={c.selected}
                            onChange={() => handleToggleSelect(c.id)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-0 disabled:opacity-30"
                          />
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-mono text-slate-900 dark:text-white font-medium break-all max-w-xs">
                            {c.rawFileName}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>{formatFileSize(c.fileSize)}</span>
                            <span className="font-mono truncate max-w-[120px]" title={c.fileHash}>
                              {c.fileHash.slice(0, 16)}...
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {c.parsedName ? (
                            <div className="space-y-0.5">
                              <div className="font-medium text-slate-800 dark:text-slate-200">
                                {c.parsedName}
                                <span className="ml-1 text-slate-500 font-mono">[{c.parsedSpec}]</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className={`px-1.5 py-0.2 text-[10px] rounded border font-medium ${typeBadge.color}`}>
                                  {typeBadge.short}
                                </span>
                                {c.parsedDrawingNo && (
                                  <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400">
                                    图号: {c.parsedDrawingNo}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-red-500 font-mono text-[11px] flex items-center gap-1">
                              <FileX2 className="w-3.5 h-3.5" />
                              无法解析命名结构
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="space-y-1.5">
                            {c.matchStatus === 'MATCHED' && (
                              <div className="flex items-center justify-between gap-2 bg-emerald-50/70 dark:bg-emerald-950/40 p-2 rounded border border-emerald-200 dark:border-emerald-800">
                                <div>
                                  <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-semibold text-xs">
                                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                    <span>已绑定: {c.matchedMaterialName} [{c.matchedMaterialSpec}]</span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                    编码: {c.matchedMaterialCode} | 图号: {c.matchedDrawingNo || '自动生成'}
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    setCandidates(prev =>
                                      prev.map(item =>
                                        item.id === c.id
                                          ? {
                                              ...item,
                                              matchStatus: 'UNMATCHED',
                                              matchedMaterialId: undefined,
                                              matchedMaterialCode: undefined,
                                              matchedMaterialName: undefined,
                                              matchedMaterialSpec: undefined,
                                              matchedDrawingNo: undefined,
                                            }
                                          : item
                                      )
                                    );
                                  }}
                                  className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline px-1.5 py-0.5 bg-white dark:bg-slate-900 rounded border border-blue-200 dark:border-blue-800 shrink-0 cursor-pointer"
                                  title="重新选择物料"
                                >
                                  重新选择
                                </button>
                              </div>
                            )}

                            {(c.matchStatus === 'UNMATCHED' || !c.matchedMaterialId) && (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium text-xs">
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                  <span>请为图纸指定物料主数据</span>
                                </div>
                                <select
                                  onChange={e => {
                                    if (e.target.value) handleManualBindMaterial(c.id, e.target.value);
                                  }}
                                  defaultValue=""
                                  className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 w-full focus:outline-none shadow-xs"
                                >
                                  <option value="" disabled>-- 请选择物料档案 --</option>
                                  {materials.map(m => (
                                    <option key={m.id} value={m.id}>
                                      {m.materialName} [{m.materialSpec}] - 编码: {m.materialCode}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {/* 版本操作目标选择 (仅限草稿状态 DRAFT 进行追加/覆盖或新建版本) */}
                            {c.matchStatus === 'MATCHED' && (() => {
                              const master = drawingMasters.find(
                                d => d.drawingNo === c.matchedDrawingNo || d.materialId === c.matchedMaterialId
                              );
                              const draftVersions = master ? master.versions.filter(v => v.status === 'DRAFT') : [];

                              return (
                                <div className="space-y-1.5 pt-1.5 border-t border-emerald-200/60 dark:border-emerald-900/60 text-[11px]">
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-500 dark:text-slate-400 shrink-0 font-medium">版本策略:</span>
                                    <select
                                      value={c.resolutionAction}
                                      onChange={e => {
                                        const val = e.target.value as any;
                                        setCandidates(prev =>
                                          prev.map(item => (item.id === c.id ? { ...item, resolutionAction: val } : item))
                                        );
                                      }}
                                      className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium px-2 py-1 rounded border border-slate-300 dark:border-slate-700 text-[11px] w-full focus:outline-none"
                                    >
                                      <option value="MERGE_TO_EXISTING_DRAFT">追加至指定草稿版本 (DRAFT)</option>
                                      <option value="OVERWRITE_CURRENT_DRAFT">覆盖指定草稿版本文件 (DRAFT)</option>
                                      <option value="NEW_DRAFT_NEXT_VER">新建下一版草稿 (引用/继承历史图纸)</option>
                                      <option value="CREATE_MASTER_AND_DRAFT_V1">新增版本 (创建全新图号或V1草稿)</option>
                                    </select>
                                  </div>

                                  {(c.resolutionAction === 'MERGE_TO_EXISTING_DRAFT' || c.resolutionAction === 'OVERWRITE_CURRENT_DRAFT' || c.resolutionAction === 'NEW_DRAFT_NEXT_VER') && (
                                    <div className="flex items-center gap-2 pl-1">
                                      <span className="text-slate-400 shrink-0 text-[10px]">目标草稿:</span>
                                      <select
                                        value={c.targetDraftVersionId || draftVersions[0]?.id || ''}
                                        onChange={e => {
                                          const val = e.target.value;
                                          setCandidates(prev =>
                                            prev.map(item => (item.id === c.id ? { ...item, targetDraftVersionId: val } : item))
                                          );
                                        }}
                                        className="bg-blue-50/70 dark:bg-blue-950/50 text-blue-800 dark:text-blue-200 font-medium px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 text-[10px] w-full focus:outline-none"
                                      >
                                        {draftVersions.length > 0 ? (
                                          draftVersions.map(v => (
                                            <option key={v.id} value={v.id}>
                                              版本 {v.versionNo} [草稿状态] ({v.notes || '无变更说明'})
                                            </option>
                                          ))
                                        ) : (
                                          <option value="">-- 该图号暂无草稿版本，将自动新建 --</option>
                                        )}
                                      </select>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {c.resolutionAction === 'CREATE_MASTER_AND_DRAFT_V1' && (
                            <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800 text-[11px] font-medium">
                              <GitBranch className="w-3.5 h-3.5 text-blue-500" />
                              <span>新建图号主档 + 创建首版草稿 V1</span>
                            </div>
                          )}

                          {c.resolutionAction === 'MERGE_TO_EXISTING_DRAFT' && (
                            <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800 text-[11px] font-medium">
                              <Layers className="w-3.5 h-3.5 text-indigo-500" />
                              <span>合并收纳至已有草稿版本</span>
                            </div>
                          )}

                          {c.resolutionAction === 'NEW_DRAFT_NEXT_VER' && (
                            <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 text-[11px] font-medium">
                              <GitBranch className="w-3.5 h-3.5 text-emerald-500" />
                              <span>自动创建下一版草稿</span>
                            </div>
                          )}

                          {c.resolutionAction === 'SKIP_DUPLICATE' && (
                            <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 text-[11px]">
                              已拦截，跳过导入
                            </span>
                          )}

                          {c.resolutionAction === 'MANUAL_BIND' && (
                            <span className="text-slate-400 italic">待人工确认绑定</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleRemoveCandidate(c.id)}
                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded transition-colors cursor-pointer"
                            title="从队列中移除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
