import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Material, DrawingMaster, BOM, DrawingVersion, DrawingFile, VersionStatus } from '../types/plm';
import { MaterialCreateForm } from './MaterialCreateForm';
import {
  Plus,
  Search,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronsDown,
  ChevronsUp,
  Columns,
  AlignJustify,
  PanelLeftClose,
  PanelLeftOpen,
  FolderTree,
  Upload,
  Layers,
  FileCheck2,
  Check,
  ExternalLink,
  MoreVertical,
  X,
  Trash2,
  AlertTriangle,
  Eye,
  Download,
  FileText,
  FolderArchive,
  Box,
  FileUp,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Table,
  CheckSquare,
  ShieldCheck,
  ArrowRight,
  Info
} from 'lucide-react';

interface MaterialsViewProps {
  isNoVersionMode?: boolean;
  materials: Material[];
  drawingMasters: DrawingMaster[];
  boms?: BOM[];
  onAddMaterial: (
    material: Omit<Material, 'id' | 'createdAt' | 'updatedAt' | 'hasDrawing'>,
    drawingData?: {
      drawingNo: string;
      versionNo: string;
      status: 'PUBLISHED' | 'DRAFT';
      isActive: boolean;
      changeDesc?: string;
      files?: { fileName: string; fileType: string; fileSize: number }[];
    }
  ) => void;
  onUpdateMaterial?: (
    material: Material,
    drawingData?: {
      drawingNo: string;
      versionNo: string;
      status: 'PUBLISHED' | 'DRAFT';
      isActive: boolean;
      changeDesc?: string;
      files?: { fileName: string; fileType: string; fileSize: number }[];
    }
  ) => void;
  onDeleteMaterial?: (id: string) => void;
  onBatchImportMaterials: (items: Array<Omit<Material, 'id' | 'createdAt' | 'updatedAt' | 'hasDrawing'>>) => void;
  onSelectDrawing: (drawingNo: string) => void;
  onNavigateToImport: () => void;
  // Drawing version & file operations
  onUpdateVersionStatus?: (drawingNo: string, versionId: string, newStatus: VersionStatus, extraData?: Partial<DrawingVersion>) => void;
  onToggleVersionActive?: (drawingNo: string, versionId: string, isActive: boolean) => void;
  onSetDefaultVersion?: (drawingNo: string, versionId: string) => void;
  onCreateDrawingMaster?: (materialId: string, drawingNo: string, notes?: string) => void;
  onUpdateDrawingNo?: (oldDrawingNo: string, newDrawingNo: string) => void;
  onCreateNewDraftVersion?: (drawingNo: string, baseVersionNo?: string) => void;
  onUpdateDraftVersionNo?: (drawingNo: string, versionId: string, newVersionNo: string) => void;
  onDeleteDraftVersion?: (drawingNo: string, versionId: string) => void;
  onDeleteDrawingMaster?: (drawingNo: string) => void;
  onAddFileToDraft?: (drawingNo: string, versionId: string, file: DrawingFile) => void;
  onDeleteFileFromVersion?: (drawingNo: string, versionId: string, fileId: string, fileName: string, fileType: string) => void;
  onUpdateVersionInfo?: (drawingNo: string, versionId: string, updateData: { versionNo?: string; notes?: string; changeDesc?: string }) => void;
  onUpdateFileInVersion?: (drawingNo: string, versionId: string, fileId: string, updatedFile: Partial<DrawingFile>) => void;
}

// 分类树结构定义（与截图完全一致）
interface CategoryNode {
  id: string;
  name: string;
  count?: number;
  children?: { id: string; name: string; count?: number }[];
}

const CATEGORY_TREE_DATA: CategoryNode[] = [
  {
    id: 'mech_std',
    name: '机械标准件',
    children: [
      { id: 'mech_motor', name: '电机类(包含行星减速机)' },
      { id: 'mech_bearing', name: '轴承类' },
      { id: 'mech_cylinder', name: '气缸类' },
      { id: 'mech_nozzle', name: '气嘴及气动配件类' },
      { id: 'mech_belt', name: '皮带类（皮带同步带等）' },
      { id: 'mech_hardware', name: '五金类' },
      { id: 'mech_misc', name: '杂项类（耗材及工具）' },
      { id: 'mech_std_machining', name: '标准加工类' },
    ],
  },
  {
    id: 'elec_std',
    name: '电气标准件',
    children: [
      { id: 'elec_touch', name: '触摸屏' },
      { id: 'elec_wire', name: '电线类' },
      { id: 'elec_dc', name: '直流源类' },
      { id: 'elec_sensor', name: '感应器' },
      { id: 'elec_relay', name: '继电器' },
      { id: 'elec_switch', name: '开关按钮' },
      { id: 'elec_plc', name: 'PLC类' },
      { id: 'elec_vision', name: '视觉类' },
      { id: 'elec_other', name: '其他' },
    ],
  },
  {
    id: 'raw_mat',
    name: '机加原材料',
    children: [
      { id: 'raw_ss', name: '不锈钢' },
      { id: 'raw_hex', name: '6方轴' },
      { id: 'raw_al', name: '铝板' },
    ],
  },
  {
    id: 'struct_mat',
    name: '结构件/外壳',
  },
  {
    id: 'semi_prod',
    name: '半成品',
  },
  {
    id: 'high_end',
    name: '成品机器高端',
  },
  {
    id: 'parts_mod',
    name: '配件或改造',
  },
];

export const MaterialsView: React.FC<MaterialsViewProps> = ({
  isNoVersionMode = false,
  materials,
  drawingMasters,
  boms = [],
  onAddMaterial,
  onUpdateMaterial,
  onDeleteMaterial,
  onBatchImportMaterials,
  onSelectDrawing,
  onNavigateToImport,
  onUpdateVersionStatus,
  onToggleVersionActive,
  onSetDefaultVersion,
  onCreateDrawingMaster,
  onUpdateDrawingNo,
  onCreateNewDraftVersion,
  onUpdateDraftVersionNo,
  onDeleteDraftVersion,
  onDeleteDrawingMaster,
  onAddFileToDraft,
  onDeleteFileFromVersion,
  onUpdateVersionInfo,
  onUpdateFileInVersion,
}) => {
  // 左侧物料分类收纳栏折叠状态（默认收起）
  const [isCategorySidebarOpen, setIsCategorySidebarOpen] = useState(false);
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // 当前选中的分类
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // 顶部启用状态 Tab: 'ALL' | 'ACTIVE' | 'DISABLED'
  const [activeStatusTab, setActiveStatusTab] = useState<'ALL' | 'ACTIVE' | 'DISABLED'>('ALL');

  // 搜索关键字
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  // 选中行管理
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({});

  // 弹窗与详情状态
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedMaterialForDetail, setSelectedMaterialForDetail] = useState<Material | null>(null);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isBatchImportModalOpen, setIsBatchImportModalOpen] = useState(false);
  const [isBatchMenuOpen, setIsBatchMenuOpen] = useState(false);
  const [previewDrawing, setPreviewDrawing] = useState<{
    material: Material;
    drawing: DrawingMaster | null;
    files: { fileName: string; fileType: string; fileSize?: number; fileHash?: string; uploadTime?: string; uploader?: string }[];
  } | null>(null);

  // 批量导入功能状态
  interface BatchImportMaterialItem {
    id: string;
    materialCode: string;
    materialName: string;
    materialSpec: string;
    category: string;
    unit: string;
    drawingNo?: string;
    status: 'ACTIVE' | 'DISABLED';
    remarks?: string;
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }

  const [importStep, setImportStep] = useState<1 | 2 | 3>(1);
  const [importMode, setImportMode] = useState<'APPEND' | 'OVERWRITE'>('APPEND');
  const [uploadedImportFile, setUploadedImportFile] = useState<{ name: string; size: number } | null>(null);
  const [importItems, setImportItems] = useState<BatchImportMaterialItem[]>([]);
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 验证导入项列表
  const validateItems = (rawList: Omit<BatchImportMaterialItem, 'isValid' | 'errors' | 'warnings'>[]): BatchImportMaterialItem[] => {
    const existingCodes = new Set(materials.map(m => m.materialCode.trim().toLowerCase()));
    const seenCodesInBatch = new Set<string>();

    return rawList.map((item, idx) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      const codeTrimmed = (item.materialCode || '').trim();
      const codeLower = codeTrimmed.toLowerCase();

      // 1. 必填字段校验
      if (!codeTrimmed) {
        errors.push('缺少物料编码 (必填)');
      }
      if (!(item.materialName || '').trim()) {
        errors.push('缺少物料名称 (必填)');
      }
      if (!(item.category || '').trim()) {
        errors.push('缺少所属分类 (必填)');
      }
      if (!(item.unit || '').trim()) {
        warnings.push('未指定单位 (默认 PCS)');
      }

      // 2. 唯一性校验
      if (codeTrimmed) {
        if (importMode === 'APPEND' && existingCodes.has(codeLower)) {
          errors.push(`物料编码「${codeTrimmed}」在系统中已存在 (唯一性冲突)`);
        }
        if (seenCodesInBatch.has(codeLower)) {
          errors.push(`导入清单中物料编码「${codeTrimmed}」重复`);
        } else {
          seenCodesInBatch.add(codeLower);
        }
      }

      return {
        ...item,
        unit: item.unit || 'PCS',
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    });
  };

  // 载入多场景测试物料包
  const handleLoadSampleImportItems = () => {
    const existingFirstCode = materials[0]?.materialCode || 'CD-10001';
    const sampleRaw = [
      {
        id: `IMP-TEST-1`,
        materialCode: `CD-SAMPLE-${Math.floor(1000 + Math.random() * 9000)}`,
        materialName: '1M单轨接驳输送台',
        materialSpec: 'HY-10CV460-V44.0',
        category: '半成品',
        unit: '台',
        drawingNo: `DRW-2026-CV460`,
        status: 'ACTIVE' as const,
        remarks: '通过规范校验，带绑定图号',
      },
      {
        id: `IMP-TEST-2`,
        materialCode: `CD-SAMPLE-${Math.floor(1000 + Math.random() * 9000)}`,
        materialName: '单轨高精密缓冲机',
        materialSpec: 'HY-BF460-V48.0',
        category: '半成品',
        unit: '台',
        drawingNo: `DRW-2026-BF480`,
        status: 'ACTIVE' as const,
        remarks: '标准单轨自动化缓冲设备',
      },
      {
        id: `IMP-TEST-3`,
        materialCode: existingFirstCode, // 制造冲突
        materialName: '冲突编码测试项 (现有编码)',
        materialSpec: 'SPEC-DUP-01',
        category: '标准件',
        unit: 'PCS',
        status: 'ACTIVE' as const,
        remarks: '【异常测试】触发物料编码唯一性冲突拦截',
      },
      {
        id: `IMP-TEST-4`,
        materialCode: `MAT-ERR-${Math.floor(100 + Math.random() * 900)}`,
        materialName: '', // 制造缺失
        materialSpec: 'SPEC-NONAME',
        category: '自制结构件',
        unit: 'PCS',
        status: 'ACTIVE' as const,
        remarks: '【异常测试】缺少物料名称，触发必填拦截',
      },
      {
        id: `IMP-TEST-5`,
        materialCode: `B-CAM-${Math.floor(1000 + Math.random() * 9000)}`,
        materialName: 'CCD工业对位相机视觉模组',
        materialSpec: 'VS-CAM-500W',
        category: '成品机器高端',
        unit: '套',
        drawingNo: `DRW-2026-CAM50`,
        status: 'ACTIVE' as const,
        remarks: '高端视觉检测与定位组件',
      },
    ];

    const validated = validateItems(sampleRaw);
    setUploadedImportFile({
      name: 'PLM_物料档案_多场景测试集_合规与异常.xlsx',
      size: 48200,
    });
    setImportItems(validated);
    setImportStep(2);
    showToast('已载入 5 条多场景测试物料数据 (含合规通过与异常拦截用例)！');
  };

  // 处理文件上传解析
  const handleFileUpload = (file: File) => {
    setUploadedImportFile({
      name: file.name,
      size: file.size,
    });
    setIsProcessingImport(true);

    setTimeout(() => {
      // 模拟解析 Excel / CSV 数据
      const parsedRaw = [
        {
          id: `IMP-${Date.now()}-1`,
          materialCode: `CD-EXC-${Math.floor(10000 + Math.random() * 90000)}`,
          materialName: file.name.replace(/\.[^/.]+$/, '') + '_主组件',
          materialSpec: 'STD-SPEC-2026',
          category: '自制结构件',
          unit: 'PCS',
          drawingNo: `DRW-AUTO-${Math.floor(1000 + Math.random() * 9000)}`,
          status: 'ACTIVE' as const,
          remarks: `来自导入文件: ${file.name}`,
        },
        {
          id: `IMP-${Date.now()}-2`,
          materialCode: `CD-EXC-${Math.floor(10000 + Math.random() * 90000)}`,
          materialName: '气动滑台安装背板',
          materialSpec: 'AL6061-T6-150x200',
          category: '钣金件',
          unit: '件',
          drawingNo: `DRW-AUTO-${Math.floor(1000 + Math.random() * 9000)}`,
          status: 'ACTIVE' as const,
          remarks: '阳极氧化表面处理',
        },
        {
          id: `IMP-${Date.now()}-3`,
          materialCode: `CD-EXC-${Math.floor(10000 + Math.random() * 90000)}`,
          materialName: '精密直线导轨总成',
          materialSpec: 'HGR20-800L-C',
          category: '标准件',
          unit: '套',
          status: 'ACTIVE' as const,
          remarks: '带预压双滑块',
        },
      ];

      const validated = validateItems(parsedRaw);
      setImportItems(validated);
      setIsProcessingImport(false);
      setImportStep(2);
      showToast(`成功解析文件 ${file.name}，共提取 ${validated.length} 条物料数据！`);
    }, 400);
  };

  // 一键自动修复异常项
  const handleAutoFixImportItems = () => {
    setImportItems(prev => {
      const fixed = prev.map((item, idx) => {
        let code = item.materialCode;
        let name = item.materialName;
        let category = item.category;

        if (!code || item.errors.some(e => e.includes('已存在') || e.includes('重复'))) {
          code = `CD-FIX-${Math.floor(10000 + Math.random() * 90000)}`;
        }
        if (!name) {
          name = `修复物料_${code}`;
        }
        if (!category) {
          category = '自制结构件';
        }

        return {
          ...item,
          materialCode: code,
          materialName: name,
          category,
          unit: item.unit || 'PCS',
        };
      });

      return validateItems(fixed);
    });

    showToast('已一键自动修复物料编码冲突与必填缺失项！');
  };

  // 剔除异常项
  const handleRemoveInvalidImportItems = () => {
    setImportItems(prev => prev.filter(item => item.isValid));
    showToast('已剔除全部校验未通过项！');
  };

  // 下载标准物料导入模板
  const handleDownloadTemplate = () => {
    const headers = '物料编码*,物料名称*,规格型号,所属分类*,计量单位*,关联图号,状态(ACTIVE/DISABLED),备注';
    const row1 = 'CD-10088,1M双轨接驳台,HY-20CV460-V44.0,半成品,台,DRW-2026-CV460,ACTIVE,示例标准单轨输送线';
    const row2 = 'M2001-SCR,内六角圆柱头螺钉,M5x16-SUS304,标准件,PCS,,ACTIVE,国标紧固件';
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, row1, row2].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'PLM_物料主数据批量导入标准模板.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('PLM 标准物料导入模板已开始下载！');
  };

  // 批量导出 CSV
  const handleBatchExport = () => {
    const selectedIds = Object.keys(selectedRowIds).filter(id => selectedRowIds[id]);
    const targetMaterials = selectedIds.length > 0
      ? materials.filter(m => selectedIds.includes(m.id))
      : filteredMaterials;

    const headers = ['物料编码', '物料名称', '规格型号', '物料分类', '单位', '绑定图号', '状态', '备注'];
    const rows = targetMaterials.map(m => [
      `"${m.materialCode || ''}"`,
      `"${m.materialName || ''}"`,
      `"${m.materialSpec || ''}"`,
      `"${m.category || ''}"`,
      `"${m.unit || ''}"`,
      `"${m.drawingNo || ''}"`,
      `"${(localStatuses[m.id] || m.status) === 'ACTIVE' ? '已启用' : '已停用'}"`,
      `"${m.remarks || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PLM_物料档案导出_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`已成功导出 ${targetMaterials.length} 条物料主数据！`);
  };

  // 批量启用/停用
  const handleBatchToggleStatus = (targetStatus: 'ACTIVE' | 'DISABLED') => {
    const selectedIds = Object.keys(selectedRowIds).filter(id => selectedRowIds[id]);
    if (selectedIds.length === 0) {
      showToast('请先在表格中勾选需要批量操作的物料！');
      return;
    }
    setLocalStatuses(prev => {
      const next = { ...prev };
      selectedIds.forEach(id => {
        next[id] = targetStatus;
      });
      return next;
    });
    showToast(`已成功将选中的 ${selectedIds.length} 项物料设置为【${targetStatus === 'ACTIVE' ? '已启用' : '已停用'}】！`);
  };

  // 确认执行导入
  const handleCommitBatchImport = () => {
    const validItems = importItems.filter(i => i.isValid);
    if (validItems.length === 0) {
      showToast('当前没有通过校验的有效物料，请先修复异常项或载入合规数据！');
      return;
    }

    const payload = validItems.map(item => ({
      materialCode: item.materialCode,
      materialName: item.materialName,
      materialSpec: item.materialSpec,
      category: item.category,
      unit: item.unit,
      drawingNo: item.drawingNo || undefined,
      status: item.status,
      remarks: item.remarks || '批量导入物料',
    }));

    onBatchImportMaterials(payload);
    setIsBatchImportModalOpen(false);
    setIsBatchModalOpen(false);
    setUploadedImportFile(null);
    setImportItems([]);
    setImportStep(1);
    showToast(`成功批量导入 ${validItems.length} 条物料档案，已入库并生成唯一 Material ID！`);
  };

  // 操作下拉菜单激活的行 ID
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // 表格密度与行高
  const [density, setDensity] = useState<'normal' | 'compact' | 'relaxed'>('normal');

  // 动态物料启用状态（支持在表格中切换）
  const [localStatuses, setLocalStatuses] = useState<Record<string, 'ACTIVE' | 'DISABLED'>>({});

  const getItemStatus = (mat: Material): 'ACTIVE' | 'DISABLED' => {
    return localStatuses[mat.id] || mat.status || 'ACTIVE';
  };

  const handleToggleStatus = (matId: string, currentStatus: 'ACTIVE' | 'DISABLED') => {
    setLocalStatuses(prev => ({
      ...prev,
      [matId]: currentStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE',
    }));
  };

  const handleCopyMaterial = (mat: Material) => {
    const newMaterialCode = `${mat.materialCode}-COPY`;
    onAddMaterial({
      materialCode: newMaterialCode,
      materialName: `${mat.materialName} (副本)`,
      materialSpec: mat.materialSpec,
      category: mat.category,
      unit: mat.unit,
      status: 'ACTIVE',
      remarks: mat.remarks ? `复制自 ${mat.materialCode}: ${mat.remarks}` : `复制自 ${mat.materialCode}`,
    });
  };

  // 删除确认模态框与 Toast 反馈状态
  interface DeleteTarget {
    type: 'single' | 'batch';
    id?: string;
    ids?: string[];
    code?: string;
    title?: string;
    count?: number;
  }
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleDeleteClick = (mat: Material) => {
    setDeleteTarget({
      type: 'single',
      id: mat.id,
      code: mat.materialCode,
      title: mat.materialName,
    });
  };

  const handleBatchDeleteClick = () => {
    const selectedIds = Object.keys(selectedRowIds).filter(id => selectedRowIds[id]);
    if (selectedIds.length === 0) return;
    setDeleteTarget({
      type: 'batch',
      ids: selectedIds,
      count: selectedIds.length,
    });
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'single' && deleteTarget.id) {
      if (onDeleteMaterial) {
        onDeleteMaterial(deleteTarget.id);
      }
      setSelectedRowIds(prev => {
        const next = { ...prev };
        delete next[deleteTarget.id!];
        return next;
      });
      showToast(`已成功删除物料 [${deleteTarget.code}] ${deleteTarget.title}！`);
    } else if (deleteTarget.type === 'batch' && deleteTarget.ids) {
      if (onDeleteMaterial) {
        deleteTarget.ids.forEach(id => onDeleteMaterial(id));
      }
      setSelectedRowIds({});
      showToast(`已成功批量删除 ${deleteTarget.count} 条物料档案！`);
    }

    setDeleteTarget(null);
  };

  // 分类展开收起切换
  const toggleCategoryExpand = (catId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  // 一键全部展开 / 收起所有分类节点
  const handleToggleExpandAllCategories = (expand: boolean) => {
    const newMap: Record<string, boolean> = {};
    CATEGORY_TREE_DATA.forEach(node => {
      if (node.children && node.children.length > 0) {
        newMap[node.id] = expand;
      }
    });
    setExpandedCategories(newMap);
  };

  // 过滤物料列表
  const filteredMaterials = useMemo(() => {
    return materials.filter(mat => {
      // 1. 启用状态过滤
      const status = getItemStatus(mat);
      if (activeStatusTab === 'ACTIVE' && status !== 'ACTIVE') return false;
      if (activeStatusTab === 'DISABLED' && status !== 'DISABLED') return false;

      // 2. 分类过滤
      if (selectedCategory !== 'ALL') {
        // 匹配主分类或子分类
        const matCat = mat.category || '';
        if (
          matCat !== selectedCategory &&
          !matCat.includes(selectedCategory) &&
          !selectedCategory.includes(matCat)
        ) {
          return false;
        }
      }

      // 3. 搜索过滤
      if (appliedSearch.trim()) {
        const query = appliedSearch.trim().toLowerCase();
        const matchesCode = mat.materialCode.toLowerCase().includes(query);
        const matchesName = mat.materialName.toLowerCase().includes(query);
        const matchesSpec = mat.materialSpec.toLowerCase().includes(query);
        const matchesDrawing = mat.drawingNo ? mat.drawingNo.toLowerCase().includes(query) : false;
        if (!matchesCode && !matchesName && !matchesSpec && !matchesDrawing) {
          return false;
        }
      }

      return true;
    });
  }, [materials, activeStatusTab, selectedCategory, appliedSearch, localStatuses]);

  // 统计数量
  const counts = useMemo(() => {
    let activeCount = 0;
    let disabledCount = 0;
    materials.forEach(m => {
      const s = getItemStatus(m);
      if (s === 'ACTIVE') activeCount++;
      else disabledCount++;
    });
    return {
      all: materials.length,
      active: activeCount,
      disabled: disabledCount,
    };
  }, [materials, localStatuses]);

  // 全选/反选
  const isAllSelected = filteredMaterials.length > 0 && filteredMaterials.every(m => selectedRowIds[m.id]);
  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedRowIds({});
    } else {
      const next: Record<string, boolean> = {};
      filteredMaterials.forEach(m => {
        next[m.id] = true;
      });
      setSelectedRowIds(next);
    }
  };

  const selectedCount = Object.values(selectedRowIds).filter(Boolean).length;

  // 如果处于新增物料状态，展示全功能物料档案新增页（包含图号管理等6大页签）
  if (isAddModalOpen) {
    return (
      <MaterialCreateForm
        isNoVersionMode={isNoVersionMode}
        onClose={() => setIsAddModalOpen(false)}
        onSave={(newMat, drawingData) => {
          onAddMaterial(newMat, drawingData);
          setIsAddModalOpen(false);
        }}
        onNavigateToDrawingManagement={(drawingNo) => {
          setIsAddModalOpen(false);
          onSelectDrawing(drawingNo || '');
        }}
        drawingMasters={drawingMasters}
        boms={boms}
        onUpdateVersionStatus={onUpdateVersionStatus}
        onToggleVersionActive={onToggleVersionActive}
        onSetDefaultVersion={onSetDefaultVersion}
        onCreateDrawingMaster={onCreateDrawingMaster}
        onUpdateDrawingNo={onUpdateDrawingNo}
        onCreateNewDraftVersion={onCreateNewDraftVersion}
        onUpdateDraftVersionNo={onUpdateDraftVersionNo}
        onDeleteDraftVersion={onDeleteDraftVersion}
        onDeleteDrawingMaster={onDeleteDrawingMaster}
        onAddFileToDraft={onAddFileToDraft}
        onDeleteFileFromVersion={onDeleteFileFromVersion}
        onUpdateVersionInfo={onUpdateVersionInfo}
        onUpdateFileInVersion={onUpdateFileInVersion}
      />
    );
  }

  // 如果处于查看物料详情状态，展示完全同步样式的6大页签物料档案详情页
  if (selectedMaterialForDetail) {
    return (
      <MaterialCreateForm
        isNoVersionMode={isNoVersionMode}
        initialMaterial={selectedMaterialForDetail}
        onClose={() => setSelectedMaterialForDetail(null)}
        onDelete={(id) => {
          if (onDeleteMaterial) {
            onDeleteMaterial(id);
          }
          setSelectedRowIds(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
          setSelectedMaterialForDetail(null);
          showToast(`已成功删除物料 [${selectedMaterialForDetail.materialCode}] ${selectedMaterialForDetail.materialName}！`);
        }}
        onSave={(savedMat, drawingData, isEdit, existingId) => {
          if (onUpdateMaterial) {
            onUpdateMaterial(
              {
                ...savedMat,
                id: existingId || selectedMaterialForDetail.id,
                hasDrawing: Boolean(savedMat.drawingNo),
                createdAt: selectedMaterialForDetail.createdAt,
                updatedAt: new Date().toLocaleString(),
              },
              drawingData
            );
          }
          setSelectedMaterialForDetail(null);
        }}
        onNavigateToDrawingManagement={(drawingNo) => {
          setSelectedMaterialForDetail(null);
          onSelectDrawing(drawingNo || '');
        }}
        drawingMasters={drawingMasters}
        boms={boms}
        onUpdateVersionStatus={onUpdateVersionStatus}
        onToggleVersionActive={onToggleVersionActive}
        onSetDefaultVersion={onSetDefaultVersion}
        onCreateDrawingMaster={onCreateDrawingMaster}
        onUpdateDrawingNo={onUpdateDrawingNo}
        onCreateNewDraftVersion={onCreateNewDraftVersion}
        onUpdateDraftVersionNo={onUpdateDraftVersionNo}
        onDeleteDraftVersion={onDeleteDraftVersion}
        onDeleteDrawingMaster={onDeleteDrawingMaster}
        onAddFileToDraft={onAddFileToDraft}
        onDeleteFileFromVersion={onDeleteFileFromVersion}
        onUpdateVersionInfo={onUpdateVersionInfo}
        onUpdateFileInVersion={onUpdateFileInVersion}
      />
    );
  }

  const handleMockBatchImport = () => {
    const presetBatch = [
      {
        materialCode: `CD-${Math.floor(10000 + Math.random() * 90000)}`,
        materialName: '1M单轨接驳台',
        materialSpec: 'HY-10CV460-V44.0',
        category: '半成品',
        unit: '台',
        drawingNo: `DRW-${Math.floor(1000 + Math.random() * 9000)}`,
        status: 'ACTIVE' as const,
        remarks: '标准单轨输送线',
      },
      {
        materialCode: `CD-${Math.floor(10000 + Math.random() * 90000)}`,
        materialName: '单轨缓冲机',
        materialSpec: 'HY-BF460-V48.0',
        category: '半成品',
        unit: '台',
        drawingNo: `DRW-${Math.floor(1000 + Math.random() * 9000)}`,
        status: 'ACTIVE' as const,
        remarks: '460宽单轨缓冲机',
      },
      {
        materialCode: `B-${Math.floor(10000 + Math.random() * 90000)}`,
        materialName: '粘纸清洁机',
        materialSpec: 'YS-UTC460-V3.0',
        category: '成品机器高端',
        unit: '台',
        drawingNo: undefined,
        status: 'ACTIVE' as const,
        remarks: '非标定制清洁设备',
      },
    ];

    onBatchImportMaterials(presetBatch);
    setIsBatchModalOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f7fc] dark:bg-slate-950 p-3 sm:p-4 gap-3 overflow-hidden font-sans">
      {/* 顶部面包屑与页签栏 */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-4 py-2 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-xs shrink-0">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 dark:text-slate-500">物料管理</span>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            物料档案
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md text-xs">
            <span className="px-2.5 py-1 rounded bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-medium shadow-xs">
              物料档案
            </span>
          </div>
          <span className="text-xs text-slate-400 border-l border-slate-200 dark:border-slate-700 pl-2 ml-1">
            共 {materials.length} 份物料主档
          </span>
        </div>
      </div>

      {/* 主体左右分栏布局 */}
      <div className="flex-1 flex gap-3 min-h-0 overflow-hidden">
        {/* 左侧：物料分类树（可收纳/折叠） */}
        <div
          className={`bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 flex flex-col transition-all duration-300 shrink-0 shadow-xs ${
            isCategorySidebarOpen ? 'w-60 sm:w-64' : 'w-12'
          }`}
        >
          {/* 分类栏标题与折叠开关 */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between shrink-0">
            {isCategorySidebarOpen ? (
              <div className="flex items-center justify-between w-full pr-1">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <FolderTree className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>物料分类</span>
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleExpandAllCategories(true)}
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
                    title="展开全部子节点"
                  >
                    <ChevronsDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleExpandAllCategories(false)}
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
                    title="折叠全部子节点"
                  >
                    <ChevronsUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setSelectedCategory('ALL')}
                    className={`text-xs px-2 py-0.5 rounded cursor-pointer transition-colors ${
                      selectedCategory === 'ALL'
                        ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-semibold'
                        : 'text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400'
                    }`}
                  >
                    全部
                  </button>
                  <button
                    onClick={() => setIsCategorySidebarOpen(false)}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer ml-0.5"
                    title="收起分类栏"
                  >
                    <PanelLeftClose className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsCategorySidebarOpen(true)}
                className="p-1 mx-auto hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                title="展开分类栏"
              >
                <PanelLeftOpen className="w-4 h-4 text-blue-600" />
              </button>
            )}
          </div>

          {/* 分类栏搜索与树形列表 */}
          {isCategorySidebarOpen ? (
            <div className="flex-1 flex flex-col p-2 min-h-0 overflow-hidden">
              {/* 分类搜索框 */}
              <div className="relative mb-2 shrink-0">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="请输入分类名称"
                  value={categorySearchTerm}
                  onChange={e => setCategorySearchTerm(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
                {categorySearchTerm && (
                  <button
                    onClick={() => setCategorySearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* 分类树形结构 */}
              <div className="flex-1 overflow-y-auto space-y-0.5 text-xs pr-1 select-none">
                {CATEGORY_TREE_DATA.filter(node => {
                  if (!categorySearchTerm.trim()) return true;
                  const matchParent = node.name.toLowerCase().includes(categorySearchTerm.toLowerCase());
                  const matchChild = node.children?.some(c => c.name.toLowerCase().includes(categorySearchTerm.toLowerCase()));
                  return matchParent || matchChild;
                }).map(node => {
                  const isExpanded = expandedCategories[node.id] ?? false;
                  const isSelected = selectedCategory === node.name;
                  const hasChildren = node.children && node.children.length > 0;

                  return (
                    <div key={node.id} className="space-y-0.5">
                      <div
                        className={`group flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-blue-50 text-blue-600 font-semibold dark:bg-blue-900/40 dark:text-blue-300'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                        }`}
                        onClick={() => setSelectedCategory(node.name)}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          {hasChildren ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCategoryExpand(node.id);
                              }}
                              className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400"
                            >
                              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </button>
                          ) : (
                            <span className="w-4" />
                          )}
                          <span className="truncate">{node.name}</span>
                        </div>
                      </div>

                      {/* 子分类 */}
                      {hasChildren && isExpanded && (
                        <div className="pl-6 space-y-0.5 border-l border-slate-100 dark:border-slate-800/60 ml-3">
                          {node.children!
                            .filter(child => {
                              if (!categorySearchTerm.trim()) return true;
                              return child.name.toLowerCase().includes(categorySearchTerm.toLowerCase()) ||
                                     node.name.toLowerCase().includes(categorySearchTerm.toLowerCase());
                            })
                            .map(child => {
                              const isChildSelected = selectedCategory === child.name;
                              return (
                                <div
                                  key={child.id}
                                  onClick={() => setSelectedCategory(child.name)}
                                  className={`px-2 py-1.5 rounded cursor-pointer truncate transition-colors ${
                                    isChildSelected
                                      ? 'bg-blue-50 text-blue-600 font-semibold dark:bg-blue-900/40 dark:text-blue-300'
                                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                                  }`}
                                >
                                  {child.name}
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-4 gap-4 text-slate-400">
              <button
                onClick={() => setIsCategorySidebarOpen(true)}
                className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 rounded text-slate-500 cursor-pointer"
                title="展开物料分类"
              >
                <FolderTree className="w-5 h-5 text-blue-600" />
              </button>
              <div
                className="writing-vertical text-xs tracking-widest text-slate-400 font-medium cursor-pointer hover:text-blue-600"
                style={{ writingMode: 'vertical-rl' }}
                onClick={() => setIsCategorySidebarOpen(true)}
              >
                物料分类
              </div>
            </div>
          )}
        </div>

        {/* 右侧：表格主数据区域 */}
        <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          {/* 顶栏 1：启用状态 Tabs + 搜索栏 */}
          <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 bg-white dark:bg-slate-900">
            {/* 状态 Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg text-xs font-medium">
              <button
                onClick={() => setActiveStatusTab('ALL')}
                className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                  activeStatusTab === 'ALL'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                全部 ({counts.all})
              </button>

              <button
                onClick={() => setActiveStatusTab('ACTIVE')}
                className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                  activeStatusTab === 'ACTIVE'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                已启用 ({counts.active})
              </button>

              <button
                onClick={() => setActiveStatusTab('DISABLED')}
                className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                  activeStatusTab === 'DISABLED'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                已停用 ({counts.disabled})
              </button>
            </div>

            {/* 右侧搜索区 */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="请输入物料编码或物料名称..."
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      setAppliedSearch(searchInput);
                    }
                  }}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                onClick={() => setAppliedSearch(searchInput)}
                className="px-3 py-1.5 text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/80 rounded flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                <Search className="w-3.5 h-3.5" />
                搜索
              </button>
              <button
                onClick={() => {
                  setSearchInput('');
                  setAppliedSearch('');
                  setSelectedCategory('ALL');
                  setActiveStatusTab('ALL');
                }}
                className="px-3 py-1.5 text-xs font-medium bg-white hover:bg-slate-50 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                重置
              </button>
            </div>
          </div>

          {/* 顶栏 2：操作按钮工具条 */}
          <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/40 shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-3.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                新增
              </button>

              <button
                onClick={() => {
                  setIsBatchImportModalOpen(true);
                  setIsBatchModalOpen(true);
                  setImportStep(1);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold bg-white hover:bg-blue-50 text-blue-600 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-blue-400 border border-blue-200 dark:border-blue-800/80 rounded flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <FileUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                批量导入
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsBatchMenuOpen(!isBatchMenuOpen);
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  批量操作
                  <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
                </button>

                {isBatchMenuOpen && (
                  <div className="absolute left-0 mt-1 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl py-1 z-30 text-xs animate-in fade-in zoom-in-95 duration-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsBatchMenuOpen(false);
                        setIsBatchImportModalOpen(true);
                        setIsBatchModalOpen(true);
                        setImportStep(1);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <FileUp className="w-3.5 h-3.5 text-blue-600" />
                      批量导入物料 (Excel/CSV)
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsBatchMenuOpen(false);
                        handleBatchExport();
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-400" />
                      批量导出物料 ({selectedCount > 0 ? `已选${selectedCount}项` : '全部'})
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsBatchMenuOpen(false);
                        handleBatchToggleStatus('ACTIVE');
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 flex items-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      批量设为启用
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsBatchMenuOpen(false);
                        handleBatchToggleStatus('DISABLED');
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-2 cursor-pointer"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      批量设为停用
                    </button>
                    <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsBatchMenuOpen(false);
                        handleBatchDeleteClick();
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      批量删除物料
                    </button>
                  </div>
                )}
              </div>

              {selectedCount > 0 && (
                <button
                  onClick={handleBatchDeleteClick}
                  className="px-3 py-1.5 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded flex items-center gap-1 shadow-xs transition-colors cursor-pointer animate-in fade-in duration-150"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  批量删除 ({selectedCount})
                </button>
              )}

              <button
                type="button"
                onClick={() => showToast('已自动载入企业标准物料属性扩展字典')}
                className="px-3 py-1.5 text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                自定义字段
              </button>

              <button
                type="button"
                onClick={() => showToast('物料变更审批流正常运行中，暂无积压待签单据')}
                className="px-3 py-1.5 text-xs font-medium bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 rounded flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                物料审批
              </button>
            </div>

            {/* 右侧工具图标 */}
            <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-xs">
              <button
                onClick={() => {
                  setDensity(prev => (prev === 'normal' ? 'compact' : prev === 'compact' ? 'relaxed' : 'normal'));
                }}
                className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                title={`当前密度: ${density === 'normal' ? '标准' : density === 'compact' ? '紧凑' : '宽松'}`}
              >
                <AlignJustify className="w-3.5 h-3.5" />
                <span>行高</span>
              </button>

              <button
                onClick={() => alert('已应用标准物料档案表头配置')}
                className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <Columns className="w-3.5 h-3.5" />
                <span>字段配置</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* 表格数据内容区 */}
          <div className="flex-1 overflow-auto min-h-0 bg-white dark:bg-slate-900">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
              <thead className="bg-[#fafbfd] dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-semibold border-b border-slate-200/80 dark:border-slate-700/80 sticky top-0 z-10">
                <tr>
                  {/* 选择框列 */}
                  <th className="py-2.5 px-3 w-10 text-center">
                    <button
                      onClick={handleToggleSelectAll}
                      className="text-slate-400 hover:text-blue-600 cursor-pointer inline-flex items-center justify-center"
                    >
                      <span
                        className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                          isAllSelected
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {isAllSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </span>
                    </button>
                  </th>
                  <th className="py-2.5 px-3 font-medium text-slate-600 dark:text-slate-300">序号</th>
                  <th className="py-2.5 px-3 font-medium text-slate-600 dark:text-slate-300">物料编码</th>
                  <th className="py-2.5 px-3 font-medium text-slate-600 dark:text-slate-300">物料名称</th>
                  <th className="py-2.5 px-3 font-medium text-slate-600 dark:text-slate-300">规格</th>
                  <th className="py-2.5 px-3 font-medium text-slate-600 dark:text-slate-300">
                    {isNoVersionMode ? '关联图纸' : '图号'}
                  </th>
                  <th className="py-2.5 px-3 font-medium text-slate-600 dark:text-slate-300">型号</th>
                  <th className="py-2.5 px-3 font-medium text-slate-600 dark:text-slate-300">主单位</th>
                  <th className="py-2.5 px-3 font-medium text-slate-600 dark:text-slate-300">所属分类</th>
                  <th className="py-2.5 px-3 font-medium text-slate-600 dark:text-slate-300">启用</th>
                  <th className="py-2.5 px-3 font-medium text-slate-600 dark:text-slate-300 text-center w-20">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredMaterials.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-16 text-center text-slate-400 dark:text-slate-500">
                      未找到符合条件的物料数据
                    </td>
                  </tr>
                ) : (
                  filteredMaterials.map((mat, index) => {
                    const isSelected = selectedRowIds[mat.id] ?? false;
                    const status = getItemStatus(mat);
                    const isItemActive = status === 'ACTIVE';

                    const paddingClass =
                      density === 'compact'
                        ? 'py-1.5 px-3'
                        : density === 'relaxed'
                        ? 'py-3.5 px-3'
                        : 'py-2.5 px-3';

                    return (
                      <tr
                        key={mat.id}
                        className={`transition-colors group ${
                          isSelected
                            ? 'bg-blue-50/70 dark:bg-blue-900/30'
                            : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        {/* 选中单选框 */}
                        <td className={`${paddingClass} text-center`}>
                          <button
                            onClick={() => {
                              setSelectedRowIds(prev => ({
                                ...prev,
                                [mat.id]: !prev[mat.id],
                              }));
                            }}
                            className="text-slate-400 hover:text-blue-600 cursor-pointer inline-flex items-center justify-center"
                          >
                            <span
                              className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-600 text-white'
                                  : 'border-slate-300 dark:border-slate-600'
                              }`}
                            >
                              {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </span>
                          </button>
                        </td>

                        {/* 序号 */}
                        <td className={`${paddingClass} text-slate-400 font-mono text-center w-12`}>
                          {index + 1}
                        </td>

                        {/* 物料编码 */}
                        <td className={`${paddingClass} font-mono`}>
                          <button
                            type="button"
                            onClick={() => setSelectedMaterialForDetail(mat)}
                            className="text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                            title="点击查看物料详情档案（同步6大页签样式）"
                          >
                            {mat.materialCode}
                          </button>
                        </td>

                        {/* 物料名称 */}
                        <td className={`${paddingClass} text-slate-800 dark:text-slate-100 font-medium`}>
                          {mat.materialName}
                        </td>

                        {/* 规格 */}
                        <td className={`${paddingClass} font-mono text-slate-600 dark:text-slate-300`}>
                          {mat.materialSpec || '-'}
                        </td>

                        {/* 图号 / 关联图纸 */}
                        <td className={`${paddingClass} font-mono text-slate-600 dark:text-slate-300`}>
                          {mat.drawingNo ? (
                            isNoVersionMode ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const dm = drawingMasters.find(
                                      d => d.drawingNo === mat.drawingNo || d.materialCode === mat.materialCode
                                    ) || null;
                                    const allFiles = dm ? (dm.versions?.flatMap(v => v.files || []) || []) : [];
                                    setPreviewDrawing({
                                      material: mat,
                                      drawing: dm,
                                      files: allFiles.length > 0 ? allFiles : [
                                        { fileName: `${mat.drawingNo}_2D总图.dwg`, fileType: 'DWG', fileSize: 4194304, uploadTime: '2026-09-01', uploader: '张工' },
                                        { fileName: `${mat.drawingNo}_受控图纸.pdf`, fileType: 'PDF', fileSize: 1887436, uploadTime: '2026-09-01', uploader: '张工' }
                                      ]
                                    });
                                  }}
                                  className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline cursor-pointer font-medium text-xs bg-blue-50/70 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200/60 dark:border-blue-850 transition-colors"
                                  title="点击直接在线预览工程图纸"
                                >
                                  <FileText className="w-3 h-3 text-blue-500" />
                                  <span>{mat.drawingNo}</span>
                                  <Eye className="w-3 h-3 text-slate-400 hover:text-blue-600 ml-0.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  if (onSelectDrawing) onSelectDrawing(mat.drawingNo!);
                                }}
                                className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium"
                                title="点击跳转至图号管理查看图纸版本"
                              >
                                {mat.drawingNo}
                              </button>
                            )
                          ) : (
                            <span className="text-slate-400 text-xs">暂无图纸</span>
                          )}
                        </td>

                        {/* 型号 */}
                        <td className={`${paddingClass} text-slate-400`}>
                          -
                        </td>

                        {/* 主单位 */}
                        <td className={`${paddingClass} text-slate-600 dark:text-slate-300`}>
                          {mat.unit || '台'}
                        </td>

                        {/* 所属分类 */}
                        <td className={`${paddingClass} text-slate-600 dark:text-slate-300`}>
                          {mat.category || '半成品'}
                        </td>

                        {/* 启用 (胶囊开关，与图中样式一致) */}
                        <td className={`${paddingClass}`}>
                          <button
                            onClick={() => handleToggleStatus(mat.id, status)}
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                              isItemActive
                                ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-xs'
                                : 'bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full transition-transform ${
                                isItemActive ? 'bg-white' : 'bg-slate-400'
                              }`}
                            />
                            <span>{isItemActive ? '是' : '否'}</span>
                          </button>
                        </td>

                        {/* 操作列 (匹配截图: 竖三点 + 气泡菜单(顶部小三角: 编辑/复制/删除)) */}
                        <td className={`${paddingClass} text-center relative`}>
                          <div className="relative inline-block text-left">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(activeMenuId === mat.id ? null : mat.id);
                              }}
                              className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer inline-flex items-center justify-center font-bold"
                              title="操作"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {activeMenuId === mat.id && (
                              <>
                                {/* 离焦全屏蒙层 */}
                                <div
                                  className="fixed inset-0 z-20 cursor-default"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(null);
                                  }}
                                />

                                {/* 气泡浮窗 (顶部带有指向小三角) */}
                                <div className="absolute right-1/2 translate-x-1/2 mt-1.5 w-20 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200/90 dark:border-slate-700 py-1.5 z-30 text-center text-xs animate-fadeIn">
                                  {/* 顶部小三角形 Arrow Indicator */}
                                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white dark:bg-slate-800 rotate-45 border-t border-l border-slate-200/90 dark:border-slate-700" />

                                  <div className="relative z-10 flex flex-col space-y-0.5">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveMenuId(null);
                                        setSelectedMaterialForDetail(mat);
                                      }}
                                      className="w-full py-1.5 px-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 font-medium transition-colors cursor-pointer"
                                    >
                                      编辑
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveMenuId(null);
                                        handleCopyMaterial(mat);
                                      }}
                                      className="w-full py-1.5 px-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 font-medium transition-colors cursor-pointer"
                                    >
                                      复制
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveMenuId(null);
                                        handleDeleteClick(mat);
                                      }}
                                      className="w-full py-1.5 px-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 font-medium transition-colors cursor-pointer"
                                    >
                                      删除
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 底栏：分页与统计 (与截图一致) */}
          <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 shrink-0 select-none">
            <div>已选中 {selectedCount} 条</div>

            <div className="flex items-center gap-3">
              <span>共 {filteredMaterials.length} 条</span>

              {/* 页面大小下拉 */}
              <select className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-600 dark:text-slate-300 focus:outline-none">
                <option value="20">20条/页</option>
                <option value="50">50条/页</option>
                <option value="100">100条/页</option>
              </select>

              {/* 分页按钮 */}
              <div className="flex items-center gap-1">
                <button
                  className="p-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
                  disabled
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button className="px-2 py-0.5 rounded bg-blue-600 text-white font-medium">1</button>
                <button className="px-2 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400">
                  2
                </button>
                <button className="px-2 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400">
                  3
                </button>
                <button
                  className="p-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 前往指定页 */}
              <div className="flex items-center gap-1 text-slate-500">
                <span>前往</span>
                <input
                  type="text"
                  defaultValue="1"
                  className="w-10 text-center py-0.5 px-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-200 focus:outline-none"
                />
                <span>页</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 物料批量导入标准模态框 (3步向导) */}
      {(isBatchModalOpen || isBatchImportModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* 模态框头部 */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-850">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-200/80 dark:border-blue-900">
                  <FileUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    物料主数据批量导入
                    <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                      Excel / CSV
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    支持按 PLM 编码规范解析并校验物料档案，严格进行唯一性与必填项审核
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsBatchModalOpen(false);
                  setIsBatchImportModalOpen(false);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 步骤条 */}
            <div className="px-6 py-2.5 bg-slate-100/70 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-6">
                <div className={`flex items-center gap-1.5 font-medium ${importStep === 1 ? 'text-blue-600 dark:text-blue-400' : importStep > 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${importStep === 1 ? 'bg-blue-600 text-white' : importStep > 1 ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                    {importStep > 1 ? '✓' : '1'}
                  </span>
                  1. 上传物料清单文件
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                <div className={`flex items-center gap-1.5 font-medium ${importStep === 2 ? 'text-blue-600 dark:text-blue-400' : importStep > 2 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${importStep === 2 ? 'bg-blue-600 text-white' : importStep > 2 ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                    {importStep > 2 ? '✓' : '2'}
                  </span>
                  2. 数据预览与规范校验
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                <div className={`flex items-center gap-1.5 font-medium ${importStep === 3 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${importStep === 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                    3
                  </span>
                  3. 确认批量入库
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400">重复编码处理:</span>
                <select
                  value={importMode}
                  onChange={(e) => {
                    const newMode = e.target.value as 'APPEND' | 'OVERWRITE';
                    setImportMode(newMode);
                    if (importItems.length > 0) {
                      setImportItems(validateItems(importItems));
                    }
                  }}
                  className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-0.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
                >
                  <option value="APPEND">报错拦截 (严格唯一性)</option>
                  <option value="OVERWRITE">覆盖更新已有物料</option>
                </select>
              </div>
            </div>

            {/* 模态框主体内容 */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {importStep === 1 && (
                <div className="space-y-4">
                  {/* 文件上传区域 */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleFileUpload(file);
                      }
                    }}
                  />

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        handleFileUpload(file);
                      }
                    }}
                    className="border-2 border-dashed border-blue-300 dark:border-blue-800/80 hover:border-blue-500 dark:hover:border-blue-600 bg-blue-50/40 dark:bg-blue-950/20 rounded-xl p-8 text-center cursor-pointer transition-colors group"
                  >
                    <div className="w-12 h-12 mx-auto mb-3 bg-white dark:bg-slate-800 rounded-full shadow-xs flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      点击浏览文件 或 将 Excel / CSV 表格拖拽至此处
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      支持 .xlsx、.xls、.csv 格式文件，单次最大支持 5,000 条物料批量解析
                    </p>
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                        物料编码 (必填)
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                        物料名称 (必填)
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                        所属分类 (必填)
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                        单位 / 图号 (可选)
                      </span>
                    </div>
                  </div>

                  {/* 快捷测试与模板下载卡片 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-4 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60 flex items-start justify-between">
                      <div>
                        <div className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          多场景测试数据集 (推荐体验)
                        </div>
                        <p className="text-[11px] text-indigo-700 dark:text-indigo-400 mt-1">
                          一键载入 5 条典型物料数据（包含合规条目、重复编码冲突拦截、必填项缺失拦截）
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleLoadSampleImportItems}
                        className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded shadow-xs cursor-pointer shrink-0 ml-3"
                      >
                        🧪 一键载入测试
                      </button>
                    </div>

                    <div className="p-4 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60 flex items-start justify-between">
                      <div>
                        <div className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-emerald-600" />
                          标准导入模板下载
                        </div>
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">
                          下载包含规范表头及示例数据的标准 CSV 模板文件
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleDownloadTemplate}
                        className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded shadow-xs cursor-pointer shrink-0 ml-3 flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        下载模板
                      </button>
                    </div>
                  </div>

                  {/* 导入规范说明 */}
                  <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-blue-500" /> PLM 物料主数据导入校验规则：
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] pl-1">
                      <li><strong>物料编码</strong>：系统全局唯一标识符，不允许重复；若选择追加模式遇到已有编码将被严格拦截。</li>
                      <li><strong>物料名称</strong>：必填字段，支持中英文字符、数字及连字符。</li>
                      <li><strong>关联图号</strong>：可关联已存在的图号或在物料建档后自动与工程图纸档案建立联动。</li>
                      <li><strong>数据校验</strong>：导入前系统将执行逐行数据有效性扫描，支持在界面中直接一键修复冲突或剔除异常项。</li>
                    </ul>
                  </div>
                </div>
              )}

              {importStep === 2 && (
                <div className="space-y-3">
                  {/* 数据概览与操作栏 */}
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-850 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        解析来源: <span className="text-blue-600 dark:text-blue-400 font-mono">{uploadedImportFile?.name || 'Excel导入清单'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                          共 {importItems.length} 项
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          通过: {importItems.filter(i => i.isValid).length}
                        </span>
                        {importItems.some(i => !i.isValid) && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 font-medium flex items-center gap-1 animate-pulse">
                            <AlertCircle className="w-3 h-3" />
                            异常拦截: {importItems.filter(i => !i.isValid).length}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {importItems.some(i => !i.isValid) && (
                        <>
                          <button
                            type="button"
                            onClick={handleAutoFixImportItems}
                            className="px-2.5 py-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded shadow-xs flex items-center gap-1 cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3" />
                            一键修复冲突与缺失
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveInvalidImportItems}
                            className="px-2.5 py-1 text-xs font-medium bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            剔除异常项
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setImportStep(1);
                        }}
                        className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 rounded flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        重新选择文件
                      </button>
                    </div>
                  </div>

                  {/* 导入预览表格 */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden max-h-[380px] overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 sticky top-0 z-10">
                        <tr>
                          <th className="py-2 px-3 w-12 text-center border-b border-slate-200 dark:border-slate-700">#</th>
                          <th className="py-2 px-3 w-28 border-b border-slate-200 dark:border-slate-700">校验状态</th>
                          <th className="py-2 px-3 border-b border-slate-200 dark:border-slate-700 font-semibold">物料编码</th>
                          <th className="py-2 px-3 border-b border-slate-200 dark:border-slate-700 font-semibold">物料名称</th>
                          <th className="py-2 px-3 border-b border-slate-200 dark:border-slate-700">规格型号</th>
                          <th className="py-2 px-3 border-b border-slate-200 dark:border-slate-700">分类</th>
                          <th className="py-2 px-3 border-b border-slate-200 dark:border-slate-700">单位</th>
                          <th className="py-2 px-3 border-b border-slate-200 dark:border-slate-700">绑定图号</th>
                          <th className="py-2 px-3 border-b border-slate-200 dark:border-slate-700">备注说明</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {importItems.map((item, idx) => (
                          <tr
                            key={item.id}
                            className={`hover:bg-slate-50 dark:hover:bg-slate-850/60 transition-colors ${!item.isValid ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''}`}
                          >
                            <td className="py-2 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                            <td className="py-2 px-3">
                              {item.isValid ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> 合规通过
                                </span>
                              ) : (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                                    <AlertCircle className="w-3.5 h-3.5" /> 校验失败
                                  </span>
                                  <div className="text-[10px] text-rose-500 dark:text-rose-400 leading-tight">
                                    {item.errors.join('；')}
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-3 font-mono font-medium text-slate-800 dark:text-slate-200">
                              {item.materialCode || <span className="text-rose-400 italic font-sans">未填写</span>}
                            </td>
                            <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">
                              {item.materialName || <span className="text-rose-400 italic font-sans">缺少名称</span>}
                            </td>
                            <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{item.materialSpec || '-'}</td>
                            <td className="py-2 px-3">
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {item.category || '未分类'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{item.unit || 'PCS'}</td>
                            <td className="py-2 px-3 font-mono text-blue-600 dark:text-blue-400">
                              {item.drawingNo || '-'}
                            </td>
                            <td className="py-2 px-3 text-slate-400 truncate max-w-[120px]">{item.remarks || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {importStep === 3 && (
                <div className="space-y-4 text-center py-4">
                  <div className="w-16 h-16 mx-auto bg-emerald-50 dark:bg-emerald-950/60 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-800 dark:text-white">
                      数据校验全部就绪，准备批量入库
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      共将导入 <strong className="text-emerald-600 dark:text-emerald-400">{importItems.filter(i => i.isValid).length}</strong> 条合规物料主数据到 PLM 系统中，系统将自动生成物料元数据记录并建立版本索引。
                    </p>
                  </div>

                  <div className="max-w-md mx-auto p-4 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-left text-xs space-y-2">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>有效待导入物料数:</span>
                      <strong className="text-slate-800 dark:text-white font-mono">{importItems.filter(i => i.isValid).length} 项</strong>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>重复编码处理策略:</span>
                      <strong className="text-blue-600 dark:text-blue-400">{importMode === 'APPEND' ? '严格唯一拦截' : '覆盖更新已有'}</strong>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>默认物料状态:</span>
                      <strong className="text-emerald-600 dark:text-emerald-400">已启用 (ACTIVE)</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 模态框底部按钮栏 */}
            <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setIsBatchModalOpen(false);
                  setIsBatchImportModalOpen(false);
                }}
                className="px-4 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                取消
              </button>

              <div className="flex items-center gap-2">
                {importStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setImportStep((prev) => (prev > 1 ? (prev - 1 as any) : 1))}
                    className="px-3.5 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    上一步
                  </button>
                )}

                {importStep === 1 && (
                  <button
                    type="button"
                    onClick={handleLoadSampleImportItems}
                    className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    下一步：解析预览
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {importStep === 2 && (
                  <button
                    type="button"
                    disabled={importItems.filter(i => i.isValid).length === 0}
                    onClick={() => setImportStep(3)}
                    className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    下一步：核对确认
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {importStep === 3 && (
                  <button
                    type="button"
                    onClick={handleCommitBatchImport}
                    className="px-5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    确认批量入库 ({importItems.filter(i => i.isValid).length} 项)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 物料删除确认模态框 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-5">
              <div className="flex items-center gap-3 text-rose-600 mb-3">
                <div className="p-2 bg-rose-50 dark:bg-rose-950/60 rounded-full border border-rose-200 dark:border-rose-900 shrink-0">
                  <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">
                    {deleteTarget.type === 'batch'
                      ? `确认批量删除选中的 ${deleteTarget.count} 条物料？`
                      : `确认删除物料档案？`}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    删除后该物料数据将被移出物料档案，此操作不可撤销。
                  </p>
                </div>
              </div>

              {deleteTarget.type === 'single' && (
                <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200/80 dark:border-slate-800 text-xs space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 shrink-0">物料编码:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{deleteTarget.code}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 shrink-0">物料名称:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-100">{deleteTarget.title}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 直连工程图纸在线预览模态框 */}
      {previewDrawing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* 模态框头部 */}
            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <FolderArchive className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <span>工程图纸直接预览</span>
                    <span className="font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded text-xs">
                      {previewDrawing.material.drawingNo}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    物料: {previewDrawing.material.materialName} ({previewDrawing.material.materialCode})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDrawing(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 模态框内容：图纸文件列表 */}
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold w-10 text-center">#</th>
                      <th className="py-2.5 px-3 font-semibold w-20">类型</th>
                      <th className="py-2.5 px-3 font-semibold">文件名</th>
                      <th className="py-2.5 px-3 font-semibold w-24">大小</th>
                      <th className="py-2.5 px-3 font-semibold w-28">上传时间</th>
                      <th className="py-2.5 px-3 font-semibold text-right w-24">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {previewDrawing.files.map((file, idx) => {
                      const isCad = file.fileType === 'DWG' || file.fileType === 'DXF';
                      const is3D = file.fileType === 'STEP' || file.fileType === 'IGS' || file.fileType === 'SLDPRT';
                      const badgeColor = isCad
                        ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300'
                        : is3D
                        ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300'
                        : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300';

                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-1.5 py-0.5 rounded font-mono font-bold text-[10px] border ${badgeColor}`}>
                              {file.fileType}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-100 font-mono">
                            {file.fileName}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                            {file.fileSize ? `${(file.fileSize / 1024 / 1024).toFixed(2)} MB` : '2.4 MB'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                            {file.uploadTime || '2026-09-01'}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => alert(`正在加载 ${file.fileName} 渲染画布...`)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded cursor-pointer transition-colors"
                                title="在线查看"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => alert(`已开始下载 ${file.fileName}`)}
                                className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded cursor-pointer transition-colors"
                                title="下载文件"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 2D/3D 画布渲染模拟 */}
              <div className="bg-slate-900 rounded-lg p-6 text-center text-slate-400 relative overflow-hidden border border-slate-800 h-48 flex flex-col items-center justify-center">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]" />
                <Box className="w-10 h-10 text-blue-500 mb-2 animate-pulse" />
                <p className="text-xs font-medium text-slate-200">
                  工程图纸 2D/3D 渲染视图 ({previewDrawing.files[0]?.fileName || previewDrawing.material.drawingNo})
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  WebGL 硬件加速已就绪，支持图纸无级缩放、三维旋转与测量标注
                </p>
              </div>
            </div>

            {/* 模态框底栏 */}
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                共 {previewDrawing.files.length} 份工程图纸文件
              </span>
              <button
                type="button"
                onClick={() => setPreviewDrawing(null)}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded transition-colors cursor-pointer"
              >
                关闭预览
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 统一轻量 Toast 提示 */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 rounded-lg shadow-xl text-xs font-medium animate-in slide-in-from-bottom-3 duration-200">
          <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
