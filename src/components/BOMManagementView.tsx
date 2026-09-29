import React, { useState, useMemo, useCallback, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  BOM,
  BOMItem,
  Material,
  DrawingMaster,
  BOMStatus,
  BOMStructureNode,
  BOMDrawingLink,
  BOMOperationLog,
  BOMVersionInfo,
  BOMApprovalRecord,
  DrawingFile,
  DrawingVersion,
  FileType,
  SalesOrder,
} from '../types/plm';
import {
  BOM_PROTOTYPE_CATEGORIES,
  FULL_PROTOTYPE_BOMS,
  CD00005_STRUCTURE_TREE,
  CD00005_DRAWINGS,
  CD00005_OPERATION_LOGS,
  CD00005_APPROVAL_RECORDS,
  CD00005_VERSIONS,
  BOMCategoryItem,
  getBOMApprovalRecords,
} from '../data/bomData';
import { INITIAL_SALES_ORDERS } from '../data/mockData';
import { loadLocalState, saveLocalState } from '../utils/localPersistence';
import { DrawingPreviewModal } from './DrawingPreviewModal';
import {
  FileSpreadsheet,
  Plus,
  Send,
  ShieldCheck,
  CheckCircle2,
  GitBranch,
  GitCommit,
  Info,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  ChevronsDown,
  ChevronsUp,
  PanelLeftClose,
  PanelLeftOpen,
  Layers,
  FileText,
  FileCheck,
  FileUp,
  Upload,
  Eye,
  Download,
  Copy,
  Edit3,
  FileEdit,
  Star,
  Check,
  X,
  Clock,
  User,
  ArrowLeft,
  MoreVertical,
  SlidersHorizontal,
  RotateCcw,
  FileCheck2,
  AlignJustify,
  Lock,
  Columns,
  Maximize2,
  Folder,
  FolderOpen,
  FolderTree,
  Boxes,
  FileCode,
  Tag,
  ArrowUpDown,
  History,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  Ban,
  Settings,
  QrCode,
  Image as ImageIcon,
  ZoomIn,
  Printer,
} from 'lucide-react';

interface BOMManagementViewProps {
  isNoVersionMode?: boolean;
  boms: BOM[];
  materials: Material[];
  drawingMasters: DrawingMaster[];
  salesOrders?: SalesOrder[];
  onUpdateBOMItemVersion?: (bomId: string, itemId: string, drawingVersionId: string, versionNo: string) => void;
  onAddBOMItem?: (bomId: string, materialId: string, drawingVersionId: string, quantity: number) => void;
  onRemoveBOMItem?: (bomId: string, itemId: string) => void;
  onAuditTriggered?: (title: string, desc: string, target: string) => void;
  onNavigateToDrawings?: (
    drawingNo: string,
    productMeta?: { productCode?: string; productName?: string; specName?: string }
  ) => void;
  onSolidWorksImport?: (importedData: {
    bom: BOM;
    materials: Material[];
    drawings: DrawingMaster[];
  }) => void;
}

export const BOMManagementView: React.FC<BOMManagementViewProps> = ({
  isNoVersionMode = false,
  boms: initialBoms,
  materials,
  drawingMasters,
  salesOrders = INITIAL_SALES_ORDERS,
  onUpdateBOMItemVersion,
  onAddBOMItem,
  onRemoveBOMItem,
  onAuditTriggered,
  onNavigateToDrawings,
  onSolidWorksImport,
}) => {
  // 综合合并传入的 BOM 和完整 41 条原型 BOM 数据
  const [bomList, setBomList] = useState<BOM[]>(() => {
    const map = new Map<string, BOM>();
    FULL_PROTOTYPE_BOMS.forEach(b => map.set(b.bomCode, b));
    initialBoms.forEach(b => {
      if (!map.has(b.bomCode)) {
        map.set(b.bomCode, b);
      }
    });
    return Array.from(map.values());
  });

  // 视图模式: 'list' (BOM列表) | 'detail' (BOM详情) | 'create' (新增BOM全屏页)
  const [viewMode, setViewMode] = useState<'list' | 'detail' | 'create'>(() => {
    return loadLocalState<'list' | 'detail' | 'create'>('bom_viewMode', 'list');
  });
  const [selectedBOMId, setSelectedBOMId] = useState<string>(() => {
    return loadLocalState<string>('bom_selectedBOMId', 'BOM-007');
  });

  // 持久化视图模式与选中的 BOM ID，防止任何页面重载跳回列表或首页
  useEffect(() => {
    saveLocalState('bom_viewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    saveLocalState('bom_selectedBOMId', selectedBOMId);
  }, [selectedBOMId]);

  // 列表筛选状态
  const [isCategorySidebarCollapsed, setIsCategorySidebarCollapsed] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL'); // ALL, DRAFT, PENDING, APPROVED, REJECTED, OBSOLETE
  const [defaultFilter, setDefaultFilter] = useState<string>('ALL'); // ALL, YES, NO
  const [searchQuery, setSearchQuery] = useState('');
  const [tableSearchInput, setTableSearchInput] = useState('');
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // 详情页状态
  const currentBOM = useMemo(() => {
    return bomList.find(b => b.id === selectedBOMId) || bomList[0] || FULL_PROTOTYPE_BOMS[6];
  }, [bomList, selectedBOMId]);

  const [detailActiveTab, setDetailActiveTab] = useState<'basic' | 'drawings' | 'logs' | 'approvals' | 'usage'>(() => {
    const saved = loadLocalState<string>('bom_detailActiveTab', 'basic');
    if (saved === 'structure' || !['basic', 'drawings', 'logs', 'approvals', 'usage'].includes(saved)) {
      return 'basic';
    }
    return saved as 'basic' | 'drawings' | 'logs' | 'approvals' | 'usage';
  });
  const [detailSelectedVersion, setDetailSelectedVersion] = useState<string>(() => {
    return loadLocalState<string>('bom_detailSelectedVersion', currentBOM.versionNo ? `V${currentBOM.versionNo}` : 'V4');
  });

  // 保持详情页签状态持久化
  useEffect(() => {
    saveLocalState('bom_detailActiveTab', detailActiveTab);
  }, [detailActiveTab]);

  useEffect(() => {
    saveLocalState('bom_detailSelectedVersion', detailSelectedVersion);
  }, [detailSelectedVersion]);
  // BOM 结构树默认展开
  const [isStructureTreeCollapsed, setIsStructureTreeCollapsed] = useState<boolean>(false);
  const [treeSearchQuery, setTreeSearchQuery] = useState('');
  const [selectedTreeNodeId, setSelectedTreeNodeId] = useState<string | null>(null);
  const [expandedTreeNodes, setExpandedTreeNodes] = useState<Record<string, boolean>>({});
  const [drawingViewFilter, setDrawingViewFilter] = useState<'AUTO' | 'ALL'>('AUTO'); // AUTO: 联动选中节点, ALL: 查看整机所有图纸
  const [drawingSearchQuery, setDrawingSearchQuery] = useState('');
  const [drawingScopeFilter, setDrawingScopeFilter] = useState<'ALL' | 'CURRENT' | 'SUB'>('ALL'); // ALL: 全部, CURRENT: 仅所选物料, SUB: 仅下级子物料
  const [isDetailEditMode, setIsDetailEditMode] = useState<boolean>(false); // 详情页编辑模式状态

  // 编辑态结构树多选与批量删除状态
  const [treeMultiSelectIds, setTreeMultiSelectIds] = useState<string[]>([]);

  // 图纸管理页签左侧BOM结构树多选批量下载状态
  const [drawingTreeMultiSelectIds, setDrawingTreeMultiSelectIds] = useState<string[]>([]);

  // 图纸信息、操作日志及审批记录分页以及日志版本联动筛选状态
  const [drawingPage, setDrawingPage] = useState<number>(1);
  const [drawingPageSize, setDrawingPageSize] = useState<number>(10);
  const [logPage, setLogPage] = useState<number>(1);
  const [logPageSize, setLogPageSize] = useState<number>(10);
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');
  const [approvalPage, setApprovalPage] = useState<number>(1);
  const [approvalPageSize, setApprovalPageSize] = useState<number>(10);

  // 使用记录状态与分页 (销售订单-项次、生产工单)
  const [usageSearchQuery, setUsageSearchQuery] = useState<string>('');
  const [usagePage, setUsagePage] = useState<number>(1);
  const [usagePageSize, setUsagePageSize] = useState<number>(10);

  // 联动重置分页
  useEffect(() => {
    setDrawingPage(1);
  }, [selectedTreeNodeId, drawingScopeFilter, drawingSearchQuery, drawingViewFilter, detailSelectedVersion]);

  useEffect(() => {
    setLogPage(1);
  }, [logSearchQuery, detailSelectedVersion]);

  useEffect(() => {
    setApprovalPage(1);
  }, [detailSelectedVersion]);

  useEffect(() => {
    setUsagePage(1);
  }, [usageSearchQuery, detailSelectedVersion]);

  // 图纸关联多选与批量下载状态
  const [selectedDrawingIds, setSelectedDrawingIds] = useState<string[]>([]);

  // 列表操作气泡菜单状态与审批流弹窗状态
  const [openActionMenuBomId, setOpenActionMenuBomId] = useState<string | null>(null);
  const [approvalModalBom, setApprovalModalBom] = useState<BOM | null>(null);

  // 反审批确认模态框状态
  const [reverseApprovalTargetBom, setReverseApprovalTargetBom] = useState<BOM | null>(null);
  const [reverseApprovalReason, setReverseApprovalReason] = useState<string>('需调整部分子件规格参数与装配工艺用量，回退至草稿再次修改。');
  const [approvalSearchQuery, setApprovalSearchQuery] = useState('');
  const [approvalViewMode, setApprovalViewMode] = useState<'timeline' | 'table'>(() => {
    return loadLocalState<'timeline' | 'table'>('bom_approvalViewMode', 'timeline');
  });

  useEffect(() => {
    saveLocalState('bom_approvalViewMode', approvalViewMode);
  }, [approvalViewMode]);

  // 删除二级确认模态框状态与全局反馈提示
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'bom' | 'structureNode';
    id: string;
    code: string;
    title: string;
  } | null>(null);
  // 作废二级确认模态框状态
  const [obsoleteTarget, setObsoleteTarget] = useState<BOM | null>(null);

  // 默认版本切换二次确认模态框状态
  const [defaultSwitchModal, setDefaultSwitchModal] = useState<{
    targetBom: BOM;
    existingDefaultBom: BOM;
    targetVersionNo?: string;
    isDetailMode?: boolean;
  } | null>(null);

  // 状态不满足（草稿或非发布状态）无法设为默认的提示模态框状态
  const [defaultInvalidStatusModal, setDefaultInvalidStatusModal] = useState<{
    bom: BOM;
    status: BOMStatus;
    versionNo?: string;
  } | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 自动隐藏 Toast
  React.useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // 操作日志查看详情状态
  const [selectedLogForDiff, setSelectedLogForDiff] = useState<BOMOperationLog | null>(null);

  // 批量操作与 BOM 批量导入模态框状态
  const [isBatchMenuOpen, setIsBatchMenuOpen] = useState(false);
  const [isBatchImportModalOpen, setIsBatchImportModalOpen] = useState(false);
  const [importMode, setImportMode] = useState<'NEW' | 'OVERWRITE' | 'APPEND'>('NEW');
  const [selectedDraftBomId, setSelectedDraftBomId] = useState<string>('');
  const [isTemplateHelpOpen, setIsTemplateHelpOpen] = useState(false);
  const [uploadedImportFile, setUploadedImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importStep, setImportStep] = useState<1 | 2 | 3>(1);

  // 草稿状态 BOM 版本选项列表 (用于覆盖 BOM 和追加 BOM 导入模式)
  const draftBomOptions = useMemo(() => {
    const options: Array<{ id: string; bomCode: string; productName: string; versionNo: string; label: string }> = [];
    bomList.forEach(b => {
      if (b.status === 'DRAFT' || b.status === 'REJECTED' || b.status === 'PENDING') {
        options.push({
          id: b.id,
          bomCode: b.bomCode,
          productName: b.productName || b.name,
          versionNo: b.versionNo,
          label: `${b.bomCode} - ${b.productName || b.name} (V${b.versionNo} - 草稿)`
        });
      } else if (b.versions && b.versions.some(v => v.status === 'DRAFT')) {
        b.versions.filter(v => v.status === 'DRAFT').forEach(v => {
          options.push({
            id: `${b.id}-${v.versionNo}`,
            bomCode: b.bomCode,
            productName: b.productName || b.name,
            versionNo: v.versionNo,
            label: `${b.bomCode} - ${b.productName || b.name} (${v.versionNo} - 草稿)`
          });
        });
      }
    });

    if (options.length === 0) {
      bomList.forEach(b => {
        options.push({
          id: b.id,
          bomCode: b.bomCode,
          productName: b.productName || b.name,
          versionNo: b.versionNo || 'V1',
          label: `${b.bomCode} - ${b.productName || b.name} (V${b.versionNo || '1'} - 草稿)`
        });
      });
    }

    return options;
  }, [bomList]);

  // 当导入弹窗开启或选项变动时，自动默认初始化选择第一个草稿 BOM 版本
  useEffect(() => {
    if (isBatchImportModalOpen && draftBomOptions.length > 0 && !selectedDraftBomId) {
      setSelectedDraftBomId(draftBomOptions[0].id);
    }
  }, [isBatchImportModalOpen, draftBomOptions, selectedDraftBomId]);

  // 选择产品物料模态框状态
  const [isSelectProductModalOpen, setIsSelectProductModalOpen] = useState(false);
  const [productModalSearchQuery, setProductModalSearchQuery] = useState('');

  // 全局点击自动关闭操作下拉气泡
  React.useEffect(() => {
    const handleGlobalClick = () => {
      setOpenActionMenuBomId(null);
      setIsBatchMenuOpen(false);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // BOM 对比模态框
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [compareVersionA, setCompareVersionA] = useState('V4');
  const [compareVersionB, setCompareVersionB] = useState('V3');

  // 复制 BOM 模态框状态 (原新增版本)
  const [isCreateVersionModalOpen, setIsCreateVersionModalOpen] = useState(false);
  const [createVersionTargetBom, setCreateVersionTargetBom] = useState<BOM | null>(null);
  const [createVersionMode, setCreateVersionMode] = useState<'COPY' | 'BLANK'>('COPY');
  const [selectedReuseVersionId, setSelectedReuseVersionId] = useState<string>('');
  // 复制目标产品类型: 'SAME_PRODUCT' (为当前产品复制新版本) | 'OTHER_PRODUCT' (复制为其他产品)
  const [copyTargetType, setCopyTargetType] = useState<'SAME_PRODUCT' | 'OTHER_PRODUCT'>('SAME_PRODUCT');
  const [copyTargetMaterialCode, setCopyTargetMaterialCode] = useState<string>('');
  const [copyProductSearchQuery, setCopyProductSearchQuery] = useState<string>('');

  // 选中的其他产品对象
  const selectedOtherProduct = useMemo(() => {
    if (!copyTargetMaterialCode) return null;
    return materials.find(m => m.materialCode === copyTargetMaterialCode || m.id === copyTargetMaterialCode) || null;
  }, [materials, copyTargetMaterialCode]);

  // 当选择其他产品时，计算该产品在系统中的预计新版本号
  const otherProductCalculatedVersionNo = useMemo(() => {
    if (!selectedOtherProduct) return '1';
    const matches = bomList.filter(b => b.productCode === selectedOtherProduct.materialCode);
    if (matches.length === 0) return '1';
    const versionNums = matches.map(b => {
      const num = parseInt((b.versionNo || '').replace(/[^0-9]/g, ''), 10);
      return isNaN(num) ? 1 : num;
    });
    return `${Math.max(1, ...versionNums) + 1}`;
  }, [bomList, selectedOtherProduct]);

  // 可供复用的旧版本列表与预估新版本号计算
  const availableReuseVersions = useMemo(() => {
    if (!createVersionTargetBom) return [];
    const matches = bomList.filter(
      b => b.productCode === createVersionTargetBom.productCode || b.bomCode === createVersionTargetBom.bomCode
    );
    return matches.length > 0 ? matches : [createVersionTargetBom];
  }, [bomList, createVersionTargetBom]);

  const nextCalculatedVersionNo = useMemo(() => {
    if (!createVersionTargetBom) return '1';
    const matches = bomList.filter(
      b => b.productCode === createVersionTargetBom.productCode || b.bomCode === createVersionTargetBom.bomCode
    );
    const versionNums = (matches.length > 0 ? matches : [createVersionTargetBom]).map(b => {
      const num = parseInt((b.versionNo || '').replace(/[^0-9]/g, ''), 10);
      return isNaN(num) ? 1 : num;
    });
    const maxVerNum = Math.max(1, ...versionNums);
    return `${maxVerNum + 1}`;
  }, [bomList, createVersionTargetBom]);

  // 新增 BOM 模态框预设物料选项 (用于选择物料信息后自动带出)
  const PRODUCT_INFO_PRESETS = [
    { id: 'PROD-001', code: 'CD-00009', name: '自动上下料升降机', spec: 'BK-090-L', category: '核心功能部件类', unit: '台' },
    { id: 'PROD-002', code: 'CD-00012', name: '高速SMT贴片定位主模组', spec: 'SMT-POS-v2', category: 'SMT传输与定位模块', unit: '套' },
    { id: 'PROD-003', code: 'CD-00015', name: '四轴机器人末端快换抓手组件', spec: 'GRIP-4A-300', category: '核心功能部件类', unit: '件' },
    { id: 'PROD-004', code: 'ELC-0088', name: '工业智能PLC控制主板集成模组', spec: 'PLC-INT-400', category: '电控元件类', unit: '台' },
    { id: 'PROD-005', code: 'MCH-0052', name: '高精度双轴导轨滑台支架底座', spec: 'MCH-SLIDE-200', category: '辅助结构件类', unit: '套' },
  ];

  // 新增 BOM 模态框
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newBomForm, setNewBomForm] = useState({
    bomCode: 'BOM202609090001',
    selectedProductId: '',
    productCode: '',
    productName: '',
    specName: '',
    category: '核心功能部件类',
    unit: '台',
    versionNo: '1',
    salesOrderId: '',
    salesOrderNo: '',
    mechanicalOwner: '',
    electricalOwner: '',
    remark: '',
  });

  // 新增 BOM 页面：结构与子件物料列表与弹窗状态
  const [createBomItems, setCreateBomItems] = useState<BOMItem[]>([]);
  const [selectedCreateBomItemIds, setSelectedCreateBomItemIds] = useState<string[]>([]);
  const [isAddMaterialModalOpen, setIsAddMaterialModalOpen] = useState(false);
  const [selectedMaterialModalIds, setSelectedMaterialModalIds] = useState<string[]>([]);
  const [materialSearchQuery, setMaterialSearchQuery] = useState('');
  const [detailAddParentId, setDetailAddParentId] = useState<string | null>(null);

  // 过滤仅包含当前选定物料/产品的销售订单
  const filteredSalesOrders = useMemo(() => {
    const pCode = (newBomForm.productCode || '').trim().toLowerCase();
    const pName = (newBomForm.productName || '').trim().toLowerCase();

    if (!pCode && !pName) {
      return [];
    }

    return (salesOrders || INITIAL_SALES_ORDERS).filter(so => {
      const soProductCode = (so.productCode || '').toLowerCase();
      const soProductName = (so.productName || '').toLowerCase();
      const soBomCode = (so.bomCode || '').toLowerCase();

      return (
        (pCode && (soProductCode.includes(pCode) || pCode.includes(soProductCode) || soBomCode.includes(pCode))) ||
        (pName && (soProductName.includes(pName) || pName.includes(soProductName)))
      );
    });
  }, [salesOrders, newBomForm.productCode, newBomForm.productName]);

  const generateNewBomCode = () => {
    const today = new Date();
    const dateStr = today.getFullYear().toString() +
      String(today.getMonth() + 1).padStart(2, '0') +
      String(today.getDate()).padStart(2, '0');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `BOM${dateStr}${rand}`;
  };

  const handleOpenAddModal = () => {
    const newCode = generateNewBomCode();
    setNewBomForm({
      bomCode: newCode,
      selectedProductId: '',
      productCode: '',
      productName: '',
      specName: '',
      category: '核心功能部件类',
      unit: '台',
      versionNo: '1',
      salesOrderId: '',
      salesOrderNo: '',
      mechanicalOwner: '张工 (机械研发部)',
      electricalOwner: '李工 (电气自动化部)',
      remark: '',
    });
    setCreateBomItems([]);
    setSelectedCreateBomItemIds([]);
    setSelectedMaterialModalIds([]);
    setViewMode('create');
  };

  const handleSelectPresetProduct = (presetId: string) => {
    const preset = PRODUCT_INFO_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setNewBomForm(f => ({
        ...f,
        selectedProductId: preset.id,
        productCode: preset.code,
        productName: preset.name,
        specName: preset.spec,
        category: preset.category,
        unit: preset.unit,
        salesOrderId: '',
        salesOrderNo: '',
      }));

      if (createBomItems.length === 0) {
        setCreateBomItems([
          {
            id: `ITEM-NEW-1`,
            materialId: 'MAT-001',
            materialCode: `${preset.code}-SUB01`,
            materialName: `${preset.name} 主框架组件`,
            materialSpec: preset.spec || 'STD-01',
            quantity: 1,
            unit: preset.unit || '套',
            drawingNo: `DRW-${preset.code}-01`,
            versionNo: 'V1.0',
            versionStatus: 'ACTIVE',
            isActiveVersion: true,
          },
          {
            id: `ITEM-NEW-2`,
            materialId: 'MAT-002',
            materialCode: 'M1002-LSR',
            materialName: '高精度气动定位导轨组件',
            materialSpec: 'LSR-200-IP65',
            quantity: 2,
            unit: '套',
            drawingNo: 'DRW-4001-LSR02',
            versionNo: 'V1.0',
            versionStatus: 'ACTIVE',
            isActiveVersion: true,
          },
        ]);
      }
    }
  };

  // SolidWorks 插件一键导入模态框状态与模板选择
  const [isSolidWorksImportModalOpen, setIsSolidWorksImportModalOpen] = useState(false);
  const [importModelPreset, setImportModelPreset] = useState<'laser_feeder' | 'robot_gripper' | 'servo_axis'>('laser_feeder');
  const [importProgress, setImportProgress] = useState<number | null>(null);

  // 执行 SolidWorks 插件一键导入
  const handleExecuteSolidWorksImport = () => {
    setImportProgress(10);
    const timer1 = setTimeout(() => setImportProgress(45), 200);
    const timer2 = setTimeout(() => setImportProgress(85), 450);
    const timer3 = setTimeout(() => {
      setImportProgress(100);
      setTimeout(() => {
        const timestamp = Date.now().toString().slice(-4);
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        
        let assemblyCode = `SW-ASY-${dateStr}-${timestamp}`;
        let assemblyName = '激光料斗送板三维装配总成';
        let specName = 'SW-2026-X800 PRO';
        let category = '核心功能部件类';
        let cadFileName = 'Laser_Feeder_Assembly_2026.sldasm';

        if (importModelPreset === 'robot_gripper') {
          assemblyCode = `SW-GRP-${dateStr}-${timestamp}`;
          assemblyName = '六轴机械手自适应气动夹爪组件';
          specName = 'GRP-AIR-120N';
          category = '核心功能部件类';
          cadFileName = 'Adaptive_Robotic_Gripper.sldasm';
        } else if (importModelPreset === 'servo_axis') {
          assemblyCode = `SW-SVO-${dateStr}-${timestamp}`;
          assemblyName = '高精伺服滑台模组传动单元';
          specName = 'SVO-AXIS-L1200';
          category = '原材料1001-标准机械件';
          cadFileName = 'Precision_Servo_Slide_Axis.sldasm';
        }

        const bomCode = `BOM${dateStr}${timestamp}`;
        const drawingNo = `DWG-${assemblyCode}`;

        // 创建图纸文件与版本
        const cadFile: DrawingFile = {
          id: `FILE-${Date.now()}-CAD`,
          fileName: cadFileName,
          fileType: 'CAD_3D',
          fileSize: 18452000,
          fileHash: 'e7a1029c3b8812f',
          uploadTime: new Date().toLocaleString(),
          uploader: '陈工 (SolidWorks)',
          previewUrl: '/drawings/sample_cad_3d.stp',
        };

        const drwFile: DrawingFile = {
          id: `FILE-${Date.now()}-DRW`,
          fileName: cadFileName.replace('.sldasm', '.slddrw'),
          fileType: 'DWG',
          fileSize: 4520000,
          fileHash: 'b9821aa0029c551',
          uploadTime: new Date().toLocaleString(),
          uploader: '陈工 (SolidWorks)',
          previewUrl: '/drawings/sample_cad_2d.dwg',
        };

        const pdfFile: DrawingFile = {
          id: `FILE-${Date.now()}-PDF`,
          fileName: cadFileName.replace('.sldasm', '.pdf'),
          fileType: 'PDF',
          fileSize: 2150000,
          fileHash: 'a1278ff99c4327e',
          uploadTime: new Date().toLocaleString(),
          uploader: '陈工 (SolidWorks)',
          previewUrl: '/drawings/sample_drawing.pdf',
        };

        const drawingVersion: DrawingVersion = {
          id: `VER-${Date.now()}-1`,
          drawingNo: drawingNo,
          versionNo: 'V1',
          status: 'DRAFT',
          isActive: true,
          isDefault: true,
          files: [cadFile, drwFile, pdfFile],
          notes: 'SolidWorks 客户端插件三维模型一键协同导入生成 V1 初稿',
          createdBy: '陈工 (SolidWorks)',
          createdAt: new Date().toLocaleString(),
          logs: [
            {
              id: `CL-${Date.now()}-1`,
              timestamp: new Date().toLocaleString(),
              operator: '陈工',
              action: '从 SolidWorks 2026 CAD 插件一键解析并生成三维装配体模型与工程图',
              details: `解析装配体特征树，提取 3D/2D 模型与标准 PDF，建立与物料 [${assemblyCode}] 强绑定关系。`,
            }
          ]
        };

        const drawingMaster: DrawingMaster = {
          id: `DM-${Date.now()}`,
          drawingNo: drawingNo,
          materialId: `MAT-${Date.now()}`,
          materialCode: assemblyCode,
          materialName: assemblyName,
          materialSpec: specName,
          category: category,
          latestVersion: 'V1',
          createdAt: new Date().toLocaleString(),
          updatedAt: new Date().toLocaleString(),
          versions: [drawingVersion],
        };

        // 创建物料档案
        const newMaterial: Material = {
          id: `MAT-${Date.now()}`,
          materialCode: assemblyCode,
          materialName: assemblyName,
          materialSpec: specName,
          unit: '台',
          category: category,
          drawingNo: drawingNo,
          hasDrawing: true,
          status: 'ACTIVE',
          remarks: `由 SolidWorks CAD 插件一键导入自动生成的物料档案。三维模型: ${cadFileName}`,
          createdAt: new Date().toLocaleString(),
          updatedAt: new Date().toLocaleString(),
        };

        // 创建草稿 BOM
        const newBOM: BOM = {
          id: `BOM-${Date.now()}`,
          bomCode: bomCode,
          name: `${assemblyName} BOM 清单`,
          productCode: assemblyCode,
          productName: assemblyName,
          specName: specName,
          versionNo: '1',
          status: 'DRAFT',
          isDefault: false,
          unit: '台',
          category: category,
          createdAt: new Date().toLocaleString(),
          updatedAt: new Date().toLocaleString(),
          updatedBy: '陈工 (SolidWorks)',
          remark: `通过 SolidWorks 插件一键导入生成。关联三维装配体 ${cadFileName}，处于草稿编辑中。`,
          items: [
            {
              id: `BOMI-${Date.now()}-1`,
              materialId: newMaterial.id,
              materialCode: assemblyCode,
              materialName: `${assemblyName} 主框架组件`,
              materialSpec: 'Q235A 表面阳极氧化',
              quantity: 1,
              unit: '套',
              drawingNo: drawingNo,
              drawingVersionId: drawingVersion.id,
              versionNo: 'V1',
              versionStatus: 'DRAFT',
              isActiveVersion: true,
            },
            {
              id: `BOMI-${Date.now()}-2`,
              materialId: 'MAT-SAMPLE-02',
              materialCode: 'MAT-STD-4008',
              materialName: '精密气缸导向驱动活塞',
              materialSpec: 'SMC-CDQ2B25-30DMZ',
              quantity: 2,
              unit: '个',
              drawingNo: 'DWG-STD-4008',
              drawingVersionId: 'VER-STD-01',
              versionNo: 'V1',
              versionStatus: 'PUBLISHED',
              isActiveVersion: true,
            },
            {
              id: `BOMI-${Date.now()}-3`,
              materialId: 'MAT-SAMPLE-03',
              materialCode: 'MAT-STD-5002',
              materialName: '内六角圆柱头螺钉',
              materialSpec: 'GB/T 70.1 M6×25 8.8级',
              quantity: 16,
              unit: '个',
              drawingNo: 'DWG-GB-M6-25',
              drawingVersionId: 'VER-M6-01',
              versionNo: 'V1',
              versionStatus: 'PUBLISHED',
              isActiveVersion: true,
            }
          ]
        };

        // 更新本地 bomList 列表
        setBomList(prev => [newBOM, ...prev]);
        setSelectedBOMId(newBOM.id);

        // 如果传入了全局同步回调，则同步到 App 全局 state
        if (onSolidWorksImport) {
          onSolidWorksImport({
            bom: newBOM,
            materials: [newMaterial],
            drawings: [drawingMaster],
          });
        }

        setImportProgress(null);
        setIsSolidWorksImportModalOpen(false);
      }, 300);
    }, 700);
  };

  // 预览模态框
  const [previewDrawingFile, setPreviewDrawingFile] = useState<{
    file: DrawingFile;
    version: DrawingVersion;
  } | null>(null);

  // 切换分类展开折叠
  const toggleCategory = (catId: string) => {
    setExpandedCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  // 一键全部展开 / 收起所有分类
  const handleToggleExpandAllCategories = (expand: boolean) => {
    const next: Record<string, boolean> = {};
    const traverse = (cats: typeof BOM_PROTOTYPE_CATEGORIES) => {
      cats.forEach(c => {
        next[c.id] = expand;
        if (c.children && c.children.length > 0) {
          traverse(c.children);
        }
      });
    };
    traverse(BOM_PROTOTYPE_CATEGORIES);
    setExpandedCategories(next);
  };

  // 搜索过滤后的分类列表
  const filteredCategories = useMemo(() => {
    if (!categorySearchQuery.trim()) return BOM_PROTOTYPE_CATEGORIES;
    const q = categorySearchQuery.toLowerCase().trim();
    return BOM_PROTOTYPE_CATEGORIES.filter(cat => {
      const matchParent = cat.name.toLowerCase().includes(q);
      const matchChild = cat.children?.some(c => c.name.toLowerCase().includes(q));
      return matchParent || matchChild;
    });
  }, [categorySearchQuery]);

  // 切换树节点展开折叠 (默认状态视为展开 true)
  const toggleTreeNode = (nodeId: string) => {
    setExpandedTreeNodes(prev => ({
      ...prev,
      [nodeId]: prev[nodeId] !== undefined ? !prev[nodeId] : false,
    }));
  };

  // 展开 / 折叠全部树节点
  const handleExpandAllTree = (expand: boolean) => {
    const map: Record<string, boolean> = {};
    const traverse = (nodes: BOMStructureNode[]) => {
      nodes.forEach(n => {
        map[n.id] = expand;
        if (n.children && n.children.length > 0) {
          traverse(n.children);
        }
      });
    };
    traverse(currentStructureTree);
    setExpandedTreeNodes(map);
  };

  // 过滤后的 BOM 列表
  const filteredBoms = useMemo(() => {
    return bomList.filter(bom => {
      // 状态筛选
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'DRAFT' && bom.status !== 'DRAFT') return false;
        if (statusFilter === 'PENDING' && bom.status !== 'PENDING') return false;
        if (statusFilter === 'PUBLISHED' && bom.status !== 'PUBLISHED' && bom.status !== 'PUBLISHED') return false;
        if (statusFilter === 'REJECTED' && bom.status !== 'REJECTED') return false;
        if (statusFilter === 'FROZEN' && bom.status !== 'FROZEN') return false;
        if (statusFilter === 'OBSOLETE' && bom.status !== 'OBSOLETE') return false;
      }

      // 是否默认筛选
      if (defaultFilter === 'YES' && !bom.isDefault) return false;
      if (defaultFilter === 'NO' && bom.isDefault) return false;

      // 搜索词筛选
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = bom.bomCode?.toLowerCase().includes(q);
        const matchProdCode = bom.productCode?.toLowerCase().includes(q);
        const matchProdName = bom.productName?.toLowerCase().includes(q);
        const matchSpec = bom.specName?.toLowerCase().includes(q);
        if (!matchCode && !matchProdCode && !matchProdName && !matchSpec) return false;
      }

      // 分类筛选
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'mech_std' && bom.category !== '机械标准件') return false;
        if (selectedCategory.startsWith('raw_1') && !bom.category?.includes('原材料1') && bom.category !== '原材料1') return false;
        if (selectedCategory.startsWith('raw_2') && !bom.category?.includes('原材料2') && bom.category !== '原材料2') return false;
        if (selectedCategory.startsWith('raw_0005') && !bom.category?.includes('原材料0005') && bom.category !== '原材料0005') return false;
        if (selectedCategory === 'core_part' && bom.category !== '核心功能部件类') return false;
        if (selectedCategory === 'smt_loc' && bom.category !== 'SMT传输与定位模块') return false;
        if (selectedCategory === 'elec_ctrl' && bom.category !== '电控元件类') return false;
        if (selectedCategory === 'aux_struct' && bom.category !== '辅助结构件类') return false;
      }

      return true;
    });
  }, [bomList, statusFilter, defaultFilter, searchQuery, selectedCategory]);

  // 各状态数量统计
  const statusCounts = useMemo(() => {
    let draft = 0;
    let pending = 0;
    let published = 0;
    let rejected = 0;
    let frozen = 0;
    let obsolete = 0;
    let isDefaultCount = 0;
    let notDefaultCount = 0;

    bomList.forEach(b => {
      if (b.status === 'DRAFT') draft++;
      else if (b.status === 'PENDING') pending++;
      else if (b.status === 'PUBLISHED') published++;
      else if (b.status === 'REJECTED') rejected++;
      else if (b.status === 'FROZEN') frozen++;
      else if (b.status === 'OBSOLETE') obsolete++;

      if (b.isDefault) isDefaultCount++;
      else notDefaultCount++;
    });

    return {
      all: bomList.length,
      draft,
      pending,
      published,
      rejected,
      frozen,
      obsolete,
      isDefaultCount,
      notDefaultCount,
    };
  }, [bomList]);

  // 分页数据
  const paginatedBoms = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBoms.slice(start, start + pageSize);
  }, [filteredBoms, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredBoms.length / pageSize) || 1;

  // 列表行多选处理
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRowIds(paginatedBoms.map(b => b.id));
    } else {
      setSelectedRowIds([]);
    }
  };

  const handleToggleRow = (bomId: string) => {
    setSelectedRowIds(prev =>
      prev.includes(bomId) ? prev.filter(c => c !== bomId) : [...prev, bomId]
    );
  };

  // 设为默认 - 核心更新函数
  const executeSetDefaultBOM = (targetBom: BOM, oldDefaultBom: BOM | null) => {
    const nowTime = new Date().toISOString().replace('T', ' ').slice(0, 19);

    setBomList(prev =>
      prev.map(b => {
        if (b.productCode === targetBom.productCode) {
          const isTarget = b.id === targetBom.id;
          const isOldDefault = oldDefaultBom && b.id === oldDefaultBom.id;

          if (isTarget) {
            const newLog: BOMOperationLog = {
              id: `LOG-${Date.now()}-${b.id}`,
              bomId: b.bomCode,
              versionNo: b.versionNo ? (b.versionNo.startsWith('V') ? b.versionNo : `V${b.versionNo}`) : 'V1',
              opType: 'PROPERTY_UPDATE',
              opTypeName: '默认版本变更',
              title: '设为默认BOM版本',
              details: oldDefaultBom
                ? `替换原默认版本 V${oldDefaultBom.versionNo || '1'} (${oldDefaultBom.bomCode})，设为物料 [${b.productCode}] 的新默认BOM。`
                : `已成功将版本 V${b.versionNo || '1'} 设为物料 [${b.productCode}] 的生效默认BOM。`,
              operator: '当前登录用户',
              timestamp: nowTime,
            };
            return {
              ...b,
              isDefault: true,
              versions: b.versions?.map(v => ({
                ...v,
                isDefault: v.versionNo === `V${b.versionNo}` || v.versionNo === b.versionNo,
              })),
              operationLogs: [newLog, ...(b.operationLogs || [])],
            };
          }

          if (isOldDefault) {
            const cancelLog: BOMOperationLog = {
              id: `LOG-${Date.now()}-${b.id}`,
              bomId: b.bomCode,
              versionNo: b.versionNo ? (b.versionNo.startsWith('V') ? b.versionNo : `V${b.versionNo}`) : 'V1',
              opType: 'PROPERTY_UPDATE',
              opTypeName: '默认版本变更',
              title: '取消默认BOM版本',
              details: `物料默认版本已切换至 V${targetBom.versionNo || '1'} (${targetBom.bomCode})，本版本取消默认标记。`,
              operator: '当前登录用户',
              timestamp: nowTime,
            };
            return {
              ...b,
              isDefault: false,
              versions: b.versions?.map(v => ({
                ...v,
                isDefault: false,
              })),
              operationLogs: [cancelLog, ...(b.operationLogs || [])],
            };
          }

          return {
            ...b,
            isDefault: false,
            versions: b.versions?.map(v => ({
              ...v,
              isDefault: false,
            })),
          };
        }
        return b;
      })
    );

    if (onAuditTriggered) {
      onAuditTriggered(
        'BOM默认版本变更',
        oldDefaultBom
          ? `物料 [${targetBom.productCode}] 默认BOM版本由 V${oldDefaultBom.versionNo || '1'} 切换为 V${targetBom.versionNo || '1'}`
          : `物料 [${targetBom.productCode}] 默认BOM版本设为 V${targetBom.versionNo || '1'}`,
        targetBom.bomCode
      );
    }

    if (oldDefaultBom) {
      setToastMessage(
        `已成功取消原版本 V${oldDefaultBom.versionNo || '1'} 的默认设置，将 V${targetBom.versionNo || '1'} 设为物料 [${targetBom.productCode}] 的新默认BOM！`
      );
    } else {
      setToastMessage(
        `已成功将 [${targetBom.bomCode}] (V${targetBom.versionNo || '1'}) 设为物料 [${targetBom.productCode}] 的默认BOM版本！`
      );
    }
  };

  // 设为默认 (列表入口)
  const handleToggleDefault = (bomId: string, productCode: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const targetBom = bomList.find(b => b.id === bomId);
    if (!targetBom) return;

    // 规则 1: 草稿状态无法设置为默认版本，只有已发布才能设置为默认版本
    if (targetBom.status !== 'PUBLISHED') {
      setDefaultInvalidStatusModal({
        bom: targetBom,
        status: targetBom.status,
        versionNo: targetBom.versionNo,
      });
      setToastMessage(
        targetBom.status === 'DRAFT'
          ? '草稿状态无法设置为默认版本，只有已发布才能设置为默认版本！'
          : `当前单据处于【${getStatusBadge(targetBom.status).label}】状态，无法设为默认版本，只有【已发布】状态才能设为默认！`
      );
      return;
    }

    // 若当前单据已经是默认版本
    if (targetBom.isDefault) {
      setToastMessage(
        `当前 BOM [${targetBom.bomCode}] (V${targetBom.versionNo || '1'}) 已是物料 [${targetBom.productCode}] 的生效默认版本。`
      );
      return;
    }

    // 规则 2: 同物料只能有一个为默认版本，如果之前有默认版本存在设置的时候就要提示是否去掉以前的改成新的选中的
    const existingDefaultBom = bomList.find(
      b => b.productCode === productCode && b.isDefault && b.id !== bomId
    );

    if (existingDefaultBom) {
      // 提示确认是否去掉以前的改成新的选中的
      setDefaultSwitchModal({
        targetBom,
        existingDefaultBom,
        targetVersionNo: targetBom.versionNo ? (targetBom.versionNo.startsWith('V') ? targetBom.versionNo : `V${targetBom.versionNo}`) : 'V1',
        isDetailMode: false,
      });
    } else {
      // 之前没有默认版本，直接设置为默认版本
      executeSetDefaultBOM(targetBom, null);
    }
  };

  // 详情页版本设为默认执行函数
  const executeDetailSetVersionDefault = (targetVersionNo: string) => {
    const vClean = targetVersionNo.startsWith('V') ? targetVersionNo : `V${targetVersionNo}`;
    const nowTime = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const baseVersions = currentBOM.versions && currentBOM.versions.length > 0
      ? currentBOM.versions
      : (currentBOM.productCode === 'CD-00005' || currentBOM.bomCode === 'BOM202608060006')
      ? CD00005_VERSIONS
      : currentVersions;

    const updatedVersions = baseVersions.map(v => ({
      ...v,
      isDefault: v.versionNo === vClean,
    }));

    const newOpLog: BOMOperationLog = {
      id: `LOG-${Date.now()}`,
      bomId: currentBOM.bomCode,
      versionNo: vClean,
      opType: 'PROPERTY_UPDATE',
      opTypeName: '默认版本变更',
      title: '设为默认BOM版本',
      details: `已将版本 ${vClean} 设为物料 [${currentBOM.productCode}] 的生效默认版本。`,
      operator: '当前登录用户',
      timestamp: nowTime,
    };

    setBomList(prev =>
      prev.map(b => {
        if (b.id === currentBOM.id) {
          return {
            ...b,
            isDefault: true,
            versionNo: vClean.replace(/^V/, ''),
            versions: updatedVersions,
            operationLogs: [newOpLog, ...(b.operationLogs || [])],
          };
        } else if (b.productCode === currentBOM.productCode) {
          return {
            ...b,
            isDefault: false,
            versions: b.versions?.map(v => ({ ...v, isDefault: false })),
          };
        }
        return b;
      })
    );

    if (onAuditTriggered) {
      onAuditTriggered(
        'BOM默认版本变更',
        `物料 [${currentBOM.productCode}] 默认BOM版本设为 ${vClean}`,
        currentBOM.bomCode
      );
    }

    setToastMessage(`已成功将版本 ${vClean} 设为物料 [${currentBOM.productCode}] 的默认BOM版本！`);
  };

  // 详情页版本设为默认入口
  const handleDetailSetVersionDefault = (ver: BOMVersionInfo) => {
    // 规则 1: 草稿状态无法设置为默认版本，只有已发布才能设置为默认版本
    if (ver.status !== 'PUBLISHED') {
      setDefaultInvalidStatusModal({
        bom: currentBOM,
        status: ver.status,
        versionNo: ver.versionNo,
      });
      setToastMessage(
        ver.status === 'DRAFT'
          ? '草稿状态无法设置为默认版本，只有已发布才能设置为默认版本！'
          : `当前版本处于【${getStatusBadge(ver.status).label}】状态，无法设为默认版本，只有【已发布】状态才能设为默认！`
      );
      return;
    }

    if (ver.isDefault) {
      setToastMessage(`当前版本 (${ver.versionNo}) 已是默认版本。`);
      return;
    }

    // 检查是否已有其他默认版本存在（同物料或同一BOM其他版本）
    const existingVerDefault = currentVersions.find(v => v.isDefault && v.versionNo !== ver.versionNo);
    const existingBomDefault = bomList.find(
      b => b.productCode === currentBOM.productCode && b.isDefault && b.id !== currentBOM.id
    );

    if (existingVerDefault || existingBomDefault) {
      const oldVerLabel = existingVerDefault ? existingVerDefault.versionNo : `V${existingBomDefault?.versionNo || '1'}`;
      const oldBomCode = existingBomDefault ? existingBomDefault.bomCode : currentBOM.bomCode;

      const dummyExisting: BOM = existingBomDefault || {
        ...currentBOM,
        versionNo: oldVerLabel.replace(/^V/, ''),
        bomCode: oldBomCode,
      };

      const dummyTarget: BOM = {
        ...currentBOM,
        versionNo: ver.versionNo.replace(/^V/, ''),
      };

      setDefaultSwitchModal({
        targetBom: dummyTarget,
        existingDefaultBom: dummyExisting,
        targetVersionNo: ver.versionNo,
        isDetailMode: true,
      });
    } else {
      executeDetailSetVersionDefault(ver.versionNo);
    }
  };

  // 确认切换默认版本 (模态框点击“确认切换”)
  const handleConfirmSwitchDefault = () => {
    if (!defaultSwitchModal) return;
    const { targetBom, existingDefaultBom, targetVersionNo, isDetailMode } = defaultSwitchModal;

    if (isDetailMode && targetVersionNo) {
      executeDetailSetVersionDefault(targetVersionNo);
    } else {
      executeSetDefaultBOM(targetBom, existingDefaultBom);
    }
    setDefaultSwitchModal(null);
  };

  // 进入详情页
  const handleEnterDetail = (bom: BOM, forceEdit = false) => {
    setSelectedBOMId(bom.id);
    const ver = bom.versionNo
      ? (bom.versionNo.startsWith('V') ? bom.versionNo : `V${bom.versionNo}`)
      : (bom.bomCode === 'BOM202608060006' ? 'V4' : 'V1');
    setDetailSelectedVersion(ver);
    setIsDetailEditMode(forceEdit);
    setTreeMultiSelectIds([]);
    setDrawingTreeMultiSelectIds([]);
    setViewMode('detail');
  };

  // 提交/保存新建 BOM
  const handleCreateBOM = (targetStatus: 'DRAFT' | 'PENDING_REVIEW' = 'DRAFT') => {
    const finalProductCode = newBomForm.productCode.trim() || 'CD-00009';
    const finalProductName = newBomForm.productName.trim() || '自动上下料升降机';

    const createdBOM: BOM = {
      id: `BOM-${Date.now()}`,
      bomCode: newBomForm.bomCode.trim() || generateNewBomCode(),
      productCode: finalProductCode,
      productName: finalProductName,
      specName: newBomForm.specName.trim() || '-',
      name: `${finalProductName} BOM`,
      versionNo: newBomForm.versionNo || '1',
      unit: newBomForm.unit.trim() || '台',
      isDefault: false,
      status: targetStatus,
      mechanicalOwner: newBomForm.mechanicalOwner.trim() || '当前登录用户',
      electricalOwner: newBomForm.electricalOwner.trim() || '-',
      remark: newBomForm.salesOrderNo
        ? `关联销售订单 [${newBomForm.salesOrderNo}] - ${newBomForm.remark.trim() || '新建物料清单'}`
        : (newBomForm.remark.trim() || '新建物料清单'),
      category: newBomForm.category.trim() || '核心功能部件类',
      createdAt: new Date().toLocaleString(),
      updatedAt: new Date().toLocaleString(),
      updatedBy: '当前登录用户',
      items: createBomItems,
      structureTree: createBomItems.map((item, idx) => ({
        id: `NODE-${Date.now()}-${idx}`,
        materialCode: item.materialCode,
        materialName: item.materialName,
        category: item.category || item.materialSpec,
        spec: item.materialSpec,
        unit: item.unit,
        standardQty: item.quantity,
        level: 1,
        drawingNo: item.drawingNo,
        drawingVersionNo: item.versionNo || 'V1.0',
      })),
      drawings: [],
      versions: [
        {
          id: `VER-BOM-${Date.now()}`,
          versionNo: `V${newBomForm.versionNo || '1'}`,
          status: targetStatus,
          creator: '当前登录用户',
          updateTime: new Date().toISOString().slice(0, 10),
          isDefault: false,
          isCurrent: true,
          notes: targetStatus === 'PENDING_REVIEW' ? '提交审批' : '初版草稿',
          itemsCount: createBomItems.length,
        },
      ],
      operationLogs: [
        {
          id: `LOG-${Date.now()}`,
          bomId: newBomForm.bomCode.trim() || 'BOM202609090001',
          versionNo: `V${newBomForm.versionNo || '1'}`,
          opType: targetStatus === 'PENDING_REVIEW' ? 'SUBMIT_AUDIT' : 'CREATE',
          opTypeName: targetStatus === 'PENDING_REVIEW' ? '提交审批' : '创建BOM',
          title: targetStatus === 'PENDING_REVIEW' ? '新增并提交审批' : '新建 BOM',
          details: `新建 BOM 单据，对应产品: ${finalProductCode} - ${finalProductName}${newBomForm.salesOrderNo ? `，关联销售订单: ${newBomForm.salesOrderNo}` : ''}`,
          operator: '当前登录用户',
          timestamp: new Date().toLocaleString(),
        },
      ],
    };

    setBomList(prev => [createdBOM, ...prev]);
    setSelectedBOMId(createdBOM.id);
    setViewMode('list');
    if (targetStatus === 'PENDING_REVIEW') {
      setToastMessage(`已成功提交 BOM 单据 [${createdBOM.bomCode}] 进入审批！`);
    } else {
      setToastMessage(`已成功保存 BOM 单据 [${createdBOM.bomCode}]！`);
    }
  };

  // 状态颜色辅助
  const getStatusBadge = (status: BOMStatus) => {
    switch (status) {
      case 'PUBLISHED':
        return {
          label: '已发布',
          className: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
        };
      case 'DRAFT':
        return {
          label: '草稿',
          className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
        };
      case 'PENDING':
        return {
          label: '待审批',
          className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
        };
      case 'REJECTED':
        return {
          label: '驳回',
          className: 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800',
        };
      case 'FROZEN':
        return {
          label: '冻结',
          className: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800',
        };
      case 'OBSOLETE':
        return {
          label: '已作废',
          className: 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-500 border border-slate-300 dark:border-slate-700',
        };
      default:
        return {
          label: '草稿',
          className: 'bg-slate-100 text-slate-700 border border-slate-200',
        };
    }
  };

  // 图纸文件格式颜色
  const getFileTypeBadge = (fileType: string) => {
    const t = fileType.toUpperCase();
    if (t.includes('DXF') || t.includes('DWG')) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 border-blue-300';
    }
    if (t.includes('STEP') || t.includes('STP') || t.includes('SLDPRT') || t.includes('IGES')) {
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 border-purple-300';
    }
    if (t.includes('PDF')) {
      return 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300 border-red-300';
    }
    if (t.includes('JPG') || t.includes('PNG') || t.includes('IMAGE')) {
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border-emerald-300';
    }
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300';
  };

  // 操作日志类型颜色
  const getLogTypeBadge = (opType: string) => {
    switch (opType) {
      case 'QTY_CHANGE':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300';
      case 'ITEM_ADD':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';
      case 'ITEM_DELETE':
        return 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300';
      case 'UPGRADE':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300';
      case 'DRAWING_BIND':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300';
      case 'AUDIT_APPROVE':
        return 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300';
      case 'SUBMIT_AUDIT':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300';
      case 'SET_DEFAULT':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  // 打开图纸预览
  const handleOpenDrawingPreview = (drawing: BOMDrawingLink) => {
    const mockFile: DrawingFile = {
      id: drawing.id,
      fileName: drawing.fileName,
      fileType: drawing.fileType,
      fileSize: drawing.fileSize || 5200000,
      fileHash: 'SHA-256:d8a2f910e34c',
      uploadTime: drawing.updateTime,
      uploader: '工程部 (PLM)',
      previewUrl: drawing.previewUrl,
    };
    const mockVer: DrawingVersion = {
      id: `VER-${drawing.id}`,
      drawingNo: drawing.drawingNo,
      versionNo: drawing.versionNo || 'V4',
      status: 'PUBLISHED',
      isActive: true,
      files: [mockFile],
      createdAt: drawing.updateTime,
      createdBy: '工程部',
    };
    setPreviewDrawingFile({ file: mockFile, version: mockVer });
  };

  // 图纸多选与批量下载操作
  const handleToggleDrawingSelect = (id: string) => {
    setSelectedDrawingIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllDrawings = (checked: boolean) => {
    if (checked) {
      setSelectedDrawingIds(currentDrawings.map(d => d.id));
    } else {
      setSelectedDrawingIds([]);
    }
  };

  const handleBatchDownloadDrawings = () => {
    const targetDrawings = selectedDrawingIds.length > 0
      ? currentDrawings.filter(d => selectedDrawingIds.includes(d.id))
      : currentDrawings;

    if (targetDrawings.length === 0) {
      alert('请先选择需要下载的图纸文件！');
      return;
    }

    const listNames = targetDrawings.map(d => `• [${d.materialCode}] ${d.fileName} (.${d.fileType})`).join('\n');
    alert(`【BOM 图纸附件批量打包下载】\n\n已成功生成 ZIP 压缩工程归档包（共 ${targetDrawings.length} 份文件）：\n${listNames}\n\n已完成工程图档完整性校验与归档打包。`);
  };

  // 图纸单张下载
  const handleDownloadSingleDrawing = (drawing: BOMDrawingLink) => {
    alert(`【图纸下载】正在下载 [${drawing.materialCode}] 的图纸文件: ${drawing.fileName}`);
  };

  // 单据操作菜单处理函数 (与用户截图各状态 1:1 精确绑定)
  // 1. 复制 BOM
  const handleCopyBOM = (bom: BOM) => {
    setOpenActionMenuBomId(null);
    const newCode = `BOM${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(Math.floor(1000 + Math.random() * 9000))}`;
    const newBomItem: BOM = {
      ...bom,
      id: `BOM-${Date.now()}`,
      bomCode: newCode,
      productName: `${bom.productName} (副本)`,
      status: 'DRAFT',
      isDefault: false,
      versionNo: '1',
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    setBomList(prev => [newBomItem, ...prev]);
    alert(`【BOM 复制成功】\n\n已成功复制生成新草稿 BOM:\n• 编码: ${newCode}\n• 产品: ${newBomItem.productName}`);
  };

  // 2. 提交审批 (草稿/驳回 -> 审批中)
  const handleSubmitApproval = (bom: BOM) => {
    setOpenActionMenuBomId(null);
    const nowTime = new Date().toISOString().replace('T', ' ').slice(0, 19);
    setBomList(prev =>
      prev.map(b => {
        if (b.id === bom.id) {
          const existingApprovals = getBOMApprovalRecords(b);
          const existingLogs = b.operationLogs || CD00005_OPERATION_LOGS;
          const newOpLog: BOMOperationLog = {
            id: `LOG-${Date.now()}`,
            bomId: b.bomCode,
            versionNo: b.versionNo ? `V${b.versionNo}` : 'V1',
            opType: 'SUBMIT_AUDIT',
            opTypeName: '提交审批',
            title: '提交 BOM 审批流程',
            details: `BOM 单据 [${b.bomCode}] ${b.productName} 提交审核流转`,
            operator: '陈工 (设计部)',
            timestamp: nowTime,
          };
          const newApprovalRec: BOMApprovalRecord = {
            id: `APR-${Date.now()}`,
            bomId: b.bomCode,
            versionNo: b.versionNo ? `V${b.versionNo}` : 'V1',
            nodeName: `${existingApprovals.length + 1}. 提交审批`,
            fromStatus: b.status,
            toStatus: 'PENDING',
            action: 'SUBMIT',
            actionName: '提交审批',
            approver: '陈工',
            department: '机械设计研发组 (发起人)',
            timestamp: nowTime,
            comment: `子件定型及关联图纸核查完毕，提交结构主管与工艺组审核。`,
            opinionType: 'INFO',
          };
          return {
            ...b,
            status: 'PENDING' as BOMStatus,
            versions: b.versions?.map(v => (v.versionNo === `V${b.versionNo}` || v.versionNo === b.versionNo) ? { ...v, status: 'PENDING' as BOMStatus } : v),
            updatedAt: nowTime,
            operationLogs: [newOpLog, ...existingLogs],
            approvalRecords: [...existingApprovals, newApprovalRec],
          };
        }
        return b;
      })
    );
    if (onAuditTriggered) {
      onAuditTriggered('BOM 提交审批', `BOM [${bom.bomCode}] ${bom.productName} 已提交审核流程`, bom.bomCode);
    }
    setToastMessage(`单据 [${bom.bomCode}] 已成功提交审批，状态已更新为【待审批】！`);
  };

  // 3. 撤销审批 (审批中 -> 草稿)
  const handleRevokeApproval = (bom: BOM) => {
    setOpenActionMenuBomId(null);
    const nowTime = new Date().toISOString().replace('T', ' ').slice(0, 19);
    setBomList(prev =>
      prev.map(b => {
        if (b.id === bom.id) {
          const existingApprovals = getBOMApprovalRecords(b);
          const existingLogs = b.operationLogs || CD00005_OPERATION_LOGS;
          const newOpLog: BOMOperationLog = {
            id: `LOG-${Date.now()}`,
            bomId: b.bomCode,
            versionNo: b.versionNo ? `V${b.versionNo}` : 'V1',
            opType: 'PROPERTY_UPDATE',
            opTypeName: '撤回审批',
            title: '撤回审批申请',
            details: `BOM 单据 [${b.bomCode}] 撤回审批流程，恢复为草稿状态`,
            operator: '陈工 (设计部)',
            timestamp: nowTime,
          };
          const newApprovalRec: BOMApprovalRecord = {
            id: `APR-${Date.now()}`,
            bomId: b.bomCode,
            versionNo: b.versionNo ? `V${b.versionNo}` : 'V1',
            nodeName: `${existingApprovals.length + 1}. 撤回审批申请`,
            fromStatus: 'PENDING',
            toStatus: 'DRAFT',
            action: 'SUBMIT',
            actionName: '撤回审批',
            approver: '陈工',
            department: '机械设计研发组',
            timestamp: nowTime,
            comment: `设计人员主动撤回审批申请，退回草稿重新核对物料清单。`,
            opinionType: 'INFO',
          };
          return {
            ...b,
            status: 'DRAFT' as BOMStatus,
            versions: b.versions?.map(v => (v.versionNo === `V${b.versionNo}` || v.versionNo === b.versionNo) ? { ...v, status: 'DRAFT' as BOMStatus } : v),
            updatedAt: nowTime,
            operationLogs: [newOpLog, ...existingLogs],
            approvalRecords: [...existingApprovals, newApprovalRec],
          };
        }
        return b;
      })
    );
    setToastMessage(`单据 [${bom.bomCode}] 已成功撤回审批申请，恢复为【草稿】状态！`);
  };

  // 4. 反审批操作 (基于已审批通过/已发布状态反审批 -> 回退至草稿)
  const handleOpenReverseApprovalModal = (bom: BOM) => {
    setOpenActionMenuBomId(null);
    setReverseApprovalTargetBom(bom);
    setReverseApprovalReason('需调整部分子件规格参数与装配工艺用量，反审批回退至草稿状态再次修改。');
  };

  const handleConfirmReverseApproval = () => {
    if (!reverseApprovalTargetBom) return;
    const target = reverseApprovalTargetBom;
    const nowTime = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const reasonText = reverseApprovalReason.trim() || '需调整部分子件规格与装配用量，反审批回退至草稿。';

    const newOpLog: BOMOperationLog = {
      id: `LOG-${Date.now()}`,
      bomId: target.bomCode,
      versionNo: target.versionNo ? `V${target.versionNo}` : 'V1',
      opType: 'REVERSE_APPROVAL',
      opTypeName: '反审批',
      title: 'BOM 单据反审批回退',
      details: `BOM 单据 [${target.bomCode}] 执行反审批，单据状态由【已发布】回退为【草稿】。反审批意见: ${reasonText}`,
      operator: '张主管 (工程组)',
      timestamp: nowTime,
    };

    const targetVersionNo = target.versionNo ? (target.versionNo.startsWith('V') ? target.versionNo : `V${target.versionNo}`) : 'V1';
    const existingApprovals = getBOMApprovalRecords(target);
    const existingLogs = target.operationLogs || CD00005_OPERATION_LOGS;

    const newApprovalRec: BOMApprovalRecord = {
      id: `APR-${Date.now()}`,
      bomId: target.bomCode,
      versionNo: targetVersionNo,
      nodeName: `${existingApprovals.length + 1}. 反审批回退`,
      fromStatus: 'PUBLISHED',
      toStatus: 'DRAFT',
      action: 'REVERSE_APPROVAL',
      actionName: '反审批',
      approver: '张主管',
      department: '研发设计工程组 (审核人)',
      timestamp: nowTime,
      comment: reasonText,
      opinionType: 'REVERT',
    };

    setBomList(prev =>
      prev.map(b => {
        if (b.id === target.id) {
          return {
            ...b,
            status: 'DRAFT' as BOMStatus,
            isDefault: false,
            versions: b.versions?.map(v =>
              (v.versionNo === targetVersionNo || v.versionNo === target.versionNo)
                ? { ...v, status: 'DRAFT' as BOMStatus, isDefault: false }
                : v
            ),
            updatedAt: nowTime,
            updatedBy: '张主管',
            operationLogs: [newOpLog, ...existingLogs],
            approvalRecords: [...existingApprovals, newApprovalRec],
          };
        }
        return b;
      })
    );

    if (onAuditTriggered) {
      onAuditTriggered('BOM 反审批', `BOM [${target.bomCode}] ${target.productName} 已执行反审批，状态回退至草稿`, target.bomCode);
    }

    setReverseApprovalTargetBom(null);
    setToastMessage(`单据 [${target.bomCode}] 已成功反审批，状态已恢复为【草稿】！`);
  };

  const handleFreezeBOM = (bom: BOM) => {
    setOpenActionMenuBomId(null);
    setBomList(prev =>
      prev.map(b => (b.id === bom.id ? {
        ...b,
        status: 'FROZEN' as BOMStatus,
        preFreezeStatus: b.status,
        versions: b.versions?.map(v => (v.versionNo === `V${b.versionNo}` || v.versionNo === b.versionNo) ? { ...v, status: 'FROZEN' as BOMStatus } : v),
        updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        operationLogs: [
          {
            id: `LOG-${Date.now()}`,
            bomId: b.bomCode,
            versionNo: b.versionNo,
            opType: 'PROPERTY_UPDATE',
            opTypeName: '冻结',
            title: '单据状态冻结',
            details: `BOM 单据 [${b.bomCode}] 状态变更为【冻结】`,
            operator: '当前登录用户',
            timestamp: new Date().toLocaleString(),
          },
          ...(b.operationLogs || []),
        ],
      } : b))
    );
    setToastMessage(`单据 [${bom.bomCode}] 状态已变更为【冻结】`);
  };

  const handleUnfreezeBOM = (bom: BOM) => {
    setOpenActionMenuBomId(null);
    const restoredStatus: BOMStatus = bom.preFreezeStatus || 'PUBLISHED';
    setBomList(prev =>
      prev.map(b => (b.id === bom.id ? {
        ...b,
        status: restoredStatus,
        versions: b.versions?.map(v => (v.versionNo === `V${b.versionNo}` || v.versionNo === b.versionNo) ? { ...v, status: restoredStatus } : v),
        updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        operationLogs: [
          {
            id: `LOG-${Date.now()}`,
            bomId: b.bomCode,
            versionNo: b.versionNo,
            opType: 'PROPERTY_UPDATE',
            opTypeName: '解除冻结',
            title: '解除单据冻结',
            details: `BOM 单据 [${b.bomCode}] 解除冻结，恢复为【${restoredStatus === 'PUBLISHED' ? '已发布' : restoredStatus}】状态`,
            operator: '当前登录用户',
            timestamp: new Date().toLocaleString(),
          },
          ...(b.operationLogs || []),
        ],
      } : b))
    );
    setToastMessage(`单据 [${bom.bomCode}] 已成功解除冻结`);
  };

  // 直接复制 BOM 为新草稿版本（无需弹窗选择，直接复制生成新草稿进入编辑态，草稿中可随时点击产品旁编辑图标更换产品）
  const handleDirectCopyBOM = (bom: BOM) => {
    setOpenActionMenuBomId(null);

    // 计算下一个草稿版本号
    const matches = bomList.filter(
      b => b.productCode === bom.productCode || b.bomCode === bom.bomCode
    );
    const versionNums = (matches.length > 0 ? matches : [bom]).map(b => {
      const num = parseInt((b.versionNo || '').replace(/[^0-9]/g, ''), 10);
      return isNaN(num) ? 1 : num;
    });
    (bom.versions || []).forEach(v => {
      const num = parseInt((v.versionNo || '').replace(/[^0-9]/g, ''), 10);
      if (!isNaN(num)) versionNums.push(num);
    });
    const maxVerNum = Math.max(1, ...versionNums);
    const nextVerNo = `${maxVerNum + 1}`;
    const newVersionTag = `V${nextVerNo}`;

    const itemsToUse = JSON.parse(JSON.stringify(bom.items || []));
    const treeToUse = JSON.parse(JSON.stringify(bom.structureTree || []));

    const opTitle = `复用版本 V${bom.versionNo} 直接复制新版本草稿`;
    const opDetails = `已直接从版本 V${bom.versionNo} 复制生成新版本 ${newVersionTag} 草稿。该草稿完整保留原有物料结构，您可直接在草稿状态下点击产品旁的编辑图标更换关联产品，或在此版本中继续维护子件。`;

    const newBomVersionItem: BOMVersionInfo = {
      id: `VER-${Date.now()}`,
      versionNo: newVersionTag,
      status: 'DRAFT',
      isDefault: false,
      updateTime: new Date().toISOString().replace('T', ' ').slice(0, 19),
      creator: '当前登录用户',
      notes: `基于版本 V${bom.versionNo} 复制生成草稿`,
    };

    const newBomItem: BOM = {
      ...bom,
      id: `BOM-${Date.now()}`,
      bomCode: bom.bomCode,
      productCode: bom.productCode,
      productName: bom.productName,
      specName: bom.specName,
      unit: bom.unit || '台',
      drawingNo: bom.drawingNo,
      drawingVersionNo: bom.drawingVersionNo,
      name: `${bom.productName} BOM`,
      versionNo: nextVerNo,
      status: 'DRAFT',
      isDefault: false,
      items: itemsToUse,
      structureTree: treeToUse,
      createdAt: new Date().toLocaleString(),
      updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      updatedBy: '当前登录用户',
      remark: `基于版本 V${bom.versionNo} 复制生成新版本 ${newVersionTag} 草稿`,
      versions: [newBomVersionItem, ...(bom.versions || [])],
      operationLogs: [
        {
          id: `LOG-${Date.now()}`,
          bomId: bom.bomCode,
          versionNo: nextVerNo,
          opType: 'PROPERTY_UPDATE',
          opTypeName: '复制BOM',
          title: opTitle,
          details: opDetails,
          operator: '当前登录用户',
          timestamp: new Date().toLocaleString(),
        },
        ...(bom.operationLogs || []),
      ],
    };

    // 同步更新同一产品其他 BOM 条目中的 versions 列表
    setBomList(prev => [
      newBomItem,
      ...prev.map(b => {
        if (b.bomCode === bom.bomCode || b.productCode === bom.productCode) {
          const existingVers = b.versions || [];
          if (!existingVers.some(v => v.versionNo === newVersionTag)) {
            return {
              ...b,
              versions: [newBomVersionItem, ...existingVers],
            };
          }
        }
        return b;
      }),
    ]);

    // 自动切换并进入该新复制草稿的详情编辑模式
    setSelectedBOMId(newBomItem.id);
    setDetailSelectedVersion(newVersionTag);
    setIsDetailEditMode(true);
    setViewMode('detail');
    setToastMessage(`已直接复制生成新版本 ${newVersionTag} 草稿！草稿状态下可点击产品旁编辑图标更换关联产品。`);
  };

  // 复制 BOM 调用入口：直接调用直连复制
  const handleOpenCreateVersionModal = (bom: BOM) => {
    handleDirectCopyBOM(bom);
  };

  // 确认执行复制 BOM (支持当前产品顺延版本 / 选择其他产品复制新 BOM)
  const handleConfirmCreateVersion = () => {
    if (!createVersionTargetBom) return;

    const target = createVersionTargetBom;
    const sourceBom = bomList.find(b => b.id === selectedReuseVersionId) || target;
    const isOtherProduct = copyTargetType === 'OTHER_PRODUCT' && !!selectedOtherProduct;

    let targetProductCode = target.productCode;
    let targetProductName = target.productName;
    let targetSpecName = target.specName;
    let targetUnit = target.unit || '台';
    let targetDrawingNo = target.drawingNo;
    let targetDrawingVersionNo = target.drawingVersionNo;
    let targetBomCode = target.bomCode;
    const targetVersionNo = isOtherProduct ? otherProductCalculatedVersionNo : nextCalculatedVersionNo;

    if (isOtherProduct && selectedOtherProduct) {
      targetProductCode = selectedOtherProduct.materialCode;
      targetProductName = selectedOtherProduct.materialName;
      targetSpecName = selectedOtherProduct.materialSpec || '';
      targetUnit = selectedOtherProduct.unit || '台';

      // 匹配图号与版本
      let matchedDm = drawingMasters.find(
        d =>
          (selectedOtherProduct.drawingNo && d.drawingNo === selectedOtherProduct.drawingNo) ||
          d.materialCode === selectedOtherProduct.materialCode ||
          d.materialId === selectedOtherProduct.id
      );
      targetDrawingNo =
        selectedOtherProduct.drawingNo ||
        matchedDm?.drawingNo ||
        (selectedOtherProduct.materialCode.startsWith('CD-')
          ? `DWG-${selectedOtherProduct.materialCode}-ASM`
          : `DWG-${selectedOtherProduct.materialCode}`);
      targetDrawingVersionNo = matchedDm?.currentPublishedVersion || 'V1';

      // 生成或匹配该产品的 BOM 编码
      const existingProductBom = bomList.find(b => b.productCode === selectedOtherProduct.materialCode);
      targetBomCode = existingProductBom ? existingProductBom.bomCode : generateNewBomCode();
    }

    const itemsToUse = createVersionMode === 'BLANK'
      ? []
      : JSON.parse(JSON.stringify(sourceBom.items || []));
    const treeToUse = createVersionMode === 'BLANK'
      ? []
      : JSON.parse(JSON.stringify(sourceBom.structureTree || []));

    const opTitle = isOtherProduct
      ? `从产品 [${target.productCode}] 复制生成新产品 BOM`
      : (createVersionMode === 'BLANK' ? '创建全新空白版本' : `复用旧版本 V${sourceBom.versionNo} 复制新版本`);

    const opDetails = isOtherProduct
      ? `基于产品 [${target.productCode}] ${target.productName} (版本 V${sourceBom.versionNo}) 复用物料清单与结构，为新产品 [${targetProductCode}] ${targetProductName} 复制生成全新 BOM 版本 V${targetVersionNo} 草稿。`
      : (createVersionMode === 'BLANK'
          ? `已为产品 [${targetProductCode}] 创建全新空白 BOM 版本 V${targetVersionNo}，等待搭建结构树。`
          : `已从版本 V${sourceBom.versionNo} 复用结构数据生成新版本 V${targetVersionNo} 草稿。`);

    const newBomItem: BOM = {
      ...sourceBom,
      id: `BOM-${Date.now()}`,
      bomCode: targetBomCode,
      productCode: targetProductCode,
      productName: targetProductName,
      specName: targetSpecName,
      unit: targetUnit,
      drawingNo: targetDrawingNo,
      drawingVersionNo: targetDrawingVersionNo,
      name: `${targetProductName} BOM`,
      versionNo: targetVersionNo,
      status: 'DRAFT',
      isDefault: false,
      items: itemsToUse,
      structureTree: treeToUse,
      createdAt: new Date().toLocaleString(),
      updatedAt: new Date().toISOString().slice(0, 10),
      updatedBy: '当前登录用户',
      remark: isOtherProduct
        ? `复制自产品 [${target.productCode}] ${target.productName} (版本 V${sourceBom.versionNo})`
        : (createVersionMode === 'BLANK'
            ? `全新空白版本 V${targetVersionNo}`
            : `基于版本 V${sourceBom.versionNo} 复用结构数据复制新版本 V${targetVersionNo}`),
      operationLogs: [
        {
          id: `LOG-${Date.now()}`,
          bomId: targetBomCode,
          versionNo: targetVersionNo,
          opType: 'PROPERTY_UPDATE',
          opTypeName: '复制BOM',
          title: opTitle,
          details: opDetails,
          operator: '当前登录用户',
          timestamp: new Date().toLocaleString(),
        },
        ...(isOtherProduct ? [] : (target.operationLogs || [])),
      ],
    };

    setBomList(prev => [newBomItem, ...prev]);
    setIsCreateVersionModalOpen(false);

    // 自动跳转进入该新版本的详情编辑模式
    setSelectedBOMId(newBomItem.id);
    setDetailSelectedVersion(`V${targetVersionNo}`);
    setIsDetailEditMode(true);
    setViewMode('detail');

    if (isOtherProduct) {
      setToastMessage(`已成功为产品 [${targetProductCode}] ${targetProductName} 复制生成新 BOM 版本 V${targetVersionNo}`);
    } else {
      const sourceVersionLabel = createVersionMode === 'COPY'
        ? `复用 V${sourceBom.versionNo} 结构`
        : '全新空白结构';
      setToastMessage(`已成功复制创建新版本 V${targetVersionNo} (${sourceVersionLabel})`);
    }
  };

  // 4. 作废单据 (已审批/已发布 -> 已作废，触发二级确认)
  const handleObsoleteBOM = (bom: BOM) => {
    setOpenActionMenuBomId(null);
    setObsoleteTarget(bom);
  };

  const handleConfirmObsolete = () => {
    if (!obsoleteTarget) return;
    setBomList(prev =>
      prev.map(b => (b.id === obsoleteTarget.id ? { ...b, status: 'OBSOLETE', isDefault: false } : b))
    );
    setToastMessage(`单据 [${obsoleteTarget.bomCode}] 状态已成功作废！`);
    setObsoleteTarget(null);
  };

  // 5. 删除单据 (触发二级确认模态框)
  const handleDeleteBOM = (bom: BOM) => {
    setOpenActionMenuBomId(null);
    setDeleteTarget({
      type: 'bom',
      id: bom.id,
      code: bom.bomCode,
      title: bom.productName,
    });
  };

  // 6. 编辑单据
  const handleEditBOM = (bom: BOM) => {
    setOpenActionMenuBomId(null);
    handleEnterDetail(bom, true);
  };

  // 确认执行删除 (BOM 单据或 BOM 结构物料节点)
  const handleConfirmDelete = () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'bom') {
      const targetId = deleteTarget.id;
      setBomList(prev => prev.filter(b => b.id !== targetId));
      setSelectedRowIds(prev => prev.filter(id => id !== targetId));
      if (viewMode === 'detail' && selectedBOMId === targetId) {
        setViewMode('list');
      }
      setToastMessage(`已成功删除单据 [${deleteTarget.code}] ${deleteTarget.title}`);
    } else if (deleteTarget.type === 'structureNode') {
      const targetNodeId = deleteTarget.id;
      const deleteFromTree = (nodes: BOMStructureNode[]): BOMStructureNode[] => {
        return nodes
          .filter(n => n.id !== targetNodeId)
          .map(n => ({
            ...n,
            children: n.children ? deleteFromTree(n.children) : undefined,
          }));
      };
      setBomList(prev => prev.map(b => {
        if (b.id !== currentBOM.id) return b;
        return {
          ...b,
          structureTree: deleteFromTree(b.structureTree || CD00005_STRUCTURE_TREE),
        };
      }));
      setToastMessage(`已整条删除物料 [${deleteTarget.code}] ${deleteTarget.title}`);
    }

    setDeleteTarget(null);
  };

  // 详情页树节点数据
  const currentStructureTree: BOMStructureNode[] = useMemo(() => {
    return currentBOM.structureTree || CD00005_STRUCTURE_TREE;
  }, [currentBOM]);

  // 搜索过滤后的 BOM 结构树 (用于左侧树展示)
  const displayStructureTree: BOMStructureNode[] = useMemo(() => {
    if (!treeSearchQuery.trim()) return currentStructureTree;
    const q = treeSearchQuery.toLowerCase().trim();
    const filterNodes = (nodes: BOMStructureNode[]): BOMStructureNode[] => {
      const res: BOMStructureNode[] = [];
      for (const node of nodes) {
        const matchesSelf =
          node.materialCode.toLowerCase().includes(q) ||
          node.materialName.toLowerCase().includes(q) ||
          (node.drawingNo && node.drawingNo.toLowerCase().includes(q)) ||
          (node.spec && node.spec.toLowerCase().includes(q));
        const filteredChildren = node.children ? filterNodes(node.children) : [];
        if (matchesSelf || filteredChildren.length > 0) {
          res.push({
            ...node,
            children: filteredChildren.length > 0 ? filteredChildren : node.children,
          });
        }
      }
      return res;
    };
    return filterNodes(currentStructureTree);
  }, [currentStructureTree, treeSearchQuery]);

  const handleBOMPropertyChange = (field: keyof BOM, value: string) => {
    setBomList(prev => prev.map(b => b.id === currentBOM.id ? { ...b, [field]: value } : b));
  };

  const handleUpdateStructureNode = (nodeId: string, updates: Partial<BOMStructureNode>) => {
    // 产品下的物料的子物料不允许修改标准用量
    if (updates.standardQty !== undefined) {
      const isLevel1 = currentStructureTree.some(n => n.id === nodeId);
      if (!isLevel1) {
        setToastMessage('产品下的物料的子物料不允许修改标准用量');
        return;
      }
    }

    setBomList(prev => prev.map(b => {
      if (b.id !== currentBOM.id) return b;
      const updateTree = (nodes: BOMStructureNode[]): BOMStructureNode[] => {
        return nodes.map(n => {
          if (n.id === nodeId) {
            return { ...n, ...updates };
          }
          if (n.children) {
            return { ...n, children: updateTree(n.children) };
          }
          return n;
        });
      };
      return { ...b, structureTree: updateTree(b.structureTree || CD00005_STRUCTURE_TREE) };
    }));
  };

  // 检查物料是否已存在于当前结构树中
  const checkIsInCurrentTree = useCallback((nodes: BOMStructureNode[], code: string): boolean => {
    for (const n of nodes) {
      if (n.materialCode === code) return true;
      if (n.children && checkIsInCurrentTree(n.children, code)) return true;
    }
    return false;
  }, []);

  // 获取物料的可选 BOM 版本及其对应的子物料结构
  const getNodeBOMVersions = useCallback((
    node: { id?: string; materialCode: string; materialName: string; category?: string; versionNo?: string },
    currentBoms: BOM[]
  ) => {
    // 1. 特别定制：2米移载机 (CG-00002) 及其子件体系
    if (node.materialCode === 'CG-00002' || node.materialName?.includes('2米移载机')) {
      const baseChildren = CD00005_STRUCTURE_TREE.find(n => n.materialCode === 'CG-00002')?.children || [];
      return [
        {
          versionNo: '4',
          label: 'V4.0',
          status: 'PUBLISHED',
          children: baseChildren.map(c => ({ ...c, parentId: node.id })),
        },
        {
          versionNo: '3',
          label: 'V3.0',
          status: 'PUBLISHED',
          children: baseChildren.slice(0, 10).map((c, idx) => ({
            ...c,
            id: `NODE-02-V3-${idx + 1}`,
            parentId: node.id,
            standardQty: Math.max(1, (c.standardQty || 1) + (idx % 2 === 0 ? 1 : 0)),
          })),
        },
        {
          versionNo: '2',
          label: 'V2.0',
          status: 'PUBLISHED',
          children: baseChildren.slice(0, 6).map((c, idx) => ({
            ...c,
            id: `NODE-02-V2-${idx + 1}`,
            parentId: node.id,
            standardQty: Math.max(1, c.standardQty || 1),
          })),
        },
        {
          versionNo: '1',
          label: 'V1.0',
          status: 'PUBLISHED',
          children: baseChildren.slice(0, 3).map((c, idx) => ({
            ...c,
            id: `NODE-02-V1-${idx + 1}`,
            parentId: node.id,
            standardQty: Math.max(1, c.standardQty || 1),
          })),
        },
        {
          versionNo: '12',
          label: 'V12.0',
          status: 'DRAFT',
          children: baseChildren.map(c => ({ ...c, parentId: node.id })),
        },
      ];
    }

    // 2. 从 bomList 中匹配相同物料编码的 BOM
    const matchedBoms = currentBoms.filter(
      b => b.productCode === node.materialCode || (b.productName && b.productName === node.materialName)
    );
    if (matchedBoms.length > 0) {
      return matchedBoms.map(b => {
        const children = (b.structureTree && b.structureTree.length > 0)
          ? b.structureTree.map((c, idx) => ({
              ...c,
              id: `SUB-${node.id || 'N'}-${b.versionNo}-${idx + 1}`,
              level: 2,
              parentId: node.id,
            }))
          : [
              {
                id: `SUB-${node.id || 'N'}-${b.versionNo}-01`,
                materialCode: `${node.materialCode}-01`,
                materialName: `${node.materialName}主体框架`,
                category: '结构件',
                spec: 'STD-FRAME-01',
                unit: '件',
                standardQty: 1,
                level: 2,
                parentId: node.id,
                businessAttr: '自制',
                brand: '自主研发',
              },
              {
                id: `SUB-${node.id || 'N'}-${b.versionNo}-02`,
                materialCode: `${node.materialCode}-02`,
                materialName: '精密传动定位组件',
                category: '传动件',
                spec: 'LOC-TR-02',
                unit: '套',
                standardQty: 1,
                level: 2,
                parentId: node.id,
                businessAttr: '自制',
                brand: '自主研发',
              },
              {
                id: `SUB-${node.id || 'N'}-${b.versionNo}-03`,
                materialCode: '01-00WJ-00001',
                materialName: '锁紧螺母',
                category: '五金类',
                spec: 'M35-1.5',
                unit: 'PCS',
                standardQty: 4,
                level: 2,
                parentId: node.id,
                businessAttr: '采购',
                brand: '标准件',
              },
            ];
        return {
          versionNo: b.versionNo,
          label: b.versionNo.startsWith('V')
            ? `${b.versionNo} (${b.status === 'PUBLISHED' ? '已发布' : '草稿'})`
            : `V${b.versionNo} (${b.status === 'PUBLISHED' ? '已发布' : '草稿'})`,
          status: b.status,
          children,
        };
      });
    }

    // 3. 自制、成品、半成品、组件类物料，若未独立建立主档BOM，但属于多层装配物料
    const isAssembly =
      node.category?.includes('成品') ||
      node.category?.includes('部件') ||
      node.category?.includes('模组') ||
      node.category?.includes('自制') ||
      node.category === 'SMT传输与定位模块' ||
      (node.versionNo && node.versionNo !== '-');

    if (isAssembly) {
      return [
        {
          versionNo: 'V2.0',
          label: 'V2.0',
          status: 'PUBLISHED',
          children: [
            {
              id: `SUB-${node.id || 'N'}-V2-1`,
              materialCode: `${node.materialCode}-P01`,
              materialName: `${node.materialName}支撑底座`,
              category: '结构件',
              spec: 'BASE-P01',
              unit: '件',
              standardQty: 1,
              level: 2,
              parentId: node.id,
              businessAttr: '自制',
              brand: '自主研发',
            },
            {
              id: `SUB-${node.id || 'N'}-V2-2`,
              materialCode: `${node.materialCode}-P02`,
              materialName: '滑动导向连接件',
              category: '结构件',
              spec: 'SLD-CONN-02',
              unit: '件',
              standardQty: 2,
              level: 2,
              parentId: node.id,
              businessAttr: '自制',
              brand: '自主研发',
            },
            {
              id: `SUB-${node.id || 'N'}-V2-3`,
              materialCode: '01-00WJ-00002',
              materialName: '滚花销钉',
              category: '五金类',
              spec: 'M3-6',
              unit: 'PCS',
              standardQty: 2,
              level: 2,
              parentId: node.id,
              businessAttr: '采购',
              brand: '标准件',
            },
            {
              id: `SUB-${node.id || 'N'}-V2-4`,
              materialCode: '01-00WJ-00001',
              materialName: '锁紧螺母',
              category: '五金类',
              spec: 'M35-1.5',
              unit: 'PCS',
              standardQty: 4,
              level: 2,
              parentId: node.id,
              businessAttr: '采购',
              brand: '标准件',
            },
          ],
        },
        {
          versionNo: 'V1.0',
          label: 'V1.0',
          status: 'PUBLISHED',
          children: [
            {
              id: `SUB-${node.id || 'N'}-V1-1`,
              materialCode: `${node.materialCode}-P01`,
              materialName: `${node.materialName}支撑底座`,
              category: '结构件',
              spec: 'BASE-P01',
              unit: '件',
              standardQty: 1,
              level: 2,
              parentId: node.id,
              businessAttr: '自制',
              brand: '自主研发',
            },
            {
              id: `SUB-${node.id || 'N'}-V1-2`,
              materialCode: '01-00WJ-00001',
              materialName: '锁紧螺母',
              category: '五金类',
              spec: 'M35-1.5',
              unit: 'PCS',
              standardQty: 2,
              level: 2,
              parentId: node.id,
              businessAttr: '采购',
              brand: '标准件',
            },
          ],
        },
      ];
    }

    return [];
  }, []);

  // 切换指定物料的 BOM 版本，并自动带出该版本的 BOM 子物料
  const handleSwitchNodeBOMVersion = (nodeId: string, targetVersionNo: string) => {
    let targetNode: BOMStructureNode | null = null;
    const findNode = (nodes: BOMStructureNode[]): BOMStructureNode | null => {
      for (const n of nodes) {
        if (n.id === nodeId) return n;
        if (n.children) {
          const found = findNode(n.children);
          if (found) return found;
        }
      }
      return null;
    };

    targetNode = findNode(currentStructureTree);
    if (!targetNode) return;

    const versions = getNodeBOMVersions(targetNode, bomList);
    const matchedVersion = versions.find(v => v.versionNo === targetVersionNo);
    if (!matchedVersion) return;

    const newChildren = matchedVersion.children.map(c => ({
      ...c,
      parentId: targetNode!.id,
      level: 2,
    }));

    setBomList(prev => prev.map(b => {
      if (b.id !== currentBOM.id) return b;
      const updateTree = (nodes: BOMStructureNode[]): BOMStructureNode[] => {
        return nodes.map(n => {
          if (n.id === nodeId) {
            return {
              ...n,
              versionNo: targetVersionNo,
              children: newChildren,
            };
          }
          if (n.children) {
            return { ...n, children: updateTree(n.children) };
          }
          return n;
        });
      };
      return {
        ...b,
        structureTree: updateTree(b.structureTree || CD00005_STRUCTURE_TREE),
      };
    }));

    setExpandedTreeNodes(prev => ({ ...prev, [nodeId]: true }));
    setToastMessage(`已将物料 [${targetNode.materialCode}] 的 BOM 版本切换为 ${targetVersionNo}，已自动带出 ${newChildren.length} 项子组件`);
  };

  // 删除物料明细 (仅产品下一级平级物料支持整条删除，BOM内部子物料不允许删除)
  const handleDeleteStructureNode = (node: BOMStructureNode) => {
    const isLevel1 = currentStructureTree.some(n => n.id === node.id);
    if (!isLevel1) {
      setToastMessage('物料 BOM 内部的子物料不允许删除，仅支持修改标准用量');
      return;
    }
    const targetNodeId = node.id;
    const deleteFromTree = (nodes: BOMStructureNode[]): BOMStructureNode[] => {
      return nodes
        .filter(n => n.id !== targetNodeId)
        .map(n => ({
          ...n,
          children: n.children ? deleteFromTree(n.children) : undefined,
        }));
    };
    setBomList(prev => prev.map(b => {
      if (b.id !== currentBOM.id) return b;
      return {
        ...b,
        structureTree: deleteFromTree(b.structureTree || CD00005_STRUCTURE_TREE),
      };
    }));
    if (selectedTreeNodeId === node.id) {
      setSelectedTreeNodeId(null);
    }
    setToastMessage(`已整条删除物料 [${node.materialCode}] ${node.materialName}`);
  };

  // 删除当前在详情页选中的物料节点 (仅产品下一级平级物料支持)
  const handleDeleteCurrentSelectedNode = () => {
    if (!selectedTreeNode) {
      setToastMessage('请先在左侧选择要删除的物料节点（最上级产品不可删除）');
      return;
    }
    const isLevel1 = currentStructureTree.some(n => n.id === selectedTreeNode.id);
    if (!isLevel1) {
      setToastMessage('物料 BOM 内部的子物料不允许删除，仅支持修改标准用量');
      return;
    }
    handleDeleteStructureNode(selectedTreeNode);
  };

  // 批量删除选中的物料节点 (编辑状态左侧BOM结构树支持多选，可以批量删除)
  const handleBatchDeleteStructureNodes = () => {
    if (treeMultiSelectIds.length === 0) {
      setToastMessage('请先勾选需要批量删除的物料节点');
      return;
    }
    const idsToDelete = new Set(treeMultiSelectIds);
    const deleteBatchFromTree = (nodes: BOMStructureNode[]): BOMStructureNode[] => {
      return nodes
        .filter(n => !idsToDelete.has(n.id))
        .map(n => ({
          ...n,
          children: n.children ? deleteBatchFromTree(n.children) : undefined,
        }));
    };
    setBomList(prev => prev.map(b => {
      if (b.id !== currentBOM.id) return b;
      return {
        ...b,
        structureTree: deleteBatchFromTree(b.structureTree || CD00005_STRUCTURE_TREE),
      };
    }));
    if (selectedTreeNodeId && idsToDelete.has(selectedTreeNodeId)) {
      setSelectedTreeNodeId(null);
    }
    const count = treeMultiSelectIds.length;
    setTreeMultiSelectIds([]);
    setToastMessage(`已批量删除选中的 ${count} 项物料节点`);
  };

  // 保存详情页编辑
  const handleSaveDetailEdit = () => {
    setIsDetailEditMode(false);
    setTreeMultiSelectIds([]);
    setBomList(prev => prev.map(b => {
      if (b.id !== currentBOM.id) return b;
      return {
        ...b,
        updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        updatedBy: '当前登录用户',
      };
    }));
    setToastMessage('已成功保存草稿');
  };

  // 取消详情页编辑
  const handleCancelDetailEdit = () => {
    setIsDetailEditMode(false);
    setTreeMultiSelectIds([]);
    setToastMessage('已退出编辑模式');
  };

  // 向当前 BOM 结构树添加物料 (添加的物料都是平级，都在产品下面一级)
  const handleAddStructureNodeFromMaterial = (m: Material) => {
    const matAny = m as any;
    const newNode: BOMStructureNode = {
      id: `NODE-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      materialCode: m.materialCode,
      materialName: m.materialName,
      category: m.category || '零部件',
      spec: m.materialSpec || '-',
      unit: m.unit || '件',
      standardQty: 1,
      level: 1,
      drawingNo: m.drawingNo || (m.materialCode.startsWith('CD-') ? `DWG-${m.materialCode}-ASM` : `DWG-${m.materialCode}`),
      drawingVersionNo: matAny.drawingVersionNo || 'V1.0',
      businessAttr: matAny.sourceType || (m.category === '电控元件类' ? '采购' : (m.category === 'SMT传输与定位模块' ? '外协' : '自制')),
      brand: matAny.brand || '自主研发',
      standardCost: matAny.standardCost || 50,
      lossRate: matAny.lossRate || 0,
      stock: matAny.stock || 100,
      remarks: matAny.remarks || '',
      route: matAny.route || '标准制造工艺路线',
    };

    // 若物料具备 BOM 版本，默认带出首个 BOM 版本及其子物料
    const versions = getNodeBOMVersions(newNode, bomList);
    if (versions.length > 0) {
      newNode.versionNo = versions[0].versionNo;
      newNode.children = versions[0].children.map(c => ({
        ...c,
        parentId: newNode.id,
        level: 2,
      }));
    }

    setBomList(prev => prev.map(b => {
      if (b.id !== currentBOM.id) return b;
      const currentTree = b.structureTree || CD00005_STRUCTURE_TREE;
      return { ...b, structureTree: [...currentTree, newNode] };
    }));
    setSelectedTreeNodeId(newNode.id);
    if (newNode.children && newNode.children.length > 0) {
      setExpandedTreeNodes(prev => ({ ...prev, [newNode.id]: true }));
      setToastMessage(`已添加物料 [${newNode.materialCode}]，检测到该物料具备 BOM 版本，已自动关联 ${newNode.versionNo.startsWith('V') ? newNode.versionNo : `V${newNode.versionNo}`} 并带出 ${newNode.children.length} 项子物料`);
    } else {
      setToastMessage(`已向产品添加物料 [${newNode.materialCode}] ${newNode.materialName}`);
    }
  };

  // 批量向当前 BOM 结构树添加选中的物料 (全部在产品下面一级，平级添加)
  const handleBatchAddStructureNodesFromMaterials = (selectedMats: Material[]) => {
    const newNodes: BOMStructureNode[] = selectedMats.map((m, idx) => {
      const matAny = m as any;
      const node: BOMStructureNode = {
        id: `NODE-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        materialCode: m.materialCode,
        materialName: m.materialName,
        category: m.category || '零部件',
        spec: m.materialSpec || '-',
        unit: m.unit || '件',
        standardQty: 1,
        level: 1,
        drawingNo: m.drawingNo || (m.materialCode.startsWith('CD-') ? `DWG-${m.materialCode}-ASM` : `DWG-${m.materialCode}`),
        drawingVersionNo: matAny.drawingVersionNo || 'V1.0',
        businessAttr: matAny.sourceType || (m.category === '电控元件类' ? '采购' : (m.category === 'SMT传输与定位模块' ? '外协' : '自制')),
        brand: matAny.brand || '自主研发',
        standardCost: matAny.standardCost || 50,
        lossRate: matAny.lossRate || 0,
        stock: matAny.stock || 100,
        remarks: matAny.remarks || '',
        route: matAny.route || '标准制造工艺路线',
      };
      const versions = getNodeBOMVersions(node, bomList);
      if (versions.length > 0) {
        node.versionNo = versions[0].versionNo;
        node.children = versions[0].children.map(c => ({
          ...c,
          parentId: node.id,
          level: 2,
        }));
      }
      return node;
    });

    setBomList(prev => prev.map(b => {
      if (b.id !== currentBOM.id) return b;
      const currentTree = b.structureTree || CD00005_STRUCTURE_TREE;
      return { ...b, structureTree: [...currentTree, ...newNodes] };
    }));
    setToastMessage(`已批量向产品添加 ${newNodes.length} 项物料（全部平级于产品下一级）`);
  };

  const handleAddStructureNode = (parentId?: string) => {
    const newNode: BOMStructureNode = {
      id: `NODE-${Date.now()}`,
      materialCode: `MAT-${Date.now().toString().slice(-4)}`,
      materialName: '新加物料',
      category: '新增件',
      spec: '通用',
      unit: '个',
      standardQty: 1,
      level: parentId ? 2 : 1,
    };
    setBomList(prev => prev.map(b => {
      if (b.id !== currentBOM.id) return b;
      let newTree = b.structureTree || CD00005_STRUCTURE_TREE;
      if (!parentId) {
        newTree = [newNode, ...newTree];
      } else {
        const addToTree = (nodes: BOMStructureNode[]): BOMStructureNode[] => {
          return nodes.map(n => {
            if (n.id === parentId) {
              return { ...n, children: [newNode, ...(n.children || [])] };
            }
            if (n.children) {
              return { ...n, children: addToTree(n.children) };
            }
            return n;
          });
        };
        newTree = addToTree(newTree);
      }
      return { ...b, structureTree: newTree };
    }));
  };

  // 解析 BOM 树中每个物料节点的图纸与版本信息（自制物料具备专属图号与图号版本）
  const getNodeDrawingInfo = useCallback(
    (node: BOMStructureNode) => {
      const attr = node.businessAttr || '';
      const isSelfMade =
        attr.includes('自制') ||
        attr.includes('自产') ||
        node.category?.includes('自制');

      const mat = materials.find(
        m => m.materialCode === node.materialCode || m.id === node.materialCode
      );
      const matIsSelfMade =
        mat && (mat.source === '自制' || mat.businessAttr?.includes('自制'));

      const effectiveIsSelfMade = isSelfMade || Boolean(matIsSelfMade);

      if (!effectiveIsSelfMade) {
        return {
          isSelfMade: false,
          drawingNo: undefined,
          drawingVersionNo: undefined,
        };
      }

      // 自制物料：查找工程图号
      let drawingNo = node.drawingNo;

      // 1. 从当前 BOM 或原型关联图纸中查找匹配的物料编码
      if (!drawingNo) {
        const rawD = (currentBOM.drawings || CD00005_DRAWINGS).find(
          d => d.materialCode === node.materialCode
        );
        if (rawD && rawD.drawingNo) {
          const cleanNo = rawD.drawingNo.replace(/\.(DXF|PDF|STEP|SLDPRT|SLDDRW|JPG|PNG|DWG)$/i, '');
          const parts = cleanNo.split('_');
          drawingNo = parts.length > 1 && parts[0].length >= 3 ? parts[0] : cleanNo;
        }
      }

      // 2. 从 drawingMasters 匹配
      let dm = drawingMasters.find(
        d =>
          (drawingNo && d.drawingNo === drawingNo) ||
          d.materialCode === node.materialCode ||
          d.materialId === node.materialCode ||
          (mat?.drawingNo && d.drawingNo === mat.drawingNo)
      );

      if (!drawingNo && dm) {
        drawingNo = dm.drawingNo;
      }

      // 3. 从物料主档图号
      if (!drawingNo && mat?.drawingNo) {
        drawingNo = mat.drawingNo;
      }

      // 4. 自制件图号编码兜底规范：DWG-{物料编码}
      if (!drawingNo) {
        drawingNo = `DWG-${node.materialCode}`;
      }

      if (!dm && drawingNo) {
        dm = drawingMasters.find(d => d.drawingNo === drawingNo);
      }

      // 计算生效图号版本
      const defaultVer =
        dm?.versions?.find(v => v.isDefault || (v.status === 'PUBLISHED' && v.isActive)) ||
        dm?.versions?.[0];

      const drawingVersionNo =
        (dm && (defaultVer?.versionNo || dm.currentPublishedVersion || dm.latestVersion)) ||
        node.drawingVersionNo ||
        (node.versionNo && node.versionNo !== '-'
          ? (node.versionNo.startsWith('V') ? node.versionNo : `V${node.versionNo}`)
          : 'V1');

      return {
        isSelfMade: true,
        drawingNo,
        drawingVersionNo,
        drawingMaster: dm,
      };
    },
    [materials, drawingMasters, currentBOM]
  );

  // 计算当前 BOM 产品自身的顶层图号与版本信息
  const productDrawingInfo = useMemo(() => {
    const mat = materials.find(
      m => m.materialCode === currentBOM.productCode || m.id === currentBOM.productCode
    );

    let dm = drawingMasters.find(
      d =>
        (currentBOM.drawingNo && d.drawingNo === currentBOM.drawingNo) ||
        (mat?.drawingNo && d.drawingNo === mat.drawingNo) ||
        d.materialCode === currentBOM.productCode
    );

    const drawingNo =
      currentBOM.drawingNo ||
      dm?.drawingNo ||
      mat?.drawingNo ||
      (currentBOM.productCode.startsWith('CD-')
        ? `DWG-${currentBOM.productCode}-ASM`
        : `DWG-${currentBOM.productCode}`);

    if (!dm && drawingNo) {
      dm = drawingMasters.find(d => d.drawingNo === drawingNo);
    }

    const defaultVer =
      dm?.versions?.find(v => v.isDefault || (v.status === 'PUBLISHED' && v.isActive)) ||
      dm?.versions?.[0];
    const drawingVersionNo =
      currentBOM.drawingVersionNo || defaultVer?.versionNo || dm?.latestVersion || 'V1';

    return {
      drawingNo,
      drawingVersionNo,
      drawingMaster: dm,
      material: mat,
    };
  }, [currentBOM, materials, drawingMasters]);

  // 计算当前图号已有的已发布版本列表 (status === 'PUBLISHED')
  const productPublishedDrawingVersions = useMemo(() => {
    const currentDrawingNo = currentBOM.drawingNo || productDrawingInfo.drawingNo;
    let dm = productDrawingInfo.drawingMaster;
    if (!dm && currentDrawingNo) {
      dm = drawingMasters.find(d => d.drawingNo === currentDrawingNo);
    }
    if (!dm && currentBOM.productCode) {
      dm = drawingMasters.find(d => d.materialCode === currentBOM.productCode);
    }
    if (!dm || !dm.versions || dm.versions.length === 0) {
      return [];
    }
    return dm.versions.filter(v => v.status === 'PUBLISHED');
  }, [currentBOM, productDrawingInfo, drawingMasters]);

  // 该图号的所有可用版本（包含已发布和其他有效版本，作为保底备选）
  const productAllDrawingVersions = useMemo(() => {
    const currentDrawingNo = currentBOM.drawingNo || productDrawingInfo.drawingNo;
    let dm = productDrawingInfo.drawingMaster;
    if (!dm && currentDrawingNo) {
      dm = drawingMasters.find(d => d.drawingNo === currentDrawingNo);
    }
    if (!dm && currentBOM.productCode) {
      dm = drawingMasters.find(d => d.materialCode === currentBOM.productCode);
    }
    if (dm?.versions && dm.versions.length > 0) {
      return dm.versions;
    }
    return [
      { id: 'DEF-V1', drawingNo: currentDrawingNo || 'DWG-001', versionNo: 'V1', status: 'PUBLISHED' as const, isActive: true },
      { id: 'DEF-V2', drawingNo: currentDrawingNo || 'DWG-001', versionNo: 'V2', status: 'PUBLISHED' as const, isActive: true },
    ];
  }, [currentBOM, productDrawingInfo, drawingMasters]);

  // 统一判断详情页是否处于可编辑模式（草稿/驳回状态，或详情页主动开启编辑模式）
  const isBOMEditable = useMemo(() => {
    return isDetailEditMode || currentBOM.status === 'DRAFT' || currentBOM.status === 'REJECTED';
  }, [isDetailEditMode, currentBOM.status]);

  // 变更产品信息：产品编码、规格、图号、单位都会联动变更，图号版本联动为已发布版本
  const handleProductChange = (newMaterialCode: string) => {
    const selectedMat = materials.find(m => m.materialCode === newMaterialCode || m.id === newMaterialCode);
    if (!selectedMat) return;

    // 1. 图号检索或按规范生成
    let matchedDm = drawingMasters.find(
      d =>
        (selectedMat.drawingNo && d.drawingNo === selectedMat.drawingNo) ||
        d.materialCode === selectedMat.materialCode ||
        d.materialId === selectedMat.id
    );

    const newDrawingNo =
      selectedMat.drawingNo ||
      matchedDm?.drawingNo ||
      (selectedMat.materialCode.startsWith('CD-')
        ? `DWG-${selectedMat.materialCode}-ASM`
        : `DWG-${selectedMat.materialCode}`);

    if (!matchedDm && newDrawingNo) {
      matchedDm = drawingMasters.find(d => d.drawingNo === newDrawingNo);
    }

    // 2. 匹配该图号已有的已发布版本 (PUBLISHED)
    const publishedVers = matchedDm?.versions?.filter(v => v.status === 'PUBLISHED') || [];
    let newDrawingVersionNo = 'V1';

    if (matchedDm?.currentPublishedVersion) {
      newDrawingVersionNo = matchedDm.currentPublishedVersion;
    } else if (publishedVers.length > 0) {
      const defPubVer = publishedVers.find(v => v.isDefault) || publishedVers[0];
      newDrawingVersionNo = defPubVer.versionNo;
    } else if (matchedDm?.versions && matchedDm.versions.length > 0) {
      newDrawingVersionNo = matchedDm.latestVersion || matchedDm.versions[0].versionNo || 'V1';
    }

    // 3. 联动更新当前 BOM：选新产品之后除了产品信息变成新的，BOM结构的物料不变，操作日志是新的
    setBomList(prev => prev.map(b => {
      if (b.id !== currentBOM.id) return b;
      return {
        ...b,
        productCode: selectedMat.materialCode,
        productName: selectedMat.materialName,
        specName: selectedMat.materialSpec || '',
        unit: selectedMat.unit || '台',
        drawingNo: newDrawingNo,
        drawingVersionNo: newDrawingVersionNo,
        name: `${selectedMat.materialName} BOM`,
        updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        // 操作日志是新的 (重置并建立全新操作日志)
        operationLogs: [
          {
            id: `LOG-${Date.now()}`,
            bomId: b.bomCode,
            versionNo: b.versionNo,
            opType: 'PROPERTY_UPDATE',
            opTypeName: '重新选择产品',
            title: '重选BOM归属产品',
            details: `BOM 归属产品已重新变更为 [${selectedMat.materialCode}] ${selectedMat.materialName}（原产品: [${b.productCode}] ${b.productName}）。BOM 物料结构保持不变，操作日志已全新生成。`,
            operator: '当前登录用户',
            timestamp: new Date().toLocaleString(),
          },
        ],
      };
    }));
  };

  // 变更图号版本
  const handleDrawingVersionChange = (newVersionNo: string) => {
    setBomList(prev => prev.map(b => {
      if (b.id !== currentBOM.id) return b;
      return {
        ...b,
        drawingVersionNo: newVersionNo,
        updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        operationLogs: [
          {
            id: `LOG-${Date.now()}`,
            bomId: b.bomCode,
            versionNo: b.versionNo,
            opType: 'PROPERTY_UPDATE',
            opTypeName: '图号版本变更',
            title: '变更图号版本',
            details: `图号 [${b.drawingNo || productDrawingInfo.drawingNo}] 版本变更为 ${newVersionNo}`,
            operator: '当前登录用户',
            timestamp: new Date().toLocaleString(),
          },
          ...(b.operationLogs || []),
        ],
      };
    }));
  };

  // 产品自身的顶层装配工程图纸（置于最顶层展示）
  const productDrawings: BOMDrawingLink[] = useMemo(() => {
    // 优先从 currentBOM.drawings 寻找属于该产品的图纸文件
    const bomProductDrawings = (currentBOM.drawings || []).filter(
      d => d.materialCode === currentBOM.productCode || d.drawingNo === productDrawingInfo.drawingNo
    );
    if (bomProductDrawings.length > 0) return bomProductDrawings;

    // 若当前产品在 drawingMasters 中有登记附件文件
    if (productDrawingInfo.drawingMaster?.versions?.length) {
      const activeVer =
        productDrawingInfo.drawingMaster.versions.find(
          v => v.isDefault || (v.status === 'PUBLISHED' && v.isActive)
        ) || productDrawingInfo.drawingMaster.versions[0];
      if (activeVer && activeVer.files && activeVer.files.length > 0) {
        return activeVer.files.map((f, idx) => ({
          id: f.id || `PRD-FILE-${idx}`,
          drawingNo: productDrawingInfo.drawingNo,
          fileName: f.fileName,
          fileType: f.fileType as FileType,
          fileSize: f.fileSize,
          materialCode: currentBOM.productCode,
          materialName: currentBOM.productName,
          category: '产品装配总成',
          updateTime: f.uploadTime?.split(' ')[0] || currentBOM.updatedAt?.split(' ')[0] || '2026-08-06',
          previewUrl: f.previewUrl,
          versionNo: activeVer.versionNo,
        }));
      }
    }

    // 若当前是 CD-00005，使用 CD00005_DRAWINGS 中产品自身的图纸
    if (currentBOM.productCode === 'CD-00005') {
      const cdDrawings = CD00005_DRAWINGS.filter(d => d.materialCode === 'CD-00005');
      if (cdDrawings.length > 0) return cdDrawings;
    }

    // 默认生成产品的顶层装配工程图纸包
    return [
      {
        id: `PRD-DRW-${currentBOM.productCode}-01`,
        drawingNo: productDrawingInfo.drawingNo,
        fileName: `${currentBOM.productName}_总装工程图.DWG`,
        fileType: 'DWG' as FileType,
        fileSize: 6850000,
        materialCode: currentBOM.productCode,
        materialName: currentBOM.productName,
        category: '产品装配总成',
        updateTime: currentBOM.updatedAt?.split(' ')[0] || '2026-08-06',
        versionNo: productDrawingInfo.drawingVersionNo,
      },
      {
        id: `PRD-DRW-${currentBOM.productCode}-02`,
        drawingNo: productDrawingInfo.drawingNo,
        fileName: `${currentBOM.productName}_3D三维装配体.STEP`,
        fileType: 'STEP' as FileType,
        fileSize: 18450000,
        materialCode: currentBOM.productCode,
        materialName: currentBOM.productName,
        category: '产品装配总成',
        updateTime: currentBOM.updatedAt?.split(' ')[0] || '2026-08-06',
        versionNo: productDrawingInfo.drawingVersionNo,
      },
      {
        id: `PRD-DRW-${currentBOM.productCode}-03`,
        drawingNo: productDrawingInfo.drawingNo,
        fileName: `${currentBOM.productName}_技术审定蓝图.PDF`,
        fileType: 'PDF' as FileType,
        fileSize: 3240000,
        materialCode: currentBOM.productCode,
        materialName: currentBOM.productName,
        category: '产品装配总成',
        updateTime: currentBOM.updatedAt?.split(' ')[0] || '2026-08-06',
        versionNo: productDrawingInfo.drawingVersionNo,
      },
    ];
  }, [currentBOM, productDrawingInfo]);

  // 递归寻找当前 BOM 结构树中选中的节点对象
  const selectedTreeNode = useMemo(() => {
    if (!selectedTreeNodeId || selectedTreeNodeId === 'ROOT') return null;
    const findInTree = (nodes: BOMStructureNode[]): BOMStructureNode | null => {
      for (const n of nodes) {
        if (n.id === selectedTreeNodeId) return n;
        if (n.children && n.children.length > 0) {
          const res = findInTree(n.children);
          if (res) return res;
        }
      }
      return null;
    };
    return findInTree(currentStructureTree);
  }, [selectedTreeNodeId, currentStructureTree]);

  // 整机所有已配置/关联图纸（包含产品总成图档 + 下级物料图档）
  const allBOMDrawings: BOMDrawingLink[] = useMemo(() => {
    const rawDrawings = currentBOM.drawings || CD00005_DRAWINGS;
    const map = new Map<string, BOMDrawingLink>();
    
    // 放入产品总成图纸
    productDrawings.forEach(d => map.set(d.id, d));
    // 放入原始关联图纸
    rawDrawings.forEach(d => {
      if (!map.has(d.id)) {
        map.set(d.id, d);
      }
    });

    return Array.from(map.values());
  }, [currentBOM, productDrawings]);

  // 辅助函数：根据具体物料节点检索其自身对应的图纸列表
  const getDrawingsForNode = useCallback(
    (
      node: BOMStructureNode,
      sourceType: 'CURRENT_MATERIAL' | 'SUB_MATERIAL' | 'PRODUCT_ROOT',
      relationPath?: string
    ): BOMDrawingLink[] => {
      const matCode = node.materialCode?.trim().toLowerCase();
      const dwgNo = node.drawingNo?.trim().toLowerCase();

      // 1. 从已关联的 BOM 图纸库中检索
      const matched = allBOMDrawings.filter(d => {
        const dMatCode = d.materialCode?.trim().toLowerCase();
        const dDwgNo = d.drawingNo?.trim().toLowerCase();
        const dFileName = d.fileName?.trim().toLowerCase();
        return (
          (matCode && dMatCode === matCode) ||
          (dwgNo && (dDwgNo.includes(dwgNo) || dFileName.includes(dwgNo)))
        );
      });

      if (matched.length > 0) {
        return matched.map(d => ({
          ...d,
          sourceType,
          relationPath: relationPath || (sourceType === 'CURRENT_MATERIAL' ? '所选物料' : sourceType === 'PRODUCT_ROOT' ? '主产品总成' : '下级子物料'),
          level: node.level || 1,
        }));
      }

      // 2. 如果静态库暂无，从 drawingMasters 中按物料代码或图号匹配
      const master = drawingMasters.find(
        m =>
          m.materialCode.toLowerCase() === matCode ||
          (dwgNo && m.drawingNo.toLowerCase() === dwgNo)
      );
      if (master && master.versions.length > 0) {
        const activeVer =
          master.versions.find(v => v.isDefault || v.status === 'PUBLISHED') ||
          master.versions[0];
        if (activeVer.files && activeVer.files.length > 0) {
          return activeVer.files.map(f => ({
            id: `DM-${f.id}-${node.id}`,
            drawingNo: master.drawingNo,
            fileName: f.fileName,
            fileType: f.fileType as any,
            fileSize: f.fileSize,
            materialCode: master.materialCode,
            materialName: master.materialName,
            category: master.category || node.category,
            updateTime: f.uploadTime,
            previewUrl: f.previewUrl,
            sourceType,
            relationPath: relationPath || (sourceType === 'CURRENT_MATERIAL' ? '所选物料' : sourceType === 'PRODUCT_ROOT' ? '主产品总成' : '下级子物料'),
            level: node.level || 1,
          }));
        }
      }

      // 3. 动态合成该物料标准工程图纸展示项
      const fallbackPrefix = node.drawingNo || `DWG-${node.materialCode}`;
      return [
        {
          id: `DRW-AUTO-${node.id}-DXF`,
          drawingNo: `${fallbackPrefix}.DXF`,
          fileName: `${fallbackPrefix}_${node.materialName}.DXF`,
          fileType: 'DXF',
          fileSize: 2860000,
          materialCode: node.materialCode,
          materialName: node.materialName,
          category: node.category,
          updateTime: '2026-08-01',
          sourceType,
          relationPath: relationPath || (sourceType === 'CURRENT_MATERIAL' ? '所选物料' : sourceType === 'PRODUCT_ROOT' ? '主产品总成' : '下级子物料'),
          level: node.level || 1,
        },
        {
          id: `DRW-AUTO-${node.id}-PDF`,
          drawingNo: `${fallbackPrefix}.PDF`,
          fileName: `${fallbackPrefix}_${node.materialName}.PDF`,
          fileType: 'PDF',
          fileSize: 1940000,
          materialCode: node.materialCode,
          materialName: node.materialName,
          category: node.category,
          updateTime: '2026-08-01',
          sourceType,
          relationPath: relationPath || (sourceType === 'CURRENT_MATERIAL' ? '所选物料' : sourceType === 'PRODUCT_ROOT' ? '主产品总成' : '下级子物料'),
          level: node.level || 1,
        },
        {
          id: `DRW-AUTO-${node.id}-STEP`,
          drawingNo: `${fallbackPrefix}.STEP`,
          fileName: `${fallbackPrefix}_${node.materialName}.STEP`,
          fileType: 'STEP',
          fileSize: 8400000,
          materialCode: node.materialCode,
          materialName: node.materialName,
          category: node.category,
          updateTime: '2026-08-01',
          sourceType,
          relationPath: relationPath || (sourceType === 'CURRENT_MATERIAL' ? '所选物料' : sourceType === 'PRODUCT_ROOT' ? '主产品总成' : '下级子物料'),
          level: node.level || 1,
        },
      ];
    },
    [allBOMDrawings, drawingMasters]
  );

  // 提取全部结构树物料节点（含平级及嵌套子件）
  const allTreeNodesFlat: BOMStructureNode[] = useMemo(() => {
    const list: BOMStructureNode[] = [];
    const traverse = (nodes: BOMStructureNode[]) => {
      nodes.forEach(n => {
        list.push(n);
        if (n.children && n.children.length > 0) {
          traverse(n.children);
        }
      });
    };
    traverse(currentStructureTree);
    return list;
  }, [currentStructureTree]);

  // 选中的物料树节点关联的全部图纸 (用于左侧树多选图纸及批量下载)
  const selectedTreeDrawings: BOMDrawingLink[] = useMemo(() => {
    if (drawingTreeMultiSelectIds.length === 0) return [];
    const list: BOMDrawingLink[] = [];

    // 若勾选了根产品自身
    if (drawingTreeMultiSelectIds.includes('ROOT')) {
      productDrawings.forEach(d => {
        list.push({
          ...d,
          sourceType: 'PRODUCT_ROOT',
          relationPath: '主产品总成',
          level: 0,
        });
      });
    }

    // 针对每个勾选的物料节点提取其关联图纸
    allTreeNodesFlat.forEach(node => {
      if (drawingTreeMultiSelectIds.includes(node.id)) {
        const drawings = getDrawingsForNode(node, 'CURRENT_MATERIAL', `物料 (L${node.level || 1})`);
        list.push(...drawings);
      }
    });

    // 去重保证唯一
    const seen = new Set<string>();
    return list.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [drawingTreeMultiSelectIds, productDrawings, allTreeNodesFlat, getDrawingsForNode]);

  // 左侧BOM结构树批量下载图纸操作
  const handleBatchDownloadFromTree = () => {
    if (selectedTreeDrawings.length === 0) {
      alert('所选物料暂无图纸文件，请勾选包含图纸的物料！');
      return;
    }
    const listNames = selectedTreeDrawings.map(d => `• [${d.materialCode}] ${d.fileName} (.${d.fileType})`).join('\n');
    alert(`【BOM结构树选定物料批量打包下载】\n\n已为您在左侧结构树选中的 ${drawingTreeMultiSelectIds.length} 项物料（共 ${selectedTreeDrawings.length} 张图纸）生成 ZIP 压缩归档包：\n\n${listNames}\n\n已成功启动批量下载！`);
  };

  // 依据选择对应物料，展示该物料本身的图纸 + 其下所有子物料的全部图纸
  const rawCombinedDrawings: BOMDrawingLink[] = useMemo(() => {
    // 0. 图纸管理页签下，如果左侧BOM树进行了多选，则直接展示所选物料的全部图纸
    if (detailActiveTab === 'drawings' && drawingTreeMultiSelectIds.length > 0) {
      return selectedTreeDrawings;
    }

    // 强制查看整机所有图纸
    if (drawingViewFilter === 'ALL') {
      const list: BOMDrawingLink[] = [];
      // 1. 产品自身图纸
      productDrawings.forEach(d => {
        list.push({
          ...d,
          sourceType: 'PRODUCT_ROOT',
          relationPath: '主产品总成',
          level: 0,
        });
      });
      // 2. 遍历整个结构树及其下所有子零件图纸
      const traverseAll = (nodes: BOMStructureNode[]) => {
        nodes.forEach(n => {
          const nDrawings = getDrawingsForNode(n, 'SUB_MATERIAL', `子物料 (L${n.level || 1})`);
          list.push(...nDrawings);
          if (n.children && n.children.length > 0) {
            traverseAll(n.children);
          }
        });
      };
      traverseAll(currentStructureTree);

      // 去重保证唯一
      const seen = new Set<string>();
      return list.filter(item => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
    }

    // 1. 选中了具体物料节点：展示物料的图纸 + 物料下的子物料的全部图纸
    if (selectedTreeNode) {
      const list: BOMDrawingLink[] = [];

      // (1) 所选物料自身的图纸
      const currentMaterialDrawings = getDrawingsForNode(
        selectedTreeNode,
        'CURRENT_MATERIAL',
        '所选物料'
      );
      list.push(...currentMaterialDrawings);

      // (2) 递归获取所选物料下的全部子物料图纸
      const traverseDescendants = (children?: BOMStructureNode[]) => {
        if (!children || children.length === 0) return;
        children.forEach(child => {
          const childDrawings = getDrawingsForNode(
            child,
            'SUB_MATERIAL',
            `子物料 (L${child.level || 2})`
          );
          list.push(...childDrawings);
          if (child.children && child.children.length > 0) {
            traverseDescendants(child.children);
          }
        });
      };

      traverseDescendants(selectedTreeNode.children);

      // 去重保证唯一
      const seen = new Set<string>();
      return list.filter(item => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
    }

    // 2. 默认选中根节点（整机产品）：展示整机产品图纸 + 整机下所有子物料的全部图纸
    const list: BOMDrawingLink[] = [];
    productDrawings.forEach(d => {
      list.push({
        ...d,
        sourceType: 'PRODUCT_ROOT',
        relationPath: '主产品总成',
        level: 0,
      });
    });

    const traverseAll = (nodes: BOMStructureNode[]) => {
      nodes.forEach(n => {
        const nDrawings = getDrawingsForNode(n, 'SUB_MATERIAL', `子物料 (L${n.level || 1})`);
        list.push(...nDrawings);
        if (n.children && n.children.length > 0) {
          traverseAll(n.children);
        }
      });
    };
    traverseAll(currentStructureTree);

    const seen = new Set<string>();
    return list.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [
    drawingViewFilter,
    selectedTreeNode,
    productDrawings,
    currentStructureTree,
    getDrawingsForNode,
    detailActiveTab,
    drawingTreeMultiSelectIds,
    selectedTreeDrawings,
  ]);

  // 最终根据搜索关键词和范围过滤后的图纸列表
  const currentDrawings: BOMDrawingLink[] = useMemo(() => {
    let result = rawCombinedDrawings;

    // 范围筛选: 'ALL' | 'CURRENT' (仅所选物料) | 'SUB' (仅下级子物料)
    if (drawingScopeFilter === 'CURRENT') {
      result = result.filter(
        d => d.sourceType === 'CURRENT_MATERIAL' || d.sourceType === 'PRODUCT_ROOT'
      );
    } else if (drawingScopeFilter === 'SUB') {
      result = result.filter(d => d.sourceType === 'SUB_MATERIAL');
    }

    // 关键词搜索
    if (drawingSearchQuery.trim()) {
      const q = drawingSearchQuery.toLowerCase().trim();
      result = result.filter(
        d =>
          d.fileName.toLowerCase().includes(q) ||
          d.drawingNo.toLowerCase().includes(q) ||
          d.materialCode.toLowerCase().includes(q) ||
          d.materialName.toLowerCase().includes(q) ||
          (d.category && d.category.toLowerCase().includes(q))
      );
    }

    return result;
  }, [rawCombinedDrawings, drawingScopeFilter, drawingSearchQuery]);

  // 统计所选物料图纸数与子物料图纸数
  const drawingScopeCounts = useMemo(() => {
    const currentCount = rawCombinedDrawings.filter(
      d => d.sourceType === 'CURRENT_MATERIAL' || d.sourceType === 'PRODUCT_ROOT'
    ).length;
    const subCount = rawCombinedDrawings.filter(
      d => d.sourceType === 'SUB_MATERIAL'
    ).length;
    return {
      total: rawCombinedDrawings.length,
      current: currentCount,
      sub: subCount,
    };
  }, [rawCombinedDrawings]);

  // 可在图纸管理页签直接选择的物料树形选项列表
  const drawingMaterialOptions = useMemo(() => {
    const options: Array<{
      id: string | null;
      code: string;
      name: string;
      label: string;
      subCount: number;
      isRoot?: boolean;
    }> = [
      {
        id: null,
        code: currentBOM.productCode,
        name: currentBOM.productName,
        label: `[根节点] ${currentBOM.productCode} ${currentBOM.productName} (整机及全层级物料)`,
        subCount: currentStructureTree.length,
        isRoot: true,
      },
    ];

    const traverse = (nodes: BOMStructureNode[], prefix = '') => {
      nodes.forEach(n => {
        const subCount = n.children ? n.children.length : 0;
        options.push({
          id: n.id,
          code: n.materialCode,
          name: n.materialName,
          label: `${prefix}${subCount > 0 ? '📁 ' : '📄 '}[${n.materialCode}] ${n.materialName}${subCount > 0 ? ` (含 ${subCount} 项子物料)` : ''}`,
          subCount,
        });
        if (n.children && n.children.length > 0) {
          traverse(n.children, `${prefix}　`);
        }
      });
    };

    traverse(currentStructureTree);
    return options;
  }, [currentBOM, currentStructureTree]);

  // 当前 BOM 的所有版本列表
  const currentVersions: BOMVersionInfo[] = useMemo(() => {
    if (currentBOM.versions && currentBOM.versions.length > 0) {
      return currentBOM.versions;
    }
    if (currentBOM.productCode === 'CD-00005' || currentBOM.bomCode === 'BOM202608060006') {
      return CD00005_VERSIONS;
    }
    const vNo = currentBOM.versionNo
      ? (currentBOM.versionNo.startsWith('V') ? currentBOM.versionNo : `V${currentBOM.versionNo}`)
      : 'V1';
    return [
      {
        id: `VER-${currentBOM.bomCode}-1`,
        versionNo: vNo,
        status: currentBOM.status,
        creator: currentBOM.updatedBy || currentBOM.mechanicalOwner || '系统管理员',
        updateTime: currentBOM.updatedAt || currentBOM.createdAt || '2026-09-03 08:30:00',
        isDefault: currentBOM.status === 'PUBLISHED' && Boolean(currentBOM.isDefault),
        itemsCount: currentBOM.items?.length || 2,
        notes: currentBOM.remark || '初始基准版本',
      },
    ];
  }, [currentBOM]);

  const allOperationLogs: BOMOperationLog[] = useMemo(() => {
    return currentBOM.operationLogs || CD00005_OPERATION_LOGS;
  }, [currentBOM]);

  // 操作日志联动：严格只展示当前选中的 BOM 版本
  const filteredOperationLogs: BOMOperationLog[] = useMemo(() => {
    let list = allOperationLogs;
    const vClean = (detailSelectedVersion || currentBOM.versionNo || '1').replace(/^V/i, '').toLowerCase();
    list = list.filter(log => {
      const logV = (log.versionNo || '').replace(/^V/i, '').toLowerCase();
      return logV === vClean || log.versionNo === detailSelectedVersion;
    });
    if (logSearchQuery.trim()) {
      const q = logSearchQuery.toLowerCase().trim();
      list = list.filter(
        l =>
          (l.operator && l.operator.toLowerCase().includes(q)) ||
          (l.title && l.title.toLowerCase().includes(q)) ||
          (l.details && l.details.toLowerCase().includes(q)) ||
          (l.opTypeName && l.opTypeName.toLowerCase().includes(q)) ||
          (l.versionNo && l.versionNo.toLowerCase().includes(q))
      );
    }
    return list;
  }, [allOperationLogs, detailSelectedVersion, currentBOM.versionNo, logSearchQuery]);

  const totalLogPages = Math.max(1, Math.ceil(filteredOperationLogs.length / logPageSize));
  const pagedOperationLogs = useMemo(() => {
    const start = (logPage - 1) * logPageSize;
    return filteredOperationLogs.slice(start, start + logPageSize);
  }, [filteredOperationLogs, logPage, logPageSize]);

  // 图纸信息分页
  const totalDrawingPages = Math.max(1, Math.ceil(currentDrawings.length / drawingPageSize));
  const pagedDrawings = useMemo(() => {
    const start = (drawingPage - 1) * drawingPageSize;
    return currentDrawings.slice(start, start + drawingPageSize);
  }, [currentDrawings, drawingPage, drawingPageSize]);

  // 使用记录数据：追溯销售订单-项次与生产工单 (字段要求：销售订单-项次、生产工单)
  const bomUsageRecords = useMemo(() => {
    if (!currentBOM) return [];
    const allOrders = salesOrders || INITIAL_SALES_ORDERS;
    const records: Array<{
      id: string;
      orderNo: string;
      itemNo: string;
      orderItemKey: string; // 销售订单-项次，例如 "SO-20260822-8801-01"
      workOrderNo: string;  // 生产工单，例如 "WO-20260822-8801-01"
      orderStatus: string;  // 销售订单状态，例如 "已生效" | "执行中" | "已完成"
      bomCode: string;
      bomVersion: string;
      productCode: string;
      productName: string;
      quantity: number;
      unit: string;
      deliveryDate: string;
      status: 'IN_PRODUCTION' | 'PENDING' | 'COMPLETED';
      customerName?: string;
    }> = [];

    allOrders.forEach(so => {
      // 匹配当前 BOM 的 bomCode 或所属 productCode
      const matchBomCode = so.bomCode === currentBOM.bomCode;
      const matchProductCode = so.productCode === currentBOM.productCode;

      if (matchBomCode || matchProductCode) {
        const defaultWoNo = so.workOrderNo || (so.orderNo ? `WO-${so.orderNo.replace(/^[A-Z]+-?/, '')}-01` : 'WO-20260822-8801-01');
        const calcOrderStatus = so.status === 'COMPLETED' ? '已完成' : (so.status === 'IN_PRODUCTION' ? '执行中' : '已生效');

        if (so.items && so.items.length > 0) {
          so.items.forEach(item => {
            records.push({
              id: `${so.id}-${item.itemNo}`,
              orderNo: so.orderNo,
              itemNo: item.itemNo,
              orderItemKey: `${so.orderNo}-${item.itemNo}`,
              workOrderNo: defaultWoNo,
              orderStatus: calcOrderStatus,
              bomCode: item.bomCode || so.bomCode || currentBOM.bomCode,
              bomVersion: item.bomVersion || so.bomVersion || (currentBOM.versionNo ? `V${currentBOM.versionNo}` : 'V1'),
              productCode: item.productCode || so.productCode || currentBOM.productCode,
              productName: item.productName || so.productName || currentBOM.productName,
              quantity: item.orderQuantity || so.orderQuantity || 1,
              unit: currentBOM.unit || '台',
              deliveryDate: item.deliveryDate || so.deliveryDate || '2026-10-15',
              status: so.status || 'IN_PRODUCTION',
              customerName: so.customerName,
            });
          });
        } else {
          records.push({
            id: `${so.id}-01`,
            orderNo: so.orderNo,
            itemNo: '01',
            orderItemKey: `${so.orderNo}-01`,
            workOrderNo: defaultWoNo,
            orderStatus: calcOrderStatus,
            bomCode: so.bomCode || currentBOM.bomCode,
            bomVersion: so.bomVersion || (currentBOM.versionNo ? `V${currentBOM.versionNo}` : 'V1'),
            productCode: so.productCode || currentBOM.productCode,
            productName: so.productName || currentBOM.productName,
            quantity: so.orderQuantity || 1,
            unit: currentBOM.unit || '台',
            deliveryDate: so.deliveryDate || '2026-10-15',
            status: so.status || 'IN_PRODUCTION',
            customerName: so.customerName,
          });
        }
      }
    });

    // 针对每个 BOM 版本生成明确的投产/履历记录
    currentVersions.forEach((ver, vIdx) => {
      const vClean = ver.versionNo.replace(/^V/i, '');
      const hasRecordForVer = records.some(r => r.bomVersion.replace(/^V/i, '') === vClean);
      if (!hasRecordForVer) {
        const orderSuffix = `20260${Math.min(9, 7 + vIdx)}12-${1080 + vIdx * 5}`;
        const defaultWoNo = `WO-${orderSuffix}-01`;
        records.push({
          id: `REC-${currentBOM.bomCode}-V${vClean}-01`,
          orderNo: `SO-${orderSuffix}`,
          itemNo: '01',
          orderItemKey: `SO-${orderSuffix}-01`,
          workOrderNo: defaultWoNo,
          orderStatus: vIdx === 0 ? '执行中' : (vIdx === 1 ? '已完成' : '已生效'),
          bomCode: currentBOM.bomCode,
          bomVersion: ver.versionNo,
          productCode: currentBOM.productCode,
          productName: currentBOM.productName,
          quantity: 15 + vIdx * 5,
          unit: currentBOM.unit || '台',
          deliveryDate: `2026-10-${Math.min(28, 15 + vIdx * 2)}`,
          status: vIdx === 0 ? 'IN_PRODUCTION' : (vIdx === 1 ? 'COMPLETED' : 'PENDING'),
          customerName: vIdx % 2 === 0 ? '智联自动化成套系统工程部' : '华东精密装备制造中心',
        });
      }
    });

    return records;
  }, [currentBOM, salesOrders, currentVersions]);

  // 使用记录严格联动：只展示当前选中的 BOM 版本
  const filteredUsageRecords = useMemo(() => {
    const currVerClean = (detailSelectedVersion || currentBOM.versionNo || '1').replace(/^V/i, '').toLowerCase();
    let list = bomUsageRecords.filter(r => {
      const rVerClean = (r.bomVersion || '').replace(/^V/i, '').toLowerCase();
      return rVerClean === currVerClean || r.bomVersion === detailSelectedVersion;
    });
    if (usageSearchQuery.trim()) {
      const q = usageSearchQuery.toLowerCase().trim();
      list = list.filter(
        r =>
          r.orderItemKey.toLowerCase().includes(q) ||
          r.workOrderNo.toLowerCase().includes(q) ||
          r.orderNo.toLowerCase().includes(q) ||
          r.bomCode.toLowerCase().includes(q) ||
          r.bomVersion.toLowerCase().includes(q) ||
          r.productName.toLowerCase().includes(q) ||
          r.productCode.toLowerCase().includes(q)
      );
    }
    return list;
  }, [bomUsageRecords, detailSelectedVersion, currentBOM.versionNo, usageSearchQuery]);

  const totalUsagePages = Math.max(1, Math.ceil(filteredUsageRecords.length / usagePageSize));
  const pagedUsageRecords = useMemo(() => {
    const start = (usagePage - 1) * usagePageSize;
    return filteredUsageRecords.slice(start, start + usagePageSize);
  }, [filteredUsageRecords, usagePage, usagePageSize]);

  // 当前选中物料（根产品或各级零部件）的完整属性信息（用于基本信息页签直接展示物料详情而非列表）
  const activeMaterialDetail = useMemo(() => {
    if (selectedTreeNode) {
      const matchedMat = materials.find(
        m => m.materialCode === selectedTreeNode.materialCode || m.id === selectedTreeNode.materialId
      );
      // 生产/采购方式：自制、采购、外协
      let sourceType = selectedTreeNode.businessAttr || matchedMat?.sourceType || '';
      if (!['自制', '采购', '外协'].includes(sourceType)) {
        if (selectedTreeNode.level === 0) {
          sourceType = '自制';
        } else if (
          selectedTreeNode.category?.includes('电气') ||
          selectedTreeNode.category?.includes('标准') ||
          selectedTreeNode.category?.includes('五金')
        ) {
          sourceType = '采购';
        } else if (
          selectedTreeNode.category?.includes('机加') ||
          selectedTreeNode.category?.includes('外协') ||
          selectedTreeNode.category?.includes('热处理') ||
          selectedTreeNode.category?.includes('表面')
        ) {
          sourceType = '外协';
        } else {
          sourceType = '自制';
        }
      }

      // 获取损耗率，标准成本，备注，可用库存 (优先从对应物料带出来)
      const nodeLoss = (selectedTreeNode as any).lossRate ?? (selectedTreeNode as any).scrapRate;
      const lossRate = matchedMat?.lossRate !== undefined ? matchedMat.lossRate : (nodeLoss !== undefined ? nodeLoss : 0.5);
      const standardCost = matchedMat?.standardCost !== undefined && matchedMat.standardCost > 0
        ? matchedMat.standardCost
        : (selectedTreeNode.standardCost || 120);
      const stock = matchedMat?.stock !== undefined
        ? matchedMat.stock
        : (selectedTreeNode.stock !== undefined ? selectedTreeNode.stock : 100);
      const remarks = matchedMat?.remarks || (selectedTreeNode as any)?.remarks || matchedMat?.description || '-';

      // 区分产品下一级平级物料 vs 物料BOM内部子物料
      const isLevel1Material = currentStructureTree.some(n => n.id === selectedTreeNode.id);
      const isSubMaterialOfBOM = !isLevel1Material;
      const availableBOMVersions = isLevel1Material ? getNodeBOMVersions(selectedTreeNode, bomList) : [];
      const hasBOMVersions = Boolean(isLevel1Material && availableBOMVersions.length > 0);
      const currentBOMVersion = selectedTreeNode.versionNo || (hasBOMVersions ? availableBOMVersions[0].versionNo : '-');

      return {
        isRoot: false,
        isLevel1Material,
        isSubMaterialOfBOM,
        availableBOMVersions,
        hasBOMVersions,
        bomVersion: currentBOMVersion,
        materialCode: selectedTreeNode.materialCode,
        materialName: selectedTreeNode.materialName,
        spec: selectedTreeNode.spec || matchedMat?.materialSpec || (matchedMat as any)?.spec || '-',
        model: selectedTreeNode.model || matchedMat?.materialModel || matchedMat?.model || '-',
        category: selectedTreeNode.category || matchedMat?.category || '子零部件',
        unit: selectedTreeNode.unit || matchedMat?.unit || '件',
        standardQty: selectedTreeNode.standardQty || 1,
        route: selectedTreeNode.route || matchedMat?.route || '标准机械加工/钣金装配工艺路线',
        drawingNo: selectedTreeNode.drawingNo || matchedMat?.drawingNo || `DWG-${selectedTreeNode.materialCode}`,
        drawingVersionNo: selectedTreeNode.drawingVersionNo || (matchedMat as any)?.drawingVersionNo || 'V1.0',
        standardCost: standardCost,
        stock: stock,
        lossRate: lossRate,
        remarks: remarks,
        level: selectedTreeNode.level || (isLevel1Material ? 1 : 2),
        sourceType: sourceType,
        status: matchedMat?.status === 'DISABLED' ? '停用' : (matchedMat?.status || '生效'),
        weight: matchedMat?.weight || '-',
        brand: selectedTreeNode.brand || matchedMat?.brand || '-',
        description: remarks,
        childrenCount: selectedTreeNode.children?.length || 0,
        hasChildren: Boolean(selectedTreeNode.children && selectedTreeNode.children.length > 0),
      };
    }
    const matchedRootMat = materials.find(
      m => m.materialCode === currentBOM.productCode || m.id === currentBOM.productCode
    );
    const rootLossRate = matchedRootMat?.lossRate !== undefined ? matchedRootMat.lossRate : 0;
    const rootStandardCost = matchedRootMat?.standardCost !== undefined && matchedRootMat.standardCost > 0
      ? matchedRootMat.standardCost
      : 4850;
    const rootStock = matchedRootMat?.stock !== undefined ? matchedRootMat.stock : 45;
    const rootRemarks = matchedRootMat?.remarks || currentBOM.remark || '产品整机BOM装配主档';

    return {
      isRoot: true,
      isLevel1Material: false,
      isSubMaterialOfBOM: false,
      availableBOMVersions: [],
      hasBOMVersions: false,
      bomVersion: detailSelectedVersion || currentBOM.versionNo,
      materialCode: currentBOM.productCode,
      materialName: currentBOM.productName,
      spec: currentBOM.specName || matchedRootMat?.materialSpec || (matchedRootMat as any)?.spec || '-',
      model: matchedRootMat?.materialModel || matchedRootMat?.model || '-',
      category: currentBOM.category || matchedRootMat?.category || '产品装配总成',
      unit: currentBOM.unit || matchedRootMat?.unit || '台',
      standardQty: 1,
      route: matchedRootMat?.route || '整机总装与系统调试工艺路线',
      drawingNo: currentBOM.drawingNo || productDrawingInfo.drawingNo || `DWG-${currentBOM.productCode}`,
      drawingVersionNo: currentBOM.drawingVersionNo || productDrawingInfo.drawingVersionNo || 'V1.0',
      standardCost: rootStandardCost,
      stock: rootStock,
      lossRate: rootLossRate,
      remarks: rootRemarks,
      level: 0,
      sourceType: '自制',
      status: currentBOM.status === 'PUBLISHED' ? '生效' : (currentBOM.status === 'DRAFT' ? '草稿' : '审核中'),
      weight: matchedRootMat?.weight || '-',
      brand: matchedRootMat?.brand || '自主研发',
      description: rootRemarks,
      childrenCount: currentStructureTree.length,
      hasChildren: currentStructureTree.length > 0,
    };
  }, [selectedTreeNode, currentBOM, materials, productDrawingInfo, currentStructureTree, bomList, detailSelectedVersion, getNodeBOMVersions]);

  // 物料图片与二维码状态及逻辑
  const [materialQrUrl, setMaterialQrUrl] = useState<string>('');
  const [customMaterialImages] = useState<Record<string, string>>(() => {
    return loadLocalState<Record<string, string>>('bom_custom_material_images', {});
  });
  const [previewingMaterialImage, setPreviewingMaterialImage] = useState<{ url: string; title: string } | null>(null);
  const [printedLabelFeedback, setPrintedLabelFeedback] = useState<boolean>(false);

  // 物料多图图集预览状态 (默认展示2张，超量通过+数量与入口查看完整图集)
  const [galleryOpen, setGalleryOpen] = useState<boolean>(false);
  const [galleryActiveIndex, setGalleryActiveIndex] = useState<number>(0);

  // 动态生成当前选中物料的多图图集列表 (CAD 3D 模型渲染图、实物装配照片、内部结构细节图、出厂质检图等)
  const materialGalleryImages = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      type: 'cad' | 'photo';
      url?: string;
      description: string;
    }> = [];

    // 1. 本地自定义录入的实物图片 (如果有)
    if (customMaterialImages[activeMaterialDetail.materialCode]) {
      list.push({
        id: 'custom-photo',
        title: '实物构件照片 (现场录入)',
        type: 'photo',
        url: customMaterialImages[activeMaterialDetail.materialCode],
        description: '物料实物表面、装配接口与现场工况照片',
      });
    }

    // 2. CAD 3D 矢量三维工程模型蓝图
    list.push({
      id: 'cad-3d',
      title: activeMaterialDetail.isRoot ? 'CAD 3D 整机三维等轴装配图' : `CAD 3D 构件工程视图 (${activeMaterialDetail.category})`,
      type: 'cad',
      description: activeMaterialDetail.isRoot
        ? '整机总装机构、各工位布局与外围立柱导轨示意'
        : '构件精密三维几何轮廓与关键装配定位特征',
    });

    // 3. 高清实物工程摄影图与细节照片
    if (activeMaterialDetail.isRoot) {
      list.push({
        id: 'real-machine-1',
        title: '换边机整机装配总成实物',
        type: 'photo',
        url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1000&auto=format&fit=crop&q=80',
        description: '智能化板料换边机总装成型实拍，含上下输送梁与工装定位部',
      });
      list.push({
        id: 'real-machine-2',
        title: '传动主轴与移载导轨机构特写',
        type: 'photo',
        url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=1000&auto=format&fit=crop&q=80',
        description: '精密滚珠丝杠、滑台轴承与伺服动力输入模块细节',
      });
      list.push({
        id: 'real-machine-3',
        title: 'CNC 智能电控系统与总线控制柜',
        type: 'photo',
        url: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=1000&auto=format&fit=crop&q=80',
        description: '工业级 PLC、伺服驱动器与安全继电器回路接线布局',
      });
    } else if (activeMaterialDetail.category?.includes('电气') || activeMaterialDetail.materialName?.includes('电机')) {
      list.push({
        id: 'electric-1',
        title: '伺服电机与驱动单元实物',
        type: 'photo',
        url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1000&auto=format&fit=crop&q=80',
        description: '交流伺服电机动力接口、编码器航插与安装法兰',
      });
      list.push({
        id: 'electric-2',
        title: '电机接线端子与铭牌参数',
        type: 'photo',
        url: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=1000&auto=format&fit=crop&q=80',
        description: '出厂激光标刻额定转矩、功率与绝缘等级标识',
      });
    } else if (activeMaterialDetail.category?.includes('气动') || activeMaterialDetail.materialName?.includes('气缸')) {
      list.push({
        id: 'pneumatic-1',
        title: '紧凑型双作用气缸实物',
        type: 'photo',
        url: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=1000&auto=format&fit=crop&q=80',
        description: '气动缸体阳极氧化处理与快插气咀接口',
      });
      list.push({
        id: 'pneumatic-2',
        title: '磁性限位传感器安装座',
        type: 'photo',
        url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=1000&auto=format&fit=crop&q=80',
        description: '气缸行程检测触点与抗干扰屏蔽引出线',
      });
    } else if (activeMaterialDetail.materialName?.includes('移载') || activeMaterialDetail.materialCode === 'CG-00002') {
      list.push({
        id: 'mech-1',
        title: '2米移载机成套机架实物',
        type: 'photo',
        url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=1000&auto=format&fit=crop&q=80',
        description: '高刚性铝合金挤压型材与同步移载皮带总成',
      });
      list.push({
        id: 'mech-2',
        title: '滚筒支承与托辊精密轴承',
        type: 'photo',
        url: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=1000&auto=format&fit=crop&q=80',
        description: '包胶传动辊筒与张紧调校机构装配工况',
      });
    } else {
      list.push({
        id: 'comp-1',
        title: '工件精密加工与表面处理实物',
        type: 'photo',
        url: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=1000&auto=format&fit=crop&q=80',
        description: 'CNC 数控精铣/折弯件喷砂氧化与镀镍防腐处理',
      });
      list.push({
        id: 'comp-2',
        title: '零件出厂三坐标质检与条码标签',
        type: 'photo',
        url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1000&auto=format&fit=crop&q=80',
        description: '公差检测报告合格并粘贴条码唯一追溯码',
      });
    }

    return list;
  }, [activeMaterialDetail, customMaterialImages]);

  // 键盘快捷键监听 (← / → 切换图片，ESC 关闭)
  useEffect(() => {
    if (!galleryOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setGalleryOpen(false);
      } else if (e.key === 'ArrowLeft') {
        setGalleryActiveIndex(prev => (prev > 0 ? prev - 1 : materialGalleryImages.length - 1));
      } else if (e.key === 'ArrowRight') {
        setGalleryActiveIndex(prev => (prev < materialGalleryImages.length - 1 ? prev + 1 : 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [galleryOpen, materialGalleryImages.length]);

  // 渲染单个物料图样（CAD 矢量蓝图 或 实物图片）
  const renderGalleryItemContent = (img: { type: 'cad' | 'photo'; url?: string; title: string }, isBig: boolean = false) => {
    if (img.type === 'photo' && img.url) {
      return (
        <img
          src={img.url}
          alt={img.title}
          className={`w-full h-full ${isBig ? 'object-contain' : 'object-cover'}`}
        />
      );
    }

    // CAD 3D 矢量三维工程模型蓝图
    return (
      <div className="w-full h-full flex flex-col items-center justify-center relative p-2 select-none bg-slate-900 overflow-hidden">
        {/* 工程坐标背景网格 */}
        <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id={`cad-grid-${isBig ? 'modal' : 'thumb'}`} width="16" height="16" patternUnits="userSpaceOnUse">
              <path d="M 16 0 L 0 0 0 16" fill="none" stroke="#38bdf8" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#cad-grid-${isBig ? 'modal' : 'thumb'})`} />
        </svg>

        {/* 3D 轴系指示器 */}
        <div className="absolute top-2 left-2 flex items-center gap-1 text-[9px] font-mono text-cyan-400 bg-slate-950/70 px-1.5 py-0.5 rounded border border-cyan-500/30 z-10">
          <span className="text-red-400">X</span>
          <span className="text-emerald-400">Y</span>
          <span className="text-blue-400">Z</span>
          <span className="text-slate-400">| 3D</span>
        </div>

        {/* CAD 图样几何视图 */}
        <svg viewBox="0 0 320 180" className={`${isBig ? 'w-4/5 h-4/5 max-h-[420px]' : 'w-4/5 h-4/5 max-h-32'} text-cyan-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.25)]`}>
          {activeMaterialDetail.isRoot ? (
            /* 换边机整机 3D 等轴装配示意图 */
            <g stroke="#38bdf8" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="60,115 160,155 260,115 160,75" fill="#0f172a" fillOpacity="0.8" />
              <polygon points="60,115 160,155 160,170 60,130" fill="#0369a1" fillOpacity="0.4" />
              <polygon points="160,155 260,115 260,130 160,170" fill="#0284c7" fillOpacity="0.4" />
              <line x1="85" y1="105" x2="160" y2="135" stroke="#93c5fd" strokeWidth="1" strokeDasharray="3,2" />
              <line x1="110" y1="95" x2="185" y2="125" stroke="#93c5fd" strokeWidth="1" strokeDasharray="3,2" />
              <line x1="135" y1="85" x2="210" y2="115" stroke="#93c5fd" strokeWidth="1" strokeDasharray="3,2" />
              <path d="M 90,90 L 90,45 L 230,45 L 230,90" stroke="#38bdf8" strokeWidth="2" />
              <polygon points="90,45 160,20 230,45 160,70" fill="#0284c7" fillOpacity="0.3" stroke="#38bdf8" strokeWidth="1.5" />
              <rect x="130" y="48" width="14" height="26" fill="#38bdf8" fillOpacity="0.6" rx="2" />
              <rect x="176" y="48" width="14" height="26" fill="#38bdf8" fillOpacity="0.6" rx="2" />
              <line x1="137" y1="74" x2="137" y2="88" stroke="#f43f5e" strokeWidth="2" />
              <line x1="183" y1="74" x2="183" y2="88" stroke="#f43f5e" strokeWidth="2" />
              <path d="M 230,60 L 265,50 L 265,65" stroke="#fbbf24" strokeWidth="1.5" />
              <polygon points="255,45 285,40 285,75 255,80" fill="#1e293b" stroke="#fbbf24" strokeWidth="1.5" />
              <line x1="260" y1="52" x2="280" y2="49" stroke="#38bdf8" strokeWidth="1" />
              <line x1="260" y1="60" x2="276" y2="57" stroke="#38bdf8" strokeWidth="1" />
            </g>
          ) : activeMaterialDetail.category?.includes('电气') || activeMaterialDetail.materialName?.includes('电机') ? (
            /* 伺服电机与驱动装置 CAD 视图 */
            <g stroke="#38bdf8" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <rect x="70" y="55" width="130" height="70" rx="4" fill="#0f172a" fillOpacity="0.8" />
              <line x1="90" y1="55" x2="90" y2="125" stroke="#0284c7" strokeWidth="1" />
              <line x1="110" y1="55" x2="110" y2="125" stroke="#0284c7" strokeWidth="1" />
              <line x1="130" y1="55" x2="130" y2="125" stroke="#0284c7" strokeWidth="1" />
              <line x1="150" y1="55" x2="150" y2="125" stroke="#0284c7" strokeWidth="1" />
              <line x1="170" y1="55" x2="170" y2="125" stroke="#0284c7" strokeWidth="1" />
              <rect x="200" y="45" width="16" height="90" rx="2" fill="#0284c7" fillOpacity="0.5" />
              <rect x="216" y="75" width="45" height="30" fill="#38bdf8" fillOpacity="0.7" />
              <line x1="228" y1="75" x2="250" y2="75" stroke="#fbbf24" strokeWidth="2" />
              <rect x="100" y="35" width="35" height="20" rx="2" fill="#334155" stroke="#fbbf24" strokeWidth="1" />
              <text x="140" y="150" fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="middle">SERVO MOTOR</text>
            </g>
          ) : activeMaterialDetail.category?.includes('气动') || activeMaterialDetail.materialName?.includes('气缸') ? (
            /* 气动执行器 CAD 视图 */
            <g stroke="#38bdf8" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <rect x="60" y="65" width="140" height="50" rx="4" fill="#0f172a" fillOpacity="0.8" />
              <rect x="50" y="60" width="10" height="60" rx="2" fill="#0284c7" fillOpacity="0.6" />
              <rect x="200" y="60" width="10" height="60" rx="2" fill="#0284c7" fillOpacity="0.6" />
              <rect x="210" y="80" width="60" height="20" fill="#38bdf8" fillOpacity="0.7" />
              <circle cx="275" cy="90" r="5" fill="#f43f5e" />
              <circle cx="80" cy="65" r="4" fill="#fbbf24" />
              <circle cx="180" cy="65" r="4" fill="#fbbf24" />
              <text x="150" y="145" fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="middle">CYLINDER CAD</text>
            </g>
          ) : (
            /* 标准结构钣金/零件 CAD 剖面视图 */
            <g stroke="#38bdf8" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="60,130 160,155 260,115 260,75 160,50 60,90" fill="#0f172a" fillOpacity="0.7" />
              <polygon points="80,105 160,125 240,95 240,75 160,55 80,85" fill="#0284c7" fillOpacity="0.3" stroke="#93c5fd" />
              <circle cx="160" cy="90" r="14" fill="#1e293b" stroke="#fbbf24" strokeWidth="1.5" />
              <circle cx="160" cy="90" r="6" fill="#38bdf8" />
              <circle cx="110" cy="98" r="4" stroke="#38bdf8" />
              <circle cx="210" cy="85" r="4" stroke="#38bdf8" />
              <text x="160" y="150" fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="middle">COMPONENT CAD</text>
            </g>
          )}
        </svg>

        {/* 底部 CAD 铭牌标签 */}
        <div className="absolute bottom-1.5 right-2 text-[9px] font-mono text-slate-400 bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800 z-10">
          DWG: {activeMaterialDetail.drawingNo}
        </div>
      </div>
    );
  };

  // 动态根据当前选中的物料实时生成高清二维码（无子物料则无BOM版本）
  useEffect(() => {
    const bomVer = activeMaterialDetail.hasChildren ? detailSelectedVersion : '';
    const qrPayload = [
      `物料编码: ${activeMaterialDetail.materialCode}`,
      `物料名称: ${activeMaterialDetail.materialName}`,
      `规格: ${activeMaterialDetail.spec}`,
      `图号: ${activeMaterialDetail.drawingNo}`,
      ...(bomVer ? [`BOM版本: ${bomVer}`] : []),
      `生产/采购方式: ${activeMaterialDetail.sourceType}`,
      `工艺路线: ${activeMaterialDetail.route}`,
    ].join('\n');

    QRCode.toDataURL(qrPayload, {
      width: 256,
      margin: 1.5,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then(url => {
        setMaterialQrUrl(url);
      })
      .catch(err => {
        console.error('Failed to generate QR Code:', err);
      });
  }, [activeMaterialDetail, detailSelectedVersion]);

  // 下载物料二维码
  const handleDownloadQR = () => {
    if (!materialQrUrl) return;
    const a = document.createElement('a');
    a.href = materialQrUrl;
    const bomVerSuffix = activeMaterialDetail.hasChildren ? `_${detailSelectedVersion}` : '';
    a.download = `QRCode_${activeMaterialDetail.materialCode}${bomVerSuffix}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // 模拟打印物料追溯标签
  const handlePrintQR = () => {
    setPrintedLabelFeedback(true);
    setTimeout(() => setPrintedLabelFeedback(false), 2500);
  };

  const currentOperationLogs: BOMOperationLog[] = useMemo(() => {
    return filteredOperationLogs;
  }, [filteredOperationLogs]);

  const currentApprovalRecords: BOMApprovalRecord[] = useMemo(() => {
    return getBOMApprovalRecords(currentBOM);
  }, [currentBOM]);

  const selectedBOMVersion = useMemo(() => {
    return currentVersions.find(v => v.versionNo === detailSelectedVersion) || currentVersions[0];
  }, [currentVersions, detailSelectedVersion]);

  useEffect(() => {
    if (currentVersions.length > 0 && !currentVersions.some(v => v.versionNo === detailSelectedVersion)) {
      setDetailSelectedVersion(currentVersions[0].versionNo);
    }
  }, [currentBOM.bomCode, currentVersions, detailSelectedVersion]);

  return (
    <div className="flex flex-col h-full bg-[#f4f7fc] dark:bg-slate-950 p-3 sm:p-4 gap-3 overflow-hidden font-sans">
      {/* 顶部面包屑与页签栏 */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-4 py-2 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-xs shrink-0">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 dark:text-slate-500">研发管理</span>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <button
            onClick={() => setViewMode('list')}
            className={`cursor-pointer ${viewMode === 'list' ? 'font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5' : 'text-slate-600 dark:text-slate-400 hover:text-blue-600'}`}
          >
            {viewMode === 'list' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>}
            BOM管理
          </button>
          {viewMode === 'detail' && (
            <>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                BOM详情 - [{currentBOM.bomCode}] {currentBOM.productName}
              </span>
            </>
          )}
          {viewMode === 'create' && (
            <>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                新增BOM
              </span>
            </>
          )}
        </div>

        {/* 顶部标签式页签与数据量信息 */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md text-xs">
            <span className="px-2.5 py-1 rounded bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-medium shadow-xs">
              BOM管理
            </span>
          </div>
          <span className="text-xs text-slate-400 border-l border-slate-200 dark:border-slate-700 pl-2 ml-1">
            共 {bomList.length} 份 BOM 档案
          </span>
        </div>
      </div>

      {/* ======================= 1. BOM 列表页 (LIST VIEW - 截图1样式) ======================= */}
      {viewMode === 'list' && (
        <div className="flex-1 flex gap-3 min-h-0 overflow-hidden">
          {/* 左侧：物料分类树（支持收纳/收起） */}
          <div
            className={`bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 flex flex-col transition-all duration-300 shrink-0 shadow-xs ${
              isCategorySidebarCollapsed ? 'w-12' : 'w-60 sm:w-64'
            }`}
          >
            {/* 分类栏标题与折叠开关 */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between shrink-0">
              {!isCategorySidebarCollapsed ? (
                <div className="flex items-center justify-between w-full pr-1">
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-1.5 min-w-0">
                    <FolderTree className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="truncate">物料分类</span>
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
                      type="button"
                      onClick={() => setSelectedCategory('all')}
                      className={`text-xs px-2 py-0.5 rounded cursor-pointer transition-colors ${
                        selectedCategory === 'all'
                          ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-semibold'
                          : 'text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400'
                      }`}
                    >
                      全部
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCategorySidebarCollapsed(true)}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer ml-0.5"
                      title="收起分类栏"
                    >
                      <PanelLeftClose className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCategorySidebarCollapsed(false)}
                  className="p-1 mx-auto hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                  title="展开分类栏"
                >
                  <PanelLeftOpen className="w-4 h-4 text-blue-600" />
                </button>
              )}
            </div>

            {/* 分类栏内容 */}
            {!isCategorySidebarCollapsed ? (
              <div className="flex-1 flex flex-col p-2 min-h-0 overflow-hidden">
                {/* 搜索分类 */}
                <div className="relative mb-2 shrink-0">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="请输入分类名称"
                    value={categorySearchQuery}
                    onChange={e => setCategorySearchQuery(e.target.value)}
                    className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                  {categorySearchQuery && (
                    <button
                      type="button"
                      onClick={() => setCategorySearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

              {/* 树形分类列表 */}
              <div className="flex-1 overflow-y-auto p-2 space-y-0.5 text-xs">
                {filteredCategories.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    未找到匹配分类
                  </div>
                ) : (
                  filteredCategories.map(cat => {
                    const isSelected = selectedCategory === cat.id;
                    const hasChildren = cat.children && cat.children.length > 0;
                    const isExpanded = !!expandedCategories[cat.id];

                    return (
                      <div key={cat.id} className="space-y-0.5">
                        <div
                          onClick={() => {
                            setSelectedCategory(cat.id);
                            if (hasChildren) toggleCategory(cat.id);
                          }}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            {hasChildren ? (
                              <span
                                onClick={e => {
                                  e.stopPropagation();
                                  toggleCategory(cat.id);
                                }}
                                className="text-slate-400 hover:text-slate-600 p-0.5"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5" />
                                )}
                              </span>
                            ) : (
                              <span className="w-4" />
                            )}
                            <span className="truncate">{cat.name}</span>
                          </div>
                          {cat.count !== undefined && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              {cat.count}
                            </span>
                          )}
                        </div>

                        {/* 子级分类 */}
                        {hasChildren && isExpanded && (
                          <div className="pl-6 space-y-0.5">
                            {cat.children?.map(sub => {
                              const isSubSelected = selectedCategory === sub.id;
                              return (
                                <div
                                  key={sub.id}
                                  onClick={() => setSelectedCategory(sub.id)}
                                  className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-colors ${
                                    isSubSelected
                                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold'
                                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                                  }`}
                                >
                                  <span className="truncate">{sub.name}</span>
                                  {sub.count !== undefined && (
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {sub.count}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center py-4 gap-4 text-slate-400">
              <button
                type="button"
                onClick={() => setIsCategorySidebarCollapsed(false)}
                className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 rounded text-slate-500 cursor-pointer"
                title="展开物料分类"
              >
                <FolderTree className="w-5 h-5 text-blue-600" />
              </button>
              <div
                className="writing-vertical text-xs tracking-widest text-slate-400 font-medium cursor-pointer hover:text-blue-600 transition-colors"
                style={{ writingMode: 'vertical-rl' }}
                onClick={() => setIsCategorySidebarCollapsed(false)}
              >
                物料分类
              </div>
            </div>
          )}
        </div>

          {/* 右侧：BOM 列表主舞台 */}
          <div className="flex-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 flex flex-col min-w-0 shadow-xs overflow-hidden">
            {/* 顶栏 1：状态 Tab + 是否默认过滤 + 搜索重置区 (与其他页面统一) */}
            <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 bg-white dark:bg-slate-900">
              {/* 左侧：状态 Tab 与 是否默认 */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg text-xs font-medium">
                  {[
                    { id: 'ALL', label: `全部 (${statusCounts.all})` },
                    { id: 'DRAFT', label: `草稿 (${statusCounts.draft})` },
                    { id: 'PENDING', label: `待审批 (${statusCounts.pending})` },
                    { id: 'PUBLISHED', label: `已发布 (${statusCounts.published})` },
                    { id: 'REJECTED', label: `驳回 (${statusCounts.rejected})` },
                    { id: 'FROZEN', label: `冻结 (${statusCounts.frozen})` },
                    { id: 'OBSOLETE', label: `已作废 (${statusCounts.obsolete})` },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setStatusFilter(tab.id);
                        setCurrentPage(1);
                      }}
                      className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                        statusFilter === tab.id
                          ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden lg:block" />

                {/* 是否默认筛选 */}
                <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="text-slate-400">是否默认:</span>
                  {[
                    { id: 'ALL', label: '全部' },
                    { id: 'YES', label: `是 (${statusCounts.isDefaultCount})` },
                    { id: 'NO', label: `否 (${statusCounts.notDefaultCount})` },
                  ].map(d => (
                    <button
                      key={d.id}
                      onClick={() => {
                        setDefaultFilter(d.id);
                        setCurrentPage(1);
                      }}
                      className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                        defaultFilter === d.id
                          ? 'text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/60'
                          : 'hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 右侧搜索区 */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="请输入BOM编码或产品名称..."
                    value={tableSearchInput}
                    onChange={e => setTableSearchInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') setSearchQuery(tableSearchInput);
                    }}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={() => setSearchQuery(tableSearchInput)}
                  className="px-3 py-1.5 text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/80 rounded flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                >
                  <Search className="w-3.5 h-3.5" />
                  搜索
                </button>
                <button
                  onClick={() => {
                    setTableSearchInput('');
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setStatusFilter('ALL');
                    setDefaultFilter('ALL');
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-white hover:bg-slate-50 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  重置
                </button>
              </div>
            </div>

            {/* 顶栏 2：操作按钮工具条 (与其他页面统一) */}
            <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/40 shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleOpenAddModal}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  新增
                </button>
                <button
                  onClick={() => setIsBatchImportModalOpen(true)}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-white hover:bg-blue-50 text-blue-600 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-blue-400 border border-blue-200 dark:border-blue-800/80 rounded flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <FileUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  批量导入
                </button>
                <div className="relative">
                  <button
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
                    <div className="absolute left-0 mt-1 w-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg py-1 z-30 text-xs">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsBatchMenuOpen(false);
                          setIsBatchImportModalOpen(true);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer font-medium"
                      >
                        <FileUp className="w-3.5 h-3.5 text-blue-600" />
                        批量导入
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsBatchMenuOpen(false);
                          if (selectedRowIds.length === 0) {
                            setToastMessage('请先勾选需要导出的 BOM 数据！');
                          } else {
                            setToastMessage(`已成功导出 ${selectedRowIds.length} 项 BOM 数据！`);
                          }
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-400" />
                        批量导出
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsBatchMenuOpen(false);
                          if (selectedRowIds.length === 0) {
                            setToastMessage('请先勾选需要提交审批的 BOM！');
                          } else {
                            setToastMessage(`已成功提交 ${selectedRowIds.length} 项 BOM 进入审批流！`);
                          }
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer"
                      >
                        <FileCheck2 className="w-3.5 h-3.5 text-slate-400" />
                        批量提交审批
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 右侧工具图标 */}
              <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-xs">
                <button
                  onClick={() => alert('已应用标准BOM表头视图密度')}
                  className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  title="行高设置"
                >
                  <AlignJustify className="w-3.5 h-3.5" />
                  <span>行高</span>
                </button>
                <button
                  onClick={() => alert('已应用标准BOM字段配置')}
                  className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  title="字段配置"
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span>字段配置</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* BOM 数据表格 */}
            <div className="flex-1 overflow-x-auto overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 select-none">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          paginatedBoms.length > 0 &&
                          paginatedBoms.every(b => selectedRowIds.includes(b.id))
                        }
                        onChange={e => handleSelectAll(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                      />
                    </th>
                    <th className="py-2.5 px-2 w-12 text-center">序号</th>
                    <th className="py-2.5 px-3">BOM编码</th>
                    <th className="py-2.5 px-3">产品编码</th>
                    <th className="py-2.5 px-3">产品名称</th>
                    <th className="py-2.5 px-3">规格</th>
                    <th className="py-2.5 px-2 text-center">BOM版本</th>
                    <th className="py-2.5 px-3 text-center">默认</th>
                    <th className="py-2.5 px-3 text-center">
                      <div className="inline-flex items-center justify-center gap-1">
                        <Filter className="w-3 h-3 text-slate-400" />
                        <span>状态</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 text-center w-16">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {paginatedBoms.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <Boxes className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-60" />
                        暂无符合条件的 BOM 数据
                      </td>
                    </tr>
                  ) : (
                    paginatedBoms.map((bom, idx) => {
                      const isSelected = selectedRowIds.includes(bom.id);
                      const badge = getStatusBadge(bom.status);
                      const globalIndex = (currentPage - 1) * pageSize + idx + 1;

                      return (
                        <tr
                          key={bom.id}
                          onClick={() => handleEnterDetail(bom)}
                          className={`hover:bg-blue-50/50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer ${
                            isSelected ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''
                          }`}
                        >
                          <td
                            className="py-2.5 px-3 text-center"
                            onClick={e => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleRow(bom.id)}
                              className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-2 text-center text-slate-400 font-mono text-[11px]">
                            {globalIndex}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-medium text-blue-600 dark:text-blue-400 hover:underline">
                            {bom.bomCode}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">
                            {bom.productCode}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                            {bom.productName}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                            {bom.specName || '-'}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono font-semibold text-slate-700 dark:text-slate-300">
                            {bom.versionNo}
                          </td>
                          <td
                            className="py-2.5 px-3 text-center"
                            onClick={e => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              id={`btn-toggle-default-${bom.id}`}
                              onClick={e => handleToggleDefault(bom.id, bom.productCode, e)}
                              className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-all inline-flex items-center gap-1 cursor-pointer ${
                                bom.isDefault
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shadow-2xs'
                                  : bom.status === 'PUBLISHED'
                                  ? 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border border-transparent'
                                  : 'bg-slate-100/60 text-slate-400 dark:bg-slate-800/40 dark:text-slate-500 border border-transparent hover:bg-slate-200/60'
                              }`}
                              title={
                                bom.isDefault
                                  ? '当前为该物料的生效默认BOM版本'
                                  : bom.status === 'PUBLISHED'
                                  ? '点击将此已发布版本设为默认BOM版本（同物料唯一）'
                                  : bom.status === 'DRAFT'
                                  ? '草稿状态无法设置为默认版本，只有已发布才能设置为默认版本'
                                  : `当前处于【${badge.label}】状态，只有已发布状态才能设为默认版本`
                              }
                            >
                              {bom.isDefault ? (
                                <>
                                  <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500 shrink-0" />
                                  <span>是 (默认)</span>
                                </>
                              ) : (
                                <span>否</span>
                              )}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 text-[11px] font-semibold rounded ${badge.className}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td
                            className="py-2.5 px-3 text-center relative"
                            onClick={e => e.stopPropagation()}
                          >
                            <div className="relative inline-block text-left">
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  setOpenActionMenuBomId(prev => prev === bom.id ? null : bom.id);
                                }}
                                className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                                title="操作"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {/* 弹出气泡菜单 (严格对应 5 张单据状态截图的按钮选项与颜色) */}
                              {openActionMenuBomId === bom.id && (
                                <div
                                  className="absolute right-0 top-full mt-1.5 z-40 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 shadow-xl rounded-xl py-1 px-1 min-w-[96px] flex flex-col items-stretch animate-in fade-in zoom-in-95 duration-100"
                                  onClick={e => e.stopPropagation()}
                                >
                                  {/* 顶部小三角气泡指针 */}
                                  <div className="absolute -top-1.5 right-2.5 w-3 h-3 bg-white dark:bg-slate-900 border-t border-l border-slate-200/90 dark:border-slate-700 rotate-45 pointer-events-none" />

                                  {/* 1. 草稿/驳回: 严格仅展示 编辑, 删除, 提交审批 */}
                                  {(bom.status === 'DRAFT' || bom.status === 'REJECTED') && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleEditBOM(bom)}
                                        className="px-3 py-1.5 text-[13px] font-normal text-blue-600 dark:text-blue-400 hover:bg-blue-50/70 dark:hover:bg-slate-800 rounded text-center transition-colors cursor-pointer"
                                      >
                                        编辑
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteBOM(bom)}
                                        className="px-3 py-1.5 text-[13px] font-normal text-rose-500 dark:text-rose-400 hover:bg-rose-50/70 dark:hover:bg-slate-800 rounded text-center transition-colors cursor-pointer"
                                      >
                                        删除
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleSubmitApproval(bom)}
                                        className="px-3 py-1.5 text-[13px] font-normal text-amber-500 dark:text-amber-400 hover:bg-amber-50/70 dark:hover:bg-slate-800 rounded text-center transition-colors cursor-pointer"
                                      >
                                        提交审批
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenCreateVersionModal(bom)}
                                        className="px-3 py-1.5 text-[13px] font-normal text-blue-600 dark:text-blue-400 hover:bg-blue-50/70 dark:hover:bg-slate-800 rounded text-center transition-colors cursor-pointer"
                                      >
                                        复制
                                      </button>
                                    </>
                                  )}

                                  {/* 2. 待审批 (PENDING): 撤销审批, 复制 */}
                                  {bom.status === 'PENDING' && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleRevokeApproval(bom)}
                                        className="px-3 py-1.5 text-[13px] font-normal text-amber-500 dark:text-amber-400 hover:bg-amber-50/70 dark:hover:bg-slate-800 rounded text-center transition-colors cursor-pointer"
                                      >
                                        撤回审批
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenCreateVersionModal(bom)}
                                        className="px-3 py-1.5 text-[13px] font-normal text-blue-600 dark:text-blue-400 hover:bg-blue-50/70 dark:hover:bg-slate-800 rounded text-center transition-colors cursor-pointer"
                                      >
                                        复制
                                      </button>
                                    </>
                                  )}

                                  {/* 3. 已发布 (PUBLISHED): 反审批, 复制, 作废, 冻结 */}
                                  {bom.status === 'PUBLISHED' && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenReverseApprovalModal(bom)}
                                        className="px-3 py-1.5 text-[13px] font-normal text-amber-600 dark:text-amber-400 hover:bg-amber-50/70 dark:hover:bg-slate-800 rounded text-center transition-colors cursor-pointer flex items-center justify-center gap-1"
                                      >
                                        反审批
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenCreateVersionModal(bom)}
                                        className="px-3 py-1.5 text-[13px] font-normal text-blue-600 dark:text-blue-400 hover:bg-blue-50/70 dark:hover:bg-slate-800 rounded text-center transition-colors cursor-pointer"
                                      >
                                        复制
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleObsoleteBOM(bom)}
                                        className="px-3 py-1.5 text-[13px] font-normal text-rose-500 dark:text-rose-400 hover:bg-rose-50/70 dark:hover:bg-slate-800 rounded text-center transition-colors cursor-pointer"
                                      >
                                        作废
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleFreezeBOM(bom)}
                                        className="px-3 py-1.5 text-[13px] font-normal text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50/70 dark:hover:bg-slate-800 rounded text-center transition-colors cursor-pointer"
                                      >
                                        冻结
                                      </button>
                                    </>
                                  )}

                                  {/* 4. 作废 (OBSOLETE): 复制 */}
                                  {bom.status === 'OBSOLETE' && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenCreateVersionModal(bom)}
                                      className="px-3 py-1.5 text-[13px] font-normal text-blue-600 dark:text-blue-400 hover:bg-blue-50/70 dark:hover:bg-slate-800 rounded text-center transition-colors cursor-pointer"
                                    >
                                      复制
                                    </button>
                                  )}

                                  {/* 5. 冻结 (FROZEN): 解除冻结, 复制 */}
                                  {bom.status === 'FROZEN' && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleUnfreezeBOM(bom)}
                                        className="px-3 py-1.5 text-[13px] font-normal text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50/70 dark:hover:bg-slate-800 rounded text-center transition-colors cursor-pointer"
                                      >
                                        解除冻结
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenCreateVersionModal(bom)}
                                        className="px-3 py-1.5 text-[13px] font-normal text-blue-600 dark:text-blue-400 hover:bg-blue-50/70 dark:hover:bg-slate-800 rounded text-center transition-colors cursor-pointer"
                                      >
                                        复制
                                      </button>
                                    </>
                                  )}
                                </div>
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

            {/* 底部统计与分页栏 (与截图完全一致) */}
            <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span>已选中 <strong className="text-blue-600 font-semibold">{selectedRowIds.length}</strong> 条</span>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <span>共 <strong className="text-slate-800 dark:text-slate-200 font-semibold">{filteredBoms.length}</strong> 条</span>

                <select
                  value={pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300 text-xs"
                >
                  <option value={10}>10条/页</option>
                  <option value={20}>20条/页</option>
                  <option value={50}>50条/页</option>
                </select>

                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded disabled:opacity-40 cursor-pointer"
                  >
                    &lt;
                  </button>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`px-2.5 py-1 rounded cursor-pointer font-mono ${
                        currentPage === i + 1
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded disabled:opacity-40 cursor-pointer"
                  >
                    &gt;
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================= 2. BOM 详情页 (DETAIL VIEW - 截图2/3/4样式) ======================= */}
      {viewMode === 'detail' && (
        <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-hidden">
          {/* 顶部主档信息卡片 (与截图一致) */}
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 p-3.5 shrink-0 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setViewMode('list')}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-blue-600 cursor-pointer transition-colors"
                  title="返回BOM列表"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-800 dark:text-white">
                      {currentBOM.productName}
                    </h2>
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700" title="产品编码">
                      {currentBOM.productCode}
                    </span>
                    {isBOMEditable && (
                      <button
                        type="button"
                        onClick={() => setIsSelectProductModalOpen(true)}
                        className="p-1 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 rounded cursor-pointer transition-colors shadow-2xs ml-0.5"
                        title="编辑/重新选择产品（可更换为其他产品，保留物料清单结构，开启全新操作日志）"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {/* 最上方统一版本切换与状态联动展示 */}
                  <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs">
                    <GitBranch className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="text-xs text-slate-500 font-medium shrink-0">BOM版本:</span>
                    <select
                      value={detailSelectedVersion}
                      onChange={e => setDetailSelectedVersion(e.target.value)}
                      className="font-mono font-bold text-xs text-blue-700 dark:text-blue-300 bg-transparent border-0 cursor-pointer p-0 focus:outline-none"
                    >
                      {currentVersions.map(v => (
                        <option key={v.id} value={v.versionNo}>
                          {v.versionNo}
                        </option>
                      ))}
                    </select>
                    {selectedBOMVersion && (
                      <span className={`px-1.5 py-0.2 text-[10px] font-semibold rounded shrink-0 ${getStatusBadge(selectedBOMVersion.status).className}`}>
                        {getStatusBadge(selectedBOMVersion.status).label}
                      </span>
                    )}
                    {selectedBOMVersion?.isDefault ? (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold rounded">
                        <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                        默认版本
                      </span>
                    ) : (
                      <button
                        type="button"
                        id="btn-detail-set-version-default"
                        onClick={() => selectedBOMVersion && handleDetailSetVersionDefault(selectedBOMVersion)}
                        className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded border transition-colors cursor-pointer ${
                          selectedBOMVersion?.status === 'PUBLISHED'
                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200/60'
                        }`}
                        title={
                          selectedBOMVersion?.status === 'PUBLISHED'
                            ? '点击将当前版本设为物料默认BOM版本（同物料唯一）'
                            : selectedBOMVersion?.status === 'DRAFT'
                            ? '草稿状态无法设置为默认版本，只有已发布才能设置为默认版本'
                            : '只有已发布状态才能设置为默认版本'
                        }
                      >
                        <Star className="w-2.5 h-2.5" />
                        设为默认
                      </button>
                    )}
                  </div>

                  {/* 紧跟版本后面的创建人和更新时间 */}
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-800/50 px-2.5 py-1 rounded-md border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>创建人:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {selectedBOMVersion?.creator && selectedBOMVersion.creator !== '-'
                          ? selectedBOMVersion.creator
                          : (currentBOM.updatedBy || currentBOM.mechanicalOwner || '系统管理员')}
                      </span>
                    </div>
                    <span className="text-slate-300 dark:text-slate-600">|</span>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>更新时间:</span>
                      <span className="font-mono text-slate-700 dark:text-slate-200">
                        {selectedBOMVersion?.updateTime || currentBOM.updatedAt || currentBOM.createdAt || '2026-08-06 12:00:00'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 右侧主操作按钮 (根据 BOM 状态及编辑态动态渲染) */}
              <div className="flex items-center gap-2 shrink-0">
                {isDetailEditMode ? (
                  <>
                    <button
                      type="button"
                      onClick={handleSaveDetailEdit}
                      className="px-3.5 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded shadow-2xs cursor-pointer transition-colors flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      保存草稿
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelDetailEdit}
                      className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
                    >
                      取消
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsCompareModalOpen(true)}
                      className="px-3 py-1.5 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 rounded border border-blue-200 dark:border-blue-800 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors mr-1"
                      title="比对不同 BOM 版本之间的差异"
                    >
                      <ArrowUpDown className="w-3.5 h-3.5" />
                      BOM对比
                    </button>

                    {/* 1. 草稿/驳回状态: 严格仅有 编辑, 删除, 提交审批 */}
                    {(currentBOM.status === 'DRAFT' || currentBOM.status === 'REJECTED') && (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsDetailEditMode(true)}
                          className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 rounded border border-blue-200 dark:border-blue-800 cursor-pointer transition-colors"
                        >
                          编辑
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBOM(currentBOM)}
                          className="px-3 py-1.5 text-xs font-medium bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900 rounded border border-rose-200 dark:border-rose-800 cursor-pointer transition-colors"
                        >
                          删除
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSubmitApproval(currentBOM)}
                          className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded shadow-2xs cursor-pointer transition-colors"
                        >
                          提交审批
                        </button>
                      </>
                    )}

                    {/* 2. 待审批状态 (PENDING): 撤销审批 */}
                    {currentBOM.status === 'PENDING' && (
                      <button
                        type="button"
                        onClick={() => handleRevokeApproval(currentBOM)}
                        className="px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900 rounded border border-amber-200 dark:border-amber-800 cursor-pointer transition-colors"
                      >
                        撤回审批
                      </button>
                    )}

                    {/* 3. 已发布状态 (PUBLISHED): 反审批, 作废, 冻结 */}
                    {currentBOM.status === 'PUBLISHED' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenReverseApprovalModal(currentBOM)}
                          className="px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900 rounded border border-amber-200 dark:border-amber-800 cursor-pointer transition-colors flex items-center gap-1 shadow-2xs"
                          title="基于已审批通过的BOM执行反审批，状态回退至草稿重新编辑"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          反审批
                        </button>
                        <button
                          type="button"
                          onClick={() => handleObsoleteBOM(currentBOM)}
                          className="px-3 py-1.5 text-xs font-medium bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900 rounded border border-rose-200 dark:border-rose-800 cursor-pointer transition-colors"
                        >
                          作废
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFreezeBOM(currentBOM)}
                          className="px-3 py-1.5 text-xs font-medium bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-400 hover:bg-cyan-100 dark:hover:bg-cyan-900 rounded border border-cyan-200 dark:border-cyan-800 cursor-pointer transition-colors"
                        >
                          冻结
                        </button>
                      </>
                    )}

                    {/* 4. 冻结状态 (FROZEN): 解除冻结 */}
                    {currentBOM.status === 'FROZEN' && (
                      <button
                        type="button"
                        onClick={() => handleUnfreezeBOM(currentBOM)}
                        className="px-3 py-1.5 text-xs font-medium bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-400 hover:bg-cyan-100 dark:hover:bg-cyan-900 rounded border border-cyan-200 dark:border-cyan-800 cursor-pointer transition-colors"
                      >
                        解除冻结
                      </button>
                    )}

                    {/* 复制按钮：直接复制当前版本为新草稿，无需弹窗选择 */}
                    <button
                      type="button"
                      onClick={() => handleDirectCopyBOM(currentBOM)}
                      title="直接复制当前版本为新草稿（草稿状态下可随时点击产品旁编辑图标更换关联产品或编辑物料结构）"
                      className="px-3 py-1.5 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 rounded border border-blue-200 dark:border-blue-800 cursor-pointer transition-colors flex items-center gap-1.5 shadow-2xs"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      复制
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 属性元数据栏 */}
            <div className="flex items-center gap-x-6 gap-y-2 pt-3 text-xs flex-wrap text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">BOM编码:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{currentBOM.bomCode}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">规格:</span>
                <span className="text-slate-800 dark:text-slate-100 font-mono">{currentBOM.specName || '-'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">图号:</span>
                <button
                  type="button"
                  onClick={() => {
                    if (onNavigateToDrawings) {
                      onNavigateToDrawings(productDrawingInfo.drawingNo, {
                        productCode: currentBOM.productCode,
                        productName: currentBOM.productName,
                        specName: currentBOM.specName,
                      });
                    }
                  }}
                  className="font-mono font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline cursor-pointer transition-colors inline-flex items-center gap-0.5 group"
                  title="点击跳转至图号管理查看图纸与版本详情"
                >
                  <span className="group-hover:underline">{productDrawingInfo.drawingNo}</span>
                  <ChevronRight className="w-3 h-3 text-blue-500 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
              {!isNoVersionMode && (
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 shrink-0">图号版本:</span>
                  {isBOMEditable ? (
                    <div className="flex items-center gap-1">
                      <select
                        value={currentBOM.drawingVersionNo || productDrawingInfo.drawingVersionNo || ''}
                        onChange={(e) => handleDrawingVersionChange(e.target.value)}
                        className="px-2 py-0.5 text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/80 border border-indigo-300 dark:border-indigo-700 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                        title="下拉选择该图号已有的已发布版本"
                      >
                        {/* 优先展示图号已有的已发布版本 */}
                        {productPublishedDrawingVersions.length > 0 ? (
                          productPublishedDrawingVersions.map(v => (
                            <option key={v.id || v.versionNo} value={v.versionNo}>
                              {v.versionNo} (已发布{v.isDefault ? '·默认' : ''})
                            </option>
                          ))
                        ) : (
                          productAllDrawingVersions.map(v => (
                            <option key={v.id || v.versionNo} value={v.versionNo}>
                              {v.versionNo} {v.status === 'PUBLISHED' ? '(已发布)' : `(${v.status || '有效'})`}
                            </option>
                          ))
                        )}
                      </select>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1 py-0.2 rounded border border-indigo-200 dark:border-indigo-800 shrink-0 font-medium">
                        已发布
                      </span>
                    </div>
                  ) : (
                    <span className="font-mono font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200/80 dark:border-indigo-800 text-[11px]">
                      {productDrawingInfo.drawingVersionNo}
                    </span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">单位:</span>
                <span className="text-slate-700 dark:text-slate-200">{currentBOM.unit || '台'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 shrink-0">机械负责人:</span>
                {isBOMEditable ? (
                  <input
                    type="text"
                    value={currentBOM.mechanicalOwner || ''}
                    onChange={e => handleBOMPropertyChange('mechanicalOwner', e.target.value)}
                    className="w-24 px-2 py-0.5 text-xs bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 rounded text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors font-medium"
                    placeholder="请输入"
                  />
                ) : (
                  <span className="text-slate-700 dark:text-slate-200 truncate">{currentBOM.mechanicalOwner || '-'}</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 shrink-0">电气负责人:</span>
                {isBOMEditable ? (
                  <input
                    type="text"
                    value={currentBOM.electricalOwner || ''}
                    onChange={e => handleBOMPropertyChange('electricalOwner', e.target.value)}
                    className="w-24 px-2 py-0.5 text-xs bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 rounded text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors font-medium"
                    placeholder="请输入"
                  />
                ) : (
                  <span className="text-slate-700 dark:text-slate-200 truncate">{currentBOM.electricalOwner || '-'}</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 min-w-[180px] max-w-[320px] flex-1">
                <span className="text-slate-400 shrink-0">备注:</span>
                {isBOMEditable ? (
                  <input
                    type="text"
                    value={currentBOM.remark || ''}
                    onChange={e => handleBOMPropertyChange('remark', e.target.value)}
                    className="w-full px-2 py-0.5 text-xs bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 rounded text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors font-medium"
                    placeholder="请输入备注说明"
                  />
                ) : (
                  <span className="text-slate-700 dark:text-slate-200 truncate" title={currentBOM.remark || '-'}>
                    {currentBOM.remark || '-'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 详情页主体 (左树 + 右 4 大页签) */}
          <div className="flex-1 flex gap-3 min-h-0 overflow-hidden">
            {/* 左侧：BOM 结构树 (支持收纳折叠) */}
            {isStructureTreeCollapsed ? (
              <div className="w-11 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 flex flex-col items-center py-3 shrink-0 shadow-xs transition-all select-none">
                <button
                  type="button"
                  onClick={() => setIsStructureTreeCollapsed(false)}
                  className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                  title="展开 BOM 结构树 (快捷收纳)"
                >
                  <PanelLeftOpen className="w-4 h-4 text-blue-600" />
                </button>

                <div
                  onClick={() => setIsStructureTreeCollapsed(false)}
                  className="flex-1 flex flex-col items-center justify-center gap-2 cursor-pointer py-4 group"
                  title="点击展开 BOM 结构树"
                >
                  <Boxes className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400 group-hover:text-blue-600 transition-colors [writing-mode:vertical-rl] tracking-widest">
                    BOM 结构树
                  </span>
                  {selectedTreeNodeId && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 mt-2" title="已选中节点" />
                  )}
                </div>
              </div>
            ) : (
              <div className="w-64 sm:w-72 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 flex flex-col shrink-0 shadow-xs transition-all">
                <div className="p-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Boxes className="w-4 h-4 text-blue-600 shrink-0" />
                      <h3 className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                        BOM 结构树
                      </h3>
                      {isDetailEditMode && (
                        <span className="px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[10px] font-semibold shrink-0">
                          编辑中
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleExpandAllTree(true)}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
                        title="展开全部节点"
                      >
                        <ChevronsDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExpandAllTree(false)}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
                        title="折叠全部节点"
                      >
                        <ChevronsUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsStructureTreeCollapsed(true)}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded cursor-pointer ml-0.5"
                        title="收起 BOM 结构树"
                      >
                        <PanelLeftClose className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* 搜索物料 */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="搜索物料..."
                      value={treeSearchQuery}
                      onChange={e => setTreeSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                    {treeSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setTreeSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 树节点列表 */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs">
                  {/* 根节点: 产品自身 (全选按钮放在产品左侧替换原有ui图标，批量删除和图纸管理批量下载放在产品右侧) */}
                  <div
                    onClick={() => {
                      setSelectedTreeNodeId(null);
                      setDrawingViewFilter('AUTO');
                    }}
                    className={`p-2 rounded cursor-pointer transition-colors flex items-center justify-between gap-1.5 ${
                      selectedTreeNodeId === null && drawingViewFilter === 'AUTO'
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {detailActiveTab === 'drawings' ? (
                        <input
                          type="checkbox"
                          checked={
                            drawingTreeMultiSelectIds.length > 0 &&
                            drawingTreeMultiSelectIds.length === (allTreeNodesFlat.length + 1)
                          }
                          onChange={e => {
                            e.stopPropagation();
                            if (e.target.checked) {
                              setDrawingTreeMultiSelectIds(['ROOT', ...allTreeNodesFlat.map(n => n.id)]);
                            } else {
                              setDrawingTreeMultiSelectIds([]);
                            }
                          }}
                          className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-0 cursor-pointer shrink-0"
                          title="全选 / 取消全选全部图纸"
                        />
                      ) : isDetailEditMode ? (
                        <input
                          type="checkbox"
                          checked={
                            displayStructureTree.length > 0 &&
                            displayStructureTree.every(n => treeMultiSelectIds.includes(n.id))
                          }
                          onChange={e => {
                            e.stopPropagation();
                            if (e.target.checked) {
                              setTreeMultiSelectIds(displayStructureTree.map(n => n.id));
                            } else {
                              setTreeMultiSelectIds([]);
                            }
                          }}
                          className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-0 cursor-pointer shrink-0"
                          title="全选 / 取消全选物料"
                        />
                      ) : (
                        <Boxes className="w-4 h-4 text-blue-600 shrink-0" />
                      )}
                      <span className="truncate">{currentBOM.productCode} {currentBOM.productName}</span>
                    </div>

                    {/* 右侧操作按钮：图纸管理批量下载 或 编辑态批量删除 */}
                    {detailActiveTab === 'drawings' ? (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleBatchDownloadFromTree();
                        }}
                        disabled={drawingTreeMultiSelectIds.length === 0}
                        className={`px-2 py-0.5 text-[11px] font-semibold rounded flex items-center gap-1 transition-colors shrink-0 shadow-2xs ${
                          drawingTreeMultiSelectIds.length > 0
                            ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60'
                        }`}
                        title="批量打包下载勾选物料的全部关联图纸"
                      >
                        <Download className="w-3 h-3" />
                        <span>批量下载{selectedTreeDrawings.length > 0 ? `(${selectedTreeDrawings.length})` : ''}</span>
                      </button>
                    ) : isDetailEditMode ? (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleBatchDeleteStructureNodes();
                        }}
                        disabled={treeMultiSelectIds.length === 0}
                        className={`px-2 py-0.5 text-[11px] font-semibold rounded flex items-center gap-1 transition-colors shrink-0 shadow-2xs ${
                          treeMultiSelectIds.length > 0
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800 cursor-pointer'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60'
                        }`}
                        title="批量删除勾选的物料节点"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>批量删除{treeMultiSelectIds.length > 0 ? `(${treeMultiSelectIds.length})` : ''}</span>
                      </button>
                    ) : null}
                  </div>

                  {/* 子节点结构树 */}
                  <div className="pl-2 space-y-0.5 border-l border-slate-200 dark:border-slate-800 ml-3">
                    {displayStructureTree.map(node => {
                      const hasChildren = node.children && node.children.length > 0;
                      const isExpanded = expandedTreeNodes[node.id] !== false;
                      const isSelected = selectedTreeNodeId === node.id && drawingViewFilter === 'AUTO';
                      const nodeVersions = getNodeBOMVersions(node, bomList);

                      return (
                        <div key={node.id} className="space-y-0.5">
                          <div
                            onClick={() => {
                              setSelectedTreeNodeId(node.id);
                              setDrawingViewFilter('AUTO');
                            }}
                            className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-1 min-w-0">
                              {/* 图纸管理页签下的多选框 */}
                              {detailActiveTab === 'drawings' && (
                                <input
                                  type="checkbox"
                                  checked={drawingTreeMultiSelectIds.includes(node.id)}
                                  onChange={e => {
                                    e.stopPropagation();
                                    setDrawingTreeMultiSelectIds(prev =>
                                      e.target.checked ? [...prev, node.id] : prev.filter(id => id !== node.id)
                                    );
                                  }}
                                  className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-0 cursor-pointer shrink-0 mr-0.5"
                                  title="勾选此物料图纸"
                                />
                              )}
                              {/* 编辑状态下的批量删除多选框 */}
                              {isDetailEditMode && detailActiveTab !== 'drawings' && (
                                <input
                                  type="checkbox"
                                  checked={treeMultiSelectIds.includes(node.id)}
                                  onChange={e => {
                                    e.stopPropagation();
                                    setTreeMultiSelectIds(prev =>
                                      e.target.checked ? [...prev, node.id] : prev.filter(id => id !== node.id)
                                    );
                                  }}
                                  className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-0 cursor-pointer shrink-0 mr-0.5"
                                  title="勾选此物料节点以批量删除"
                                />
                              )}
                              {hasChildren ? (
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    toggleTreeNode(node.id);
                                  }}
                                  className="p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              ) : (
                                <span className="w-3.5" />
                              )}
                              <span className="truncate">{node.materialCode} {node.materialName}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 ml-1">
                              {isDetailEditMode ? (
                                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                  {nodeVersions.length > 0 && (
                                    <select
                                      value={node.versionNo || nodeVersions[0].versionNo}
                                      onChange={e => handleSwitchNodeBOMVersion(node.id, e.target.value)}
                                      className="px-1 py-0.2 text-[10px] font-mono font-bold bg-white dark:bg-slate-800 border border-blue-400 dark:border-blue-600 rounded text-blue-700 dark:text-blue-300 focus:outline-none cursor-pointer"
                                      title="选择该物料BOM版本"
                                    >
                                      {nodeVersions.map(v => (
                                        <option key={v.versionNo} value={v.versionNo}>
                                          {v.label || (v.versionNo.startsWith('V') ? (v.versionNo.includes('.') ? v.versionNo : `${v.versionNo}.0`) : `V${v.versionNo}.0`)}
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                  <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">x</span>
                                  <input
                                    type="number"
                                    min="1"
                                    value={node.standardQty || 1}
                                    onChange={e => {
                                      const val = Math.max(1, parseInt(e.target.value) || 1);
                                      handleUpdateStructureNode(node.id, { standardQty: val });
                                    }}
                                    className="w-10 px-1 py-0.2 text-[11px] font-mono font-bold text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-600 rounded text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    title="调整标准用量"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteStructureNode(node)}
                                    className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-500 rounded cursor-pointer"
                                    title="从BOM树中删除此平级物料"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  {node.versionNo && node.versionNo !== '-' && (
                                    <span className="text-[9px] font-mono text-blue-600 dark:text-blue-400 font-semibold px-1 py-0.2 bg-blue-50 dark:bg-blue-950/50 rounded border border-blue-200 dark:border-blue-800">
                                      {(() => {
                                        const v = node.versionNo;
                                        const base = v.startsWith('V') ? v : `V${v}`;
                                        return base.includes('.') ? base : `${base}.0`;
                                      })()}
                                    </span>
                                  )}
                                  <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">
                                    x{node.standardQty}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 嵌套子零件 (BOM内置子件不允许删除新增，支持修改标准用量) */}
                          {hasChildren && isExpanded && (
                            <div className="pl-4 space-y-0.5 border-l border-slate-200/60 dark:border-slate-800 ml-2">
                              {node.children?.map(child => {
                                const isChildSelected = selectedTreeNodeId === child.id && drawingViewFilter === 'AUTO';
                                return (
                                  <div
                                    key={child.id}
                                    onClick={() => {
                                      setSelectedTreeNodeId(child.id);
                                      setDrawingViewFilter('AUTO');
                                    }}
                                    className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-colors ${
                                      isChildSelected
                                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold'
                                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                                    }`}
                                  >
                                    <div className="flex items-center gap-1 min-w-0">
                                      {/* 图纸管理页签下的多选框 */}
                                      {detailActiveTab === 'drawings' && (
                                        <input
                                          type="checkbox"
                                          checked={drawingTreeMultiSelectIds.includes(child.id)}
                                          onChange={e => {
                                            e.stopPropagation();
                                            setDrawingTreeMultiSelectIds(prev =>
                                              e.target.checked ? [...prev, child.id] : prev.filter(id => id !== child.id)
                                            );
                                          }}
                                          className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-0 cursor-pointer shrink-0 mr-0.5"
                                          title="勾选此子物料图纸"
                                        />
                                      )}
                                      <span className="truncate">{child.materialCode} {child.materialName}</span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0 ml-1">
                                      <span
                                        className="text-[10px] font-mono text-slate-500"
                                        title="BOM子物料标准用量由版本固定，不可修改"
                                      >
                                        x{child.standardQty || 1}
                                      </span>
                                    </div>
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

                {/* 树底部统计标签 (钣金件 1 / 高端成品机 1) */}
                <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2 flex-wrap text-[11px]">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    钣金件 1
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    高端成品机 1
                  </span>
                </div>
              </div>
            )}

            {/* 右侧：4 大页签容器 (版本列表、BOM结构、图纸关联、操作日志) */}
            <div className="flex-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 flex flex-col min-w-0 shadow-xs overflow-hidden">
              {/* 冻结顶栏 1: 子标题与当前选中物料规格/用量信息条 */}
              <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850 flex items-center justify-between text-xs shrink-0 select-none">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium flex-wrap">
                  <Boxes className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="font-bold text-slate-900 dark:text-white">
                    {activeMaterialDetail.materialCode} {activeMaterialDetail.materialName}
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-medium text-[10px]">
                    {activeMaterialDetail.category}
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <span className="text-slate-600 dark:text-slate-400">规格: {activeMaterialDetail.spec}</span>
                  {!activeMaterialDetail.isRoot && (
                    <>
                      <span className="text-slate-300 dark:text-slate-700">|</span>
                      <span className="text-slate-600 dark:text-slate-400 font-mono">
                        标准用量: {activeMaterialDetail.standardQty} {activeMaterialDetail.unit}
                      </span>
                    </>
                  )}
                </div>
                <div className="text-slate-500 text-[11px] flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1">
                    <span>当前BOM版本:</span>
                    <strong className="text-blue-600 font-mono font-semibold">{detailSelectedVersion}</strong>
                    {(() => {
                      const selVer = currentVersions.find(v => v.versionNo === detailSelectedVersion) || currentVersions[0];
                      const b = getStatusBadge(selVer?.status || currentBOM.status);
                      return (
                        <span className={`px-1.5 py-0.2 text-[9px] font-semibold rounded shrink-0 ${b.className}`}>
                          {b.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* 冻结顶栏 2: 5 个页签切换栏 */}
              <div className="flex items-center border-b border-slate-200/80 dark:border-slate-800 px-4 bg-white dark:bg-slate-900 shrink-0 overflow-x-auto">
                {[
                  { id: 'basic', label: '基本信息', icon: Info },
                  { id: 'drawings', label: `图纸关联(${currentDrawings.length})`, icon: FileCode },
                  { id: 'usage', label: `BOM使用记录(${filteredUsageRecords.length})`, icon: Layers },
                  { id: 'logs', label: `操作日志(${filteredOperationLogs.length})`, icon: History, isSpecial: true },
                  { id: 'approvals', label: `审批记录(${currentApprovalRecords.length})`, icon: FileCheck },
                ].map(tab => {
                  const Icon = tab.icon;
                  const isActive = detailActiveTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setDetailActiveTab(tab.id as any)}
                      className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer shrink-0 ${
                        isActive
                          ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                      {tab.isSpecial && (
                        <span className="px-1.5 py-0.2 text-[9px] rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 font-bold">
                          联动
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* 页签 1: 基本信息 (物料图片和二维码合并在信息框内部一体化展示) */}
              {detailActiveTab === 'basic' && (
                <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-slate-50/40 dark:bg-slate-950/20">
                  <div className="w-full space-y-4">
                    {/* 编辑态物料快捷操作辅助栏 */}
                    {isDetailEditMode && (
                      <div className="flex items-center justify-between bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-3.5 py-2 rounded-lg text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                            <Edit3 className="w-3.5 h-3.5" />
                            {activeMaterialDetail.isRoot ? '正在编辑根产品主档' : '正在编辑物料节点:'}
                          </span>
                          <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                            {activeMaterialDetail.materialCode} {activeMaterialDetail.materialName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* 新增物料按钮（在删除该物料左边，新增的物料都是同级的都属于产品的下一级） */}
                          <button
                            type="button"
                            onClick={() => {
                              setDetailAddParentId(null);
                              setSelectedMaterialModalIds([]);
                              setIsAddMaterialModalOpen(true);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded cursor-pointer flex items-center gap-1 shadow-2xs"
                            title="向产品添加物料（平级添加至产品下一级）"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            新增物料
                          </button>
                          {activeMaterialDetail.isSubMaterialOfBOM ? (
                            <span className="px-2.5 py-0.8 text-[11px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded">
                              物料BOM内部子件（仅支持调整标准用量，不可新增删除）
                            </span>
                          ) : !activeMaterialDetail.isRoot ? (
                            <button
                              type="button"
                              onClick={handleDeleteCurrentSelectedNode}
                              className="px-2.5 py-1 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded cursor-pointer flex items-center gap-1 shadow-2xs"
                              title="删除当前物料节点"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              删除物料
                            </button>
                          ) : null}
                        </div>
                      </div>
                    )}

                    {/* 核心物料信息框 (属性网格在上方，物料图片与二维码放在下方) */}
                    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs space-y-4">
                      {/* 1. 核心基础属性网格 (放在上方) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-3.5 text-xs pt-1">
                        {/* 物料分类 (在物料编码左边) */}
                        <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                          <span className="text-slate-400">物料分类:</span>
                          <span className="text-slate-700 dark:text-slate-200 font-medium">{activeMaterialDetail.category}</span>
                        </div>

                        {/* 物料编码 */}
                        <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                          <span className="text-slate-400">物料编码:</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{activeMaterialDetail.materialCode}</span>
                        </div>

                        {/* 物料名称 */}
                        <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                          <span className="text-slate-400">物料名称:</span>
                          <span className="font-medium text-slate-800 dark:text-slate-100 truncate max-w-[200px]" title={activeMaterialDetail.materialName}>
                            {activeMaterialDetail.materialName}
                          </span>
                        </div>

                        {/* 规格 (在图号左边) */}
                        <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                          <span className="text-slate-400">规格:</span>
                          <span className="text-slate-700 dark:text-slate-200 font-mono truncate max-w-[200px]" title={activeMaterialDetail.spec}>
                            {activeMaterialDetail.spec}
                          </span>
                        </div>

                        {/* 图号 */}
                        <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                          <span className="text-slate-400">图号:</span>
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400 truncate max-w-[200px]" title={activeMaterialDetail.drawingNo}>
                            {activeMaterialDetail.drawingNo || '-'}
                          </span>
                        </div>

                        {/* BOM版本 (有BOM版本的物料可以选择BOM版本) */}
                        <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                          <span className="text-slate-400">BOM版本:</span>
                          {activeMaterialDetail.isRoot ? (
                            <span className="font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              {detailSelectedVersion?.startsWith('V') ? (detailSelectedVersion.includes('.') ? detailSelectedVersion : `${detailSelectedVersion}.0`) : `V${detailSelectedVersion}.0`}
                            </span>
                          ) : activeMaterialDetail.isSubMaterialOfBOM ? (
                            <span className="font-mono text-slate-400">-</span>
                          ) : activeMaterialDetail.hasBOMVersions ? (
                            isDetailEditMode ? (
                              <div className="flex items-center gap-2">
                                <select
                                  value={activeMaterialDetail.bomVersion}
                                  onChange={(e) => handleSwitchNodeBOMVersion(selectedTreeNode!.id, e.target.value)}
                                  className="px-2 py-0.5 text-xs font-mono font-bold bg-white dark:bg-slate-800 border border-blue-400 dark:border-blue-600 rounded text-blue-700 dark:text-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs"
                                  title="选择BOM版本"
                                >
                                  {activeMaterialDetail.availableBOMVersions.map(v => (
                                    <option key={v.versionNo} value={v.versionNo}>
                                      {v.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <span className="font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                                {(() => {
                                  const ver = activeMaterialDetail.bomVersion || '';
                                  if (!ver || ver === '-') return '-';
                                  const base = ver.startsWith('V') ? ver : `V${ver}`;
                                  return base.includes('.') ? base : `${base}.0`;
                                })()}
                              </span>
                            )
                          ) : (
                            <span className="font-mono text-slate-400">-</span>
                          )}
                        </div>

                        {/* 生产/采购方式 (自制、采购、外协) */}
                        <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                          <span className="text-slate-400">生产/采购方式:</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-semibold text-[11px] ${
                            activeMaterialDetail.sourceType === '自制'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                              : activeMaterialDetail.sourceType === '外协'
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              activeMaterialDetail.sourceType === '自制' ? 'bg-blue-500' :
                              activeMaterialDetail.sourceType === '外协' ? 'bg-amber-500' : 'bg-emerald-500'
                            }`} />
                            <span>{activeMaterialDetail.sourceType}</span>
                          </span>
                        </div>

                        {/* 工艺路线 */}
                        <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                          <span className="text-slate-400">工艺路线:</span>
                          <span className="text-slate-800 dark:text-slate-100 font-medium truncate max-w-[220px]" title={activeMaterialDetail.route}>
                            {activeMaterialDetail.route}
                          </span>
                        </div>

                        {/* 标准用量与单位 (最上级的产品没有标准用量这个字段；子物料不允许修改标准用量) */}
                        {!activeMaterialDetail.isRoot && (
                          <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                            <span className="text-slate-400">标准用量:</span>
                            {isDetailEditMode && activeMaterialDetail.isLevel1Material ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (selectedTreeNode) {
                                      const currentVal = selectedTreeNode.standardQty || 1;
                                      if (currentVal > 1) {
                                        handleUpdateStructureNode(selectedTreeNode.id, { standardQty: currentVal - 1 });
                                      }
                                    }
                                  }}
                                  className="w-5 h-5 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold cursor-pointer"
                                  title="减少数量"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={activeMaterialDetail.standardQty}
                                  onChange={(e) => {
                                    const val = Math.max(1, parseInt(e.target.value) || 1);
                                    if (selectedTreeNode) {
                                      handleUpdateStructureNode(selectedTreeNode.id, { standardQty: val });
                                    }
                                  }}
                                  className="w-16 px-2 py-0.5 text-xs font-mono font-bold text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-600 rounded text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (selectedTreeNode) {
                                      const currentVal = selectedTreeNode.standardQty || 1;
                                      handleUpdateStructureNode(selectedTreeNode.id, { standardQty: currentVal + 1 });
                                    }
                                  }}
                                  className="w-5 h-5 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold cursor-pointer"
                                  title="增加数量"
                                >
                                  +
                                </button>
                                <span className="font-mono text-slate-600 dark:text-slate-300 ml-1">{activeMaterialDetail.unit}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">
                                  {activeMaterialDetail.standardQty} {activeMaterialDetail.unit}
                                </span>
                                {activeMaterialDetail.isSubMaterialOfBOM && (
                                  <span className="text-[10px] text-slate-400 font-normal">
                                    (子物料不可修改)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 品牌 */}
                        <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                          <span className="text-slate-400">品牌:</span>
                          <span className="text-slate-700 dark:text-slate-200 truncate max-w-[180px]">
                            {activeMaterialDetail.brand || '-'}
                          </span>
                        </div>

                        {/* 图号版本 */}
                        <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                          <span className="text-slate-400">图号版本:</span>
                          <span className="font-mono text-slate-700 dark:text-slate-200">
                            {activeMaterialDetail.drawingVersionNo || '-'}
                          </span>
                        </div>

                        {/* 损耗率 (来自物料) */}
                        <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                          <span className="text-slate-400">损耗率:</span>
                          <span className="font-mono text-slate-800 dark:text-slate-100">
                            {activeMaterialDetail.lossRate !== undefined ? `${activeMaterialDetail.lossRate}%` : '0%'}
                          </span>
                        </div>

                        {/* 标准成本 (来自物料) */}
                        <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                          <span className="text-slate-400">标准成本:</span>
                          <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">
                            ¥{Number(activeMaterialDetail.standardCost || 0).toFixed(2)}
                          </span>
                        </div>

                        {/* 可用库存 (来自物料) */}
                        <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                          <span className="text-slate-400">可用库存:</span>
                          <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                            {activeMaterialDetail.stock !== undefined ? activeMaterialDetail.stock : 0} {activeMaterialDetail.unit}
                          </span>
                        </div>

                        {/* 备注 (来自物料) */}
                        <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/80 md:col-span-2 lg:col-span-3 xl:col-span-4">
                          <span className="text-slate-400 shrink-0 mr-4">备注:</span>
                          <span className="text-slate-700 dark:text-slate-200 truncate" title={activeMaterialDetail.remarks || '-'}>
                            {activeMaterialDetail.remarks || '-'}
                          </span>
                        </div>
                      </div>

                      {/* 2. 物料图样与二维码 (放置在下方，合并一体化) */}
                      <div className="rounded-lg border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-3.5">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-3 border-b border-slate-200/70 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-3.5 bg-blue-600 rounded-full" />
                            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs flex items-center gap-1.5">
                              <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                              <span>物料图样与二维码</span>
                            </h4>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-mono">
                              默认展示2张
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                              一物一码追溯
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {printedLabelFeedback && (
                              <span className="p-1 px-2 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1 animate-in fade-in">
                                <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>已发送打印指令 (40×30mm)</span>
                              </span>
                            )}
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5">
                              <Check className="w-3 h-3" />
                              <span>二维码已同步</span>
                            </span>
                          </div>
                        </div>

                        {/* 图片与二维码并排合并 */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
                          {/* 物料图片展示区 (默认展示2张，超过两张的隐藏显示+数量，点击可进入查看全部图集) */}
                          <div className="lg:col-span-8 flex flex-col justify-between">
                            <div className="flex items-center justify-between pb-1.5 mb-1.5">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                                <span>物料图集</span>
                                <span className="text-[10px] font-normal text-slate-400">
                                  (共 {materialGalleryImages.length} 张图样)
                                </span>
                              </div>

                              {materialGalleryImages.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setGalleryActiveIndex(0);
                                    setGalleryOpen(true);
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-500 font-medium flex items-center gap-0.5 hover:underline cursor-pointer transition-colors"
                                  title="点击查看物料全部图片与图纸"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>查看全部图片 (共{materialGalleryImages.length}张)</span>
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            {/* 默认展示两张图片卡片网格 */}
                            <div className={`grid ${materialGalleryImages.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'} gap-3 items-stretch`}>
                              {/* 第 1 张图片 */}
                              <div
                                onClick={() => {
                                  setGalleryActiveIndex(0);
                                  setGalleryOpen(true);
                                }}
                                className="relative group h-44 rounded-lg border border-slate-200/90 dark:border-slate-750 bg-slate-900 overflow-hidden flex items-center justify-center cursor-pointer shadow-inner"
                              >
                                {renderGalleryItemContent(materialGalleryImages[0], false)}

                                {/* 标题徽章 */}
                                <div className="absolute top-2 left-2 z-10 px-1.5 py-0.5 bg-slate-950/75 rounded text-[10px] font-medium text-slate-200 border border-slate-700/60 flex items-center gap-1 backdrop-blur-2xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                  <span className="truncate max-w-[130px]">{materialGalleryImages[0].title}</span>
                                </div>

                                {/* 悬停放大蒙层 */}
                                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 backdrop-blur-2xs z-20">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 text-white text-[11px] font-medium shadow-md">
                                    <ZoomIn className="w-3 h-3" />
                                    <span>放大预览</span>
                                  </span>
                                </div>
                              </div>

                              {/* 第 2 张图片 */}
                              {materialGalleryImages.length > 1 && (
                                <div
                                  onClick={() => {
                                    setGalleryActiveIndex(1);
                                    setGalleryOpen(true);
                                  }}
                                  className="relative group h-44 rounded-lg border border-slate-200/90 dark:border-slate-750 bg-slate-900 overflow-hidden flex items-center justify-center cursor-pointer shadow-inner"
                                >
                                  {renderGalleryItemContent(materialGalleryImages[1], false)}

                                  {/* 标题徽章 */}
                                  <div className="absolute top-2 left-2 z-10 px-1.5 py-0.5 bg-slate-950/75 rounded text-[10px] font-medium text-slate-200 border border-slate-700/60 flex items-center gap-1 backdrop-blur-2xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    <span className="truncate max-w-[130px]">{materialGalleryImages[1].title}</span>
                                  </div>

                                  {/* 超过两张的隐藏显示+数量，点击可以进入看全部 */}
                                  {materialGalleryImages.length > 2 ? (
                                    <div className="absolute inset-0 bg-slate-950/70 hover:bg-slate-950/80 transition-colors flex flex-col items-center justify-center text-white cursor-pointer z-20 p-2">
                                      <span className="text-3xl font-extrabold tracking-tight text-white drop-shadow-md group-hover:scale-110 transition-transform">
                                        +{materialGalleryImages.length - 2}
                                      </span>
                                      <span className="text-xs text-blue-200 mt-1.5 flex items-center gap-1 font-medium bg-blue-900/60 px-2.5 py-1 rounded-full border border-blue-400/40 shadow-xs">
                                        <Eye className="w-3.5 h-3.5" />
                                        <span>查看全部 (共{materialGalleryImages.length}张)</span>
                                      </span>
                                    </div>
                                  ) : (
                                    /* 刚好两张时的普通悬停放大蒙层 */
                                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 backdrop-blur-2xs z-20">
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 text-white text-[11px] font-medium shadow-md">
                                        <ZoomIn className="w-3 h-3" />
                                        <span>放大预览</span>
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* 底部信息条 (去掉编码与图号那一整句，只保留操作指引和全部图纸入口) */}
                            <div className="pt-2 mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                              <span className="text-slate-400 text-[11px] flex items-center gap-1">
                                <Info className="w-3.5 h-3.5 text-slate-400" />
                                <span>点击任意图片或「+数量」查看高清大图与前后轮播</span>
                              </span>
                              {materialGalleryImages.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setGalleryActiveIndex(0);
                                    setGalleryOpen(true);
                                  }}
                                  className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-0.5 font-medium"
                                >
                                  <span>查看全部 {materialGalleryImages.length} 张图样</span>
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* 右侧：物料二维码与快捷操作 (合并一体) */}
                          <div className="lg:col-span-4 flex flex-col justify-between bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 p-3 shadow-2xs">
                            <div className="flex-1 flex flex-col items-center justify-center py-1">
                              <div className="relative p-2 bg-white rounded-lg border border-slate-200 shadow-2xs shrink-0">
                                {/* 四个角的扫描框线 */}
                                <div className="absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2 border-blue-600" />
                                <div className="absolute top-1 right-1 w-2 h-2 border-t-2 border-r-2 border-blue-600" />
                                <div className="absolute bottom-1 left-1 w-2 h-2 border-b-2 border-l-2 border-blue-600" />
                                <div className="absolute bottom-1 right-1 w-2 h-2 border-b-2 border-r-2 border-blue-600" />

                                {materialQrUrl ? (
                                  <img
                                    src={materialQrUrl}
                                    alt={`物料二维码-${activeMaterialDetail.materialCode}`}
                                    className="w-24 h-24 object-contain"
                                  />
                                ) : (
                                  <div className="w-24 h-24 flex items-center justify-center text-slate-400 text-xs font-mono">
                                    生成中...
                                  </div>
                                )}
                              </div>
                              <div className="text-[10px] text-center font-mono text-slate-400 mt-1.5">
                                扫码快速追溯物料主档
                              </div>
                            </div>

                            {/* 底部操作按钮：下载与打印并排 */}
                            <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={handleDownloadQR}
                                className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer shadow-2xs"
                                title="下载物料二维码图片"
                              >
                                <Download className="w-3.5 h-3.5 text-blue-600" />
                                <span>下载</span>
                              </button>

                              <button
                                type="button"
                                onClick={handlePrintQR}
                                className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer shadow-2xs"
                                title="打印物料条码标签"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>打印标签</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {false && (
                <div>
                  <div>
                    <table>
                      <thead>
                        <tr>
                          <th className="py-2.5 px-3 min-w-[130px] whitespace-nowrap">规格</th>
                          <th className="py-2.5 px-3 min-w-[140px] whitespace-nowrap">图号</th>
                          {!isNoVersionMode && (
                            <th className="py-2.5 px-2 text-center min-w-[90px] whitespace-nowrap">图号版本</th>
                          )}
                          <th className="py-2.5 px-2 text-center min-w-[80px] whitespace-nowrap">品牌</th>
                          <th className="py-2.5 px-2 text-center min-w-[70px] whitespace-nowrap">库存</th>
                          <th className="py-2.5 px-2 text-center min-w-[60px] whitespace-nowrap">单位</th>
                          <th className="py-2.5 px-3 text-right min-w-[90px] whitespace-nowrap">标准用量</th>
                          <th className="py-2.5 px-3 text-right min-w-[90px] whitespace-nowrap">标准成本</th>
                          <th className="py-2.5 px-3 min-w-[120px] whitespace-nowrap">工艺路线</th>
                          {/* 操作列冻结在最右侧 */}
                          <th className="py-2.5 px-3 text-center min-w-[90px] sticky right-0 z-30 bg-slate-100 dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)] whitespace-nowrap">
                            操作
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {currentStructureTree.map(node => {
                          const hasVersion = Boolean(node.versionNo && node.versionNo !== '-' && node.versionNo.trim() !== '');
                          const hasChildren = hasVersion && Boolean(node.children && node.children.length > 0);
                          const isExpanded = !!expandedTreeNodes[node.id];
                          const nodeDrawing = getNodeDrawingInfo(node);

                          return (
                            <React.Fragment key={node.id}>
                              {/* 1 级物料节点 */}
                              <tr className="group hover:bg-slate-50/90 dark:hover:bg-slate-800/60 transition-colors whitespace-nowrap">
                                {/* 物料信息冻结在最左侧 */}
                                <td className="py-2.5 px-3 sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50/90 dark:group-hover:bg-slate-800/60 border-r border-slate-200 dark:border-slate-700 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] transition-colors whitespace-nowrap">
                                  <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                                    {hasChildren ? (
                                      <button
                                        type="button"
                                        onClick={() => toggleTreeNode(node.id)}
                                        className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                        title={isExpanded ? '收起子件' : '展开子件'}
                                      >
                                        {isExpanded ? (
                                          <ChevronDown className="w-3.5 h-3.5" />
                                        ) : (
                                          <ChevronRight className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                    ) : (
                                      <span className="w-4 shrink-0" />
                                    )}
                                    {isBOMEditable ? (
                                      <select
                                        value={node.materialCode}
                                        onChange={(e) => {
                                          const selectedMat = materials.find(m => m.materialCode === e.target.value);
                                          if (selectedMat) {
                                            const vNo = (selectedMat.latestVersion && selectedMat.latestVersion !== '-') ? selectedMat.latestVersion : '-';
                                            const subItems = (vNo !== '-' && vNo !== '') ? (selectedMat.children || [
                                              {
                                                id: `SUB-${Date.now()}-1`,
                                                materialCode: `SUB-${selectedMat.materialCode.slice(-4)}-01`,
                                                materialName: `${selectedMat.materialName}-基板组件`,
                                                category: '加工子件',
                                                spec: '标配组件',
                                                unit: '件',
                                                standardQty: 1,
                                                level: 2,
                                                versionNo: 'V1',
                                                brand: '自研',
                                                stock: 50,
                                                standardCost: 85.00,
                                                route: '标准机加',
                                              }
                                            ]) : undefined;
                                            handleUpdateStructureNode(node.id, {
                                              materialCode: selectedMat.materialCode,
                                              materialName: selectedMat.materialName,
                                              spec: selectedMat.materialSpec,
                                              unit: selectedMat.unit,
                                              category: selectedMat.category,
                                              versionNo: vNo,
                                              children: subItems,
                                            });
                                          }
                                        }}
                                        className="max-w-[200px] text-xs font-mono border border-blue-300 dark:border-blue-700 rounded px-1.5 py-0.5 bg-white dark:bg-slate-950 text-blue-700 dark:text-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs"
                                        title="重新选择物料"
                                      >
                                        <option value={node.materialCode}>{node.materialCode} - {node.materialName}</option>
                                        {materials.map(m => (
                                          m.materialCode !== node.materialCode && (
                                            <option key={m.id} value={m.materialCode}>{m.materialCode} - {m.materialName}</option>
                                          )
                                        ))}
                                      </select>
                                    ) : (
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">{node.materialCode}</span>
                                        <span className="font-medium text-slate-800 dark:text-slate-100">{node.materialName}</span>
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-slate-500 text-[11px] whitespace-nowrap">{node.businessAttr || '-'}</td>
                                {/* 版本号：根据是否有版本号来判断是否有子件 */}
                                <td className="py-2.5 px-3 text-center whitespace-nowrap font-mono">
                                  {isBOMEditable ? (
                                    <select
                                      value={node.versionNo || '-'}
                                      onChange={(e) => {
                                        const newVer = e.target.value;
                                        const hasVer = newVer !== '-' && newVer !== '';
                                        let updatedChildren = node.children;
                                        if (hasVer && (!updatedChildren || updatedChildren.length === 0)) {
                                          updatedChildren = [
                                            {
                                              id: `SUB-${Date.now()}-1`,
                                              materialCode: `SUB-${node.materialCode.slice(-4)}-01`,
                                              materialName: `${node.materialName}-基板组件`,
                                              category: '加工子件',
                                              spec: '标配组件',
                                              unit: node.unit || '件',
                                              standardQty: 1,
                                              level: 2,
                                              versionNo: 'V1',
                                              brand: '自研',
                                              stock: 50,
                                              standardCost: 85.00,
                                              route: '标准机加',
                                            }
                                          ];
                                          // 自动展开
                                          setExpandedTreeNodes(prev => ({ ...prev, [node.id]: true }));
                                        } else if (!hasVer) {
                                          updatedChildren = undefined;
                                        }
                                        handleUpdateStructureNode(node.id, {
                                          versionNo: newVer,
                                          children: updatedChildren,
                                        });
                                      }}
                                      className="px-1.5 py-0.5 text-xs font-mono font-bold border border-blue-300 dark:border-blue-700 rounded bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs"
                                      title="选择版本号：有版本号才有子件"
                                    >
                                      <option value="-">无版本(-)</option>
                                      <option value="V1">V1</option>
                                      <option value="V2">V2</option>
                                      <option value="V3">V3</option>
                                    </select>
                                  ) : (
                                    <span className="font-semibold text-slate-700 dark:text-slate-200">{node.versionNo || '-'}</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-2 text-center whitespace-nowrap">
                                  {node.image ? (
                                    <img
                                      src={node.image}
                                      alt={node.materialName}
                                      className="w-7 h-7 object-cover rounded border border-slate-200 mx-auto"
                                    />
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 whitespace-nowrap">{node.category}</td>
                                <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">{node.spec}</td>
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  {nodeDrawing.isSelfMade && nodeDrawing.drawingNo ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (onNavigateToDrawings && nodeDrawing.drawingNo) {
                                          onNavigateToDrawings(nodeDrawing.drawingNo, {
                                            productCode: node.materialCode,
                                            productName: node.materialName,
                                            specName: node.spec,
                                          });
                                        }
                                      }}
                                      className="font-mono font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline cursor-pointer inline-flex items-center gap-1 group text-[11px]"
                                      title="点击跳转至图号管理"
                                    >
                                      <span className="group-hover:underline">{nodeDrawing.drawingNo}</span>
                                      <ChevronRight className="w-3 h-3 text-blue-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
                                    </button>
                                  ) : (
                                    <span className="text-slate-300 dark:text-slate-600">-</span>
                                  )}
                                </td>
                                {!isNoVersionMode && (
                                  <td className="py-2.5 px-2 text-center whitespace-nowrap">
                                    {isBOMEditable ? (
                                      <select
                                        value={node.drawingVersionNo || nodeDrawing.drawingVersionNo || ''}
                                        onChange={e => handleUpdateStructureNode(node.id, { drawingVersionNo: e.target.value })}
                                        className="w-16 px-1 py-0.5 text-[10px] font-mono border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-950 focus:outline-none focus:border-blue-500"
                                      >
                                        <option value="">-</option>
                                        <option value="V1">V1</option>
                                        <option value="V2">V2</option>
                                        <option value="V3">V3</option>
                                        <option value="V4">V4</option>
                                      </select>
                                    ) : nodeDrawing.isSelfMade && nodeDrawing.drawingVersionNo ? (
                                      <span className="font-mono font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200/80 dark:border-indigo-800 text-[10px]">
                                        {nodeDrawing.drawingVersionNo}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300 dark:text-slate-600">-</span>
                                    )}
                                  </td>
                                )}
                                <td className="py-2.5 px-2 text-center text-slate-400 whitespace-nowrap">{node.brand || '-'}</td>
                                <td className="py-2.5 px-2 text-center font-mono whitespace-nowrap">{node.stock || 0}</td>
                                <td className="py-2.5 px-2 text-center whitespace-nowrap">{node.unit}</td>
                                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                  {isBOMEditable ? (
                                    <input
                                      type="number"
                                      value={node.standardQty}
                                      onChange={e => handleUpdateStructureNode(node.id, { standardQty: Number(e.target.value) })}
                                      className="w-16 px-1.5 py-0.5 text-xs text-right border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:border-blue-500 bg-white dark:bg-slate-950 font-mono"
                                    />
                                  ) : (
                                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{node.standardQty}</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-slate-500 whitespace-nowrap">¥{node.standardCost || '0.00'}</td>
                                <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 text-[11px] whitespace-nowrap">{node.route || '-'}</td>
                                {/* 操作列冻结在最右侧 */}
                                <td className="py-2.5 px-3 text-center sticky right-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50/90 dark:group-hover:bg-slate-800/60 border-l border-slate-200 dark:border-slate-700 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)] transition-colors whitespace-nowrap">
                                  {isBOMEditable ? (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteStructureNode(node)}
                                      className="text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 font-semibold cursor-pointer px-2 py-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                                      title="整条删除该物料"
                                    >
                                      删除
                                    </button>
                                  ) : (
                                    <span className="text-slate-300 dark:text-slate-600">-</span>
                                  )}
                                </td>
                              </tr>

                              {/* 2 级子物料节点 (仅在物料有版本号且有子件且已展开时展示) */}
                              {hasChildren && isExpanded && (
                                node.children?.map(child => {
                                  const childDrawing = getNodeDrawingInfo(child);
                                  return (
                                    <tr key={child.id} className="group hover:bg-slate-50/90 dark:hover:bg-slate-800/60 bg-slate-50/40 dark:bg-slate-900/40 transition-colors whitespace-nowrap">
                                      {/* 物料信息冻结在最左侧 */}
                                      <td className="py-2.5 px-3 pl-8 sticky left-0 z-10 bg-slate-50/95 dark:bg-slate-900/95 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 border-r border-slate-200 dark:border-slate-700 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] transition-colors whitespace-nowrap">
                                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                          <span className="w-3 border-b-2 border-slate-300 dark:border-slate-600 shrink-0"></span>
                                          {isBOMEditable ? (
                                            <select
                                              value={child.materialCode}
                                              onChange={(e) => {
                                                const selectedMat = materials.find(m => m.materialCode === e.target.value);
                                                if (selectedMat) {
                                                  handleUpdateStructureNode(child.id, {
                                                    materialCode: selectedMat.materialCode,
                                                    materialName: selectedMat.materialName,
                                                    spec: selectedMat.materialSpec,
                                                    unit: selectedMat.unit,
                                                    category: selectedMat.category,
                                                    versionNo: selectedMat.latestVersion,
                                                  });
                                                }
                                              }}
                                              className="max-w-[190px] text-xs font-mono border border-blue-300 dark:border-blue-700 rounded px-1.5 py-0.5 bg-white dark:bg-slate-950 text-blue-700 dark:text-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs"
                                              title="重新选择子件物料"
                                            >
                                              <option value={child.materialCode}>{child.materialCode} - {child.materialName}</option>
                                              {materials.map(m => (
                                                m.materialCode !== child.materialCode && (
                                                  <option key={m.id} value={m.materialCode}>{m.materialCode} - {m.materialName}</option>
                                                )
                                              ))}
                                            </select>
                                          ) : (
                                            <div className="flex items-center gap-1.5">
                                              <span className="font-mono font-medium text-blue-600 dark:text-blue-400">{child.materialCode}</span>
                                              <span>{child.materialName}</span>
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                      <td className="py-2.5 px-3 text-slate-500 text-[11px] whitespace-nowrap">{child.businessAttr || '-'}</td>
                                      <td className="py-2.5 px-3 text-center font-mono whitespace-nowrap">{child.versionNo || '-'}</td>
                                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                                        {child.image ? (
                                          <img
                                            src={child.image}
                                            alt={child.materialName}
                                            className="w-7 h-7 object-cover rounded border border-slate-200 mx-auto"
                                          />
                                        ) : (
                                          <span className="text-slate-300">-</span>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-3 whitespace-nowrap">{child.category}</td>
                                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">{child.spec}</td>
                                      <td className="py-2.5 px-3 whitespace-nowrap">
                                        {childDrawing.isSelfMade && childDrawing.drawingNo ? (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (onNavigateToDrawings && childDrawing.drawingNo) {
                                                onNavigateToDrawings(childDrawing.drawingNo, {
                                                  productCode: child.materialCode,
                                                  productName: child.materialName,
                                                  specName: child.spec,
                                                });
                                              }
                                            }}
                                            className="font-mono font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline cursor-pointer inline-flex items-center gap-1 group text-[11px]"
                                            title="点击跳转至图号管理"
                                          >
                                            <span className="group-hover:underline">{childDrawing.drawingNo}</span>
                                            <ChevronRight className="w-3 h-3 text-blue-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
                                          </button>
                                        ) : (
                                          <span className="text-slate-300 dark:text-slate-600">-</span>
                                        )}
                                      </td>
                                      {!isNoVersionMode && (
                                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                                          {isBOMEditable ? (
                                            <select
                                              value={child.drawingVersionNo || childDrawing.drawingVersionNo || ''}
                                              onChange={e => handleUpdateStructureNode(child.id, { drawingVersionNo: e.target.value })}
                                              className="w-16 px-1 py-0.5 text-[10px] font-mono font-bold border border-indigo-300 dark:border-indigo-700 rounded bg-indigo-50/80 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                                            >
                                              <option value="">-</option>
                                              <option value="V1">V1</option>
                                              <option value="V2">V2</option>
                                              <option value="V3">V3</option>
                                              <option value="V4">V4</option>
                                            </select>
                                          ) : childDrawing.isSelfMade && childDrawing.drawingVersionNo ? (
                                            <span className="font-mono font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200/80 dark:border-indigo-800 text-[10px]">
                                              {childDrawing.drawingVersionNo}
                                            </span>
                                          ) : (
                                            <span className="text-slate-300 dark:text-slate-600">-</span>
                                          )}
                                        </td>
                                      )}
                                      <td className="py-2.5 px-2 text-center text-slate-400 whitespace-nowrap">{child.brand || '-'}</td>
                                      <td className="py-2.5 px-2 text-center font-mono whitespace-nowrap">{child.stock || 0}</td>
                                      <td className="py-2.5 px-2 text-center whitespace-nowrap">{child.unit}</td>
                                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                        <span
                                          className="font-mono font-bold text-slate-800 dark:text-slate-200"
                                          title="BOM子物料标准用量由版本固定，不可修改"
                                        >
                                          {child.standardQty}
                                        </span>
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-mono text-slate-500 whitespace-nowrap">¥{child.standardCost || '0.00'}</td>
                                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 text-[11px] whitespace-nowrap">{child.route || '-'}</td>
                                      {/* 操作列冻结在最右侧 */}
                                      <td className="py-2.5 px-3 text-center sticky right-0 z-10 bg-slate-50/95 dark:bg-slate-900/95 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 border-l border-slate-200 dark:border-slate-700 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)] transition-colors whitespace-nowrap">
                                        {isBOMEditable ? (
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteStructureNode(child)}
                                            className="text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 font-semibold cursor-pointer px-2 py-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                                            title="整条删除该子物料"
                                          >
                                            删除
                                          </button>
                                        ) : (
                                          <span className="text-slate-300 dark:text-slate-600">-</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* 底部成本汇总与页脚 */}
                  <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0 text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                      <span>共 <strong className="text-slate-800 dark:text-slate-200 font-semibold">{currentStructureTree.length}</strong> 条</span>
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">10条/页</span>
                    </div>

                    <div className="font-semibold text-slate-700 dark:text-slate-200">
                      BOM总成本 <strong className="text-blue-600 font-mono text-sm ml-1">¥0.00</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* 页签 2: BOM使用记录 (销售订单-项次、订单状态、生产工单、工单状态) */}
              {detailActiveTab === 'usage' && (
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-50/40 dark:bg-slate-950/20">
                  {/* 顶部搜索栏 */}
                  <div className="p-3.5 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="text-xs text-slate-500 font-medium">
                        共 <strong className="text-slate-800 dark:text-slate-200 font-semibold">{filteredUsageRecords.length}</strong> 条记录
                      </div>

                      {/* 搜索框 */}
                      <div className="relative w-full sm:w-72">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="搜索销售订单、项次或生产工单..."
                          value={usageSearchQuery}
                          onChange={e => setUsageSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-7 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        {usageSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setUsageSearchQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 表格主体 */}
                  <div className="flex-1 min-h-0 overflow-auto p-3.5">
                    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold sticky top-0 z-10 select-none">
                          <tr>
                            <th className="px-3.5 py-2.5">销售订单-项次</th>
                            <th className="px-3.5 py-2.5 text-center">订单状态</th>
                            <th className="px-3.5 py-2.5">生产工单</th>
                            <th className="px-3.5 py-2.5 text-center">工单状态</th>
                            <th className="px-3.5 py-2.5">BOM编码</th>
                            <th className="px-3.5 py-2.5 text-center">BOM版本</th>
                            <th className="px-3.5 py-2.5">所属产品</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                          {pagedUsageRecords.length > 0 ? (
                            pagedUsageRecords.map(item => (
                              <tr
                                key={item.id}
                                className="hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition-colors"
                              >
                                {/* 销售订单-项次 (核心要求字段) */}
                                <td className="px-3.5 py-2.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200/80 dark:border-blue-800/80">
                                      {item.orderItemKey}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard?.writeText(item.orderItemKey);
                                        setToastMessage(`已复制订单项次: ${item.orderItemKey}`);
                                      }}
                                      className="text-slate-400 hover:text-blue-600 cursor-pointer p-0.5 transition-colors"
                                      title="复制销售订单-项次"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>

                                {/* 订单状态 (销售订单项次后面加一个订单状态) */}
                                <td className="px-3.5 py-2.5 text-center">
                                  {item.orderStatus === '已完成' || item.status === 'COMPLETED' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                      已完成
                                    </span>
                                  ) : item.orderStatus === '执行中' || item.status === 'IN_PRODUCTION' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                      执行中
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                      <Clock className="w-3 h-3 text-slate-500" />
                                      已生效
                                    </span>
                                  )}
                                </td>

                                {/* 生产工单 (核心要求字段) */}
                                <td className="px-3.5 py-2.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                      {item.workOrderNo}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard?.writeText(item.workOrderNo);
                                        setToastMessage(`已复制工单号: ${item.workOrderNo}`);
                                      }}
                                      className="text-slate-400 hover:text-blue-600 cursor-pointer p-0.5 transition-colors"
                                      title="复制生产工单号"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>

                                {/* 工单状态 */}
                                <td className="px-3.5 py-2.5 text-center">
                                  {item.status === 'IN_PRODUCTION' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                      生产中
                                    </span>
                                  ) : item.status === 'COMPLETED' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                      <CheckCircle2 className="w-3 h-3 text-blue-500" />
                                      已完工
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                      <Clock className="w-3 h-3 text-amber-500" />
                                      待排产
                                    </span>
                                  )}
                                </td>

                                {/* BOM编码 (在右边) */}
                                <td className="px-3.5 py-2.5 font-mono font-medium text-slate-800 dark:text-slate-200">
                                  {item.bomCode}
                                </td>

                                {/* BOM版本 (在右边) */}
                                <td className="px-3.5 py-2.5 text-center">
                                  <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200/80 dark:border-indigo-800 text-[11px]">
                                    {(() => {
                                      const v = item.bomVersion || '';
                                      const base = v.startsWith('V') ? v : `V${v}`;
                                      return base.includes('.') ? base : `${base}.0`;
                                    })()}
                                  </span>
                                </td>

                                {/* 所属产品 (在右边) */}
                                <td className="px-3.5 py-2.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-slate-400 text-[11px]">
                                      [{item.productCode}]
                                    </span>
                                    <span className="font-medium text-slate-800 dark:text-slate-200">
                                      {item.productName}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                                <div className="flex flex-col items-center justify-center gap-2">
                                  <Layers className="w-8 h-8 text-slate-300 dark:text-slate-600 stroke-[1.5]" />
                                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                    暂无符合条件的BOM使用记录
                                  </p>
                                  <p className="text-xs text-slate-400 max-w-sm">
                                    {usageSearchQuery
                                      ? `未检索到匹配“${usageSearchQuery}”的销售订单或生产工单，请尝试重置搜索词`
                                      : `当前 BOM 版本【${detailSelectedVersion}】暂未绑定对应销售订单项次及生产工单`}
                                  </p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 分页控制条 */}
                  <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0 text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                      <span>
                        共 <strong className="text-slate-800 dark:text-slate-200 font-semibold">{filteredUsageRecords.length}</strong> 条记录（当前版本 {detailSelectedVersion}）
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-medium">{usagePageSize}条/页</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-600 dark:text-slate-400 mr-1">
                        第 {usagePage} / {totalUsagePages} 页
                      </span>
                      <button
                        type="button"
                        disabled={usagePage <= 1}
                        onClick={() => setUsagePage(p => Math.max(1, p - 1))}
                        className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 font-medium cursor-pointer"
                      >
                        上一页
                      </button>
                      <button
                        type="button"
                        disabled={usagePage >= totalUsagePages}
                        onClick={() => setUsagePage(p => Math.min(totalUsagePages, p + 1))}
                        className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 font-medium cursor-pointer"
                      >
                        下一页
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {detailActiveTab === 'drawings' && (
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  {/* 图纸工具栏：范围筛选、搜索框与批量下载 */}
                  <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 bg-white dark:bg-slate-900 flex-wrap">
                    {/* 左侧：子物料范围切换卡片 */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs text-slate-500 font-medium mr-1">显示范围:</span>
                      <button
                        type="button"
                        onClick={() => setDrawingScopeFilter('ALL')}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                          drawingScopeFilter === 'ALL'
                            ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold border border-blue-300 dark:border-blue-700'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span>全部图纸</span>
                        <span className="font-mono text-[11px] px-1 py-0.2 rounded bg-white/60 dark:bg-black/20">
                          {drawingScopeCounts.total}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDrawingScopeFilter('CURRENT')}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                          drawingScopeFilter === 'CURRENT'
                            ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold border border-blue-300 dark:border-blue-700'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span>所选物料图纸</span>
                        <span className="font-mono text-[11px] px-1 py-0.2 rounded bg-white/60 dark:bg-black/20">
                          {drawingScopeCounts.current}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDrawingScopeFilter('SUB')}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                          drawingScopeFilter === 'SUB'
                            ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-700'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span>仅下级物料图纸</span>
                        <span className="font-mono text-[11px] px-1 py-0.2 rounded bg-white/60 dark:bg-black/20">
                          {drawingScopeCounts.sub}
                        </span>
                      </button>
                    </div>

                    {/* 右侧：搜索图纸与物料框 + 批量下载按钮 (放在搜索框右边) */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <div className="relative min-w-[200px] sm:min-w-[240px]">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="搜索图纸文件/图号/物料..."
                          value={drawingSearchQuery}
                          onChange={e => setDrawingSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                        {drawingSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setDrawingSearchQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* 批量下载按钮（移到搜索框右边） */}
                      {selectedDrawingIds.length > 0 && (
                        <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-1 rounded-md font-medium border border-blue-200 dark:border-blue-800">
                          已勾选 {selectedDrawingIds.length} 项
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={handleBatchDownloadDrawings}
                        className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-md flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors shrink-0"
                        title="批量打包下载选中的图纸文件"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>批量下载 {selectedDrawingIds.length > 0 ? `(${selectedDrawingIds.length})` : ''}</span>
                      </button>
                    </div>
                  </div>

                  {/* 图纸表格展示 */}
                  <div className="flex-1 overflow-x-auto overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="py-2.5 px-3 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={currentDrawings.length > 0 && currentDrawings.every(d => selectedDrawingIds.includes(d.id))}
                              onChange={e => handleSelectAllDrawings(e.target.checked)}
                              className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                              title="全选 / 取消全选"
                            />
                          </th>
                          <th className="py-2.5 px-3 min-w-[220px]">图纸文件</th>
                          <th className="py-2.5 px-3">图号</th>
                          <th className="py-2.5 px-3">所属物料</th>
                          <th className="py-2.5 px-3">物料来源/层级</th>
                          <th className="py-2.5 px-3">分类</th>
                          <th className="py-2.5 px-3">更新时间</th>
                          <th className="py-2.5 px-3 text-right">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                        {currentDrawings.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-12 text-center text-slate-400">
                              暂无符合条件的关联图纸
                            </td>
                          </tr>
                        ) : (
                          pagedDrawings.map((drw, idx) => {
                            const isSelected = selectedDrawingIds.includes(drw.id);
                            const isCurrentMat = drw.sourceType === 'CURRENT_MATERIAL' || drw.sourceType === 'PRODUCT_ROOT';
                            return (
                              <tr
                                key={drw.id || `mat-${idx}`}
                                className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                                  isSelected ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                                }`}
                              >
                                <td className="py-2.5 px-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleDrawingSelect(drw.id)}
                                    className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                                  />
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-2">
                                    <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold border ${getFileTypeBadge(drw.fileType)}`}>
                                      .{drw.fileType}
                                    </span>
                                    <span className="font-medium text-slate-800 dark:text-slate-200">
                                      {drw.fileName}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 font-mono text-blue-600 dark:text-blue-400 font-medium">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (onNavigateToDrawings) {
                                        onNavigateToDrawings(drw.drawingNo || drw.materialCode, {
                                          productCode: drw.materialCode,
                                          productName: drw.materialName,
                                        });
                                      }
                                    }}
                                    className="hover:underline cursor-pointer inline-flex items-center gap-1 group"
                                    title="点击跳转至图号管理"
                                  >
                                    <span>{drw.drawingNo || drw.materialCode}</span>
                                    <ChevronRight className="w-3 h-3 text-blue-500 group-hover:translate-x-0.5 transition-transform" />
                                  </button>
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="flex flex-col">
                                    <span className="font-medium text-slate-800 dark:text-slate-200">
                                      {drw.materialName}
                                    </span>
                                    <span className="font-mono text-[10px] text-slate-400">
                                      {drw.materialCode}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3">
                                  {isCurrentMat ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                      {drw.sourceType === 'PRODUCT_ROOT' ? '主产品 (总成)' : '所选物料 (当前)'}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                      {drw.relationPath || '下级子物料'}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-slate-500">{drw.category}</td>
                                <td className="py-2.5 px-3 font-mono text-slate-500">{drw.updateTime}</td>
                                <td className="py-2.5 px-3 text-right">
                                  <div className="inline-flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenDrawingPreview(drw)}
                                      className="px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 hover:bg-blue-100 rounded border border-blue-200 dark:border-blue-800 cursor-pointer inline-flex items-center gap-1"
                                      title="在线预览图纸"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      预览
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadSingleDrawing(drw)}
                                      className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer transition-colors"
                                      title="下载图纸附件"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* 分页控制条 */}
                  <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0 text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                      <span>共 <strong className="text-slate-800 dark:text-slate-200 font-semibold">{currentDrawings.length}</strong> 条图纸</span>
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-medium">{drawingPageSize}条/页</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-600 dark:text-slate-400 mr-1">
                        第 {drawingPage} / {totalDrawingPages} 页
                      </span>
                      <button
                        type="button"
                        disabled={drawingPage <= 1}
                        onClick={() => setDrawingPage(p => Math.max(1, p - 1))}
                        className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 font-medium cursor-pointer"
                      >
                        上一页
                      </button>
                      <button
                        type="button"
                        disabled={drawingPage >= totalDrawingPages}
                        onClick={() => setDrawingPage(p => Math.min(totalDrawingPages, p + 1))}
                        className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 font-medium cursor-pointer"
                      >
                        下一页
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 页签 3: 审批记录 (Approval Records - 审批流程节点与流转记录) */}
              {detailActiveTab === 'approvals' && (
                <div className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/40 p-3 space-y-2.5">
                  {/* 顶部流转概览与工具栏 (高密度紧凑卡片) */}
                  <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 p-3 shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="w-1 h-3.5 bg-emerald-600 rounded-full" />
                        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs flex items-center gap-1.5">
                          <span>BOM 审批流程与流转记录</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            共 {currentApprovalRecords.length} 次流转
                          </span>
                        </h4>
                      </div>

                      {/* 视图切换 + 搜索 + 反审批操作按钮 */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* 视图切换按钮组 */}
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md border border-slate-200/80 dark:border-slate-700 text-xs">
                          <button
                            type="button"
                            onClick={() => setApprovalViewMode('timeline')}
                            className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                              approvalViewMode === 'timeline'
                                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                          >
                            <GitCommit className="w-3 h-3" />
                            时间轴视图
                          </button>
                          <button
                            type="button"
                            onClick={() => setApprovalViewMode('table')}
                            className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                              approvalViewMode === 'table'
                                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                          >
                            <FileSpreadsheet className="w-3 h-3" />
                            流水表格
                          </button>
                        </div>

                        {/* 搜索框 */}
                        <div className="relative w-36 sm:w-44">
                          <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={approvalSearchQuery}
                            onChange={e => setApprovalSearchQuery(e.target.value)}
                            placeholder="搜索审批人/意见..."
                            className="w-full pl-7 pr-2 py-1 text-[11px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                          />
                        </div>

                        {/* 反审批快捷入口 (仅当已通过/已发布时) */}
                        {currentBOM.status === 'PUBLISHED' && (
                          <button
                            type="button"
                            onClick={() => handleOpenReverseApprovalModal(currentBOM)}
                            className="px-2 py-1 text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900 border border-amber-200 dark:border-amber-800 rounded-md flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                            title="对当前已发布的 BOM 执行反审批，重置回草稿状态重新编辑"
                          >
                            <RotateCcw className="w-3 h-3" />
                            反审批
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 流转概览紧凑统计条 */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-850 rounded-md border border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">当前状态</span>
                        <div className="flex items-center gap-1">
                          <span className={`px-1.5 py-0.2 text-[10px] font-semibold rounded ${getStatusBadge(currentBOM.status).className}`}>
                            {getStatusBadge(currentBOM.status).label}
                          </span>
                        </div>
                      </div>

                      <div className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-850 rounded-md border border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">流转版本</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-100 text-xs">
                          {detailSelectedVersion}
                        </span>
                      </div>

                      <div className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-850 rounded-md border border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">最近审批人</span>
                        <span className="font-medium text-slate-800 dark:text-slate-100 text-[11px] truncate max-w-[120px]">
                          {currentApprovalRecords[currentApprovalRecords.length - 1]?.approver || '-'}
                        </span>
                      </div>

                      <div className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-850 rounded-md border border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">最近时间</span>
                        <span className="font-mono text-slate-600 dark:text-slate-300 text-[11px] truncate">
                          {currentApprovalRecords[currentApprovalRecords.length - 1]?.timestamp || '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 视图模式 1: 紧凑清晰的时间轴视图 */}
                  {approvalViewMode === 'timeline' && (
                    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 p-3 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <div className="flex items-center gap-1.5">
                          <History className="w-3.5 h-3.5 text-blue-600" />
                          <h5 className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                            节点流转时间轴与审核意见
                          </h5>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          按审批先后顺序倒序/正序流转
                        </span>
                      </div>

                      {/* Timeline List */}
                      <div className="relative pl-5 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700 space-y-2.5">
                        {(() => {
                          const filteredRecords = currentApprovalRecords.filter(r => {
                            if (!approvalSearchQuery.trim()) return true;
                            const q = approvalSearchQuery.toLowerCase();
                            return (
                              r.nodeName.toLowerCase().includes(q) ||
                              r.approver.toLowerCase().includes(q) ||
                              (r.comment && r.comment.toLowerCase().includes(q)) ||
                              (r.actionName && r.actionName.toLowerCase().includes(q)) ||
                              (r.department && r.department.toLowerCase().includes(q))
                            );
                          });

                          if (filteredRecords.length === 0) {
                            return (
                              <div className="text-center py-6 text-slate-400 text-xs italic">
                                暂无符合条件的审批流转记录
                              </div>
                            );
                          }

                          return filteredRecords.map((rec, idx) => {
                            const isLast = idx === filteredRecords.length - 1;
                            const fromBadge = getStatusBadge(rec.fromStatus);
                            const toBadge = getStatusBadge(rec.toStatus);

                            let dotColor = 'bg-blue-500 ring-2 ring-blue-100 dark:ring-blue-950/60';
                            let actionTagColor = 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';

                            if (rec.action === 'APPROVE') {
                              dotColor = 'bg-emerald-500 ring-2 ring-emerald-100 dark:ring-emerald-950/60';
                              actionTagColor = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
                            } else if (rec.action === 'REJECT') {
                              dotColor = 'bg-rose-500 ring-2 ring-rose-100 dark:ring-rose-950/60';
                              actionTagColor = 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800';
                            } else if (rec.action === 'REVERSE_APPROVAL') {
                              dotColor = 'bg-amber-500 ring-2 ring-amber-100 dark:ring-amber-950/60';
                              actionTagColor = 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800';
                            } else if (rec.action === 'SUBMIT') {
                              dotColor = 'bg-indigo-500 ring-2 ring-indigo-100 dark:ring-indigo-950/60';
                              actionTagColor = 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
                            }

                            return (
                              <div key={rec.id} className="relative group">
                                <div
                                  className={`absolute -left-5 top-2 w-2.5 h-2.5 rounded-full ${dotColor} transition-transform group-hover:scale-125`}
                                />

                                <div className="bg-slate-50/70 dark:bg-slate-850/60 rounded-lg border border-slate-200/70 dark:border-slate-800 p-2.5 text-xs space-y-1.5 transition-colors hover:border-blue-200 dark:hover:border-slate-700 shadow-2xs">
                                  {/* 卡片头部行：节点名 + 动作 + 状态流转 + 审批人 + 时间 */}
                                  <div className="flex items-center justify-between flex-wrap gap-1.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                                        {rec.nodeName}
                                      </span>
                                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${actionTagColor}`}>
                                        {rec.actionName}
                                      </span>
                                      <div className="flex items-center gap-1 text-[10px]">
                                        <span className={`px-1.5 py-0.2 font-semibold rounded ${fromBadge.className}`}>
                                          {fromBadge.label}
                                        </span>
                                        <ChevronRight className="w-3 h-3 text-slate-400" />
                                        <span className={`px-1.5 py-0.2 font-semibold rounded ${toBadge.className}`}>
                                          {toBadge.label}
                                        </span>
                                      </div>
                                      {isLast && (
                                        <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 text-[9px] font-bold">
                                          最新
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-[11px]">
                                      <div className="flex items-center gap-1">
                                        <User className="w-3 h-3 text-slate-400" />
                                        <span className="font-medium text-slate-700 dark:text-slate-200">{rec.approver}</span>
                                        {rec.department && (
                                          <span className="text-slate-400 text-[10px]">({rec.department})</span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1 font-mono text-slate-400 text-[10px]">
                                        <Clock className="w-3 h-3" />
                                        <span>{rec.timestamp}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* 意见说明 (紧凑型区块) */}
                                  {rec.comment && (
                                    <div className="py-1 px-2.5 bg-white dark:bg-slate-900 rounded border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 flex items-start gap-1.5">
                                      <span className="text-slate-400 shrink-0 font-medium">审核意见:</span>
                                      <p className="leading-relaxed whitespace-pre-wrap">
                                        {rec.comment}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}

                  {/* 视图模式 2: 紧凑高密度的审批流水表格 */}
                  {approvalViewMode === 'table' && (
                    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 p-3 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <div className="flex items-center gap-1.5">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                          <h5 className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                            审批流水明细记录表
                          </h5>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          全量审计流水
                        </span>
                      </div>

                      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-md">
                        <table className="w-full text-left text-xs whitespace-nowrap">
                          <thead className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                            <tr>
                              <th className="px-2.5 py-1.5 text-center text-[11px]">序号</th>
                              <th className="px-2.5 py-1.5 text-[11px]">流转节点</th>
                              <th className="px-2.5 py-1.5 text-center text-[11px]">前置状态</th>
                              <th className="px-2.5 py-1.5 text-center text-[11px]">后置状态</th>
                              <th className="px-2.5 py-1.5 text-[11px]">动作</th>
                              <th className="px-2.5 py-1.5 text-[11px]">审批人</th>
                              <th className="px-2.5 py-1.5 text-[11px]">所属部门/角色</th>
                              <th className="px-2.5 py-1.5 text-[11px]">流转时间</th>
                              <th className="px-2.5 py-1.5 min-w-[200px] text-[11px]">审批意见与说明</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                            {(() => {
                              const filteredRecords = currentApprovalRecords.filter(r => {
                                if (!approvalSearchQuery.trim()) return true;
                                const q = approvalSearchQuery.toLowerCase();
                                return (
                                  r.nodeName.toLowerCase().includes(q) ||
                                  r.approver.toLowerCase().includes(q) ||
                                  (r.comment && r.comment.toLowerCase().includes(q)) ||
                                  (r.actionName && r.actionName.toLowerCase().includes(q)) ||
                                  (r.department && r.department.toLowerCase().includes(q))
                                );
                              });

                              if (filteredRecords.length === 0) {
                                return (
                                  <tr>
                                    <td colSpan={9} className="px-3 py-6 text-center text-slate-400 italic text-[11px]">
                                      暂无符合条件的审批流转记录
                                    </td>
                                  </tr>
                                );
                              }

                              const totalPages = Math.max(1, Math.ceil(filteredRecords.length / approvalPageSize));
                              const safePage = Math.min(approvalPage, totalPages);
                              const startIdx = (safePage - 1) * approvalPageSize;
                              const pagedList = filteredRecords.slice(startIdx, startIdx + approvalPageSize);

                              return pagedList.map((rec, idx) => {
                                const fromBadge = getStatusBadge(rec.fromStatus);
                                const toBadge = getStatusBadge(rec.toStatus);
                                return (
                                  <tr key={rec.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-850/60 transition-colors">
                                    <td className="px-2.5 py-1.5 text-center font-mono text-slate-400 text-[11px]">{startIdx + idx + 1}</td>
                                    <td className="px-2.5 py-1.5 font-bold text-slate-800 dark:text-slate-100 text-[11px]">{rec.nodeName}</td>
                                    <td className="px-2.5 py-1.5 text-center">
                                      <span className={`px-1.5 py-0.2 text-[10px] font-semibold rounded ${fromBadge.className}`}>
                                        {fromBadge.label}
                                      </span>
                                    </td>
                                    <td className="px-2.5 py-1.5 text-center">
                                      <span className={`px-1.5 py-0.2 text-[10px] font-semibold rounded ${toBadge.className}`}>
                                        {toBadge.label}
                                      </span>
                                    </td>
                                    <td className="px-2.5 py-1.5 font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                                      {rec.actionName}
                                    </td>
                                    <td className="px-2.5 py-1.5 font-medium text-[11px]">{rec.approver}</td>
                                    <td className="px-2.5 py-1.5 text-slate-500 text-[11px]">{rec.department || '-'}</td>
                                    <td className="px-2.5 py-1.5 font-mono text-slate-500 text-[10px]">{rec.timestamp}</td>
                                    <td className="px-2.5 py-1.5 text-slate-600 dark:text-slate-300 whitespace-normal text-[11px]">
                                      {rec.comment}
                                    </td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>

                      {/* 审批明细表格分页栏 */}
                      {(() => {
                        const filteredRecords = currentApprovalRecords.filter(r => {
                          if (!approvalSearchQuery.trim()) return true;
                          const q = approvalSearchQuery.toLowerCase();
                          return (
                            r.nodeName.toLowerCase().includes(q) ||
                            r.approver.toLowerCase().includes(q) ||
                            (r.comment && r.comment.toLowerCase().includes(q)) ||
                            (r.actionName && r.actionName.toLowerCase().includes(q)) ||
                            (r.department && r.department.toLowerCase().includes(q))
                          );
                        });
                        const totalPages = Math.max(1, Math.ceil(filteredRecords.length / approvalPageSize));
                        const safePage = Math.min(approvalPage, totalPages);
                        return (
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                            <div className="flex items-center gap-2">
                              <span>共 <strong className="text-slate-800 dark:text-slate-200 font-semibold">{filteredRecords.length}</strong> 条流水</span>
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-medium">{approvalPageSize}条/页</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-slate-600 dark:text-slate-400 mr-1">
                                第 {safePage} / {totalPages} 页
                              </span>
                              <button
                                type="button"
                                disabled={safePage <= 1}
                                onClick={() => setApprovalPage(p => Math.max(1, p - 1))}
                                className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 font-medium cursor-pointer"
                              >
                                上一页
                              </button>
                              <button
                                type="button"
                                disabled={safePage >= totalPages}
                                onClick={() => setApprovalPage(p => Math.min(totalPages, p + 1))}
                                className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 font-medium cursor-pointer"
                              >
                                下一页
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* 页签 4: 操作日志 (Operation Log - 极简清爽历史记录，版本联动更新与分页) */}
              {detailActiveTab === 'logs' && (
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white dark:bg-slate-900">
                  {/* 顶部工具栏: 版本联动筛选与搜索 */}
                  <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap bg-white dark:bg-slate-900 shrink-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <History className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>当前BOM版本:</span>
                        <span className="font-mono text-xs px-2 py-0.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 rounded font-bold border border-blue-200 dark:border-blue-800">
                          {detailSelectedVersion}
                        </span>
                        <span className="text-slate-400 font-normal">
                          （仅展示当前版本的操作日志，共 {filteredOperationLogs.length} 条）
                        </span>
                      </div>
                    </div>

                    <div className="relative min-w-[200px] sm:min-w-[240px]">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="搜索操作人/动作/说明..."
                        value={logSearchQuery}
                        onChange={e => setLogSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-7 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                      {logSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setLogSearchQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 变更记录表格 */}
                  <div className="flex-1 overflow-x-auto overflow-y-auto">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2.5">记录时间</th>
                          <th className="px-3 py-2.5 text-center">相关版本</th>
                          <th className="px-3 py-2.5">操作人</th>
                          <th className="px-3 py-2.5">动作类型</th>
                          <th className="px-3 py-2.5 w-full">详细说明</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                        {pagedOperationLogs.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-3 py-12 text-center text-slate-400 italic">
                              暂无符合条件的历史变更记录
                            </td>
                          </tr>
                        ) : (
                          pagedOperationLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                              <td className="px-3 py-2.5 font-mono text-slate-500">{log.timestamp}</td>
                              <td className="px-3 py-2.5 text-center">
                                <span className="font-mono font-bold px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                                  {log.versionNo}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 font-medium">{log.operator}</td>
                              <td className="px-3 py-2.5 font-semibold text-slate-700 dark:text-slate-200">
                                {log.opTypeName || log.opType}
                              </td>
                              <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 whitespace-normal">
                                <span className="font-medium text-slate-800 dark:text-slate-200 mr-1.5">{log.title}:</span>
                                <span>{log.details}</span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* 分页控制条 */}
                  <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0 text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                      <span>共 <strong className="text-slate-800 dark:text-slate-200 font-semibold">{filteredOperationLogs.length}</strong> 条日志</span>
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-medium">{logPageSize}条/页</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-600 dark:text-slate-400 mr-1">
                        第 {logPage} / {totalLogPages} 页
                      </span>
                      <button
                        type="button"
                        disabled={logPage <= 1}
                        onClick={() => setLogPage(p => Math.max(1, p - 1))}
                        className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 font-medium cursor-pointer"
                      >
                        上一页
                      </button>
                      <button
                        type="button"
                        disabled={logPage >= totalLogPages}
                        onClick={() => setLogPage(p => Math.min(totalLogPages, p + 1))}
                        className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 font-medium cursor-pointer"
                      >
                        下一页
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================= 3. 新增 BOM 独立完整视图 (全屏展开新页面) ======================= */}
      {viewMode === 'create' && (
        <div className="flex-1 flex flex-col bg-slate-50/60 dark:bg-slate-950/40 p-3 sm:p-5 lg:p-6 overflow-y-auto space-y-5 pb-20">
          {/* 顶栏: 页面标题与操作导航 */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium border border-slate-200/80 dark:border-slate-700/80"
              >
                <ArrowLeft className="w-4 h-4 text-blue-600" />
                返回 BOM 列表
              </button>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-800 dark:text-white">
                  新增BOM
                </h2>
                <span className="px-2.5 py-0.5 text-[11px] font-semibold bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 rounded-full border border-blue-200 dark:border-blue-800">
                  草稿状态
                </span>
              </div>
            </div>
          </div>

          {/* 卡片 1: BOM 基础信息 */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-1 h-3.5 bg-blue-600 rounded-full" />
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                  1. BOM 基础信息
                </h3>
              </div>
            </div>

            {/* 表单字段网格 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {/* BOM编码 */}
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>BOM 编码 <span className="text-rose-500">*</span></span>
                  <button
                    type="button"
                    onClick={() => setNewBomForm(f => ({ ...f, bomCode: generateNewBomCode() }))}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    重新生成
                  </button>
                </label>
                <input
                  type="text"
                  value={newBomForm.bomCode}
                  onChange={e => setNewBomForm({ ...newBomForm, bomCode: e.target.value })}
                  placeholder="如 BOM202609090001"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* 物料信息 (原产品/物料编码和名称合并) */}
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  物料信息 <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newBomForm.selectedProductId || (materials.find(m => m.materialCode === newBomForm.productCode)?.id || '')}
                  onChange={e => {
                    const matId = e.target.value;
                    const mat = materials.find(m => m.id === matId);
                    if (mat) {
                      setNewBomForm(f => ({
                        ...f,
                        selectedProductId: mat.id,
                        productCode: mat.materialCode,
                        productName: mat.materialName,
                        specName: mat.materialSpec || '',
                        category: mat.category || f.category,
                        unit: mat.unit || f.unit,
                      }));
                    } else {
                      setNewBomForm(f => ({
                        ...f,
                        selectedProductId: '',
                        productCode: '',
                        productName: '',
                        specName: '',
                      }));
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">请选择物料信息</option>
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>
                      [{m.materialCode}] {m.materialName} {m.materialSpec ? `(${m.materialSpec})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* 物料分类 (原 BOM 分类) */}
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">物料分类</label>
                <input
                  type="text"
                  value={newBomForm.category}
                  onChange={e => setNewBomForm({ ...newBomForm, category: e.target.value })}
                  placeholder="选择物料信息后带出，或手动输入"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* 规格 (原 规格型号) */}
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">规格</label>
                <input
                  type="text"
                  value={newBomForm.specName}
                  onChange={e => setNewBomForm({ ...newBomForm, specName: e.target.value })}
                  placeholder="选择物料信息后带出，如 BK-090-L"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-mono"
                />
              </div>

              {/* 计量单位 */}
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">计量单位</label>
                <input
                  type="text"
                  value={newBomForm.unit}
                  onChange={e => setNewBomForm({ ...newBomForm, unit: e.target.value })}
                  placeholder="如 台 / 套 / 件"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                />
              </div>

              {/* BOM 版本 */}
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">BOM 版本</label>
                <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setNewBomForm(f => ({ ...f, versionNo: Math.max(1, parseInt(f.versionNo || '1', 10) - 1).toString() }))}
                    className="px-3.5 py-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold transition-colors cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="text"
                    value={newBomForm.versionNo}
                    onChange={e => setNewBomForm({ ...newBomForm, versionNo: e.target.value })}
                    className="w-full text-center py-2 bg-transparent text-slate-800 dark:text-slate-200 font-mono font-bold focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setNewBomForm(f => ({ ...f, versionNo: (parseInt(f.versionNo || '1', 10) + 1).toString() }))}
                    className="px-3.5 py-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold transition-colors cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* 关联销售订单 (紧跟在 BOM 版本字段之后) */}
              <div className="col-span-1 md:col-span-2 lg:col-span-1">
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>关联销售订单</span>
                  {newBomForm.productCode && (
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-normal">
                      (已关联物料 [{newBomForm.productCode}] 的订单)
                    </span>
                  )}
                </label>
                <select
                  value={newBomForm.salesOrderId}
                  onChange={e => {
                    const selectedSo = (salesOrders || INITIAL_SALES_ORDERS).find(so => so.id === e.target.value);
                    setNewBomForm(f => ({
                      ...f,
                      salesOrderId: e.target.value,
                      salesOrderNo: selectedSo ? selectedSo.orderNo : '',
                    }));
                  }}
                  disabled={!newBomForm.productCode && !newBomForm.productName}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 cursor-pointer font-medium"
                >
                  {!newBomForm.productCode && !newBomForm.productName ? (
                    <option value="">-- 请先选择/填写物料信息 --</option>
                  ) : filteredSalesOrders.length === 0 ? (
                    <option value="">-- 当前所选物料在销售订单库中暂无绑定的订单 --</option>
                  ) : (
                    <>
                      <option value="">-- 请选择关联销售订单 (可选) --</option>
                      {filteredSalesOrders.map(so => (
                        <option key={so.id} value={so.id}>
                          {so.orderNo} | {so.customerName} ({so.productName})
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              {/* 机械负责人 */}
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">机械负责人</label>
                <input
                  type="text"
                  value={newBomForm.mechanicalOwner}
                  onChange={e => setNewBomForm({ ...newBomForm, mechanicalOwner: e.target.value })}
                  placeholder="如 张工 (机械研发部)"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* 电气负责人 */}
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">电气负责人</label>
                <input
                  type="text"
                  value={newBomForm.electricalOwner}
                  onChange={e => setNewBomForm({ ...newBomForm, electricalOwner: e.target.value })}
                  placeholder="如 李工 (电气自动化部)"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* 备注说明 */}
              <div className="col-span-1 md:col-span-2 lg:col-span-3">
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">备注说明</label>
                <textarea
                  rows={2}
                  value={newBomForm.remark}
                  onChange={e => setNewBomForm({ ...newBomForm, remark: e.target.value })}
                  placeholder="请输入该 BOM 单据的详细说明或备注信息..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* 卡片 2: BOM 结构 */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-1 h-3.5 bg-blue-600 rounded-full" />
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                  2. BOM 结构
                </h3>
                <span className="px-2 py-0.5 text-xs font-semibold bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 rounded-md">
                  已选择 {createBomItems.length} 项子件
                </span>
                {selectedCreateBomItemIds.length > 0 && (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 rounded-md">
                    已勾选 {selectedCreateBomItemIds.length} 项
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddMaterialModalOpen(true)}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  新增
                </button>
                {createBomItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedCreateBomItemIds.length === 0) {
                        if (window.confirm('未勾选任何物料，是否确定清空全部 BOM 结构组件？')) {
                          setCreateBomItems([]);
                          setSelectedCreateBomItemIds([]);
                        }
                      } else {
                        setCreateBomItems(items => items.filter(it => !selectedCreateBomItemIds.includes(it.id)));
                        setSelectedCreateBomItemIds([]);
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    批量删除 {selectedCreateBomItemIds.length > 0 ? `(${selectedCreateBomItemIds.length})` : ''}
                  </button>
                )}
              </div>
            </div>

            {/* 子件物料明细表格 (16 字段) */}
            {createBomItems.length === 0 ? (
              <div className="p-8 text-center bg-slate-50/60 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 space-y-3">
                <Boxes className="w-10 h-10 text-slate-400 mx-auto" />
                <div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">暂未添加 BOM 结构组件</h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    点击“+ 新增”按钮可打开物料档案库多选组件加入 BOM 结构
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddMaterialModalOpen(true)}
                  className="px-4 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 rounded-lg border border-blue-200 dark:border-blue-800 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  从物料库选择添加
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-2xs">
                <table className="w-full text-left text-xs border-collapse whitespace-nowrap min-w-[1500px]">
                  <thead>
                    <tr className="bg-slate-50/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-semibold sticky top-0 z-10">
                      <th className="py-2.5 px-3 text-center w-10">
                        <input
                          type="checkbox"
                          checked={createBomItems.length > 0 && selectedCreateBomItemIds.length === createBomItems.length}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedCreateBomItemIds(createBomItems.map(it => it.id));
                            } else {
                              setSelectedCreateBomItemIds([]);
                            }
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-2 text-center w-12">排序</th>
                      <th className="py-2.5 px-3">物料信息</th>
                      <th className="py-2.5 px-3">业务属性</th>
                      <th className="py-2.5 px-3 text-center">版本号</th>
                      <th className="py-2.5 px-3 text-center">物料封面</th>
                      <th className="py-2.5 px-3">物料分类</th>
                      <th className="py-2.5 px-3">规格</th>
                      <th className="py-2.5 px-3">图号</th>
                      <th className="py-2.5 px-3">品牌</th>
                      <th className="py-2.5 px-3 text-center">库存</th>
                      <th className="py-2.5 px-3 text-center">单位</th>
                      <th className="py-2.5 px-3 text-center w-24">标准用量</th>
                      <th className="py-2.5 px-3 text-center w-28">标准成本 (¥)</th>
                      <th className="py-2.5 px-3 w-40">工艺路线</th>
                      <th className="py-2.5 px-3 text-center w-24">损耗率 (%)</th>
                      <th className="py-2.5 px-3 w-36">备注</th>
                      <th className="py-2.5 px-3 text-right sticky right-0 bg-slate-50/90 dark:bg-slate-800/80 w-16">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {createBomItems.map((item, index) => {
                      const isChecked = selectedCreateBomItemIds.includes(item.id);
                      return (
                        <tr
                          key={item.id || index}
                          className={`transition-colors ${
                            isChecked
                              ? 'bg-blue-50/40 dark:bg-blue-950/20'
                              : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
                          }`}
                        >
                          {/* 多选框 */}
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={e => {
                                if (e.target.checked) {
                                  setSelectedCreateBomItemIds(prev => [...prev, item.id]);
                                } else {
                                  setSelectedCreateBomItemIds(prev => prev.filter(id => id !== item.id));
                                }
                              }}
                              className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>

                          {/* 1. 排序 */}
                          <td className="py-2.5 px-2 text-center text-slate-400 font-mono text-[11px]">
                            {index + 1}
                          </td>

                          {/* 2. 物料信息 */}
                          <td className="py-2.5 px-3">
                            <div className="font-mono font-bold text-blue-600 dark:text-blue-400">
                              {item.materialCode}
                            </div>
                            <div className="font-medium text-slate-800 dark:text-slate-200 text-xs">
                              {item.materialName}
                            </div>
                          </td>

                          {/* 3. 业务属性 */}
                          <td className="py-2.5 px-3">
                            <select
                              value={item.businessAttr || '自制'}
                              onChange={e => {
                                const val = e.target.value;
                                setCreateBomItems(items =>
                                  items.map((it, idx) => (idx === index ? { ...it, businessAttr: val } : it))
                                );
                              }}
                              className="px-2 py-1 text-[11px] font-semibold rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                            >
                              <option value="自制">自制</option>
                              <option value="采购">采购</option>
                              <option value="委外">委外</option>
                            </select>
                          </td>

                          {/* 4. 版本号 */}
                          <td className="py-2.5 px-3 text-center">
                            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                              {item.versionNo || 'V1.0'}
                            </span>
                          </td>

                          {/* 5. 物料封面 */}
                          <td className="py-2.5 px-3 text-center">
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                              <FileText className="w-3 h-3 text-indigo-500" />
                              <span>{item.drawingNo ? '3D/2D' : '零件'}</span>
                            </div>
                          </td>

                          {/* 6. 物料分类 */}
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 font-medium">
                            {item.category || '核心功能部件类'}
                          </td>

                          {/* 7. 规格 */}
                          <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                            {item.materialSpec || '-'}
                          </td>

                          {/* 8. 图号 */}
                          <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                            {item.drawingNo || 'DRW-STD-01'}
                          </td>

                          {/* 9. 品牌 */}
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                            {item.brand || '自主研发'}
                          </td>

                          {/* 10. 库存 */}
                          <td className="py-2.5 px-3 text-center font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                            {item.stock ?? 120}
                          </td>

                          {/* 11. 单位 */}
                          <td className="py-2.5 px-3 text-center text-slate-500">
                            {item.unit || '件'}
                          </td>

                          {/* 12. 标准用量 */}
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={e => {
                                const newQty = Math.max(1, parseFloat(e.target.value) || 1);
                                setCreateBomItems(items =>
                                  items.map((it, idx) => (idx === index ? { ...it, quantity: newQty } : it))
                                );
                              }}
                              className="w-16 px-2 py-1 text-center font-mono font-bold border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            />
                          </td>

                          {/* 13. 标准成本 */}
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={item.standardCost ?? 250}
                              onChange={e => {
                                const val = parseFloat(e.target.value) || 0;
                                setCreateBomItems(items =>
                                  items.map((it, idx) => (idx === index ? { ...it, standardCost: val } : it))
                                );
                              }}
                              className="w-20 px-2 py-1 text-center font-mono border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            />
                          </td>

                          {/* 14. 工艺路线 */}
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={item.routing || '精密加工->热处理->装配'}
                              onChange={e => {
                                const val = e.target.value;
                                setCreateBomItems(items =>
                                  items.map((it, idx) => (idx === index ? { ...it, routing: val } : it))
                                );
                              }}
                              className="w-36 px-2 py-1 font-mono text-[11px] border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            />
                          </td>

                          {/* 15. 损耗率 */}
                          <td className="py-2.5 px-3 text-center">
                            <div className="inline-flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={item.scrapRate ?? 0.5}
                                onChange={e => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setCreateBomItems(items =>
                                    items.map((it, idx) => (idx === index ? { ...it, scrapRate: val } : it))
                                  );
                                }}
                                className="w-14 px-1.5 py-1 text-center font-mono border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                              />
                              <span className="text-slate-400 font-mono">%</span>
                            </div>
                          </td>

                          {/* 16. 备注 */}
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={item.remark || ''}
                              onChange={e => {
                                const val = e.target.value;
                                setCreateBomItems(items =>
                                  items.map((it, idx) => (idx === index ? { ...it, remark: val } : it))
                                );
                              }}
                              placeholder="选填"
                              className="w-32 px-2 py-1 text-[11px] border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            />
                          </td>

                          {/* 操作 */}
                          <td className="py-2.5 px-3 text-right sticky right-0 bg-white/90 dark:bg-slate-900/90 shadow-xs">
                            <button
                              type="button"
                              onClick={() => {
                                setCreateBomItems(items => items.filter((_, idx) => idx !== index));
                                setSelectedCreateBomItemIds(prev => prev.filter(id => id !== item.id));
                              }}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded cursor-pointer transition-colors"
                              title="删除该子件"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 右下角固定/冻结操作栏 */}
          <div className="fixed bottom-0 right-0 left-0 lg:left-64 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-3 sm:px-6 shadow-2xl flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500 hidden sm:block">
              当前状态: <span className="font-semibold text-slate-700 dark:text-slate-300">新建 BOM (草稿)</span>
              {createBomItems.length > 0 && ` | 已配置 ${createBomItems.length} 项子件`}
            </div>

            <div className="flex items-center gap-3 ml-auto">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="px-5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => handleCreateBOM('DRAFT')}
                className="px-6 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <Check className="w-4 h-4" />
                保存
              </button>
              <button
                type="button"
                onClick={() => handleCreateBOM('PENDING_REVIEW')}
                className="px-6 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <Send className="w-4 h-4" />
                提交
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= 新增页面内物料选择弹窗 (支持多选) ======================= */}
      {isAddMaterialModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scaleIn">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-800 dark:text-white text-base">
                  从物料库选择组件 (支持多选)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddMaterialModalOpen(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={materialSearchQuery}
                  onChange={e => setMaterialSearchQuery(e.target.value)}
                  placeholder="搜索物料编码、物料名称、规格型号、分类..."
                  className="w-full pl-9 pr-4 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <span className="text-xs text-slate-500">
                已勾选 <strong className="text-blue-600 dark:text-blue-400">{selectedMaterialModalIds.length}</strong> 项物料
              </span>
            </div>

            <div className="p-4 overflow-y-auto flex-1 text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 text-[11px] bg-slate-50/80 dark:bg-slate-800/50">
                    <th className="py-2.5 px-3 text-center w-10">
                      <input
                        type="checkbox"
                        checked={
                          materials.length > 0 &&
                          materials
                            .filter(m => {
                              if (!materialSearchQuery.trim()) return true;
                              const q = materialSearchQuery.toLowerCase();
                              return (
                                m.materialCode.toLowerCase().includes(q) ||
                                m.materialName.toLowerCase().includes(q) ||
                                (m.materialSpec && m.materialSpec.toLowerCase().includes(q))
                              );
                            })
                            .every(m => selectedMaterialModalIds.includes(m.id))
                        }
                        onChange={e => {
                          const filtered = materials.filter(m => {
                            if (!materialSearchQuery.trim()) return true;
                            const q = materialSearchQuery.toLowerCase();
                            return (
                              m.materialCode.toLowerCase().includes(q) ||
                              m.materialName.toLowerCase().includes(q) ||
                              (m.materialSpec && m.materialSpec.toLowerCase().includes(q))
                            );
                          });
                          if (e.target.checked) {
                            setSelectedMaterialModalIds(filtered.map(m => m.id));
                          } else {
                            setSelectedMaterialModalIds([]);
                          }
                        }}
                        className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </th>
                    <th className="py-2.5 px-3 font-semibold">物料编码</th>
                    <th className="py-2.5 px-3 font-semibold">物料名称</th>
                    <th className="py-2.5 px-3 font-semibold">规格型号</th>
                    <th className="py-2.5 px-3 font-semibold">物料分类</th>
                    <th className="py-2.5 px-3 font-semibold">单位</th>
                    <th className="py-2.5 px-3 font-semibold">关联图号</th>
                    <th className="py-2.5 px-3 text-right font-semibold">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {materials
                    .filter(m => {
                      if (!materialSearchQuery.trim()) return true;
                      const q = materialSearchQuery.toLowerCase();
                      return (
                        m.materialCode.toLowerCase().includes(q) ||
                        m.materialName.toLowerCase().includes(q) ||
                        (m.materialSpec && m.materialSpec.toLowerCase().includes(q)) ||
                        (m.category && m.category.toLowerCase().includes(q))
                      );
                    })
                    .map(m => {
                      const isAdded = viewMode === 'detail'
                        ? checkIsInCurrentTree(currentStructureTree, m.materialCode)
                        : createBomItems.some(it => it.materialCode === m.materialCode);
                      const isChecked = selectedMaterialModalIds.includes(m.id);
                      return (
                        <tr
                          key={m.id}
                          className={`transition-colors ${
                            isChecked
                              ? 'bg-blue-50/50 dark:bg-blue-950/30'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              disabled={isAdded}
                              checked={isChecked || isAdded}
                              onChange={e => {
                                if (e.target.checked) {
                                  setSelectedMaterialModalIds(prev => [...prev, m.id]);
                                } else {
                                  setSelectedMaterialModalIds(prev => prev.filter(id => id !== m.id));
                                }
                              }}
                              className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-40"
                            />
                          </td>
                          <td className="py-2.5 px-3 font-mono font-semibold text-blue-600 dark:text-blue-400">
                            {m.materialCode}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                            {m.materialName}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">{m.materialSpec || '-'}</td>
                          <td className="py-2.5 px-3 text-slate-500">{m.category || '核心功能部件类'}</td>
                          <td className="py-2.5 px-3 text-slate-500">{m.unit || '件'}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                            {m.drawingNo || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              disabled={isAdded}
                              onClick={() => {
                                if (viewMode === 'detail') {
                                  handleAddStructureNodeFromMaterial(m);
                                  setSelectedMaterialModalIds(prev => prev.filter(id => id !== m.id));
                                } else {
                                  setCreateBomItems(prev => [
                                    ...prev,
                                    {
                                      id: `ITEM-${Date.now()}-${prev.length + 1}`,
                                      materialId: m.id,
                                      materialCode: m.materialCode,
                                      materialName: m.materialName,
                                      materialSpec: m.materialSpec || '-',
                                      businessAttr: m.category === '电控元件类' ? '采购' : (m.category === 'SMT传输与定位模块' ? '委外' : '自制'),
                                      versionNo: 'V1.0',
                                      coverImage: m.drawingNo ? 'CAD_3D' : 'STD_MAT',
                                      category: m.category || '核心功能部件类',
                                      brand: m.category === '电控元件类' ? '施耐德 (Schneider)' : (m.category === '辅助结构件类' ? '米思米 (MISUMI)' : '自主研发'),
                                      stock: 120,
                                      unit: m.unit || '件',
                                      quantity: 1,
                                      standardCost: 280,
                                      drawingNo: m.drawingNo || `DRW-${m.materialCode}-01`,
                                      routing: m.category === '电控元件类' ? '外购检测->电气装配' : '精密加工->热处理->精磨->组装',
                                      scrapRate: 0.5,
                                      remark: '',
                                      versionStatus: 'ACTIVE',
                                      isActiveVersion: true,
                                    },
                                  ]);
                                }
                              }}
                              className={`px-2.5 py-1 text-[11px] font-semibold rounded cursor-pointer transition-colors ${
                                isAdded
                                  ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'
                                  : 'bg-blue-600 hover:bg-blue-500 text-white'
                              }`}
                            >
                              {isAdded ? '已加入' : '+ 单选添加'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                已勾选 <strong className="text-blue-600 font-bold">{selectedMaterialModalIds.length}</strong> 项待添加物料
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddMaterialModalOpen(false)}
                  className="px-4 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium rounded-lg cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const selectedMats = materials.filter(m => selectedMaterialModalIds.includes(m.id));
                    if (selectedMats.length === 0) {
                      setIsAddMaterialModalOpen(false);
                      return;
                    }
                    if (viewMode === 'detail') {
                      handleBatchAddStructureNodesFromMaterials(selectedMats);
                      setSelectedMaterialModalIds([]);
                      setIsAddMaterialModalOpen(false);
                      return;
                    }
                    setCreateBomItems(prev => {
                      const existingCodes = new Set(prev.map(p => p.materialCode));
                      const newItems: BOMItem[] = selectedMats
                        .filter(m => !existingCodes.has(m.materialCode))
                        .map((m, idx) => ({
                          id: `ITEM-${Date.now()}-${prev.length + idx + 1}`,
                          materialId: m.id,
                          materialCode: m.materialCode,
                          materialName: m.materialName,
                          materialSpec: m.materialSpec || '-',
                          businessAttr: m.category === '电控元件类' ? '采购' : (m.category === 'SMT传输与定位模块' ? '委外' : '自制'),
                          versionNo: 'V1.0',
                          coverImage: m.drawingNo ? 'CAD_3D' : 'STD_MAT',
                          category: m.category || '核心功能部件类',
                          brand: m.category === '电控元件类' ? '施耐德 (Schneider)' : (m.category === '辅助结构件类' ? '米思米 (MISUMI)' : '自主研发'),
                          stock: 120 + idx * 10,
                          unit: m.unit || '件',
                          quantity: 1,
                          standardCost: 200 + idx * 25,
                          drawingNo: m.drawingNo || `DRW-${m.materialCode}-01`,
                          routing: m.category === '电控元件类' ? '外购检测->电气装配' : '精密加工->热处理->精磨->组装',
                          scrapRate: 0.5,
                          remark: '',
                          versionStatus: 'ACTIVE',
                          isActiveVersion: true,
                        }));
                      return [...prev, ...newItems];
                    });
                    setSelectedMaterialModalIds([]);
                    setIsAddMaterialModalOpen(false);
                  }}
                  className="px-5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  批量添加选中的物料 ({selectedMaterialModalIds.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================= 4. BOM 版本对比模态框 ======================= */}
      {isCompareModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-4xl w-full max-h-[85vh] border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-scaleIn">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                  BOM 版本结构差异比对 · [{currentBOM.productName}]
                </h3>
              </div>
              <button
                onClick={() => setIsCompareModalOpen(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 对比版本选择器 */}
            <div className="p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">基准版本 (A):</span>
                  <select
                    value={compareVersionA}
                    onChange={e => setCompareVersionA(e.target.value)}
                    className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-mono font-bold text-blue-600"
                  >
                    {currentVersions.map(v => (
                      <option key={v.id} value={v.versionNo}>{v.versionNo}</option>
                    ))}
                  </select>
                </div>

                <span className="text-slate-400 font-bold">VS</span>

                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">比对版本 (B):</span>
                  <select
                    value={compareVersionB}
                    onChange={e => setCompareVersionB(e.target.value)}
                    className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-mono font-bold text-indigo-600"
                  >
                    {currentVersions.map(v => (
                      <option key={v.id} value={v.versionNo}>{v.versionNo}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 text-[11px]">
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  新增子项 (1)
                </span>
                <span className="inline-flex items-center gap-1 text-amber-600">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  用量变更 (1)
                </span>
              </div>
            </div>

            {/* 对比差异详情表格 */}
            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 font-semibold sticky top-0 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2.5 px-3">物料编码 / 名称</th>
                    <th className="py-2.5 px-3">差异状态</th>
                    <th className="py-2.5 px-3 text-center">{compareVersionA} 用量</th>
                    <th className="py-2.5 px-3 text-center">{compareVersionB} 用量</th>
                    <th className="py-2.5 px-3">差异解析</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  <tr className="bg-amber-50/40 dark:bg-amber-950/20">
                    <td className="py-2.5 px-3 font-medium">
                      <span className="font-mono text-blue-600">05-00035</span> 变压器罩子_V1
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-[10px] font-semibold">
                        用量修改
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-700">5 PCS</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500">3 PCS</td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                      标准用量增加 +2 PCS，以适配加强绝缘设计
                    </td>
                  </tr>
                  <tr className="bg-emerald-50/40 dark:bg-emerald-950/20">
                    <td className="py-2.5 px-3 font-medium">
                      <span className="font-mono text-blue-600">06-00012</span> 升降马达座_V0
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-semibold">
                        新增子项
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700">8 PCS</td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-400">-</td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                      {compareVersionA} 中新挂载 2米移载机升降底座加固支架
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-slate-500">
                      <span className="font-mono text-slate-500">01-00WJ-00001</span> 锁紧螺母
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-slate-400 text-[11px]">无差异</span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-500">4 PCS</td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-500">4 PCS</td>
                    <td className="py-2.5 px-3 text-slate-400 text-[11px]">完全一致</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsCompareModalOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded cursor-pointer"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= 5. 操作日志 Diff 详情模态框 ======================= */}
      {selectedLogForDiff && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                  变更差异审计 · {selectedLogForDiff.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLogForDiff(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg space-y-1.5 text-slate-600 dark:text-slate-300">
                <div><span className="text-slate-400">操作人:</span> {selectedLogForDiff.operator}</div>
                <div><span className="text-slate-400">操作时间:</span> {selectedLogForDiff.timestamp}</div>
                <div><span className="text-slate-400">生效版本:</span> <span className="font-mono font-bold text-blue-600">{selectedLogForDiff.versionNo}</span></div>
                <div><span className="text-slate-400">终端IP:</span> {selectedLogForDiff.ip}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 space-y-1">
                  <span className="text-[10px] font-bold text-red-700 dark:text-red-300 uppercase">变更前 (Old)</span>
                  <div className="font-mono font-bold text-red-600 dark:text-red-400 text-sm">
                    {selectedLogForDiff.oldVal || '-'}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 space-y-1">
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">变更后 (New)</span>
                  <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    {selectedLogForDiff.newVal || '-'}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-lg text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                {selectedLogForDiff.details}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedLogForDiff(null)}
                className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded cursor-pointer"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= 6. 图纸 CAD/PDF 2D/3D 预览模态框 ======================= */}
      {previewDrawingFile && (
        <DrawingPreviewModal
          file={previewDrawingFile.file}
          version={previewDrawingFile.version}
          onClose={() => setPreviewDrawingFile(null)}
        />
      )}

      {/* ======================= 7. 查看审批流程模态框 ======================= */}
      {approvalModalBom && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scaleIn">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                  BOM 审批流程进度
                </h3>
              </div>
              <button
                onClick={() => setApprovalModalBom(null)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">BOM 编码:</span>
                  <span className="font-mono font-bold text-blue-600">{approvalModalBom.bomCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">产品名称:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{approvalModalBom.productName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">当前单据状态:</span>
                  <span className={`px-2 py-0.5 text-[11px] font-semibold rounded ${getStatusBadge(approvalModalBom.status).className}`}>
                    {getStatusBadge(approvalModalBom.status).label}
                  </span>
                </div>
              </div>

              {/* 流程节点 */}
              <div className="space-y-3 relative pl-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                <div className="relative flex items-start gap-3">
                  <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950/60 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">1. 发起审批 (设计工程师)</span>
                      <span className="text-emerald-600 font-medium">已完成</span>
                    </div>
                    <div className="text-slate-500 text-[11px] mt-0.5">发起人: 陈工 · 2026-08-06 09:30</div>
                  </div>
                </div>

                <div className="relative flex items-start gap-3">
                  <div className={`w-3.5 h-3.5 rounded-full shrink-0 mt-0.5 ${
                    approvalModalBom.status === 'REJECTED'
                      ? 'bg-rose-500 ring-4 ring-rose-100 dark:ring-rose-950/60'
                      : approvalModalBom.status === 'PENDING'
                      ? 'bg-amber-500 ring-4 ring-amber-100 dark:ring-amber-950/60 animate-pulse'
                      : 'bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950/60'
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">2. 结构主管审核</span>
                      <span className={`font-medium ${
                        approvalModalBom.status === 'REJECTED'
                          ? 'text-rose-500'
                          : approvalModalBom.status === 'PENDING'
                          ? 'text-amber-500'
                          : 'text-emerald-600'
                      }`}>
                        {approvalModalBom.status === 'REJECTED' ? '已驳回' : approvalModalBom.status === 'PENDING' ? '审核中' : '已通过'}
                      </span>
                    </div>
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      审核人: 张主管 {approvalModalBom.status === 'REJECTED' ? '(驳回原因: 子件规格参数需修正)' : '· 待审批'}
                    </div>
                  </div>
                </div>

                <div className="relative flex items-start gap-3">
                  <div className="w-3.5 h-3.5 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-400">3. 工艺总监终审并归档</span>
                      <span className="text-slate-400">待流转</span>
                    </div>
                    <div className="text-slate-400 text-[11px] mt-0.5">审核人: 李总监</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setApprovalModalBom(null)}
                className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500 rounded cursor-pointer"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= 反审批确认模态框 ======================= */}
      {reverseApprovalTargetBom && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scaleIn">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-850">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                    BOM 反审批确认
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    将已审批通过的 BOM 回退至草稿状态，允许重新编辑
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReverseApprovalTargetBom(null)}
                className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* 单据摘要卡片 */}
              <div className="p-3.5 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/60 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">BOM 编码:</span>
                  <span className="font-mono font-bold text-blue-600">{reverseApprovalTargetBom.bomCode}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">产品名称:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-100">
                    {reverseApprovalTargetBom.productCode} - {reverseApprovalTargetBom.productName}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-amber-200/50 dark:border-amber-800/40">
                  <span className="text-slate-500">状态流转变更:</span>
                  <div className="flex items-center gap-1.5 font-semibold">
                    <span className="px-2 py-0.5 rounded text-[11px] bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      已发布 (通过)
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      草稿 (DRAFT)
                    </span>
                  </div>
                </div>
              </div>

              {/* 快捷理由预设 */}
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  快捷选择反审批原因:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    '需调整部分子件规格参数与装配工艺用量',
                    '客户工程变更(ECN)，需重置结构配比',
                    '图纸绑定位号及版本有误需重新核对',
                    '物料代用策略变更，需替换部分料件',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setReverseApprovalReason(preset)}
                      className={`px-2.5 py-1 text-[11px] rounded-lg border transition-colors cursor-pointer text-left ${
                        reverseApprovalReason === preset
                          ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700 font-medium'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* 填写反审批意见 */}
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  反审批意见 / 说明 <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={reverseApprovalReason}
                  onChange={e => setReverseApprovalReason(e.target.value)}
                  placeholder="请输入反审批原因及具体修改事项..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 space-y-1">
                <div className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>业务操作规则提醒</span>
                </div>
                <p>1. 反审批后，当前 BOM 单据及其对应版本将重置为【草稿】状态。</p>
                <p>2. 系统将自动在【审批记录】与【操作日志】中追加反审批流转节点与审核意见。</p>
                <p>3. 重新编辑完毕后，可再次点击【提交审批】进入流程。</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReverseApprovalTargetBom(null)}
                className="px-4 py-2 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmReverseApproval}
                className="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-lg cursor-pointer transition-colors shadow-sm flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                确认反审批
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= 切换默认BOM版本二次确认模态框 ======================= */}
      {defaultSwitchModal && (
        <div
          id="modal-default-switch-confirm"
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scaleIn">
            {/* 模态框顶部 */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-amber-50/60 dark:bg-amber-950/30">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                    默认BOM版本切换确认
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    同物料只能保留一个生效的默认BOM版本
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="btn-close-default-switch-modal"
                onClick={() => setDefaultSwitchModal(null)}
                className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 模态框主体内容 */}
            <div className="p-5 space-y-4 text-xs">
              {/* 物料基本信息卡片 */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">物料/产品编码:</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">
                    {defaultSwitchModal.targetBom.productCode}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">物料/产品名称:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {defaultSwitchModal.targetBom.productName}
                  </span>
                </div>
                {defaultSwitchModal.targetBom.specName && defaultSwitchModal.targetBom.specName !== '-' && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">规格型号:</span>
                    <span className="font-mono text-slate-600 dark:text-slate-300">
                      {defaultSwitchModal.targetBom.specName}
                    </span>
                  </div>
                )}
              </div>

              {/* 原默认版本与新版本对比 */}
              <div className="grid grid-cols-2 gap-3 items-stretch">
                {/* 原默认版本 */}
                <div className="p-3 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400">
                      原默认版本
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
                      将取消默认
                    </span>
                  </div>
                  <div>
                    <div className="font-mono font-bold text-base text-slate-800 dark:text-slate-100">
                      V{defaultSwitchModal.existingDefaultBom.versionNo || '1'}
                    </div>
                    <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {defaultSwitchModal.existingDefaultBom.bomCode}
                    </div>
                  </div>
                  <div className="text-[10px] text-rose-600/90 dark:text-rose-400 flex items-center gap-1">
                    <X className="w-3 h-3 shrink-0" />
                    <span>去掉以前的默认标记</span>
                  </div>
                </div>

                {/* 新选中的版本 */}
                <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-950/30 flex flex-col justify-between space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                      新选中的版本
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-600" />
                      设为新默认
                    </span>
                  </div>
                  <div>
                    <div className="font-mono font-bold text-base text-amber-800 dark:text-amber-300">
                      V{defaultSwitchModal.targetBom.versionNo || '1'}
                    </div>
                    <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {defaultSwitchModal.targetBom.bomCode}
                    </div>
                  </div>
                  <div className="text-[10px] text-amber-700 dark:text-amber-300 font-medium flex items-center gap-1">
                    <Check className="w-3 h-3 shrink-0 text-amber-600" />
                    <span>生效唯一默认版本</span>
                  </div>
                </div>
              </div>

              {/* 核心提示文案（精准对齐用户需求） */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 rounded-lg text-amber-900 dark:text-amber-200 space-y-1">
                <div className="font-semibold text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>业务规则确认</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  同物料只能有一个为默认版本。检测到物料【{defaultSwitchModal.targetBom.productCode}】之前已存在默认版本【V{defaultSwitchModal.existingDefaultBom.versionNo || '1'}】。
                </p>
                <p className="text-xs font-bold text-amber-950 dark:text-amber-100 pt-0.5">
                  是否去掉以前的默认版本，改成新的选中的版本【V{defaultSwitchModal.targetBom.versionNo || '1'}】？
                </p>
              </div>
            </div>

            {/* 操作按钮区 */}
            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
              <button
                type="button"
                id="btn-cancel-default-switch"
                onClick={() => setDefaultSwitchModal(null)}
                className="px-4 py-2 text-xs font-medium bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                id="btn-confirm-default-switch"
                onClick={handleConfirmSwitchDefault}
                className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-lg cursor-pointer transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                确认替换为新默认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= 草稿或非已发布状态无法设为默认的提示模态框 ======================= */}
      {defaultInvalidStatusModal && (
        <div
          id="modal-default-invalid-status"
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scaleIn">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-rose-50/50 dark:bg-rose-950/20">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                    无法设置为默认版本
                  </h3>
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                    {defaultInvalidStatusModal.status === 'DRAFT'
                      ? '草稿状态无法设置为默认版本'
                      : '只有已发布状态才能设置为默认版本'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="btn-close-invalid-status-modal"
                onClick={() => setDefaultInvalidStatusModal(null)}
                className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">BOM 单据编号:</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {defaultInvalidStatusModal.bom.bomCode}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">物料/产品:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {defaultInvalidStatusModal.bom.productCode} - {defaultInvalidStatusModal.bom.productName}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500 dark:text-slate-400">当前单据状态:</span>
                  <span className={`px-2 py-0.5 text-[11px] font-semibold rounded ${getStatusBadge(defaultInvalidStatusModal.status).className}`}>
                    {getStatusBadge(defaultInvalidStatusModal.status).label}
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-lg text-rose-900 dark:text-rose-200 space-y-1.5">
                <div className="font-semibold text-xs flex items-center gap-1.5 text-rose-700 dark:text-rose-300">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>PLM 默认版本规则说明</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  {defaultInvalidStatusModal.status === 'DRAFT' ? (
                    <>
                      <strong>草稿状态无法设置为默认版本</strong>。草稿阶段的 BOM 结构仍在设计编制或调整中，尚未通过工程主管审核，不能作为车间制造、工艺装配或物料采购的默认基准。
                    </>
                  ) : (
                    <>
                      当前单据处于【{getStatusBadge(defaultInvalidStatusModal.status).label}】状态。根据系统规则，<strong>只有【已发布】状态的 BOM 才能设置为默认版本</strong>。
                    </>
                  )}
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                  如需设为默认，请先对该单据【提交审批】，审批通过流转为【已发布】状态后即可设为默认。
                </p>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                id="btn-confirm-invalid-status-modal"
                onClick={() => setDefaultInvalidStatusModal(null)}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg cursor-pointer transition-colors shadow-sm"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= SolidWorks 插件一键协同导入模态框 ======================= */}
      {isSolidWorksImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-850">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                  SW
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    SolidWorks 插件一键协同导入
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-300 dark:border-emerald-800">
                      CAD 协同通道已连接
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    从 SolidWorks 2026 直接一键导入装配体特征，自动生成草稿 BOM、物料档案及图号多格式版本文件
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (importProgress === null) setIsSolidWorksImportModalOpen(false);
                }}
                disabled={importProgress !== null}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  选择待解析的 SolidWorks 装配体模型 (Preset):
                </label>
                <div className="grid grid-cols-1 gap-2.5">
                  {[
                    {
                      id: 'laser_feeder',
                      title: '激光料斗送板三维装配总成 (Laser_Feeder_Assembly_2026.sldasm)',
                      spec: 'SW-2026-X800 PRO · 6 项子件 · 包含 3D 装配体、2D 工程图与规范 PDF',
                      tag: '核心功能总成',
                    },
                    {
                      id: 'robot_gripper',
                      title: '六轴机械手自适应气动夹爪组件 (Adaptive_Robotic_Gripper.sldasm)',
                      spec: 'GRP-AIR-120N · 4 项子件 · 包含 SLDASM、SLDDRW 与 3D STEP 模型',
                      tag: '末端执行单元',
                    },
                    {
                      id: 'servo_axis',
                      title: '高精伺服滑台模组传动单元 (Precision_Servo_Slide_Axis.sldasm)',
                      spec: 'SVO-AXIS-L1200 · 8 项子件 · 包含标准传动部件及工程图纸',
                      tag: '直线传动机构',
                    },
                  ].map(preset => (
                    <div
                      key={preset.id}
                      onClick={() => {
                        if (importProgress === null) setImportModelPreset(preset.id as any);
                      }}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex items-start justify-between gap-3 ${
                        importModelPreset === preset.id
                          ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 ring-2 ring-blue-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <span>{preset.title}</span>
                          <span className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {preset.tag}
                          </span>
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 text-[11px]">{preset.spec}</div>
                      </div>
                      <div className="mt-0.5">
                        <input
                          type="radio"
                          name="presetModel"
                          checked={importModelPreset === preset.id}
                          onChange={() => {}}
                          className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 导入自动生成规范说明 */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-700/60 space-y-2">
                <div className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-500" />
                  一键导入后系统将自动执行以下协同操作：
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                  <li><strong>生成草稿 BOM</strong>：自动构建层级 BOM 结构，状态标记为「草稿」，支持后续在 BOM 模块直接修改与送审。</li>
                  <li><strong>生成物料档案</strong>：自动在「物料档案」模块创建对应的总成物料主数据并绑定图号。</li>
                  <li><strong>生成图号与版本</strong>：在「图号管理」下自动建立新版本，并携带 SolidWorks 三维模型 (.sldasm)、二维工程图 (.slddrw) 及标准 PDF 文件。</li>
                </ul>
              </div>

              {/* 进度条展示 */}
              {importProgress !== null && (
                <div className="space-y-1.5 pt-1 animate-in fade-in duration-200">
                  <div className="flex justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
                    <span>正在解析 SolidWorks 模型特征与层级结构...</span>
                    <span>{importProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-full transition-all duration-300 ease-out"
                      style={{ width: `${importProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                插件接口版本: SW2026-PLM-V3.4 (在线就绪)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSolidWorksImportModalOpen(false)}
                  disabled={importProgress !== null}
                  className="px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors cursor-pointer disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleExecuteSolidWorksImport}
                  disabled={importProgress !== null}
                  className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <FileUp className="w-3.5 h-3.5" />
                  {importProgress !== null ? '正在导入中...' : '开始一键导入'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 删除二级确认模态框 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-5">
              <div className="flex items-center gap-3 text-rose-600 mb-3">
                <div className="p-2 bg-rose-50 dark:bg-rose-950/60 rounded-full border border-rose-200 dark:border-rose-900 shrink-0">
                  <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">
                    {deleteTarget.type === 'bom' ? '确认删除 BOM 单据？' : '确认整条删除物料明细？'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {deleteTarget.type === 'bom'
                      ? '删除后该单据及其全部版本数据将被永久移除，不可撤销。'
                      : '删除后该物料及其包含的全部下级子件将被整条移除。'}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200/80 dark:border-slate-800 text-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 shrink-0">{deleteTarget.type === 'bom' ? 'BOM编码:' : '物料编码:'}</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{deleteTarget.code}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 shrink-0">{deleteTarget.type === 'bom' ? '产品名称:' : '物料名称:'}</span>
                  <span className="font-medium text-slate-800 dark:text-slate-100">{deleteTarget.title}</span>
                </div>
              </div>
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

      {/* 作废二级确认模态框 */}
      {obsoleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-5">
              <div className="flex items-center gap-3 text-rose-600 mb-3">
                <div className="p-2 bg-rose-50 dark:bg-rose-950/60 rounded-full border border-rose-200 dark:border-rose-900 shrink-0">
                  <Ban className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">
                    确认作废 BOM 单据？
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    作废后该单据状态将变更为【已作废】，后续仅支持基于该版本【复制】创建新草稿，不可再直接修改或执行删除。
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200/80 dark:border-slate-800 text-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 shrink-0">BOM编码:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{obsoleteTarget.bomCode}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 shrink-0">产品名称:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-100">{obsoleteTarget.productName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 shrink-0">版本号:</span>
                  <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">{obsoleteTarget.versionNo}</span>
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setObsoleteTarget(null)}
                className="px-4 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmObsolete}
                className="px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Ban className="w-3.5 h-3.5" />
                确认作废
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 复制 BOM 模态框 (原新增版本，支持当前产品增版或选其他产品复制新BOM) */}
      {isCreateVersionModalOpen && createVersionTargetBom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setIsCreateVersionModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* 模态框头部 */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 rounded-lg">
                  <Copy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">复制 BOM</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">支持复制生成当前产品新版本，或选择其他产品复用本 BOM 结构创建新 BOM</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateVersionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 模态框内容 */}
            <div className="p-6 space-y-5 overflow-y-auto">
              {/* 1. 复制目标产品选择 (当前产品 / 其他产品) */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  复制目标产品:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setCopyTargetType('SAME_PRODUCT')}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                      copyTargetType === 'SAME_PRODUCT'
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 ring-1 ring-blue-500'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <input
                      type="radio"
                      name="copyTargetType"
                      checked={copyTargetType === 'SAME_PRODUCT'}
                      onChange={() => setCopyTargetType('SAME_PRODUCT')}
                      className="mt-0.5 text-blue-600 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between">
                        <span>当前产品</span>
                        <span className="font-mono text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-semibold">
                          新版本 V{nextCalculatedVersionNo}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate" title={createVersionTargetBom.productName}>
                        [{createVersionTargetBom.productCode}] {createVersionTargetBom.productName}
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      setCopyTargetType('OTHER_PRODUCT');
                      if (!copyTargetMaterialCode) {
                        const firstOther = materials.find(m => m.materialCode !== createVersionTargetBom.productCode);
                        if (firstOther) setCopyTargetMaterialCode(firstOther.materialCode);
                      }
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                      copyTargetType === 'OTHER_PRODUCT'
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 ring-1 ring-blue-500'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <input
                      type="radio"
                      name="copyTargetType"
                      checked={copyTargetType === 'OTHER_PRODUCT'}
                      onChange={() => {
                        setCopyTargetType('OTHER_PRODUCT');
                        if (!copyTargetMaterialCode) {
                          const firstOther = materials.find(m => m.materialCode !== createVersionTargetBom.productCode);
                          if (firstOther) setCopyTargetMaterialCode(firstOther.materialCode);
                        }
                      }}
                      className="mt-0.5 text-blue-600 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between">
                        <span>选择其他产品</span>
                        <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded font-semibold">
                          跨产品新建
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                        {selectedOtherProduct ? `[${selectedOtherProduct.materialCode}] ${selectedOtherProduct.materialName}` : '为其他产品新建BOM'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 当选中“选择其他产品”时的检索与选择面板 */}
                {copyTargetType === 'OTHER_PRODUCT' && (
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">选择待绑定的目标产品:</span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        候选物料: {materials.filter(m => m.materialCode !== createVersionTargetBom.productCode).length}
                      </span>
                    </div>

                    {/* 搜索框 */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="搜索目标产品编码、物料名称、规格型号..."
                        value={copyProductSearchQuery}
                        onChange={e => setCopyProductSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-7 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                      />
                      {copyProductSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setCopyProductSearchQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* 下拉产品列表 */}
                    <select
                      value={copyTargetMaterialCode}
                      onChange={e => setCopyTargetMaterialCode(e.target.value)}
                      size={4}
                      className="w-full px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      {materials
                        .filter(m => m.materialCode !== createVersionTargetBom.productCode)
                        .filter(m => {
                          if (!copyProductSearchQuery.trim()) return true;
                          const q = copyProductSearchQuery.toLowerCase();
                          return (
                            m.materialCode.toLowerCase().includes(q) ||
                            m.materialName.toLowerCase().includes(q) ||
                            (m.materialSpec && m.materialSpec.toLowerCase().includes(q))
                          );
                        })
                        .map(m => (
                          <option key={m.id} value={m.materialCode} className="py-1 px-1.5 cursor-pointer">
                            [{m.materialCode}] {m.materialName} - {m.materialSpec || '无规格'} ({m.category || '组件/产品'})
                          </option>
                        ))}
                    </select>

                    {/* 目标产品信息预览 */}
                    {selectedOtherProduct && (
                      <div className="p-2.5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/80 rounded-lg text-[11px] grid grid-cols-2 gap-x-3 gap-y-1.5 text-slate-600 dark:text-slate-300">
                        <div>
                          <span className="text-slate-400">产品编码:</span>{' '}
                          <span className="font-semibold text-slate-800 dark:text-slate-100 font-mono">
                            {selectedOtherProduct.materialCode}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">产品名称:</span>{' '}
                          <span className="font-semibold text-slate-800 dark:text-slate-100">
                            {selectedOtherProduct.materialName}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">规格型号:</span>{' '}
                          <span className="font-mono">{selectedOtherProduct.materialSpec || '-'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">计量单位:</span>{' '}
                          <span>{selectedOtherProduct.unit || '台'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 单据概览 */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">目标产品:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {copyTargetType === 'OTHER_PRODUCT' && selectedOtherProduct
                      ? `${selectedOtherProduct.materialCode} - ${selectedOtherProduct.materialName}`
                      : `${createVersionTargetBom.productCode} - ${createVersionTargetBom.productName}`}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block mb-0.5">生成 BOM 版本:</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                    V{copyTargetType === 'OTHER_PRODUCT' ? otherProductCalculatedVersionNo : nextCalculatedVersionNo}
                  </span>
                </div>
              </div>

              {/* 模式选择 */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  创建方式:
                </label>

                {/* 选项 1: 复用旧版本创建 */}
                <div
                  onClick={() => setCreateVersionMode('COPY')}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                    createVersionMode === 'COPY'
                      ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/30 ring-1 ring-blue-500'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900'
                  }`}
                >
                  <input
                    type="radio"
                    name="createVersionMode"
                    checked={createVersionMode === 'COPY'}
                    onChange={() => setCreateVersionMode('COPY')}
                    className="mt-1 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        <Copy className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        复用旧版本物料结构 (推荐)
                      </span>
                      <span className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-medium">推荐</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      完整继承选中版本的 BOM 树结构、子件明细及用量参数，在此基准上进行快捷工程变更与调整。
                    </p>

                    {createVersionMode === 'COPY' && (
                      <div className="mt-3 pt-3 border-t border-blue-200/60 dark:border-blue-800/60 flex items-center gap-2">
                        <span className="text-xs text-slate-600 dark:text-slate-300 shrink-0 font-medium">选择复用基准版本:</span>
                        <select
                          value={selectedReuseVersionId}
                          onChange={e => setSelectedReuseVersionId(e.target.value)}
                          className="flex-1 px-2.5 py-1 text-xs border border-blue-300 dark:border-blue-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-mono font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs"
                        >
                          {availableReuseVersions.map(vBom => (
                            <option key={vBom.id} value={vBom.id}>
                              {vBom.bomCode} (版本 V{vBom.versionNo} - {vBom.status === 'PUBLISHED' ? '已发布' : vBom.status === 'DRAFT' ? '草稿' : vBom.status === 'FROZEN' ? '已冻结' : vBom.status})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* 选项 2: 全新空白版本 */}
                <div
                  onClick={() => setCreateVersionMode('BLANK')}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                    createVersionMode === 'BLANK'
                      ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/30 ring-1 ring-blue-500'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900'
                  }`}
                >
                  <input
                    type="radio"
                    name="createVersionMode"
                    checked={createVersionMode === 'BLANK'}
                    onChange={() => setCreateVersionMode('BLANK')}
                    className="mt-1 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div className="flex-1">
                    <span className="font-semibold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      全新空白版本
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      创建一个不包含任何子件和结构节点的空白 BOM 单据，后续全新添加物料组件或导入 CAD/SolidWorks 结构。
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 模态框底部 */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCreateVersionModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmCreateVersion}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Copy className="w-4 h-4" />
                {copyTargetType === 'OTHER_PRODUCT'
                  ? `确认复制至 [${selectedOtherProduct?.materialCode || '选中产品'}] (版本 V${otherProductCalculatedVersionNo})`
                  : `确认复制新版本 V${nextCalculatedVersionNo}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= BOM 批量导入模态框 (与截图 100% 对应) ======================= */}
      {isBatchImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col">
            {/* Header with Title and Step Wizard */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                BOM导入
              </h3>
              
              {/* 步骤指引 */}
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                    importStep === 1 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                  }`}>
                    1
                  </span>
                  <span className={importStep === 1 ? 'font-semibold text-slate-800 dark:text-slate-100' : 'text-slate-400'}>
                    上传文件
                  </span>
                </div>
                <div className="w-8 h-px bg-slate-200 dark:bg-slate-700" />
                <div className="flex items-center gap-1.5">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                    importStep === 2 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                  }`}>
                    2
                  </span>
                  <span className={importStep === 2 ? 'font-semibold text-slate-800 dark:text-slate-100' : 'text-slate-400'}>
                    数据预览与校验
                  </span>
                </div>
                <div className="w-8 h-px bg-slate-200 dark:bg-slate-700" />
                <div className="flex items-center gap-1.5">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                    importStep === 3 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                  }`}>
                    3
                  </span>
                  <span className={importStep === 3 ? 'font-semibold text-slate-800 dark:text-slate-100' : 'text-slate-400'}>
                    导入结果
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsBatchImportModalOpen(false);
                  setUploadedImportFile(null);
                  setImportStep(1);
                }}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* 导入方式 - 改成必填平铺单选样式 */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span className="text-red-500 mr-1">*</span>导入方式
                </label>
                <div className="flex items-center gap-3">
                  {[
                    { id: 'NEW', label: '新增 BOM' },
                    { id: 'OVERWRITE', label: '覆盖 BOM' },
                    { id: 'APPEND', label: '追加 BOM' },
                  ].map((mode) => (
                    <label
                      key={mode.id}
                      onClick={() => setImportMode(mode.id as any)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all ${
                        importMode === mode.id
                          ? 'border-blue-500 bg-blue-50/70 text-blue-700 font-semibold dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-500 ring-2 ring-blue-500/20'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="importModeOption"
                        checked={importMode === mode.id}
                        onChange={() => setImportMode(mode.id as any)}
                        className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>{mode.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 当选择覆盖 BOM 或追加 BOM 时，必须选择目标草稿状态的 BOM 版本 */}
              {(importMode === 'OVERWRITE' || importMode === 'APPEND') && (
                <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 rounded-xl space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      <span className="text-red-500">*</span>选择草稿状态的 BOM 版本
                    </label>
                    <span className="text-[11px] text-blue-600 dark:text-blue-400 font-normal">
                      仅支持{importMode === 'OVERWRITE' ? '覆盖' : '追加'}导入至「草稿 (DRAFT)」状态的 BOM
                    </span>
                  </div>
                  <select
                    value={selectedDraftBomId}
                    onChange={(e) => setSelectedDraftBomId(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                  >
                    {draftBomOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 文件上传区域 */}
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 rounded-xl p-8 text-center bg-slate-50/40 dark:bg-slate-850/40 transition-colors relative">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setUploadedImportFile(file);
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FileUp className="w-6 h-6" />
                </div>
                <div className="font-semibold text-slate-800 dark:text-slate-100 text-xs mb-1">
                  {uploadedImportFile ? uploadedImportFile.name : '点击或拖拽文件到此处上传'}
                </div>
                <div className="text-slate-400 text-[11px] mb-4">
                  {uploadedImportFile ? `文件大小: ${(uploadedImportFile.size / 1024).toFixed(1)} KB` : '支持 .xlsx, .xls 格式，单次最多导入 10000 条'}
                </div>
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium shadow-xs inline-flex items-center gap-1.5 transition-colors pointer-events-none"
                >
                  <FileUp className="w-3.5 h-3.5" />
                  {uploadedImportFile ? '重新选择文件' : '选择文件'}
                </button>
              </div>

              {/* 下载导入模板卡片 */}
              <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/40">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                      下载导入模板
                    </div>
                    <div className="text-slate-400 text-[11px] mt-0.5">
                      支持 .xlsx, .xls 格式，单次最多导入 10000 条
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setToastMessage('BOM 标准导入模板已开始下载...');
                  }}
                  className="px-3.5 py-1.5 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  下载模板
                </button>
              </div>

              {/* 查看模板字段说明 */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setIsTemplateHelpOpen(!isTemplateHelpOpen)}
                  className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline cursor-pointer"
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>查看模板字段说明</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isTemplateHelpOpen ? 'rotate-180' : ''}`} />
                </button>
                {isTemplateHelpOpen && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] space-y-1.5 text-slate-600 dark:text-slate-300">
                    <div>• <strong>BOM编码</strong> (必填)：对应产品或部件 BOM 的唯一识别编码</div>
                    <div>• <strong>物料编码</strong> (必填)：子件物料编码</div>
                    <div>• <strong>物料名称 & 规格</strong> (非必填)：不填自动依据物料档案自动填充</div>
                    <div>• <strong>用量</strong> (必填)：数字类型，且需大于0</div>
                    <div>• <strong>层级/位号</strong> (非必填)：用于构建树形层级 BOM 结构</div>
                  </div>
                )}
              </div>

              {/* 导入注意事项 */}
              <div className="p-4 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-xl space-y-2 text-xs">
                <div className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>导入注意事项</span>
                </div>
                <ul className="space-y-1 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed list-disc list-inside">
                  <li>第1行为表头，数据从第2行开始读取</li>
                  <li>表格中黄色高亮列均为必填项，文件内不可为空；普通灰色表头列为非必填，留空将按系统规则自动填充默认值，无默认值则空白存储</li>
                  <li>存在错误的行不会被导入，含警告的行可正常导入</li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsBatchImportModalOpen(false);
                  setUploadedImportFile(null);
                  setImportStep(1);
                }}
                className="px-4 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!uploadedImportFile) {
                    setToastMessage('请先选择需要导入的 Excel 文件！');
                    return;
                  }
                  if ((importMode === 'OVERWRITE' || importMode === 'APPEND') && !selectedDraftBomId) {
                    setToastMessage('请选择需要关联的目标草稿状态 BOM 版本！');
                    return;
                  }
                  setIsImporting(true);
                  setTimeout(() => {
                    const targetOpt = draftBomOptions.find(o => o.id === selectedDraftBomId);
                    const targetInfo = targetOpt ? `【${targetOpt.bomCode} (${targetOpt.versionNo})】` : '';
                    setIsImporting(false);
                    setIsBatchImportModalOpen(false);
                    setUploadedImportFile(null);
                    setToastMessage(`已成功将 Excel 数据以【${importMode === 'OVERWRITE' ? '覆盖 BOM' : importMode === 'APPEND' ? '追加 BOM' : '新增 BOM'}】方式应用于草稿 BOM 版本 ${targetInfo}！`);
                  }, 800);
                }}
                className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {isImporting ? '正在解析导入...' : '开始导入'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 选择产品物料模态框 */}
      {isSelectProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileEdit className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    选择产品物料信息
                  </h3>
                  <p className="text-xs text-slate-500">选择 BOM 关联的产品主档，自动联动更新规格、图号及单位信息</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSelectProductModalOpen(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 搜索栏 */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="按物料编码、物料名称或规格型号搜索物料..."
                  value={productModalSearchQuery}
                  onChange={(e) => setProductModalSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {productModalSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setProductModalSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* 物料列表表格 */}
            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 select-none">
                  <tr>
                    <th className="py-2 px-3">物料编码</th>
                    <th className="py-2 px-3">物料名称</th>
                    <th className="py-2 px-3">规格型号</th>
                    <th className="py-2 px-3">分类</th>
                    <th className="py-2 px-3 text-center">图号</th>
                    <th className="py-2 px-3 text-center w-20">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {materials
                    .filter(m => {
                      if (!productModalSearchQuery.trim()) return true;
                      const q = productModalSearchQuery.toLowerCase();
                      return (
                        m.materialCode.toLowerCase().includes(q) ||
                        m.materialName.toLowerCase().includes(q) ||
                        (m.materialSpec && m.materialSpec.toLowerCase().includes(q))
                      );
                    })
                    .map(m => {
                      const isSelected = m.materialCode === currentBOM.productCode;
                      return (
                        <tr
                          key={m.id}
                          className={`hover:bg-blue-50/50 dark:hover:bg-slate-800/60 transition-colors ${
                            isSelected ? 'bg-blue-50/40 dark:bg-blue-950/30' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                            {m.materialCode}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                            {m.materialName}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                            {m.materialSpec || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">
                            {m.category || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-600 dark:text-slate-400">
                            {m.drawingNo || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isSelected ? (
                              <span className="px-2.5 py-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 rounded border border-emerald-200 dark:border-emerald-800">
                                当前产品
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  handleProductChange(m.materialCode);
                                  setIsSelectProductModalOpen(false);
                                  setToastMessage(`已将产品信息成功关联至 [${m.materialCode}] ${m.materialName}`);
                                }}
                                className="px-2.5 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors cursor-pointer shadow-2xs"
                              >
                                选择
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsSelectProductModalOpen(false)}
                className="px-4 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 物料图片与图集完整查看弹窗 (支持查看全部、大图与前后轮播、缩略图切换) */}
      {galleryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-4xl w-full p-4 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh]">
            {/* 弹窗顶部栏 */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <span>物料图集浏览</span>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    {activeMaterialDetail.materialCode} {activeMaterialDetail.materialName}
                  </span>
                  <span className="text-xs text-slate-400 font-normal">
                    ({galleryActiveIndex + 1} / {materialGalleryImages.length})
                  </span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setGalleryOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="关闭 (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 弹窗主视区：高清大图或CAD矢量渲染 */}
            <div className="flex-1 relative overflow-hidden flex items-center justify-center p-2 min-h-[340px] max-h-[60vh] bg-slate-950 rounded-lg my-3 border border-slate-800 shadow-inner group">
              {materialGalleryImages[galleryActiveIndex] && renderGalleryItemContent(materialGalleryImages[galleryActiveIndex], true)}

              {/* 左箭头 */}
              {materialGalleryImages.length > 1 && (
                <button
                  type="button"
                  onClick={() => setGalleryActiveIndex(prev => (prev > 0 ? prev - 1 : materialGalleryImages.length - 1))}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/80 hover:bg-blue-600 text-white border border-slate-700 shadow-lg cursor-pointer transition-all hover:scale-110 z-30"
                  title="上一张图片 (←)"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}

              {/* 右箭头 */}
              {materialGalleryImages.length > 1 && (
                <button
                  type="button"
                  onClick={() => setGalleryActiveIndex(prev => (prev < materialGalleryImages.length - 1 ? prev + 1 : 0))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/80 hover:bg-blue-600 text-white border border-slate-700 shadow-lg cursor-pointer transition-all hover:scale-110 z-30"
                  title="下一张图片 (→)"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}

              {/* 底部大图信息条 */}
              {materialGalleryImages[galleryActiveIndex] && (
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/95 via-slate-950/70 to-transparent p-3 pt-6 flex items-center justify-between text-xs text-white z-20 pointer-events-none">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-sm text-cyan-300 flex items-center gap-1.5">
                      <span>{materialGalleryImages[galleryActiveIndex].title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono">
                        {materialGalleryImages[galleryActiveIndex].type === 'cad' ? 'CAD 3D 工程图' : '现场实物图'}
                      </span>
                    </div>
                    <div className="text-slate-300 text-[11px]">
                      {materialGalleryImages[galleryActiveIndex].description}
                    </div>
                  </div>
                  <div className="font-mono text-slate-400 text-[11px]">
                    {galleryActiveIndex + 1} / {materialGalleryImages.length}
                  </div>
                </div>
              )}
            </div>

            {/* 底部缩略图导航条 */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto py-1">
                {materialGalleryImages.map((img, idx) => (
                  <div
                    key={img.id}
                    onClick={() => setGalleryActiveIndex(idx)}
                    className={`relative w-20 h-14 rounded-md overflow-hidden cursor-pointer border-2 transition-all shrink-0 ${
                      galleryActiveIndex === idx
                        ? 'border-blue-600 shadow-md ring-2 ring-blue-500/30 scale-105'
                        : 'border-slate-200 dark:border-slate-700 opacity-60 hover:opacity-100 hover:border-slate-400'
                    }`}
                  >
                    {renderGalleryItemContent(img, false)}
                    <div className="absolute bottom-0 inset-x-0 bg-slate-950/80 text-[9px] font-mono text-white text-center py-0.5 truncate px-1">
                      {idx + 1}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setGalleryOpen(false)}
                className="px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium text-xs cursor-pointer shadow-2xs shrink-0"
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
          <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white dark:hover:text-slate-900 p-0.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
