import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  DrawingMaster, 
  DrawingVersion, 
  DrawingFile, 
  VersionStatus, 
  Material, 
  FileType,
  BOM,
  SalesOrder
} from '../types/plm';
import { 
  getStatusBadge, 
  getFileTypeBadge, 
  formatFileSize, 
  detectFileTypeFromName, 
  validateDrawingFileMatch,
  validateBatchDrawingUpload,
  extractDrawingNoAndMaterialNameFromFileName,
  BatchDrawingUploadValidationResult
} from '../utils/plmHelpers';
import { loadLocalState, saveLocalState } from '../utils/localPersistence';
import { DrawingPreviewModal } from './DrawingPreviewModal';
import { 
  Plus, 
  History, 
  Box, 
  ChevronRight, 
  Upload, 
  FolderArchive, 
  Trash2, 
  Clock, 
  User, 
  Check, 
  Star, 
  Search, 
  ArrowLeft, 
  Pencil, 
  X, 
  Info,
  GitCommit,
  Layers,
  ShieldCheck,
  CopyPlus,
  CheckCircle2,
  ShieldAlert,
  FileEdit,
  FolderOpen,
  PanelLeftClose,
  FolderTree,
  GitBranch,
  FileCode,
  Sparkles,
  FlaskConical,
  Wand2,
  XCircle,
  CheckCheck,
  PanelLeftOpen,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  FileText,
  Boxes,
  Eye,
  AlignJustify,
  FileCheck2,
  Lock,
  Columns,
  MoreVertical,
  FileUp,
  Download,
  Copy,
  Send,
  AlertCircle,
  AlertTriangle,
  Settings
} from 'lucide-react';

interface DrawingVersionsViewProps {
  isNoVersionMode?: boolean;
  drawingMasters: DrawingMaster[];
  materials: Material[];
  boms?: BOM[];
  salesOrders?: SalesOrder[];
  selectedDrawingNo?: string;
  onUpdateVersionStatus: (drawingNo: string, versionId: string, newStatus: VersionStatus, extraData?: Partial<DrawingVersion>) => void;
  onToggleVersionActive: (drawingNo: string, versionId: string, isActive: boolean) => void;
  onSetDefaultVersion?: (drawingNo: string, versionId: string) => void;
  onCreateDrawingMaster?: (materialId: string, drawingNo: string, notes?: string) => void;
  onUpdateDrawingNo?: (oldDrawingNo: string, newDrawingNo: string) => void;
  onCreateNewDraftVersion: (drawingNo: string, baseVersionNo?: string) => void;
  onUpdateDraftVersionNo?: (drawingNo: string, versionId: string, newVersionNo: string) => void;
  onDeleteDraftVersion: (drawingNo: string, versionId: string) => void;
  onDeleteDrawingMaster?: (drawingNo: string) => void;
  onUpdateDrawingMasterMaterial?: (drawingNo: string, newMaterialId: string) => void;
  onAddFileToDraft: (drawingNo: string, versionId: string, file: DrawingFile) => void;
  onDeleteFileFromVersion?: (drawingNo: string, versionId: string, fileId: string, fileName: string, fileType: string) => void;
  onUpdateVersionInfo?: (drawingNo: string, versionId: string, updateData: { versionNo?: string; notes?: string; changeDesc?: string }) => void;
  onUpdateFileInVersion?: (drawingNo: string, versionId: string, fileId: string, updatedFile: Partial<DrawingFile>) => void;
  onSolidWorksImport?: (importedData: { bom: BOM; materials: Material[]; drawings: DrawingMaster[] }) => void;
  fixedMaterialId?: string;
}

interface CategoryTreeNode {
  id: string;
  name: string;
  children?: { id: string; name: string }[];
}

const DRAWING_CATEGORY_TREE: CategoryTreeNode[] = [
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
  { id: 'struct_mat', name: '结构件/外壳' },
  { id: 'semi_prod', name: '半成品' },
  { id: 'high_end', name: '成品机器高端' },
  { id: 'core_comp', name: '核心功能部件类' },
  { id: 'parts_mod', name: '配件或改造' },
];

export const DrawingVersionsView: React.FC<DrawingVersionsViewProps> = (props) => {
  const { 
    isNoVersionMode = false,
    drawingMasters, 
    materials, 
    boms = [],
    salesOrders = [],
    selectedDrawingNo, 
    fixedMaterialId, 
    onUpdateVersionStatus, 
    onSetDefaultVersion, 
    onCreateDrawingMaster,
    onUpdateDrawingNo,
    onCreateNewDraftVersion, 
    onUpdateDraftVersionNo,
    onDeleteDraftVersion, 
    onDeleteDrawingMaster,
    onUpdateDrawingMasterMaterial,
    onAddFileToDraft, 
    onDeleteFileFromVersion,
    onUpdateVersionInfo,
    onUpdateFileInVersion,
    onSolidWorksImport
  } = props;

  const getInitialMaterialId = () => {
    if (fixedMaterialId) return fixedMaterialId;
    if (selectedDrawingNo?.startsWith('NEW_')) return selectedDrawingNo.replace('NEW_', '');
    const master = drawingMasters.find(d => d.drawingNo === selectedDrawingNo);
    if (master) return master.materialId;
    return materials.find(m => m.drawingNo === selectedDrawingNo)?.id || materials[0]?.id || '';
  };
  
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>(getInitialMaterialId());
  const [viewMode, setViewMode] = useState<'list' | 'detail'>(() => {
    if (fixedMaterialId || selectedDrawingNo?.startsWith('NEW_')) return 'detail';
    return loadLocalState<'list' | 'detail'>('drawing_viewMode', 'list');
  });

  useEffect(() => {
    saveLocalState('drawing_viewMode', viewMode);
  }, [viewMode]);
  
  // 列表行操作下拉气泡菜单状态 (对齐 BOM 管理操作菜单)
  const [openActionMenuDrawingNo, setOpenActionMenuDrawingNo] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setOpenActionMenuDrawingNo(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // SolidWorks 插件一键协同导入模态框状态与模板选择 (对齐 BOM 管理)
  const [isSolidWorksImportModalOpen, setIsSolidWorksImportModalOpen] = useState(false);
  const [importModelPreset, setImportModelPreset] = useState<'laser_feeder' | 'robot_gripper' | 'servo_axis'>('laser_feeder');
  const [importProgress, setImportProgress] = useState<number | null>(null);

  // 执行 SolidWorks 插件一键导入
  const handleExecuteSolidWorksImport = () => {
    setImportProgress(10);
    setTimeout(() => setImportProgress(45), 200);
    setTimeout(() => setImportProgress(85), 450);
    setTimeout(() => {
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
          isActive: false,
          isDefault: false,
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

        const newBOM: BOM = {
          id: `BOM-${Date.now()}`,
          bomCode: bomCode,
          name: `${assemblyName} BOM 清单`,
          productCode: assemblyCode,
          productName: assemblyName,
          specName: specName,
          versionNo: '1',
          status: 'DRAFT',
          isDefault: true,
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
            }
          ]
        };

        if (onSolidWorksImport) {
          onSolidWorksImport({
            bom: newBOM,
            materials: [newMaterial],
            drawings: [drawingMaster],
          });
        }

        setSelectedMaterialId(newMaterial.id);
        setImportProgress(null);
        setIsSolidWorksImportModalOpen(false);
      }, 300);
    }, 700);
  };
  
  // 列表页分类收起状态 (默认收起)
  const [isCategorySidebarCollapsed, setIsCategorySidebarCollapsed] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const toggleCategoryExpand = (catId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const handleToggleExpandAllCategories = (expand: boolean) => {
    const next: Record<string, boolean> = {};
    DRAWING_CATEGORY_TREE.forEach(node => {
      if (node.children && node.children.length > 0) {
        next[node.id] = expand;
      }
    });
    setExpandedCategories(next);
  };

  // 状态筛选 Tab: 'ALL' | 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED'
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // 搜索与选中行
  const [searchQuery, setSearchQuery] = useState('');
  const [tableSearchInput, setTableSearchInput] = useState('');
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({});
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [density, setDensity] = useState<'normal' | 'compact' | 'relaxed'>('normal');

  const prevSelectedDrawingNoRef = useRef<string | null>(null);

  // React to prop changes (e.g. clicking '新增图号' in MaterialsView)
  useEffect(() => {
    if (selectedDrawingNo && selectedDrawingNo !== prevSelectedDrawingNoRef.current) {
      prevSelectedDrawingNoRef.current = selectedDrawingNo;
      if (selectedDrawingNo.startsWith('CREATE_MAT_')) {
        const matKey = selectedDrawingNo.replace('CREATE_MAT_', '');
        const mat = materials.find(m => m.id === matKey || m.materialCode === matKey);
        if (mat) {
          setListCreateMaterialId(mat.id);
        } else if (matKey) {
          setListCreateMaterialId(matKey);
        }
        setListCreateDrawingNo(generateNewDrawingCode());
        setListCreateVersionNo('1');
        setListCreateNotes('');
        setIsListCreateModalOpen(true);
        setViewMode('list');
      } else if (selectedDrawingNo.startsWith('NEW_')) {
        setSelectedMaterialId(selectedDrawingNo.replace('NEW_', ''));
        setViewMode('detail');
      } else {
        const master = drawingMasters.find(
          d =>
            d.drawingNo === selectedDrawingNo ||
            d.materialCode === selectedDrawingNo ||
            d.materialId === selectedDrawingNo
        );
        if (master) {
          setSelectedMaterialId(master.materialId);
          setViewMode('detail');
        }
      }
    }
  }, [selectedDrawingNo, drawingMasters, materials]);
  // 详情页四大板块：版本管理、基础信息、使用记录、变更记录
  const [detailTab, setDetailTab] = useState<'versions' | 'info' | 'usage' | 'history'>('versions');

  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null);
  const [versionSubTab, setVersionSubTab] = useState<Record<string, 'files' | 'logs'>>({});
  
  // 版本号修改编辑状态
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  const [editingVersionNo, setEditingVersionNo] = useState<string>('');

  // 上传模态框状态 (支持批量图纸上传)
  const [uploadModalVersion, setUploadModalVersion] = useState<DrawingVersion | null>(null);
  const [uploadModalFiles, setUploadModalFiles] = useState<Array<{
    id: string;
    file?: File;
    fileName: string;
    fileType: FileType;
    fileSize: number;
    fileHash: string;
  }>>([]);
  const [isDragOverUpload, setIsDragOverUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewFile, setPreviewFile] = useState<{ file: DrawingFile; version: DrawingVersion; materialName?: string; materialSpec?: string } | null>(null);
  
  const [isCreatingDrawing, setIsCreatingDrawing] = useState(false);
  const [newDrawingNo, setNewDrawingNo] = useState('');
  
  const [isListCreateModalOpen, setIsListCreateModalOpen] = useState(false);
  const [listCreateMaterialId, setListCreateMaterialId] = useState('');
  const [listCreateDrawingNo, setListCreateDrawingNo] = useState('');
  const [listCreateVersionNo, setListCreateVersionNo] = useState('1');
  const [listCreateNotes, setListCreateNotes] = useState('');

  // 批量操作与批量上传图纸模态框状态
  const [isBatchMenuOpen, setIsBatchMenuOpen] = useState(false);
  const [isBatchUploadModalOpen, setIsBatchUploadModalOpen] = useState(false);
  const [batchUploadFiles, setBatchUploadFiles] = useState<Array<{
    id: string;
    fileName: string;
    fileSize: number;
    fileType: FileType;
    uploadDrawingNo: string;
    uploadMaterialName: string;
    scenarioTag?: string;
  }>>([]);
  const [batchUploadFilter, setBatchUploadFilter] = useState<'ALL' | 'VALID' | 'ERROR' | '1' | '2' | '3' | '4' | '5'>('ALL');
  const [showRuleGuide, setShowRuleGuide] = useState(false);

  const getScenarioTestSamples = () => [
    {
      id: `S1-${Date.now()}-1`,
      fileName: 'X0610-C004-G14_不锈钢传动轴套.pdf',
      fileSize: 1850000,
      fileType: 'PDF' as FileType,
      uploadDrawingNo: 'X0610-C004-G14',
      uploadMaterialName: '不锈钢传动轴套',
      scenarioTag: '场景1（图号存在物料不一样）',
    },
    {
      id: `S2-${Date.now()}-2`,
      fileName: 'PLN-GRS-888_高精行星齿轮组.dwg',
      fileSize: 3420000,
      fileType: 'DWG' as FileType,
      uploadDrawingNo: 'PLN-GRS-888',
      uploadMaterialName: '高精行星齿轮组',
      scenarioTag: '场景2（物料存在，但是物料没有图号）',
    },
    {
      id: `S3-${Date.now()}-3`,
      fileName: 'CAS-DIFF-999_减速电机外壳.step',
      fileSize: 8900000,
      fileType: 'STEP' as FileType,
      uploadDrawingNo: 'CAS-DIFF-999',
      uploadMaterialName: '减速电机外壳',
      scenarioTag: '场景3（物料存在，但是物料图号不一样）',
    },
    {
      id: `S4-${Date.now()}-4`,
      fileName: 'DRW-GHOST-888_虚拟测试法兰.pdf',
      fileSize: 1240000,
      fileType: 'PDF' as FileType,
      uploadDrawingNo: 'DRW-GHOST-888',
      uploadMaterialName: '虚拟测试法兰',
      scenarioTag: '场景4（图号和物料都不存在）',
    },
    {
      id: `S5-${Date.now()}-5`,
      fileName: 'DRV-8820-SV200_工业级伺服驱动器.dwg',
      fileSize: 5600000,
      fileType: 'DWG' as FileType,
      uploadDrawingNo: 'DRV-8820-SV200',
      uploadMaterialName: '工业级伺服驱动器',
      scenarioTag: '场景5（物料图号都存在，但是图号不是操作状态）',
    },
    {
      id: `SOK-${Date.now()}-6`,
      fileName: 'GSK-1005-EPDM_绝缘密封橡胶垫圈.step',
      fileSize: 4200000,
      fileType: 'STEP' as FileType,
      uploadDrawingNo: 'GSK-1005-EPDM',
      uploadMaterialName: '绝缘密封橡胶垫圈',
      scenarioTag: '正常合规场景（草稿可操作状态）',
    },
  ];

  const generateNewDrawingCode = () => {
    const today = new Date();
    const dateStr = today.getFullYear().toString() +
      String(today.getMonth() + 1).padStart(2, '0') +
      String(today.getDate()).padStart(2, '0');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `DRW${dateStr}${rand}`;
  };

  const handleOpenListCreateModal = () => {
    setListCreateDrawingNo(generateNewDrawingCode());
    setListCreateMaterialId('');
    setListCreateVersionNo('1');
    setListCreateNotes('');
    setIsListCreateModalOpen(true);
  };

  const selectedListCreateMaterial = useMemo(() => {
    return materials.find(m => m.id === listCreateMaterialId);
  }, [materials, listCreateMaterialId]);

  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editingNotesText, setEditingNotesText] = useState('');
  
  const [isEditingDrawingNo, setIsEditingDrawingNo] = useState(false);
  const [editingDrawingNo, setEditingDrawingNo] = useState('');

  // 删除二级确认模态框状态 (支持图号主档、版本、图纸文件整条删除)
  interface DeleteTarget {
    type: 'drawing' | 'version' | 'file';
    id: string;
    code: string;
    title: string;
    versionId?: string;
    versionNo?: string;
    fileName?: string;
    fileType?: string;
  }
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  // 统一轻量 Toast 提示
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // 图号主档及关联物料编辑弹窗状态（不需要选择版本，仅选择无图号物料）
  const [isMasterEditModalOpen, setIsMasterEditModalOpen] = useState(false);
  const [masterEditData, setMasterEditData] = useState<{
    selectedMaterialId: string;
    materialCode: string;
    materialName: string;
    materialSpec: string;
    category: string;
    unit: string;
    notes: string;
  }>({
    selectedMaterialId: '',
    materialCode: '',
    materialName: '',
    materialSpec: '',
    category: '',
    unit: '',
    notes: '',
  });

  // 草稿/驳回状态下的图纸文件编辑弹窗状态
  const [isFileEditModalOpen, setIsFileEditModalOpen] = useState(false);
  const [editingFileData, setEditingFileData] = useState<{
    versionId: string;
    fileId: string;
    fileName: string;
  }>({
    versionId: '',
    fileId: '',
    fileName: '',
  });

  const currentMaterial = materials.find(m => m.id === selectedMaterialId) || materials[0];
  const currentMaster = selectedDrawingNo?.startsWith('NEW_')
    ? undefined
    : ((selectedDrawingNo ? drawingMasters.find(d => d.drawingNo === selectedDrawingNo) : null) ||
      drawingMasters.find(d => d.materialId === currentMaterial?.id || d.drawingNo === currentMaterial?.drawingNo));

  // 详情页编辑物料时：仅展示无图号的物料，以及当前已绑定的物料
  const availableMaterialsForEdit = useMemo(() => {
    return materials.filter(m => (!m.hasDrawing && !m.drawingNo) || m.id === currentMaster?.materialId);
  }, [materials, currentMaster?.materialId]);

  const handleOpenMasterEditModal = () => {
    const mat = materials.find(m => m.id === currentMaster?.materialId) || currentMaterial;
    setMasterEditData({
      selectedMaterialId: mat?.id || '',
      materialCode: mat?.materialCode || '',
      materialName: mat?.materialName || '',
      materialSpec: mat?.materialSpec || '',
      category: mat?.category || '',
      unit: mat?.unit || 'PCS',
      notes: currentMaster?.notes || '',
    });
    setIsMasterEditModalOpen(true);
  };

  const handleMaterialChangeInMasterEdit = (matId: string) => {
    const m = materials.find(mat => mat.id === matId);
    if (m) {
      setMasterEditData(prev => ({
        ...prev,
        selectedMaterialId: m.id,
        materialCode: m.materialCode,
        materialName: m.materialName,
        materialSpec: m.materialSpec || '',
        category: m.category || '',
        unit: m.unit || 'PCS',
      }));
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'drawing') {
      if (onDeleteDrawingMaster) {
        onDeleteDrawingMaster(deleteTarget.code);
      }
      showToast(`已成功删除图号 [${deleteTarget.code}] 主档及其全部版本数据！`);
      if (viewMode === 'detail' && currentMaster?.drawingNo === deleteTarget.code) {
        setViewMode('list');
      }
    } else if (deleteTarget.type === 'version') {
      onDeleteDraftVersion(deleteTarget.code, deleteTarget.id);
      showToast(`已成功整条删除图纸草稿版本 [${deleteTarget.versionNo}]！`);
      if (currentMaster) {
        const remaining = currentMaster.versions.filter(v => v.id !== deleteTarget.id);
        if (remaining.length > 0) {
          const draft = remaining.find(v => v.status === 'DRAFT');
          const pub = remaining.find(v => v.status === 'PUBLISHED' && v.isActive) || remaining[0];
          setExpandedVersionId(draft ? draft.id : pub.id);
        } else {
          setViewMode('list');
        }
      }
    } else if (deleteTarget.type === 'file') {
      if (onDeleteFileFromVersion && deleteTarget.versionId) {
        onDeleteFileFromVersion(
          deleteTarget.code,
          deleteTarget.versionId,
          deleteTarget.id,
          deleteTarget.fileName || '',
          deleteTarget.fileType || ''
        );
      }
      showToast(`已整条删除图纸文件 [${deleteTarget.fileName}]！`);
      // 保持停留在当前详情页，不跳转
    }

    setDeleteTarget(null);
  };

  // 反审批目标与模态框状态
  const [reverseApprovalTarget, setReverseApprovalTarget] = useState<{
    master: DrawingMaster;
    version: DrawingVersion;
  } | null>(null);
  const [reverseApprovalReason, setReverseApprovalReason] = useState<string>(
    '需调整部分图纸技术要求与尺寸公差，反审批回退至草稿状态重新编辑。'
  );

  const handleOpenReverseApprovalModal = (master: DrawingMaster, targetVersion?: DrawingVersion) => {
    const pubVer =
      targetVersion ||
      master.versions.find(v => v.status === 'PUBLISHED' && v.isDefault) ||
      master.versions.find(v => v.status === 'PUBLISHED' && v.isActive) ||
      master.versions.find(v => v.status === 'PUBLISHED') ||
      master.versions[0];
    if (!pubVer) return;
    setReverseApprovalTarget({ master, version: pubVer });
    setReverseApprovalReason('需调整部分图纸技术要求与尺寸公差，反审批回退至草稿状态重新编辑。');
  };

  const handleConfirmReverseApproval = () => {
    if (!reverseApprovalTarget) return;
    const { master, version } = reverseApprovalTarget;
    const reasonText = reverseApprovalReason.trim() || '需调整图纸技术要求，反审批回退至草稿';

    onUpdateVersionStatus(master.drawingNo, version.id, 'DRAFT', {
      reviewer: '当前登录用户',
      notes: `【反审批回退】${reasonText}`,
    });

    showToast(`图号 [${master.drawingNo}] 已成功反审批！单据状态已恢复为【草稿】。`);
    setReverseApprovalTarget(null);
  };

  // 当前详情页选中的图纸版本 (单版本聚焦，不再展示重复长列表)
  const selectedVersion = currentMaster?.versions.find(v => v.id === expandedVersionId) || currentMaster?.versions[0];

  useEffect(() => {
    if (viewMode === 'detail' && currentMaster && !expandedVersionId) {
      if (currentMaster.versions.length > 0) {
        const draft = currentMaster.versions.find(v => v.status === 'DRAFT');
        const pub = currentMaster.versions.find(v => v.status === 'PUBLISHED' && v.isActive) || currentMaster.versions[0];
        setExpandedVersionId(draft ? draft.id : pub.id);
      }
    }
  }, [currentMaster, expandedVersionId, viewMode]);

  // 当新增草稿时，自动展开该草稿
  useEffect(() => {
    if (currentMaster?.versions) {
      const draft = currentMaster.versions.find(v => v.status === 'DRAFT');
      if (draft) {
        setExpandedVersionId(draft.id);
      }
    }
  }, [currentMaster?.versions.length]);

  const handleCreateDraft = (baseVerNo?: string) => {
    if (!currentMaster) return;
    const targetVer = baseVerNo || currentMaster.currentPublishedVersion || currentMaster.latestVersion;
    onCreateNewDraftVersion(currentMaster.drawingNo, targetVer);
    setDetailTab('versions');
  };

  const handleStartEditVersionNo = (ver: DrawingVersion) => {
    setEditingVersionId(ver.id);
    setEditingVersionNo(ver.versionNo);
  };

  const handleSaveVersionNo = (versionId: string) => {
    if (!currentMaster) return;
    const cleanNo = editingVersionNo.trim().toUpperCase();
    if (!cleanNo) {
      alert('版本号不能为空！');
      return;
    }

    // 检查重名
    const isDuplicate = currentMaster.versions.some(v => v.id !== versionId && v.versionNo.toUpperCase() === cleanNo);
    if (isDuplicate) {
      alert(`版本号 [${cleanNo}] 已存在，请使用唯一的版本号！`);
      return;
    }

    if (onUpdateDraftVersionNo) {
      onUpdateDraftVersionNo(currentMaster.drawingNo, versionId, cleanNo);
    } else {
      onUpdateVersionStatus(currentMaster.drawingNo, versionId, 'DRAFT', { versionNo: cleanNo });
    }

    setEditingVersionId(null);
  };

  // 处理文件批量选中与添加
  const handleAddFilesToUploadModal = (files: FileList | File[]) => {
    const newItems = Array.from(files).map((f, idx) => {
      const identified = detectFileTypeFromName(f.name);
      return {
        id: `FILE-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
        file: f,
        fileName: f.name,
        fileType: (identified || 'STEP') as FileType,
        fileSize: f.size || Math.floor(Math.random() * 4000000) + 1500000,
        fileHash: `SHA-256:${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`,
      };
    });
    setUploadModalFiles(prev => [...prev, ...newItems]);
    showToast(`已成功添加 ${newItems.length} 份本地图纸文件至待上传列表！`);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleAddFilesToUploadModal(e.target.files);
    }
  };

  const handleOpenUploadModal = (ver: DrawingVersion) => {
    setUploadModalVersion(ver);
    const base = currentMaster?.drawingNo || 'DRW-DEFAULT';
    const matName = currentMaster?.materialName || '零件';
    const initialSample = [
      {
        id: `F-${Date.now()}-1`,
        fileName: `${base}_${ver.versionNo}_2D装配总图_${matName}.dwg`,
        fileType: 'CAD' as FileType,
        fileSize: 3250000,
        fileHash: `SHA-256:${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`,
      },
    ];
    setUploadModalFiles(initialSample);
    setIsDragOverUpload(false);
  };

  // 快捷测试用例：模拟多张图纸多种情况批量上传（包含通过、缺少物料名、图号不匹配、未遵循规范、格式不支持）
  const handleLoadTestScenarios = () => {
    if (!uploadModalVersion || !currentMaster) return;
    const base = currentMaster.drawingNo;
    const vNo = uploadModalVersion.versionNo;
    const matName = currentMaster.materialName || '零件';

    const testSuite = [
      {
        id: `TEST-${Date.now()}-1`,
        fileName: `${base}_${vNo}_2D装配总图_${matName}.dwg`,
        fileType: 'CAD' as FileType,
        fileSize: 3450000,
        fileHash: 'SHA-256:d41d8cd98f00b204e9800998ecf8427e',
        testNote: '【测试1-通过】包含完整图号与物料名称的标准2D装配图',
      },
      {
        id: `TEST-${Date.now()}-2`,
        fileName: `${base}_${matName}_3D总成数模_${vNo}.stp`,
        fileType: 'STEP' as FileType,
        fileSize: 14800000,
        fileHash: 'SHA-256:9e107d9d372bb6826bd81d3542a419d6',
        testNote: '【测试2-通过】包含完整图号与物料名称的3D总成数模',
      },
      {
        id: `TEST-${Date.now()}-3`,
        fileName: `${base}_${vNo}_2D总装图_REV1.dwg`,
        fileType: 'CAD' as FileType,
        fileSize: 2890000,
        fileHash: 'SHA-256:4b227777d4dd1fc61c6f884f48641d02',
        testNote: '【测试3-失败】缺少物料名称（未包含「' + matName + '」）',
      },
      {
        id: `TEST-${Date.now()}-4`,
        fileName: `DRW-MISMATCH-99999_${matName}_零件下料图.dxf`,
        fileType: 'CAD' as FileType,
        fileSize: 1920000,
        fileHash: 'SHA-256:eccbc87e4b5ce2fe28308fd9f2a7baf3',
        testNote: '【测试4-失败】图号错误（未包含当前图号「' + base + '」）',
      },
      {
        id: `TEST-${Date.now()}-5`,
        fileName: `final_production_assembly_v2.pdf`,
        fileType: 'PDF' as FileType,
        fileSize: 1650000,
        fileHash: 'SHA-256:c4ca4238a0b923820dcc509a6f75849b',
        testNote: '【测试5-失败】完全未遵循规范（缺少图号与物料名称）',
      },
      {
        id: `TEST-${Date.now()}-6`,
        fileName: `${base}_${matName}_结构设计说明书.docx`,
        fileType: 'PDF' as FileType,
        fileSize: 850000,
        fileHash: 'SHA-256:8f434346648f6b96df89dda901c5176b',
        testNote: '【测试6-失败】不支持的图纸文件格式（.docx）',
      },
    ];

    setUploadModalFiles(testSuite);
    showToast('已载入 6 种测试场景图纸（2 份合规通过，4 份异常拦截），可在表格中查看具体校验详情！');
  };

  // 一键修复单条图纸为规范命名
  const handleAutoFixSingleFileName = (fileId: string) => {
    if (!uploadModalVersion || !currentMaster) return;
    const base = currentMaster.drawingNo;
    const vNo = uploadModalVersion.versionNo;
    const matName = currentMaster.materialName || '零件';

    setUploadModalFiles(prev =>
      prev.map(f => {
        if (f.id !== fileId) return f;
        const lastDot = f.fileName.lastIndexOf('.');
        const ext = lastDot !== -1 ? f.fileName.slice(lastDot) : '.dwg';
        const rawName = lastDot !== -1 ? f.fileName.slice(0, lastDot) : f.fileName;
        
        // 如果是 docx 等非图纸格式，自动纠正为 .pdf 或 .dwg
        let cleanExt = ext;
        if (['.docx', '.xlsx', '.txt', '.zip', ''].includes(ext.toLowerCase())) {
          cleanExt = '.pdf';
        }
        
        const newName = `${base}_${vNo}_${matName}_${rawName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_')}${cleanExt}`;
        return {
          ...f,
          fileName: newName,
          fileType: (detectFileTypeFromName(newName) || 'DWG') as FileType,
        };
      })
    );
    showToast('已自动按「图号+版本+物料名称」标准规范修复图纸文件名！');
  };

  // 一键修复全部不合规图纸
  const handleAutoFixAllFileNames = () => {
    if (!uploadModalVersion || !currentMaster) return;
    const base = currentMaster.drawingNo;
    const vNo = uploadModalVersion.versionNo;
    const matName = currentMaster.materialName || '零件';

    setUploadModalFiles(prev =>
      prev.map(f => {
        const val = validateDrawingFileMatch(f.fileName, base, matName);
        if (val.isValid) return f;

        const lastDot = f.fileName.lastIndexOf('.');
        const ext = lastDot !== -1 ? f.fileName.slice(lastDot) : '.dwg';
        const rawName = lastDot !== -1 ? f.fileName.slice(0, lastDot) : f.fileName;
        
        let cleanExt = ext;
        if (['.docx', '.xlsx', '.txt', '.zip', ''].includes(ext.toLowerCase())) {
          cleanExt = '.pdf';
        }
        
        const newName = `${base}_${vNo}_${matName}_${rawName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_')}${cleanExt}`;
        return {
          ...f,
          fileName: newName,
          fileType: (detectFileTypeFromName(newName) || 'DWG') as FileType,
        };
      })
    );
    showToast('已一键批量修复全部异常图纸为规范命名，已全部通过校验！');
  };

  // 一键移除所有校验未通过项
  const handleRemoveInvalidFiles = () => {
    if (!currentMaster) return;
    const base = currentMaster.drawingNo;
    const matName = currentMaster.materialName || '零件';
    setUploadModalFiles(prev =>
      prev.filter(f => validateDrawingFileMatch(f.fileName, base, matName).isValid)
    );
    showToast('已清除全部校验未通过图纸！');
  };

  const handleLoadPresetSuite = (suiteType: 'STANDARD_4' | 'CAD_3D') => {
    if (!uploadModalVersion || !currentMaster) return;
    const base = currentMaster.drawingNo;
    const vNo = uploadModalVersion.versionNo;
    const matName = currentMaster.materialName || '零部件';

    if (suiteType === 'STANDARD_4') {
      const suite = [
        {
          id: `SUITE-${Date.now()}-1`,
          fileName: `${base}_${vNo}_2D装配总图_${matName}.dwg`,
          fileType: 'CAD' as FileType,
          fileSize: 3420000,
          fileHash: 'SHA-256:d41d8cd98f00b204e9800998ecf8427e',
        },
        {
          id: `SUITE-${Date.now()}-2`,
          fileName: `${base}_${vNo}_3D装配体数模_${matName}.stp`,
          fileType: 'STEP' as FileType,
          fileSize: 12500000,
          fileHash: 'SHA-256:9e107d9d372bb6826bd81d3542a419d6',
        },
        {
          id: `SUITE-${Date.now()}-3`,
          fileName: `${base}_${vNo}_生产受控工程图_${matName}.pdf`,
          fileType: 'PDF' as FileType,
          fileSize: 1850000,
          fileHash: 'SHA-256:c4ca4238a0b923820dcc509a6f75849b',
        },
        {
          id: `SUITE-${Date.now()}-4`,
          fileName: `${base}_${vNo}_零件下料展开图_${matName}.dxf`,
          fileType: 'CAD' as FileType,
          fileSize: 2150000,
          fileHash: 'SHA-256:eccbc87e4b5ce2fe28308fd9f2a7baf3',
        },
      ];
      setUploadModalFiles(prev => [...prev, ...suite]);
      showToast('已载入标准 4 格式图纸包 (DWG + STEP + PDF + DXF)！');
    } else {
      const suite = [
        {
          id: `SUITE-${Date.now()}-1`,
          fileName: `${base}_${vNo}_SolidWorks零件_${matName}.sldprt`,
          fileType: 'CAD' as FileType,
          fileSize: 5600000,
          fileHash: 'SHA-256:a87ff679a2f3e71d9181a67b7542122c',
        },
        {
          id: `SUITE-${Date.now()}-2`,
          fileName: `${base}_${vNo}_SolidWorks总成_${matName}.sldasm`,
          fileType: 'STEP' as FileType,
          fileSize: 18400000,
          fileHash: 'SHA-256:e4da3b7fbbce2345d7772b0674a318d5',
        },
        {
          id: `SUITE-${Date.now()}-3`,
          fileName: `${base}_${vNo}_高精IGES曲面_${matName}.igs`,
          fileType: 'STEP' as FileType,
          fileSize: 9200000,
          fileHash: 'SHA-256:1679091c5a880faf6fb5e6087eb1b2dc',
        },
      ];
      setUploadModalFiles(prev => [...prev, ...suite]);
      showToast('已载入 3D CAD/SolidWorks 图纸套件！');
    }
  };

  const handleUploadFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadModalVersion || !currentMaster || uploadModalFiles.length === 0) return;

    // 过滤出所有通过命名规范与格式校验的文件
    const validItems = uploadModalFiles.filter(item => {
      const validation = validateDrawingFileMatch(item.fileName, currentMaster.drawingNo, currentMaster.materialName);
      return validation.isValid;
    });

    const invalidCount = uploadModalFiles.length - validItems.length;

    if (validItems.length === 0) {
      alert(`当前列表中的 ${uploadModalFiles.length} 份图纸均未通过「图号 + 物料名称」命名规范校验，请修改图纸文件名后再上传！`);
      return;
    }

    validItems.forEach(item => {
      const finalFormat = detectFileTypeFromName(item.fileName) || item.fileType;
      const newFile: DrawingFile = {
        id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        fileName: item.fileName.trim(),
        fileType: finalFormat as FileType,
        fileSize: item.fileSize,
        uploadTime: new Date().toISOString().slice(0, 16).replace('T', ' '),
        uploader: '当前登录工程师',
        fileHash: item.fileHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      };
      onAddFileToDraft(currentMaster.drawingNo, uploadModalVersion.id, newFile);
    });

    const count = validItems.length;
    setUploadModalVersion(null);
    setUploadModalFiles([]);

    if (invalidCount > 0) {
      showToast(`已成功上传 ${count} 份合规图纸！自动拦截跳过 ${invalidCount} 份未通过命名规范的图纸。`);
    } else {
      showToast(`已成功批量上传全部 ${count} 份工程图纸文件至版本 [${uploadModalVersion.versionNo}]！`);
    }
  };

  // 使用记录数据：追溯 BOM 与关联销售订单（合并展示）
  const usageData = useMemo(() => {
    if (!currentMaster) return [];

    const combinedList: Array<{
      id: string;
      bomCode: string;
      bomName: string;
      bomVersion: string;
      productName: string;
      itemQty: number;
      unit: string;
      referencedVersion: string;
      orderNo?: string;
      workOrderNo?: string;
      customerName?: string;
      deliveryDate?: string;
      orderStatus?: string;
    }> = [];

    boms.forEach(b => {
      b.items.forEach(item => {
        if (item.materialId === currentMaster.materialId || item.drawingNo === currentMaster.drawingNo) {
          const refVer = item.versionNo || currentMaster.currentPublishedVersion || '默认版本';
          const matchedOrders = salesOrders.filter(so => so.bomCode === b.bomCode && so.bomVersion === b.versionNo);

          if (matchedOrders.length > 0) {
            matchedOrders.forEach(so => {
              combinedList.push({
                id: `${b.id}-${so.id}`,
                bomCode: b.bomCode,
                bomName: b.name,
                bomVersion: b.versionNo,
                productName: b.productName || so.productName,
                itemQty: item.quantity,
                unit: item.unit,
                referencedVersion: refVer,
                orderNo: so.orderNo,
                workOrderNo: so.workOrderNo || (so.orderNo ? `WO-${so.orderNo.replace(/^[A-Z]+-?/, '')}` : undefined),
                customerName: so.customerName,
                deliveryDate: so.deliveryDate,
                orderStatus: so.status === 'IN_PRODUCTION' ? '生产中' : so.status === 'COMPLETED' ? '已完成' : '待排产',
              });
            });
          } else {
            combinedList.push({
              id: `${b.id}-no-order`,
              bomCode: b.bomCode,
              bomName: b.name,
              bomVersion: b.versionNo,
              productName: b.productName,
              itemQty: item.quantity,
              unit: item.unit,
              referencedVersion: refVer,
            });
          }
        }
      });
    });

    return combinedList;
  }, [currentMaster, boms, salesOrders]);

  // 全生命周期变更记录汇总
  const allHistoryLogs = useMemo(() => {
    if (!currentMaster) return [];
    const list: Array<{
      id: string;
      timestamp: string;
      versionNo: string;
      operator: string;
      action: string;
      details: string;
      status?: VersionStatus;
    }> = [];

    currentMaster.versions.forEach(v => {
      if (v.logs && v.logs.length > 0) {
        v.logs.forEach(log => {
          list.push({
            id: log.id,
            timestamp: log.timestamp,
            versionNo: v.versionNo,
            operator: log.operator,
            action: log.action,
            details: log.details,
            status: v.status,
          });
        });
      } else {
        list.push({
          id: `INIT-${v.id}`,
          timestamp: v.createdAt,
          versionNo: v.versionNo,
          operator: v.createdBy,
          action: '创建版本',
          details: `创建了图号版本 ${v.versionNo}（状态: ${v.status}）`,
          status: v.status,
        });
      }
    });

    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [currentMaster]);

  // 共享模态框渲染：批量导入/上传工程图纸向导（含5大异常场景强校验）
  const renderBatchUploadModal = () => {
    if (!isBatchUploadModalOpen) return null;

    // 对队列中所有图纸计算校验结果
    const validatedFiles = batchUploadFiles.map(file => {
      const val = validateBatchDrawingUpload(
        file.uploadDrawingNo,
        file.uploadMaterialName,
        drawingMasters,
        materials
      );
      return {
        ...file,
        validation: val
      };
    });

    const validCount = validatedFiles.filter(f => f.validation.isValid).length;
    const errorCount = validatedFiles.length - validCount;

    // 根据筛选器过滤展示
    const displayFiles = validatedFiles.filter(f => {
      if (batchUploadFilter === 'VALID') return f.validation.isValid;
      if (batchUploadFilter === 'ERROR') return !f.validation.isValid;
      if (batchUploadFilter === '1') return f.validation.scenario === 1;
      if (batchUploadFilter === '2') return f.validation.scenario === 2;
      if (batchUploadFilter === '3') return f.validation.scenario === 3;
      if (batchUploadFilter === '4') return f.validation.scenario === 4;
      if (batchUploadFilter === '5') return f.validation.scenario === 5;
      return true;
    });

    const handleImportSubmit = () => {
      const validItems = validatedFiles.filter(f => f.validation.isValid);
      if (validItems.length === 0) {
        showToast('当前待归档列表中无校验合规的图纸，无法执行导入！请修改图号或物料名称修正异常。');
        return;
      }

      let successCount = 0;
      validItems.forEach(item => {
        const targetMaster = item.validation.matchedMaster;
        if (targetMaster) {
          const draftVer = targetMaster.versions.find(v => v.status === 'DRAFT' || v.status === 'REJECTED');
          if (draftVer && onAddFileToDraft) {
            onAddFileToDraft(targetMaster.drawingNo, draftVer.id, {
              id: `FILE-UPL-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              fileName: item.fileName,
              fileType: item.fileType,
              fileSize: item.fileSize,
              fileHash: `SHA256-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
              uploadTime: new Date().toLocaleString(),
              uploader: '批量上传服务',
              previewUrl: '#'
            });
            successCount++;
          }
        }
      });

      if (errorCount > 0) {
        // 移除合规的，保留异常项方便用户进一步修正
        setBatchUploadFiles(prev => prev.filter(f => !validItems.some(v => v.id === f.id)));
        showToast(`已成功导入 ${successCount} 份合规图纸！自动拦截了 ${errorCount} 份异常图纸。`);
      } else {
        setBatchUploadFiles([]);
        setIsBatchUploadModalOpen(false);
        showToast(`全部 ${successCount} 份工程图纸校验通过并已成功归档至对应草稿版本！`);
      }
    };

    return (
      <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 animate-fadeIn">
        <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-5xl lg:max-w-6xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scaleIn flex flex-col max-h-[92vh]">
          {/* 模态框头部 */}
          <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/70 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-2xs">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="font-semibold text-slate-900 dark:text-white text-base">
                    批量导入工程图纸
                  </h3>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                    CAD / STEP / DWG / PDF
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  自动解析文件名并执行图号与物料关联一致性、存在性及版本状态校验
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowRuleGuide(!showRuleGuide)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                  showRuleGuide
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>5 大异常校验规则</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showRuleGuide ? 'rotate-180' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => setIsBatchUploadModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 内容区 */}
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
            {/* 可折叠的 5 大异常场景规范指引面板 */}
            {showRuleGuide && (
              <div className="p-4 bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    系统支持图纸上传的 5 种异常场景智能校验拦截规则：
                  </span>
                  <span className="text-[11px] text-slate-500">上传时自动比对校验，若触发以下任一场景则禁止归档</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-3 bg-white dark:bg-slate-800/80 rounded-lg border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                    <div className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-100">
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                      场景 1：图号存在物料不一样
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      图号已存在，但其绑定的物料与上传物料不匹配。<br/>
                      <span className="text-rose-600 dark:text-rose-400 font-mono text-[10px]">提示：图号 [图号] 关联物料为 [已有物料]，与上传的物料名称 [上传物料] 不一致。</span>
                    </p>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-800/80 rounded-lg border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                    <div className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-100">
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      场景 2：物料存在但物料无图号
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      物料存在，但尚未配置或关联任何图号主数据。<br/>
                      <span className="text-amber-600 dark:text-amber-400 font-mono text-[10px]">提示：物料 [物料] 存在，但无关联图号。</span>
                    </p>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-800/80 rounded-lg border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                    <div className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-100">
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                      场景 3：物料存在但物料图号不一样
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      物料存在且已有绑定图号，与当前上传填写的图号不一致。<br/>
                      <span className="text-rose-600 dark:text-rose-400 font-mono text-[10px]">提示：物料 [物料] 关联图号为 [已有图号]，与上传的图号 [上传图号] 不一致。</span>
                    </p>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-800/80 rounded-lg border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                    <div className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-100">
                      <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                      场景 4：图号和物料都不存在
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      系统中均未查询到对应图号与物料基础档案。<br/>
                      <span className="text-slate-600 dark:text-slate-300 font-mono text-[10px]">提示：图号 [图号] 物料 [物料] 不存在。</span>
                    </p>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-800/80 rounded-lg border border-slate-200/60 dark:border-slate-700/60 space-y-1 col-span-1 md:col-span-2">
                    <div className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-100">
                      <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                      场景 5：物料图号都存在，但是图号不是操作状态
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      图号处于已发布（PUBLISHED）或废弃等不可写状态，且无草稿版本供追加上传。<br/>
                      <span className="text-purple-600 dark:text-purple-400 font-mono text-[10px]">提示：图号 [图号] 当前处于 [状态] 状态，不可进行图纸上传操作。</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 顶层紧凑上传与快捷测试栏 */}
            <div className="flex items-stretch gap-3 flex-wrap lg:flex-nowrap">
              {/* 拖拽/点击上传卡片 */}
              <div className="flex-1 relative border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 rounded-xl p-3.5 bg-slate-50/50 dark:bg-slate-850 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition-all flex items-center justify-between gap-3 group cursor-pointer">
                <input
                  type="file"
                  multiple
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      const filesArr = Array.from(e.target.files).map((f: File, idx) => {
                        const extracted = extractDrawingNoAndMaterialNameFromFileName(f.name, drawingMasters, materials);
                        return {
                          id: `FILE-${Date.now()}-${idx}`,
                          fileName: f.name,
                          fileSize: f.size,
                          fileType: detectFileTypeFromName(f.name),
                          uploadDrawingNo: extracted.drawingNo,
                          uploadMaterialName: extracted.materialName,
                          scenarioTag: undefined
                        };
                      });
                      setBatchUploadFiles(prev => [...prev, ...filesArr]);
                      showToast(`已成功添加 ${filesArr.length} 份本地文件并自动执行五大异常校验！`);
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-2">
                      <span>点击选择文件 或 将工程图纸拖拽至此</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      支持 SolidWorks, STEP, DWG, DXF, PDF 等格式，自动匹配图号与物料并校验
                    </div>
                  </div>
                </div>
                <div className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-900/60 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0 shadow-2xs">
                  选择本地文件
                </div>
              </div>

              {/* 快捷测试与清空按钮 */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setBatchUploadFiles(getScenarioTestSamples());
                    setBatchUploadFilter('ALL');
                    showToast('已载入包含 5 种异常场景与 1 种正常场景的测试用例！');
                  }}
                  className="h-full px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                  title="一键载入场景1~5及合规场景测试数据"
                >
                  <FlaskConical className="w-4 h-4" />
                  <span>载入 5 大场景测试用例</span>
                </button>

                {batchUploadFiles.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setBatchUploadFiles([])}
                    className="h-full px-3 py-2.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer text-xs flex items-center gap-1.5 shadow-2xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>清空</span>
                  </button>
                )}
              </div>
            </div>

            {/* 校验统计与分类筛选栏 */}
            <div className="flex items-center justify-between gap-3 flex-wrap border-b border-slate-100 dark:border-slate-800 pb-2.5 pt-1">
              {/* 主分类标签 */}
              <div className="flex items-center p-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl text-xs gap-1">
                <button
                  type="button"
                  onClick={() => setBatchUploadFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    batchUploadFilter === 'ALL'
                      ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-2xs font-semibold'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                  }`}
                >
                  <span>全部</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200/60 dark:bg-slate-600 font-mono">
                    {batchUploadFiles.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setBatchUploadFilter('VALID')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    batchUploadFilter === 'VALID'
                      ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-2xs font-semibold'
                      : 'text-slate-500 hover:text-emerald-600 dark:text-slate-400'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>合规可归档</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    validCount > 0 
                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300' 
                      : 'bg-slate-200/60 dark:bg-slate-600'
                  }`}>
                    {validCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setBatchUploadFilter('ERROR')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    batchUploadFilter === 'ERROR'
                      ? 'bg-white dark:bg-slate-700 text-rose-700 dark:text-rose-300 shadow-2xs font-semibold'
                      : 'text-slate-500 hover:text-rose-600 dark:text-slate-400'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  <span>异常拦截</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    errorCount > 0 
                      ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300' 
                      : 'bg-slate-200/60 dark:bg-slate-600'
                  }`}>
                    {errorCount}
                  </span>
                </button>
              </div>

              {/* 细分场景过滤 */}
              <div className="flex items-center gap-1.5 text-xs flex-wrap">
                <span className="text-slate-400 text-[11px] hidden sm:inline mr-1">特定异常过滤:</span>
                {(['1', '2', '3', '4', '5'] as const).map(s => {
                  const count = validatedFiles.filter(f => f.validation.scenario === Number(s)).length;
                  const titles: Record<string, string> = {
                    '1': '场景1: 物料不一致',
                    '2': '场景2: 物料无图号',
                    '3': '场景3: 图号不一致',
                    '4': '场景4: 均不存在',
                    '5': '场景5: 非操作状态'
                  };
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setBatchUploadFilter(batchUploadFilter === s ? 'ALL' : s)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer border ${
                        batchUploadFilter === s
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700 font-semibold shadow-2xs'
                          : count > 0
                            ? 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                            : 'text-slate-400 border-transparent hover:text-slate-600'
                      }`}
                      title={titles[s]}
                    >
                      场景 {s} {count > 0 && <span className="font-mono text-[10px]">({count})</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 文件清单表格 */}
            {batchUploadFiles.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 space-y-3 bg-slate-50/40 dark:bg-slate-900/40">
                <FolderArchive className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">待归档图纸列表为空</p>
                  <p className="text-xs text-slate-400">请拖拽本地图纸文件至上方上传区，或点击“载入 5 大场景测试用例”进行体验</p>
                </div>
              </div>
            ) : (
              <div className="border border-slate-200/90 dark:border-slate-800 rounded-xl overflow-x-auto shadow-2xs bg-white dark:bg-slate-900">
                <table className="w-full text-left border-collapse text-xs min-w-[950px]">
                  <thead>
                    <tr className="bg-slate-50/90 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold">
                      <th className="py-3 px-3.5 min-w-[220px]">图纸文件</th>
                      <th className="py-3 px-3.5 w-52">上传图号 (可直接修改)</th>
                      <th className="py-3 px-3.5 w-52">上传物料名称 (可直接修改)</th>
                      <th className="py-3 px-3.5 min-w-[340px]">校验状态与拦截提示语</th>
                      <th className="py-3 px-3.5 text-center w-20 whitespace-nowrap">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-800/60">
                    {displayFiles.map((item) => (
                      <tr 
                        key={item.id} 
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                          !item.validation.isValid ? 'bg-rose-50/15 dark:bg-rose-950/10' : ''
                        }`}
                      >
                        {/* 文件名称与类型 */}
                        <td className="py-3 px-3.5">
                          <div className="flex flex-col gap-1 max-w-[240px]">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={item.fileName}>
                              {item.fileName}
                            </span>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                                {item.fileType}
                              </span>
                              <span>{formatFileSize(item.fileSize)}</span>
                              {item.scenarioTag && (
                                <span className="text-slate-400 dark:text-slate-500 font-sans">
                                  · {item.scenarioTag.split('（')[0]}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 上传图号编辑输入框 */}
                        <td className="py-3 px-3.5">
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={item.uploadDrawingNo}
                              placeholder="输入图号..."
                              onChange={(e) => {
                                const val = e.target.value;
                                setBatchUploadFiles(prev => prev.map(f => f.id === item.id ? { ...f, uploadDrawingNo: val } : f));
                              }}
                              className="w-full px-2.5 py-1.5 bg-slate-50/70 hover:bg-white focus:bg-white dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:focus:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1.5 focus:ring-blue-500 transition-all"
                            />
                            {item.validation.matchedMaster ? (
                              <div className="text-[10px] text-slate-400 truncate">
                                系统建档 · 关联: <span className="text-slate-600 dark:text-slate-300 font-medium">{item.validation.matchedMaster.materialName}</span>
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-400">系统未查询到此图号</div>
                            )}
                          </div>
                        </td>

                        {/* 上传物料名称编辑输入框 */}
                        <td className="py-3 px-3.5">
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={item.uploadMaterialName}
                              placeholder="输入物料名称..."
                              onChange={(e) => {
                                const val = e.target.value;
                                setBatchUploadFiles(prev => prev.map(f => f.id === item.id ? { ...f, uploadMaterialName: val } : f));
                              }}
                              className="w-full px-2.5 py-1.5 bg-slate-50/70 hover:bg-white focus:bg-white dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:focus:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1.5 focus:ring-blue-500 transition-all"
                            />
                            {item.validation.matchedMaterial ? (
                              <div className="text-[10px] text-slate-400 truncate">
                                物料编码: <span className="text-slate-600 dark:text-slate-300 font-medium">{item.validation.matchedMaterial.materialCode}</span>
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-400">系统未查询到此物料</div>
                            )}
                          </div>
                        </td>

                        {/* 校验状态与精准提示语 */}
                        <td className="py-3 px-3.5">
                          {item.validation.isValid ? (
                            <div className="py-1">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-lg border border-emerald-200/80 dark:border-emerald-800">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                校验通过 · 允许归档
                              </span>
                              <p className="text-[11px] text-emerald-600/90 dark:text-emerald-400/80 mt-1">
                                图号与物料匹配，草稿状态允许追加上传图纸文件
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-1.5 py-1">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-800 inline-flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                                  场景 {item.validation.scenario} · {item.validation.scenarioTitle}
                                </span>
                                <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                                  禁止归档
                                </span>
                              </div>
                              <div className="p-2.5 bg-rose-50/70 dark:bg-rose-950/30 border-l-3 border-rose-500 dark:border-rose-400 border border-slate-200/70 dark:border-slate-800/80 rounded-r-lg text-xs font-medium text-rose-900 dark:text-rose-100 leading-relaxed shadow-2xs">
                                <span className="font-bold text-rose-950 dark:text-rose-200 mr-1.5 select-none">
                                  提示语：
                                </span>
                                <span className="font-mono">{item.validation.errorMessage}</span>
                              </div>
                            </div>
                          )}
                        </td>

                        {/* 操作栏 */}
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              title="预览工程图纸"
                              onClick={() => {
                                const targetMaster = item.validation.matchedMaster || drawingMasters[0];
                                const targetVersion = targetMaster?.versions[0] || {
                                  id: `VER-PREVIEW-${item.id}`,
                                  versionNo: '1.0',
                                  status: 'DRAFT' as const,
                                  creator: '当前用户',
                                  createdTime: new Date().toLocaleString(),
                                  notes: '批量导入待归档文件预览',
                                  files: []
                                };
                                const mockFile: DrawingFile = {
                                  id: item.id,
                                  fileName: item.fileName,
                                  fileType: item.fileType,
                                  fileSize: item.fileSize,
                                  fileHash: `HASH-${item.id}`,
                                  uploadTime: new Date().toLocaleString(),
                                  uploader: '当前用户',
                                  previewUrl: '#'
                                };
                                setPreviewFile({
                                  file: mockFile,
                                  version: targetVersion,
                                  materialName: item.uploadMaterialName || targetMaster?.materialName,
                                  materialSpec: targetMaster?.materialSpec
                                });
                              }}
                              className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              title="移除此项"
                              onClick={() => setBatchUploadFiles(prev => prev.filter(f => f.id !== item.id))}
                              className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 底部按钮栏 */}
          <div className="px-6 py-3.5 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                当前队列: <strong className="text-slate-800 dark:text-slate-200">{validatedFiles.length}</strong> 份
              </span>
              <span>·</span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                合规可归档: <strong className="text-emerald-700 dark:text-emerald-300">{validCount}</strong> 份
              </span>
              <span>·</span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                异常拦截: <strong className="text-rose-700 dark:text-rose-300">{errorCount}</strong> 份
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsBatchUploadModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              >
                取消
              </button>
              <button
                type="button"
                disabled={validatedFiles.length === 0}
                onClick={handleImportSubmit}
                className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white rounded-lg shadow-sm cursor-pointer flex items-center gap-2 transition-all"
              >
                <Upload className="w-4 h-4" />
                <span>确认批量导入 ({validCount} 份合规)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 共享模态框渲染：删除二次确认弹窗
  const renderDeleteModal = () => {
    if (!deleteTarget) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {deleteTarget.type === 'drawing' ? '删除图号主档确认' : deleteTarget.type === 'version' ? '删除图纸草稿版本确认' : '删除图纸文件确认'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {deleteTarget.type === 'drawing' ? (
                  <>
                    确定要彻底删除工程图号 <strong className="font-mono text-slate-800 dark:text-slate-200 font-bold">[{deleteTarget.code}]</strong> 及其包含的所有版本和图纸附件吗？此操作不可逆！
                  </>
                ) : deleteTarget.type === 'version' ? (
                  <>
                    确定要删除图号 <strong className="font-mono text-slate-800 dark:text-slate-200 font-bold">[{deleteTarget.code}]</strong> 下的草稿版本 <strong className="text-blue-600 font-bold">[{deleteTarget.versionNo}]</strong> 吗？
                  </>
                ) : (
                  <>
                    确定要删除版本 <strong className="font-bold text-blue-600">[{deleteTarget.versionNo}]</strong> 中的图纸文件 <strong className="font-medium text-slate-800 dark:text-slate-200">[{deleteTarget.title}]</strong> 吗？
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-1.5 text-slate-600 dark:text-slate-400">
            <div className="flex items-center justify-between">
              <span>图号 / 编码:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{deleteTarget.code}</span>
            </div>
            {deleteTarget.title && (
              <div className="flex items-center justify-between">
                <span>关联名称:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[200px]">{deleteTarget.title}</span>
              </div>
            )}
            {deleteTarget.versionNo && (
              <div className="flex items-center justify-between">
                <span>版本号:</span>
                <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">{deleteTarget.versionNo}</span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              确认删除
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 共享模态框渲染：图号反审批确认弹窗
  const renderReverseApprovalModal = () => {
    if (!reverseApprovalTarget) return null;
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
        <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-850">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                  图号反审批确认
                </h3>
                <p className="text-[11px] text-slate-500">
                  将已发布的图号回退至草稿状态，允许重新修改与编辑
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReverseApprovalTarget(null)}
              className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4 text-xs">
            {/* 单据摘要卡片 */}
            <div className="p-3.5 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/60 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">工程图号:</span>
                <span className="font-mono font-bold text-blue-600">{reverseApprovalTarget.master.drawingNo}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">关联物料:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[260px]">
                  {reverseApprovalTarget.master.materialName} ({reverseApprovalTarget.master.materialCode})
                </span>
              </div>
              {!isNoVersionMode && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">图纸版本:</span>
                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                    V{reverseApprovalTarget.version.versionNo}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between pt-1 border-t border-amber-200/60 dark:border-amber-800/40">
                <span className="text-slate-500">状态流转:</span>
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded font-semibold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300">
                    已发布
                  </span>
                  <span className="text-slate-400">→</span>
                  <span className="px-1.5 py-0.5 rounded font-semibold text-[10px] bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300">
                    草稿
                  </span>
                </div>
              </div>
            </div>

            {/* 快捷反审批原因 */}
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1.5">
                快捷选择反审批原因:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  '需调整部分图纸技术要求与尺寸公差',
                  '重新上传 SolidWorks 三维模型与工程图',
                  '更新表面粗糙度及热处理技术说明',
                  '关联物料基础档案规格发生变更',
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setReverseApprovalReason(preset)}
                    className="px-2.5 py-1 text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 dark:bg-slate-800/60 dark:hover:bg-amber-950/30 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer text-left"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* 填写反审批意见 */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                反审批说明 / 原因 <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={reverseApprovalReason}
                onChange={e => setReverseApprovalReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500"
                placeholder="请输入反审批原因及具体修改事项..."
              />
            </div>

            {/* 注意事项 */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700 dark:text-slate-300">注意事项:</p>
              <p>1. 反审批后，当前图号状态将立即变更为【草稿】状态。</p>
              <p>2. 系统将自动在【操作日志】中追加反审批记录与审核意见。</p>
              <p>3. 变为草稿状态后，您可重新上传图纸文件、修改物料关联，并再次提交审批。</p>
            </div>
          </div>

          <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setReverseApprovalTarget(null)}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirmReverseApproval}
              disabled={!reverseApprovalReason.trim()}
              className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-medium shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              确认反审批
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 全局轻量通知提示条
  const renderToast = () => {
    if (!toastMessage) return null;
    return (
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-slate-900/90 dark:bg-slate-100/95 text-white dark:text-slate-900 rounded-xl shadow-lg backdrop-blur-xs text-xs font-medium border border-slate-700/50 dark:border-slate-300/50 animate-fadeIn">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
        <span>{toastMessage}</span>
      </div>
    );
  };

  // 1. 图号列表页
  if (viewMode === 'list' && !fixedMaterialId) {
    // 类别统计
    const categoryCounts = drawingMasters.reduce((acc, m) => {
      const cat = m.category || '未分类';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const uniqueCategories = Object.keys(categoryCounts).sort();

    // 状态统计
    let draftCount = 0;
    let pendingCount = 0;
    let publishedCount = 0;
    let rejectedCount = 0;

    drawingMasters.forEach(master => {
      const defaultVer = master.versions.find(v => v.status === 'PUBLISHED' && v.isDefault) || master.versions.find(v => v.status === 'PUBLISHED' && v.isActive) || master.versions.find(v => v.status === 'PUBLISHED');
      const pendingVer = master.versions.find(v => v.status === 'PENDING_REVIEW');
      const draftVer = master.versions.find(v => v.status === 'DRAFT');
      const rejectedVer = master.versions.find(v => v.status === 'REJECTED');
      const primaryVer = pendingVer || draftVer || rejectedVer || defaultVer || master.versions[0];
      const status = primaryVer ? primaryVer.status : 'PUBLISHED';

      if (status === 'DRAFT') draftCount++;
      else if (status === 'PENDING_REVIEW') pendingCount++;
      else if (status === 'PUBLISHED') publishedCount++;
      else if (status === 'REJECTED') rejectedCount++;
    });

    const statusCounts = {
      all: drawingMasters.length,
      draft: draftCount,
      pending: pendingCount,
      published: publishedCount,
      rejected: rejectedCount,
    };

    const filteredMasters = drawingMasters.filter(master => {
      // 1. 类别筛选
      if (selectedCategory !== 'ALL') {
        const cat = (master.category || '').trim();
        const treeNode = DRAWING_CATEGORY_TREE.find(n => n.name === selectedCategory || n.id === selectedCategory);
        if (treeNode && treeNode.children && treeNode.children.length > 0) {
          const childNames = treeNode.children.map(c => c.name);
          const match = cat === treeNode.name || childNames.includes(cat) || childNames.some(cn => cat.includes(cn) || cn.includes(cat));
          if (!match) return false;
        } else {
          if (cat !== selectedCategory && !cat.includes(selectedCategory) && !selectedCategory.includes(cat)) {
            return false;
          }
        }
      }

      // 2. 状态筛选
      if (statusFilter !== 'ALL') {
        const defaultVer = master.versions.find(v => v.status === 'PUBLISHED' && v.isDefault) || master.versions.find(v => v.status === 'PUBLISHED' && v.isActive) || master.versions.find(v => v.status === 'PUBLISHED');
        const pendingVer = master.versions.find(v => v.status === 'PENDING_REVIEW');
        const draftVer = master.versions.find(v => v.status === 'DRAFT');
        const rejectedVer = master.versions.find(v => v.status === 'REJECTED');
        const primaryVer = pendingVer || draftVer || rejectedVer || defaultVer || master.versions[0];
        const currentStatus = primaryVer ? primaryVer.status : 'PUBLISHED';

        const hasMatchingVersion = master.versions.some(v => v.status === statusFilter);
        if (currentStatus !== statusFilter && !hasMatchingVersion) {
          return false;
        }
      }

      // 3. 搜索筛选
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        master.drawingNo.toLowerCase().includes(q) ||
        master.materialCode.toLowerCase().includes(q) ||
        master.materialName.toLowerCase().includes(q) ||
        (master.materialSpec && master.materialSpec.toLowerCase().includes(q)) ||
        (master.category && master.category.toLowerCase().includes(q))
      );
    });

    const isAllSelected = filteredMasters.length > 0 && filteredMasters.every(m => selectedRowIds[m.id]);
    const isSomeSelected = filteredMasters.some(m => selectedRowIds[m.id]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
      const checked = e.target.checked;
      const newSelected: Record<string, boolean> = {};
      if (checked) {
        filteredMasters.forEach(m => {
          newSelected[m.id] = true;
        });
      }
      setSelectedRowIds(newSelected);
    };

    const handleSelectRow = (id: string) => {
      setSelectedRowIds(prev => ({
        ...prev,
        [id]: !prev[id]
      }));
    };

    return (
      <div className="flex flex-col h-full bg-[#f4f7fc] dark:bg-slate-950 p-3 sm:p-4 gap-3 overflow-hidden font-sans">
        {/* 顶部面包屑与页头 */}
        <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-4 py-2 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-xs shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 dark:text-slate-500">研发管理</span>
            <span className="text-slate-300 dark:text-slate-600">/</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              图号管理
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md text-xs">
              <span className="px-2.5 py-1 rounded bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-medium shadow-xs">
                图号列表
              </span>
            </div>
            <span className="text-xs text-slate-400 border-l border-slate-200 dark:border-slate-700 pl-2 ml-1">
              共 {drawingMasters.length} 份图号主档
            </span>
          </div>
        </div>

        {/* 列表主体容器：左右分栏 */}
        <div className="flex-1 flex gap-3 min-h-0 overflow-hidden">
          {/* 左侧：物料分类侧边栏 (支持收起/展开) */}
          <div
            className={`bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 flex flex-col transition-all duration-300 shrink-0 shadow-xs ${
              isCategorySidebarCollapsed ? 'w-12' : 'w-60 sm:w-64'
            }`}
          >
            {/* 侧边栏头部 */}
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
                  onClick={() => setIsCategorySidebarCollapsed(false)}
                  className="p-1 mx-auto hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                  title="展开分类栏"
                >
                  <PanelLeftOpen className="w-4 h-4 text-blue-600" />
                </button>
              )}
            </div>

            {/* 侧边栏内容 */}
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

                {/* 分类树列表 */}
                <div className="flex-1 overflow-y-auto space-y-0.5 text-xs pr-1 select-none">
                  {DRAWING_CATEGORY_TREE.filter(node => {
                    if (!categorySearchQuery.trim()) return true;
                    const q = categorySearchQuery.toLowerCase();
                    const matchParent = node.name.toLowerCase().includes(q);
                    const matchChild = node.children?.some(c => c.name.toLowerCase().includes(q));
                    return matchParent || matchChild;
                  }).map(node => {
                    const isExpanded = !!expandedCategories[node.id];
                    const isSelected = selectedCategory === node.name;
                    const hasChildren = node.children && node.children.length > 0;
                    const parentCount = categoryCounts[node.name] || 0;

                    return (
                      <div key={node.id} className="space-y-0.5">
                        <div
                          onClick={() => {
                            setSelectedCategory(node.name);
                            if (hasChildren) toggleCategoryExpand(node.id);
                          }}
                          className={`group flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-semibold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            {hasChildren ? (
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  toggleCategoryExpand(node.id);
                                }}
                                className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 cursor-pointer"
                              >
                                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              </button>
                            ) : (
                              <span className="w-4" />
                            )}
                            <span className="truncate">{node.name}</span>
                          </div>
                          {parentCount > 0 && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              {parentCount}
                            </span>
                          )}
                        </div>

                        {/* 子分类 */}
                        {hasChildren && isExpanded && (
                          <div className="pl-6 space-y-0.5 border-l border-slate-100 dark:border-slate-800/60 ml-3">
                            {node.children!
                              .filter(child => {
                                if (!categorySearchQuery.trim()) return true;
                                const q = categorySearchQuery.toLowerCase();
                                return child.name.toLowerCase().includes(q) || node.name.toLowerCase().includes(q);
                              })
                              .map(child => {
                                const isChildSelected = selectedCategory === child.name;
                                const childCount = categoryCounts[child.name] || 0;
                                return (
                                  <div
                                    key={child.id}
                                    onClick={() => setSelectedCategory(child.name)}
                                    className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer truncate transition-colors ${
                                      isChildSelected
                                        ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-semibold'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                                    }`}
                                  >
                                    <span className="truncate">{child.name}</span>
                                    {childCount > 0 && (
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        {childCount}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* 额外未归入标准树节点的分类 */}
                  {Object.keys(categoryCounts)
                    .filter(cat => {
                      const inTree = DRAWING_CATEGORY_TREE.some(
                        n => n.name === cat || n.children?.some(c => c.name === cat)
                      );
                      return !inTree && cat.toLowerCase().includes(categorySearchQuery.toLowerCase());
                    })
                    .map(cat => {
                      const isSelected = selectedCategory === cat;
                      const count = categoryCounts[cat];
                      return (
                        <div
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`group flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-semibold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <span className="truncate">{cat}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{count}</span>
                        </div>
                      );
                    })}
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

          {/* 右侧：列表数据区 */}
          <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            {/* 顶栏 1：状态 Tab + 搜索区 */}
            <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 bg-white dark:bg-slate-900">
              {/* 左侧状态 Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg text-xs font-medium overflow-x-auto max-w-full">
                {[
                  { id: 'ALL', label: `全部 (${statusCounts.all})` },
                  { id: 'DRAFT', label: `草稿 (${statusCounts.draft})` },
                  { id: 'PENDING_REVIEW', label: `待审批 (${statusCounts.pending})` },
                  { id: 'PUBLISHED', label: `已发布 (${statusCounts.published})` },
                  { id: 'REJECTED', label: `驳回 (${statusCounts.rejected})` },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setStatusFilter(tab.id);
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 rounded transition-colors cursor-pointer whitespace-nowrap ${
                      statusFilter === tab.id
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* 右侧搜索区 */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="请输入图号、物料编码或名称..."
                    value={searchQuery}
                    onChange={e => {
                      setSearchQuery(e.target.value);
                      setTableSearchInput(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-3 pr-7 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setTableSearchInput('');
                        setCurrentPage(1);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setTableSearchInput('');
                    setSelectedCategory('ALL');
                    setStatusFilter('ALL');
                    setCurrentPage(1);
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
                  onClick={handleOpenListCreateModal}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  新增
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (batchUploadFiles.length === 0) {
                      setBatchUploadFiles(getScenarioTestSamples());
                    }
                    setIsBatchUploadModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  批量导入图纸
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
                    <div className="absolute left-0 mt-1 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl py-1 z-30 text-xs animate-in fade-in zoom-in-95 duration-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsBatchMenuOpen(false);
                          if (batchUploadFiles.length === 0) {
                            setBatchUploadFiles(getScenarioTestSamples());
                          }
                          setIsBatchUploadModalOpen(true);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer font-medium"
                      >
                        <Upload className="w-3.5 h-3.5 text-blue-600" />
                        批量导入图纸 (CAD/STEP)
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsBatchMenuOpen(false);
                          const count = Object.values(selectedRowIds).filter(Boolean).length;
                          if (count === 0) {
                            showToast('请先勾选需要导出的图号！');
                          } else {
                            showToast(`已成功打包导出 ${count} 项图号的工程图纸包！`);
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
                          const count = Object.values(selectedRowIds).filter(Boolean).length;
                          if (count === 0) {
                            showToast('请先勾选需要提交审批的图号！');
                          } else {
                            showToast(`已成功提交 ${count} 项图号进入审签流！`);
                          }
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer"
                      >
                        <FileCheck2 className="w-3.5 h-3.5 text-slate-400" />
                        批量提交审批
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsBatchMenuOpen(false);
                          const selectedKeys = Object.keys(selectedRowIds).filter(id => selectedRowIds[id]);
                          if (selectedKeys.length === 0) {
                            showToast('请先勾选需要删除的图号！');
                          } else {
                            const firstMaster = drawingMasters.find(m => selectedKeys.includes(m.id));
                            if (firstMaster) {
                              setDeleteTarget({
                                type: 'drawing',
                                code: firstMaster.drawingNo,
                                title: firstMaster.materialName,
                              });
                            }
                          }
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2 cursor-pointer border-t border-slate-100 dark:border-slate-800"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        批量删除
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 右侧工具图标 */}
              <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-xs">
                <button
                  onClick={() => {
                    setDensity(prev => (prev === 'normal' ? 'compact' : prev === 'compact' ? 'relaxed' : 'normal'));
                  }}
                  className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  title={`行高设置 (当前: ${density === 'normal' ? '标准' : density === 'compact' ? '紧凑' : '宽松'})`}
                >
                  <AlignJustify className="w-3.5 h-3.5" />
                  <span>行高</span>
                </button>
                <button
                  onClick={() => alert('列显示配置已就绪')}
                  className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  title="自定义列显示设置"
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span>字段配置</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* 表格主体 */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
                <thead className="bg-slate-50/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 font-semibold sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800 shadow-xs">
                  <tr>
                    <th className="w-10 px-3 py-2 text-center border-r border-slate-200 dark:border-slate-800 sticky left-0 bg-slate-50 dark:bg-slate-800 z-30">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={el => {
                          if (el) el.indeterminate = isSomeSelected && !isAllSelected;
                        }}
                        onChange={handleSelectAll}
                        className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                      />
                    </th>
                    <th className="px-3 py-2 border-r border-slate-200 dark:border-slate-800 font-medium sticky left-10 bg-slate-50 dark:bg-slate-800 shadow-r z-30">图号</th>
                    <th className="px-3 py-2 border-r border-slate-200 dark:border-slate-800 font-medium">物料编码</th>
                    <th className="px-3 py-2 border-r border-slate-200 dark:border-slate-800 font-medium">物料名称</th>
                    <th className="px-3 py-2 border-r border-slate-200 dark:border-slate-800 font-medium">规格</th>
                    <th className="px-3 py-2 border-r border-slate-200 dark:border-slate-800 font-medium">物料分类</th>
                    {!isNoVersionMode && (
                      <th className="px-3 py-2 border-r border-slate-200 dark:border-slate-800 font-medium text-center">当前默认版本</th>
                    )}
                    <th className="px-3 py-2 border-r border-slate-200 dark:border-slate-800 font-medium text-center">图号状态</th>
                    {!isNoVersionMode ? (
                      <th className="px-3 py-2 border-r border-slate-200 dark:border-slate-800 font-medium text-center">版本总数</th>
                    ) : (
                      <th className="px-3 py-2 border-r border-slate-200 dark:border-slate-800 font-medium text-center">图纸文件数</th>
                    )}
                    <th className="px-3 py-2 font-medium text-center sticky right-0 bg-slate-50 dark:bg-slate-800 shadow-l z-30">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                  {filteredMasters.length > 0 ? (
                    filteredMasters.map(master => {
                      const defaultVer = master.versions.find(v => v.status === 'PUBLISHED' && v.isDefault) || master.versions.find(v => v.status === 'PUBLISHED' && v.isActive) || master.versions.find(v => v.status === 'PUBLISHED');
                      const pendingVer = master.versions.find(v => v.status === 'PENDING_REVIEW');
                      const draftVer = master.versions.find(v => v.status === 'DRAFT');
                      const rejectedVer = master.versions.find(v => v.status === 'REJECTED');
                      const activeVer = pendingVer || draftVer || rejectedVer || defaultVer || master.versions[0];
                      const masterStatus = activeVer ? activeVer.status : 'PUBLISHED';
                      const masterStatusBadge = getStatusBadge(masterStatus);
                      const isSelected = !!selectedRowIds[master.id];
                      const isMenuOpen = openActionMenuDrawingNo === master.drawingNo;

                      const pyClass = density === 'compact' ? 'py-1.5' : density === 'relaxed' ? 'py-3' : 'py-2';

                      const navigateToDetail = () => {
                        setSelectedMaterialId(master.materialId);
                        setViewMode('detail');
                        setDetailTab('versions');
                        if (master.versions.length > 0) {
                          const draft = master.versions.find(v => v.status === 'DRAFT');
                          const pub = master.versions.find(v => v.status === 'PUBLISHED' && v.isActive) || master.versions[0];
                          setExpandedVersionId(draft ? draft.id : pub.id);
                        }
                      };

                      return (
                        <tr
                          key={master.id}
                          className={`hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors ${
                            isSelected ? 'bg-blue-50/70 dark:bg-blue-950/40' : ''
                          } ${isMenuOpen ? 'relative z-30' : ''}`}
                        >
                          <td className={`px-3 ${pyClass} text-center border-r border-slate-100 dark:border-slate-800/40 sticky left-0 z-10 ${
                            isSelected ? 'bg-blue-50/70 dark:bg-blue-950/40' : 'bg-white dark:bg-slate-900'
                          }`}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectRow(master.id)}
                              className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                            />
                          </td>
                          <td className={`px-3 ${pyClass} border-r border-slate-100 dark:border-slate-800/40 font-mono font-bold text-blue-600 dark:text-blue-400 sticky left-10 shadow-r z-10 ${
                            isSelected ? 'bg-blue-50/70 dark:bg-blue-950/40' : 'bg-white dark:bg-slate-900'
                          }`}>
                            <button
                              type="button"
                              onClick={navigateToDetail}
                              className="hover:underline hover:text-blue-700 dark:hover:text-blue-300 transition-colors font-mono font-bold cursor-pointer text-left inline-block"
                              title="点击查看图号版本详情与文件"
                            >
                              {master.drawingNo}
                            </button>
                          </td>
                          <td className={`px-3 ${pyClass} border-r border-slate-100 dark:border-slate-800/40 font-mono text-slate-600 dark:text-slate-300`}>
                            {master.materialCode}
                          </td>
                          <td className={`px-3 ${pyClass} border-r border-slate-100 dark:border-slate-800/40 font-medium text-slate-900 dark:text-slate-100`}>
                            {master.materialName}
                          </td>
                          <td className={`px-3 ${pyClass} border-r border-slate-100 dark:border-slate-800/40 text-slate-500`}>
                            {master.materialSpec || '-'}
                          </td>
                          <td className={`px-3 ${pyClass} border-r border-slate-100 dark:border-slate-800/40`}>
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded text-[11px]">
                              {master.category || '未分类'}
                            </span>
                          </td>
                          {!isNoVersionMode && (
                            <td className={`px-3 ${pyClass} border-r border-slate-100 dark:border-slate-800/40 text-center`}>
                              {defaultVer ? (
                                <span className="font-mono font-bold px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 rounded text-[11px] inline-flex items-center gap-1">
                                  <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                  {defaultVer.versionNo}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-mono text-[11px]">-</span>
                              )}
                            </td>
                          )}
                          <td className={`px-3 ${pyClass} border-r border-slate-100 dark:border-slate-800/40 text-center`}>
                            <span className={`px-2 py-0.5 text-[11px] font-semibold rounded border ${masterStatusBadge.className}`}>
                              {masterStatusBadge.label}
                            </span>
                          </td>
                          {!isNoVersionMode ? (
                            <td className={`px-3 ${pyClass} border-r border-slate-100 dark:border-slate-800/40 text-center font-mono text-slate-500`}>
                              {master.versions.length}
                            </td>
                          ) : (
                            <td className={`px-3 ${pyClass} border-r border-slate-100 dark:border-slate-800/40 text-center font-mono text-slate-600 dark:text-slate-300`}>
                              {master.versions[0]?.files?.length || 0} 个文件
                            </td>
                          )}
                          <td
                            className={`px-3 ${pyClass} text-center sticky right-0 shadow-l ${
                              isSelected ? 'bg-blue-50/70 dark:bg-blue-950/40' : 'bg-white dark:bg-slate-900'
                            } ${isMenuOpen ? 'z-40' : 'z-10'}`}
                            onClick={e => e.stopPropagation()}
                          >
                            <div className="relative inline-block text-left">
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  setOpenActionMenuDrawingNo(prev => prev === master.drawingNo ? null : master.drawingNo);
                                }}
                                className={`p-1 rounded transition-colors cursor-pointer ${
                                  isMenuOpen
                                    ? 'bg-blue-50 dark:bg-slate-800 text-blue-600'
                                    : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-slate-800'
                                }`}
                                title="操作"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {/* 弹出气泡菜单 (严格按状态呈现操作选项) */}
                              {isMenuOpen && (
                                <div
                                  className="absolute right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 shadow-xl rounded-xl py-1 px-1 min-w-[100px] flex flex-col items-stretch animate-in fade-in zoom-in-95 duration-100"
                                  onClick={e => e.stopPropagation()}
                                >
                                  {/* 顶部小三角气泡指针 */}
                                  <div className="absolute -top-1.5 right-2.5 w-3 h-3 bg-white dark:bg-slate-900 border-t border-l border-slate-200/90 dark:border-slate-700 rotate-45 pointer-events-none" />

                                  {/* 1. 已发布状态: 仅已发布的图号出现反审批 */}
                                  {masterStatus === 'PUBLISHED' ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionMenuDrawingNo(null);
                                        handleOpenReverseApprovalModal(master);
                                      }}
                                      className="px-3 py-1.5 text-[13px] font-normal text-amber-600 dark:text-amber-400 hover:bg-amber-50/70 dark:hover:bg-slate-800 rounded text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                      反审批
                                    </button>
                                  ) : (masterStatus === 'DRAFT' || masterStatus === 'REJECTED') ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenActionMenuDrawingNo(null);
                                          navigateToDetail();
                                        }}
                                        className="px-3 py-1.5 text-[13px] font-normal text-blue-600 dark:text-blue-400 hover:bg-blue-50/70 dark:hover:bg-slate-800 rounded text-center transition-colors cursor-pointer"
                                      >
                                        编辑
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenActionMenuDrawingNo(null);
                                          setDeleteTarget({
                                            type: 'drawing',
                                            id: master.id,
                                            code: master.drawingNo,
                                            title: master.materialName,
                                          });
                                        }}
                                        className="px-3 py-1.5 text-[13px] font-normal text-rose-500 dark:text-rose-400 hover:bg-rose-50/70 dark:hover:bg-slate-800 rounded text-center transition-colors cursor-pointer"
                                      >
                                        删除
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenActionMenuDrawingNo(null);
                                          if (activeVer) {
                                            onUpdateVersionStatus(master.drawingNo, activeVer.id, 'PENDING_REVIEW');
                                            showToast(`图号 [${master.drawingNo}] 版本 [${activeVer.versionNo}] 已提交审批！状态变更为【待审批】。`);
                                          }
                                        }}
                                        className="px-3 py-1.5 text-[13px] font-normal text-amber-500 dark:text-amber-400 hover:bg-amber-50/70 dark:hover:bg-slate-800 rounded text-center transition-colors cursor-pointer whitespace-nowrap"
                                      >
                                        提交审批
                                      </button>
                                    </>
                                  ) : masterStatus === 'PENDING_REVIEW' ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionMenuDrawingNo(null);
                                        if (activeVer) {
                                          onUpdateVersionStatus(master.drawingNo, activeVer.id, 'DRAFT');
                                          showToast(`已撤回审批！图号 [${master.drawingNo}] 版本 [${activeVer.versionNo}] 状态恢复为【草稿】。`);
                                        }
                                      }}
                                      className="px-3 py-1.5 text-[13px] font-normal text-amber-500 dark:text-amber-400 hover:bg-amber-50/70 dark:hover:bg-slate-800 rounded text-center transition-colors cursor-pointer whitespace-nowrap"
                                    >
                                      撤回审批
                                    </button>
                                  ) : null}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={10} className="px-4 py-16 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Search className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                          <p>暂无符合条件的图号记录</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 底栏分页控制条 */}
            <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-900/60 shrink-0">
              <div>
                已选择 <span className="font-semibold text-blue-600 dark:text-blue-400">{Object.values(selectedRowIds).filter(Boolean).length}</span> 项 / 共 {filteredMasters.length} 条记录
              </div>
              <div className="flex items-center gap-2">
                <span>每页行数:</span>
                <select
                  value={pageSize}
                  onChange={e => setPageSize(Number(e.target.value))}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded disabled:opacity-40 cursor-pointer"
                  >
                    上一页
                  </button>
                  <span className="px-2">{currentPage} / {Math.ceil(filteredMasters.length / pageSize) || 1}</span>
                  <button
                    disabled={currentPage >= Math.ceil(filteredMasters.length / pageSize)}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded disabled:opacity-40 cursor-pointer"
                  >
                    下一页
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 新增图号模态框 (模仿 BOM 管理新增弹窗) */}
        {isListCreateModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scaleIn flex flex-col">
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-slate-800 dark:text-white text-base">
                    新增图号主档
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsListCreateModalOpen(false)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5 text-xs">
                {/* 模块分组标题: ▍ 基础信息 */}
                <div>
                  <div className="flex items-center gap-2 mb-3.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="w-1 h-3.5 bg-blue-600 rounded-full" />
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">基础信息</h4>
                  </div>

                  {/* 表单两栏网格布局 */}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    {/* 第 1 行: 图号 | 物料信息 */}
                    <div>
                      <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        <span className="text-red-500 mr-0.5">*</span>图号
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          required
                          value={listCreateDrawingNo}
                          onChange={e => setListCreateDrawingNo(e.target.value)}
                          placeholder="例如: DRW202609090001"
                          className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setListCreateDrawingNo(generateNewDrawingCode())}
                          title="重新生成图号"
                          className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        <span className="text-red-500 mr-0.5">*</span>物料信息
                      </label>
                      <select
                        value={listCreateMaterialId}
                        onChange={e => setListCreateMaterialId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">请选择物料信息</option>
                        {materials.map(m => (
                          <option key={m.id} value={m.id}>
                            [{m.materialCode}] {m.materialName} ({m.materialSpec})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 第 2 行: 物料分类 | 规格 */}
                    <div>
                      <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">物料分类</label>
                      <input
                        type="text"
                        readOnly
                        value={selectedListCreateMaterial?.category || ''}
                        placeholder="选择物料信息后带出"
                        className="w-full px-3 py-2 bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-750 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">规格</label>
                      <input
                        type="text"
                        readOnly
                        value={selectedListCreateMaterial?.materialSpec || ''}
                        placeholder="选择物料信息后带出"
                        className="w-full px-3 py-2 bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-750 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 font-mono"
                      />
                    </div>

                    {/* 第 3 行: 单位 | 图号版本 */}
                    <div className={isNoVersionMode ? "col-span-2" : ""}>
                      <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">单位</label>
                      <input
                        type="text"
                        readOnly
                        value={selectedListCreateMaterial?.unit || ''}
                        placeholder="选择物料信息后带出"
                        className="w-full px-3 py-2 bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-750 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400"
                      />
                    </div>

                    {!isNoVersionMode && (
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">图号版本</label>
                        <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800/80">
                          <button
                            type="button"
                            onClick={() => setListCreateVersionNo(v => Math.max(1, parseInt(v || '1', 10) - 1).toString())}
                            className="px-3.5 py-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold transition-colors cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="text"
                            value={listCreateVersionNo}
                            onChange={e => setListCreateVersionNo(e.target.value)}
                            className="w-full text-center py-2 bg-transparent text-slate-800 dark:text-slate-200 font-mono font-bold focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setListCreateVersionNo(v => (parseInt(v || '1', 10) + 1).toString())}
                            className="px-3.5 py-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold transition-colors cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 第 4 行: 备注 (占满整行) */}
                    <div className="col-span-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block font-medium text-slate-700 dark:text-slate-300">备注</label>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {(listCreateNotes || '').length} / 255
                        </span>
                      </div>
                      <textarea
                        rows={2}
                        maxLength={255}
                        value={listCreateNotes}
                        onChange={e => setListCreateNotes(e.target.value)}
                        placeholder="请输入备注"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 底部按钮栏 */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsListCreateModalOpen(false);
                      setListCreateMaterialId('');
                      setListCreateDrawingNo('');
                      setListCreateNotes('');
                    }}
                    className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (listCreateMaterialId && listCreateDrawingNo.trim() && onCreateDrawingMaster) {
                        onCreateDrawingMaster(listCreateMaterialId, listCreateDrawingNo.trim(), listCreateNotes.trim());
                        setIsListCreateModalOpen(false);
                        const createdNo = listCreateDrawingNo.trim();
                        setListCreateMaterialId('');
                        setListCreateDrawingNo('');
                        setListCreateNotes('');
                        showToast(`已成功新建图号主档 [${createdNo}]！`);
                      }
                    }}
                    disabled={!listCreateMaterialId || !listCreateDrawingNo.trim()}
                    className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    保存并进入图号详情
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SolidWorks 插件一键协同导入模态框 (与 BOM 管理协同) */}
        {isSolidWorksImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                    <FileUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      SolidWorks CAD 插件一键协同导入
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      一键解析三维装配体模型、自动提取工程图纸、建档物料并生成 BOM 与版本
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsSolidWorksImportModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    选择 SolidWorks 客户端装配体模型模板
                  </label>
                  <div className="grid grid-cols-1 gap-2.5">
                    <div
                      onClick={() => setImportModelPreset('laser_feeder')}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                        importModelPreset === 'laser_feeder'
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-950 dark:text-blue-100 ring-1 ring-blue-500'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-900 dark:text-white">
                          激光料斗送板三维装配总成 (Laser_Feeder_Assembly_2026.sldasm)
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-mono">
                          .sldasm / .slddrw
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        规格: SW-2026-X800 PRO | 包含 3D 装配模型、工程图纸及对应草稿物料
                      </p>
                    </div>

                    <div
                      onClick={() => setImportModelPreset('robot_gripper')}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                        importModelPreset === 'robot_gripper'
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-950 dark:text-blue-100 ring-1 ring-blue-500'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-900 dark:text-white">
                          六轴机械手自适应气动夹爪组件 (Adaptive_Robotic_Gripper.sldasm)
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-mono">
                          .sldasm / .pdf
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        规格: GRP-AIR-120N | 气动传动与抓手结构设计
                      </p>
                    </div>

                    <div
                      onClick={() => setImportModelPreset('servo_axis')}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                        importModelPreset === 'servo_axis'
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-950 dark:text-blue-100 ring-1 ring-blue-500'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-900 dark:text-white">
                          高精伺服滑台模组传动单元 (Precision_Servo_Slide_Axis.sldasm)
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-mono">
                          .sldasm / .stp
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        规格: SVO-AXIS-L1200 | 标准机械传动精密模组
                      </p>
                    </div>
                  </div>
                </div>

                {importProgress !== null && (
                  <div className="space-y-1.5 bg-slate-50 dark:bg-slate-800/80 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-300 font-medium">
                        {importProgress < 40 ? '正在连接 SolidWorks 插件并提取特征树...' : importProgress < 80 ? '正在解析工程图纸与关联物料...' : '正在自动建档图号主档与草稿版本...'}
                      </span>
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{importProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                        style={{ width: `${importProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setIsSolidWorksImportModalOpen(false)}
                  disabled={importProgress !== null}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  onClick={handleExecuteSolidWorksImport}
                  disabled={importProgress !== null}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileUp className="w-4 h-4" />
                  {importProgress !== null ? '正在协同导入...' : '开始一键导入'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 渲染通用模态框与轻量通知 */}
        {renderDeleteModal()}
        {renderReverseApprovalModal()}
        {renderBatchUploadModal()}
        {previewFile && (
          <DrawingPreviewModal 
            file={previewFile.file} 
            version={previewFile.version}
            materialName={previewFile.materialName}
            materialSpec={previewFile.materialSpec}
            onClose={() => setPreviewFile(null)} 
          />
        )}
        {renderToast()}
      </div>
    );
  }

  // 2. 图号详情页
  return (
    <div className="flex flex-col h-full bg-[#f4f7fc] dark:bg-slate-950 p-3 sm:p-4 gap-3 overflow-hidden font-sans text-slate-800 dark:text-slate-100">
      {/* 顶部面包屑与页头 */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-4 py-2 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-xs shrink-0">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 dark:text-slate-500">研发管理</span>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <button
            type="button"
            onClick={() => !fixedMaterialId && setViewMode('list')}
            className="text-slate-600 dark:text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
          >
            图号详情
          </button>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            {currentMaster?.drawingNo || newDrawingNo || '新建图号'} 详情
          </span>
        </div>
        {!fixedMaterialId && (
          <button
            onClick={() => setViewMode('list')}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs font-medium transition-colors flex items-center justify-center cursor-pointer"
            title="返回列表"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 详情内容滚动区 */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-0.5 min-h-0">
      {/* 顶部信息栏：冻结置顶 */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap text-sm">
            {!fixedMaterialId && (
              <button
                onClick={() => setViewMode('list')}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                title="返回列表"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">图号:</span>
              {isEditingDrawingNo ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={editingDrawingNo}
                    onChange={(e) => setEditingDrawingNo(e.target.value)}
                    className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-blue-400 dark:border-blue-600 rounded text-sm text-slate-900 dark:text-slate-100 font-mono w-36 focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (editingDrawingNo.trim() && currentMaster && onUpdateDrawingNo) {
                          onUpdateDrawingNo(currentMaster.drawingNo, editingDrawingNo.trim());
                        }
                        setIsEditingDrawingNo(false);
                      }
                      if (e.key === 'Escape') {
                        setIsEditingDrawingNo(false);
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (editingDrawingNo.trim() && currentMaster && onUpdateDrawingNo) {
                        onUpdateDrawingNo(currentMaster.drawingNo, editingDrawingNo.trim());
                      }
                      setIsEditingDrawingNo(false);
                    }}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-blue-600 dark:text-blue-400 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsEditingDrawingNo(false)}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 group">
                  <span className="font-mono font-extrabold text-base text-slate-900 dark:text-slate-100 tracking-tight">
                    {currentMaster?.drawingNo || '未关联图号'}
                  </span>
                  {currentMaster && selectedVersion && (selectedVersion.status === 'DRAFT' || selectedVersion.status === 'REJECTED') && (
                    <button
                      onClick={() => {
                        setEditingDrawingNo(currentMaster.drawingNo);
                        setIsEditingDrawingNo(true);
                      }}
                      className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                      title="修改图号"
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>

            {/* 最上方版本切换与状态联动展示 */}
            {currentMaster && currentMaster.versions.length > 0 && (
              <div className="flex items-center gap-2 shrink-0">
                {!isNoVersionMode ? (
                  <>
                    <GitBranch className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">图号版本:</span>
                    <select
                      value={selectedVersion?.id || ''}
                      onChange={e => setExpandedVersionId(e.target.value)}
                      className="font-mono font-bold text-xs text-blue-700 dark:text-blue-300 bg-transparent border-0 cursor-pointer p-0 focus:outline-none"
                    >
                      {currentMaster.versions.map(ver => {
                        const b = getStatusBadge(ver.status);
                        return (
                          <option key={ver.id} value={ver.id}>
                            {ver.versionNo} · {b.label}
                          </option>
                        );
                      })}
                    </select>
                    
                    {/* 仅在已发布且为默认版本时展示【默认版本】标签 */}
                    {selectedVersion?.status === 'PUBLISHED' && selectedVersion.isDefault && (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold rounded shrink-0">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        默认版本
                      </span>
                    )}

                    {/* 切换到非默认的已发布图号版本，已发布右边显示【设置为默认版本】按钮 */}
                    {selectedVersion?.status === 'PUBLISHED' && !selectedVersion.isDefault && (
                      <button
                        type="button"
                        onClick={() => {
                          if (onSetDefaultVersion && currentMaster) {
                            const currentDefaultVer = currentMaster.versions.find(
                              v => v.isDefault || v.id === currentMaster.currentPublishedVersion
                            );
                            const defaultVerNo = currentDefaultVer ? currentDefaultVer.versionNo : '无';
                            const confirmed = window.confirm(
                              `当前默认版本是【${defaultVerNo}】，是否确定切换为【${selectedVersion.versionNo}】？`
                            );
                            if (confirmed) {
                              onSetDefaultVersion(currentMaster.drawingNo, selectedVersion.id);
                              showToast(`已将图号 [${currentMaster.drawingNo}] 的默认版本切换为 [${selectedVersion.versionNo}]！`);
                            }
                          }
                        }}
                        className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-bold rounded cursor-pointer transition-colors shrink-0 shadow-2xs"
                        title="点击设置为当前默认图纸版本"
                      >
                        <Star className="w-3 h-3 text-amber-500" />
                        设置为默认版本
                      </button>
                    )}

                    {/* 把历史版本数展示在图纸版本后面 */}
                    <div className="flex items-center gap-1 pl-2 border-l border-slate-200 dark:border-slate-700 shrink-0 text-xs font-normal text-slate-500 dark:text-slate-400">
                      <FolderArchive className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>历史版本数: <span className="font-semibold text-slate-700 dark:text-slate-200">{currentMaster?.versions.length || 0} 个</span></span>
                    </div>
                  </>
                ) : null}

                {/* 展示创建人和更新时间 */}
                {selectedVersion && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-normal pl-2 border-l border-slate-200 dark:border-slate-700 shrink-0">
                    <span>创建人: <strong className="text-slate-700 dark:text-slate-200 font-medium">{selectedVersion.createdBy || '系统'}</strong></span>
                    <span className="text-slate-300 dark:text-slate-600">·</span>
                    <span>更新时间: <strong className="text-slate-700 dark:text-slate-200 font-medium">{selectedVersion.updatedAt || selectedVersion.createdAt?.slice(0, 10) || '-'}</strong></span>
                  </div>
                )}
              </div>
            )}

            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 hidden lg:block mx-1"></div>

            <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Box className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>物料信息: <strong className="text-slate-800 dark:text-slate-100">{currentMaterial?.materialCode} - {currentMaterial?.materialName}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>备注: </span>
                {isEditingNotes && selectedVersion && (selectedVersion.status === 'DRAFT' || selectedVersion.status === 'REJECTED') ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={editingNotesText}
                      onChange={e => setEditingNotesText(e.target.value)}
                      placeholder="请输入备注..."
                      className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 w-44 font-normal"
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          if (currentMaster && selectedVersion && onUpdateVersionInfo) {
                            onUpdateVersionInfo(currentMaster.drawingNo, selectedVersion.id, {
                              notes: editingNotesText.trim(),
                            });
                            showToast('图号草稿备注已更新！');
                          }
                          setIsEditingNotes(false);
                        } else if (e.key === 'Escape') {
                          setIsEditingNotes(false);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (currentMaster && selectedVersion && onUpdateVersionInfo) {
                          onUpdateVersionInfo(currentMaster.drawingNo, selectedVersion.id, {
                            notes: editingNotesText.trim(),
                          });
                          showToast('图号草稿备注已更新！');
                        }
                        setIsEditingNotes(false);
                      }}
                      className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs cursor-pointer font-medium"
                    >
                      保存
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingNotes(false)}
                      className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-xs cursor-pointer"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <strong className="text-slate-800 dark:text-slate-100">{selectedVersion?.notes || '无'}</strong>
                    {selectedVersion && (selectedVersion.status === 'DRAFT' || selectedVersion.status === 'REJECTED') && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingNotesText(selectedVersion.notes || '');
                          setIsEditingNotes(true);
                        }}
                        className="ml-0.5 p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                        title="编辑草稿备注"
                      >
                        <FileEdit className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>
          {/* 操作按钮展示在最上方图纸版本右侧 */}
          <div className="flex items-center shrink-0">
            {currentMaster && (
              <div className="flex items-center gap-2 flex-wrap">
                {selectedVersion && (
                  <>
                    {/* 1. 草稿 / 驳回：严格仅展示【编辑】、【删除】、【提交审批】 */}
                    {(selectedVersion.status === 'DRAFT' || selectedVersion.status === 'REJECTED') && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingNotes(true);
                            setEditingNotesText(selectedVersion.notes || '');
                          }}
                          className="px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer flex items-center gap-1"
                          title="编辑草稿"
                        >
                          <FileEdit className="w-3.5 h-3.5" />
                          编辑
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteTarget({
                              type: 'version',
                              id: selectedVersion.id,
                              code: currentMaster.drawingNo,
                              title: currentMaterial?.materialName || currentMaster.materialName,
                              versionNo: selectedVersion.versionNo,
                            });
                          }}
                          className="px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          删除
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateVersionStatus(currentMaster.drawingNo, selectedVersion.id, 'PENDING_REVIEW');
                            showToast(`图号 [${currentMaster.drawingNo}] 版本 [${selectedVersion.versionNo}] 已提交审批！单据状态变更为【待审批】。`);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Send className="w-3.5 h-3.5" />
                          提交审批
                        </button>
                      </>
                    )}

                    {/* 2. 待审批：展示【撤回审批】(并支持审核人快速处理) */}
                    {selectedVersion.status === 'PENDING_REVIEW' && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateVersionStatus(currentMaster.drawingNo, selectedVersion.id, 'DRAFT');
                            showToast(`已撤回审批！图号 [${currentMaster.drawingNo}] 版本 [${selectedVersion.versionNo}] 状态恢复为【草稿】。`);
                          }}
                          className="px-2.5 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 rounded-lg border border-amber-300 dark:border-amber-700 transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          撤回审批
                        </button>
                        <div className="flex items-center gap-1 pl-1 border-l border-slate-200 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateVersionStatus(currentMaster.drawingNo, selectedVersion.id, 'PUBLISHED', {
                                reviewer: '工程主管',
                                reviewTime: new Date().toLocaleString(),
                                publisher: '当前登录用户',
                                publishTime: new Date().toLocaleString()
                              });
                              showToast(`审批通过！图号 [${currentMaster.drawingNo}] 版本 [${selectedVersion.versionNo}] 状态已变更为【已发布】。`);
                            }}
                            className="px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg border border-emerald-300 dark:border-emerald-700 transition-colors cursor-pointer flex items-center gap-1"
                            title="通过审批并发布"
                          >
                            <Check className="w-3.5 h-3.5" />
                            通过
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const reason = prompt('请输入驳回修改原因（选填）:', '图纸标注尺寸与技术要求不一致，需修正');
                              onUpdateVersionStatus(currentMaster.drawingNo, selectedVersion.id, 'REJECTED', {
                                notes: reason || '审批驳回修改',
                                reviewer: '工程主管',
                                reviewTime: new Date().toLocaleString(),
                              });
                              showToast(`已驳回！图号 [${currentMaster.drawingNo}] 版本 [${selectedVersion.versionNo}] 状态已变更为【驳回】。`);
                            }}
                            className="px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 rounded-lg border border-rose-300 dark:border-rose-700 transition-colors cursor-pointer flex items-center gap-1"
                            title="驳回审批"
                          >
                            <X className="w-3.5 h-3.5" />
                            驳回
                          </button>
                        </div>
                      </>
                    )}
                    {/* 3. 已发布状态：展示【反审批】(仅在已发布状态才会出现) */}
                    {selectedVersion.status === 'PUBLISHED' && (
                      <button
                        type="button"
                        onClick={() => handleOpenReverseApprovalModal(currentMaster, selectedVersion)}
                        className="px-2.5 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 rounded-lg border border-amber-300 dark:border-amber-700 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                        title="对已发布的图号执行反审批，回退至草稿状态重新编辑"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        反审批
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 详情四大核心板块导航 */}
      {!currentMaster ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center text-center shadow-xs">
          <FolderArchive className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">未关联工程图号</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-md">
            当前物料 <strong>{currentMaterial?.materialCode}</strong> 尚未关联任何工程图纸档案。<br/>
            创建工程图号后，您可对该物料的图纸版本进行全生命周期管理。
          </p>
          
          {isCreatingDrawing ? (
            <div className="flex items-center gap-2">
              <input 
                type="text"
                autoFocus
                value={newDrawingNo}
                onChange={e => setNewDrawingNo(e.target.value)}
                placeholder="请输入新图号，如 DRW-001"
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={e => {
                  if (e.key === 'Enter' && newDrawingNo.trim() && onCreateDrawingMaster && currentMaterial) {
                    onCreateDrawingMaster(currentMaterial.id, newDrawingNo.trim());
                    setIsCreatingDrawing(false);
                    setNewDrawingNo('');
                  }
                  if (e.key === 'Escape') {
                    setIsCreatingDrawing(false);
                    setNewDrawingNo('');
                  }
                }}
              />
              <button 
                onClick={() => {
                  if (newDrawingNo.trim() && onCreateDrawingMaster && currentMaterial) {
                    onCreateDrawingMaster(currentMaterial.id, newDrawingNo.trim());
                    setIsCreatingDrawing(false);
                    setNewDrawingNo('');
                  }
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
              >
                确认创建
              </button>
              <button 
                onClick={() => {
                  setIsCreatingDrawing(false);
                  setNewDrawingNo('');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
              >
                取消
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsCreatingDrawing(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              新增工程图号主档
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 flex items-center gap-2 shadow-xs">
        <button
          onClick={() => setDetailTab('versions')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
            detailTab === 'versions'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>图纸信息</span>
        </button>

        <button
          onClick={() => setDetailTab('info')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
            detailTab === 'info'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Info className="w-4 h-4" />
          <span>基础信息</span>
        </button>

        <button
          onClick={() => setDetailTab('usage')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
            detailTab === 'usage'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>使用记录</span>
        </button>

        <button
          onClick={() => setDetailTab('history')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
            detailTab === 'history'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>操作日志</span>
        </button>
      </div>

      {/* 板块 1: 图纸信息 (直接展示图纸文件清单与上传，无需子页签) */}
      {detailTab === 'versions' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          {!selectedVersion ? (
            <div className="p-8 text-center text-slate-400">
              当前图号暂无图纸数据。
            </div>
          ) : (() => {
            const ver = selectedVersion;
            const isDraft = ver.status === 'DRAFT';
            const isRejected = ver.status === 'REJECTED';

            return (
              <div className="p-4 space-y-4">
                {/* 顶部操作：支持上传图纸 */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      图纸文件清单 ({ver.files?.length || 0} 份)
                    </span>
                  </div>
                  {/* 仅在处于草稿或驳回可编辑状态时，提供上传图纸按钮 */}
                  {(isDraft || isRejected) && (
                    <button
                      type="button"
                      onClick={() => handleOpenUploadModal(ver)}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>上传图纸</span>
                    </button>
                  )}
                </div>

                {/* 图纸文件表格 */}
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                      <tr>
                        <th className="px-3 py-2.5 text-center w-10">#</th>
                        <th className="px-3 py-2.5 w-32">文件格式</th>
                        <th className="px-3 py-2.5">文件名</th>
                        <th className="px-3 py-2.5">大小</th>
                        <th className="px-3 py-2.5">上传时间</th>
                        <th className="px-3 py-2.5 text-center">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {ver.files && ver.files.length > 0 ? (
                        ver.files.map((file, idx) => (
                          <tr key={file.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-3 py-2.5 text-center text-slate-400">{idx + 1}</td>
                            <td className="px-3 py-2.5">
                              <span className={`px-2 py-0.5 rounded font-mono font-bold ${getFileTypeBadge(file.fileType).color}`}>
                                {file.fileType}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 font-medium text-slate-800 dark:text-slate-200">{file.fileName}</td>
                            <td className="px-3 py-2.5 font-mono text-slate-500">{formatFileSize(file.fileSize)}</td>
                            <td className="px-3 py-2.5 font-mono text-slate-500">{file.uploadTime}</td>
                            <td className="px-3 py-2.5 text-center">
                              <div className="flex items-center justify-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => setPreviewFile({ file, version: ver })}
                                  className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                                >
                                  预览
                                </button>
                                <button
                                  type="button"
                                  onClick={() => alert(`正在下载图纸文件: ${file.fileName}`)}
                                  className="text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium cursor-pointer"
                                >
                                  下载
                                </button>
                                {(isDraft || isRejected) && onDeleteFileFromVersion && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (onDeleteFileFromVersion && currentMaster) {
                                        onDeleteFileFromVersion(
                                          currentMaster.drawingNo,
                                          ver.id,
                                          file.id,
                                          file.fileName,
                                          file.fileType
                                        );
                                        showToast(`已整条删除图纸文件 [${file.fileName}]！`);
                                      }
                                    }}
                                    className="text-rose-600 hover:text-rose-700 font-medium cursor-pointer"
                                  >
                                    删除
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-3 py-8 text-center text-slate-400 italic">
                            暂无图纸文件，请点击上方“上传图纸”添加工程图纸。
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* 板块 2: 基础信息 */}
      {detailTab === 'info' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <span className="text-xs font-semibold text-slate-500 block mb-1">工程图号</span>
              <span className="font-mono font-bold text-base text-blue-600 dark:text-blue-400">{currentMaster?.drawingNo}</span>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <span className="text-xs font-semibold text-slate-500 block mb-1">物料编码</span>
              <span className="font-mono font-bold text-base text-slate-800 dark:text-slate-100">{currentMaterial?.materialCode}</span>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <span className="text-xs font-semibold text-slate-500 block mb-1">物料名称</span>
              <span className="font-medium text-base text-slate-800 dark:text-slate-100">{currentMaterial?.materialName}</span>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <span className="text-xs font-semibold text-slate-500 block mb-1">规格</span>
              <span className="text-sm text-slate-800 dark:text-slate-200">{currentMaterial?.materialSpec || '未填写'}</span>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <span className="text-xs font-semibold text-slate-500 block mb-1">物料分类</span>
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{currentMaterial?.category || '结构件'}</span>
            </div>

            {!isNoVersionMode && (
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                <span className="text-xs font-semibold text-slate-500 block mb-1">当前默认版本</span>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-sm text-amber-600 dark:text-amber-400">
                    {currentMaster?.versions.find(v => v.status === 'PUBLISHED' && v.isDefault)?.versionNo || currentMaster?.versions.find(v => v.status === 'PUBLISHED')?.versionNo || '暂无发布版本'}
                  </span>
                  {currentMaster && currentMaster.versions.filter(v => v.status === 'PUBLISHED').length > 1 && (
                    <select
                      value={currentMaster.versions.find(v => v.status === 'PUBLISHED' && v.isDefault)?.id || (currentMaster.versions.filter(v => v.status === 'PUBLISHED')[0]?.id || '')}
                      onChange={e => {
                        if (onSetDefaultVersion && currentMaster && e.target.value) {
                          const target = currentMaster.versions.find(v => v.id === e.target.value);
                          onSetDefaultVersion(currentMaster.drawingNo, e.target.value);
                          showToast(`已将已发布版本 [${target?.versionNo || ''}] 设置为当前唯一默认版本！`);
                        }
                      }}
                      className="font-mono font-bold text-xs text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 rounded px-2 py-0.5 focus:outline-none cursor-pointer"
                    >
                      {currentMaster.versions.filter(v => v.status === 'PUBLISHED').map(pv => (
                        <option key={pv.id} value={pv.id}>
                          {pv.versionNo} {pv.isDefault ? '(当前默认)' : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            )}

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <span className="text-xs font-semibold text-slate-500 block mb-1">创建时间</span>
              <span className="text-xs font-mono text-slate-600 dark:text-slate-400">{currentMaster?.createdAt || '2026-03-01'}</span>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <span className="text-xs font-semibold text-slate-500 block mb-1">最后更新时间</span>
              <span className="text-xs font-mono text-slate-600 dark:text-slate-400">{currentMaster?.updatedAt || '实时'}</span>
            </div>

            {!isNoVersionMode && (
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                <span className="text-xs font-semibold text-slate-500 block mb-1">版本总计</span>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{currentMaster?.versions.length || 0} 个历史版本</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 板块 3: 使用记录 (BOM引用与销售订单合一展示) */}
      {detailTab === 'usage' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-2">销售订单-项次</th>
                    <th className="px-3 py-2">生产工单</th>
                    <th className="px-3 py-2">BOM 编码</th>
                    <th className="px-3 py-2">BOM 版本</th>
                    <th className="px-3 py-2">所属产品</th>
                    {!isNoVersionMode && <th className="px-3 py-2 text-center">锁定图纸版本</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {usageData.length > 0 ? (
                    usageData.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-3 py-2.5">
                          {item.orderNo ? (
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                              {item.orderNo}-10
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">通用备件 / 待绑定</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {item.workOrderNo ? (
                            <span className="font-mono font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs border border-slate-200 dark:border-slate-700">
                              {item.workOrderNo}
                            </span>
                          ) : (
                            <span className="text-slate-400">--</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {item.bomCode}
                        </td>
                        <td className="px-3 py-2.5 font-mono">{item.bomVersion}</td>
                        <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300 font-medium">{item.productName}</td>
                        {!isNoVersionMode && (
                          <td className="px-3 py-2.5 text-center">
                            <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded font-mono font-bold text-xs">
                              {item.referencedVersion}
                            </span>
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={isNoVersionMode ? 5 : 6} className="px-3 py-8 text-center text-slate-400 italic">
                        暂无 BOM 或销售订单引用此物料/图号
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 板块 4: 操作日志 */}
      {detailTab === 'history' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2.5">记录时间</th>
                  {!isNoVersionMode && <th className="px-3 py-2.5 text-center">相关版本</th>}
                  <th className="px-3 py-2.5">操作人</th>
                  <th className="px-3 py-2.5">动作类型</th>
                  <th className="px-3 py-2.5 w-full">详细说明</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {allHistoryLogs.length > 0 ? allHistoryLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-3 py-2.5 font-mono text-slate-500">{log.timestamp}</td>
                    {!isNoVersionMode && (
                      <td className="px-3 py-2.5 text-center">
                        <span className="font-mono font-bold px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                          {log.versionNo}
                        </span>
                      </td>
                    )}
                    <td className="px-3 py-2.5 font-medium">{log.operator}</td>
                    <td className="px-3 py-2.5 font-semibold text-slate-700 dark:text-slate-200">{log.action}</td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{log.details}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={isNoVersionMode ? 4 : 5} className="px-3 py-8 text-center text-slate-400 italic">暂无操作日志</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 批量上传图纸模态框 (针对当前草稿版本) */}
      {uploadModalVersion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 flex flex-col max-h-[88vh] overflow-hidden">
            {/* 模态框头部 */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-850">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    批量上传工程图纸
                    <span className="text-xs px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-mono font-semibold">
                      {uploadModalVersion.versionNo} 草稿
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    图号: <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{currentMaster?.drawingNo}</span>（物料: <span className="font-semibold text-blue-600 dark:text-blue-400">{currentMaster?.materialName}</span>）
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setUploadModalVersion(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 模态框主体内容 */}
            <form onSubmit={handleUploadFileSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {/* 命名规范提示横幅 */}
              <div className="p-3 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>图纸命名合规校验规则</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded font-mono">
                      严格匹配
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                    批量上传图纸文件名必须同时包含当前图号 <strong className="font-mono text-blue-700 dark:text-blue-300">「{currentMaster?.drawingNo}」</strong> 与物料名称 <strong className="text-blue-700 dark:text-blue-300">「{currentMaster?.materialName}」</strong>。系统会自动逐条进行语义校验，<strong>仅校验通过的合规图纸允许上传入库</strong>，未匹配项将明确提示原因并拦截。
                  </p>
                </div>
              </div>

              {/* 拖拽/点击上传区 */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOverUpload(true);
                }}
                onDragLeave={() => setIsDragOverUpload(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOverUpload(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleAddFilesToUploadModal(e.dataTransfer.files);
                  }
                }}
                className={`border-2 border-dashed rounded-xl p-4 text-center transition-all relative cursor-pointer ${
                  isDragOverUpload
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40'
                    : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 bg-slate-50/60 dark:bg-slate-800/40'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  multiple
                  onChange={handleFileInputChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="flex flex-col items-center justify-center pointer-events-none">
                  <div className="p-2 bg-blue-100/80 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full mb-1.5">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                    点击选择或将多张工程图纸拖拽至此处批量上传
                  </p>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    支持按住 <kbd className="px-1 py-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded font-mono">Ctrl</kbd> 或 <kbd className="px-1 py-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded font-mono">Shift</kbd> 一次性选择多张图纸（DWG / STEP / PDF / DXF / SLDPRT / SLDASM）
                  </p>
                </div>
              </div>

              {/* 快捷测试图纸与多场景用例工具栏 */}
              <div className="flex items-center justify-between flex-wrap gap-2 p-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl">
                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-semibold text-xs">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>快捷测试与场景模拟:</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* 用户特别要求的【测试多张图纸多种情况上传】按钮 */}
                  <button
                    type="button"
                    onClick={handleLoadTestScenarios}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                    title="一键注入 6 种测试场景：合规通过、缺物料名、错图号、无规范命名、不支持格式"
                  >
                    <FlaskConical className="w-3.5 h-3.5" />
                    测试多场景图纸上传 (合规/异常)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadPresetSuite('STANDARD_4')}
                    className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-750 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-medium rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  >
                    <Plus className="w-3 h-3" />
                    标准4件套 (DWG+STEP+PDF+DXF)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadPresetSuite('CAD_3D')}
                    className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-750 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-medium rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  >
                    <Plus className="w-3 h-3" />
                    3D SolidWorks套件
                  </button>
                </div>
              </div>

              {/* 待上传图纸列表及校验详情 */}
              <div>
                {(() => {
                  const base = currentMaster?.drawingNo || '';
                  const matName = currentMaster?.materialName || '';
                  const total = uploadModalFiles.length;
                  const validatedList = uploadModalFiles.map(f => ({
                    ...f,
                    validation: validateDrawingFileMatch(f.fileName, base, matName),
                  }));
                  const validCount = validatedList.filter(f => f.validation.isValid).length;
                  const invalidCount = total - validCount;

                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 text-xs">
                            <FileText className="w-4 h-4 text-blue-600" />
                            <span>待上传图纸清单 ({total} 份)</span>
                          </div>
                          {total > 0 && (
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                允许上传: {validCount}
                              </span>
                              {invalidCount > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-semibold flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  校验拦截: {invalidCount}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {total > 0 && (
                          <div className="flex items-center gap-2 text-[11px]">
                            {invalidCount > 0 && (
                              <>
                                <button
                                  type="button"
                                  onClick={handleAutoFixAllFileNames}
                                  className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium flex items-center gap-1 hover:underline cursor-pointer"
                                  title="批量将未匹配项按「图号+版本+物料名称」规范自动重命名"
                                >
                                  <Wand2 className="w-3 h-3" />
                                  一键修复规范命名
                                </button>
                                <span className="text-slate-300 dark:text-slate-700">|</span>
                                <button
                                  type="button"
                                  onClick={handleRemoveInvalidFiles}
                                  className="text-amber-600 hover:text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1 hover:underline cursor-pointer"
                                >
                                  清除未通过项
                                </button>
                                <span className="text-slate-300 dark:text-slate-700">|</span>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => setUploadModalFiles([])}
                              className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                            >
                              清空全部
                            </button>
                          </div>
                        )}
                      </div>

                      {total === 0 ? (
                        <div className="py-8 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                          <div>暂无待上传图纸</div>
                          <div className="text-[11px] text-slate-400">请通过上方拖拽、点击选择或点击快捷测试按钮添加图纸</div>
                        </div>
                      ) : (
                        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold">
                                <th className="py-2.5 px-2.5 w-8 text-center">#</th>
                                <th className="py-2.5 px-2 w-20">格式</th>
                                <th className="py-2.5 px-2.5">图纸文件名（支持修改实时校验）</th>
                                <th className="py-2.5 px-2 w-20">大小</th>
                                <th className="py-2.5 px-2.5 w-64">命名规范校验与匹配状态</th>
                                <th className="py-2.5 px-2 text-right w-16">操作</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                              {validatedList.map((item, idx) => {
                                const badge = getFileTypeBadge(item.fileType);
                                const isPassed = item.validation.isValid;
                                return (
                                  <tr 
                                    key={item.id} 
                                    className={`transition-colors ${
                                      isPassed 
                                        ? 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40' 
                                        : 'bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50/70 dark:hover:bg-rose-950/40'
                                    }`}
                                  >
                                    <td className="py-2.5 px-2.5 text-center text-slate-400 font-mono text-[11px]">
                                      {idx + 1}
                                    </td>
                                    <td className="py-2.5 px-2">
                                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${badge.color}`}>
                                        {item.fileType}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-2.5">
                                      <div className="space-y-1">
                                        <input
                                          type="text"
                                          value={item.fileName}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            const detected = detectFileTypeFromName(val);
                                            setUploadModalFiles(prev =>
                                              prev.map(f => f.id === item.id ? { ...f, fileName: val, fileType: (detected || f.fileType) as FileType } : f)
                                            );
                                          }}
                                          className={`w-full px-2 py-1 border rounded text-xs font-mono focus:outline-none focus:ring-1 ${
                                            isPassed
                                              ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-blue-500'
                                              : 'bg-white dark:bg-slate-850 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 focus:ring-rose-500'
                                          }`}
                                        />
                                        {item.testNote && (
                                          <div className="text-[10px] text-slate-400 font-sans">
                                            {item.testNote}
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-2 font-mono text-slate-500 text-[11px]">
                                      {formatFileSize(item.fileSize)}
                                    </td>
                                    <td className="py-2.5 px-2.5">
                                      {isPassed ? (
                                        <div className="space-y-0.5">
                                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                            <span>校验通过 (允许上传)</span>
                                          </div>
                                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-mono">
                                            <ShieldCheck className="w-3 h-3" />
                                            <span>图号 & 物料名匹配成功</span>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="space-y-1">
                                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800">
                                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                            <span>校验未通过 (禁止上传)</span>
                                          </div>
                                          <div className="p-1.5 bg-rose-100/70 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded text-[11px] text-rose-700 dark:text-rose-300 leading-tight font-medium">
                                            {item.validation.reason}
                                          </div>
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-2 text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        {!isPassed && (
                                          <button
                                            type="button"
                                            onClick={() => handleAutoFixSingleFileName(item.id)}
                                            className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded cursor-pointer transition-colors"
                                            title="按规范自动补全当前图纸名称"
                                          >
                                            <Wand2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => setUploadModalFiles(prev => prev.filter(f => f.id !== item.id))}
                                          className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 rounded cursor-pointer transition-colors"
                                          title="移除此图纸"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* 底部操作与统计栏 */}
              {(() => {
                const base = currentMaster?.drawingNo || '';
                const matName = currentMaster?.materialName || '';
                const total = uploadModalFiles.length;
                const validCount = uploadModalFiles.filter(f => validateDrawingFileMatch(f.fileName, base, matName).isValid).length;
                const invalidCount = total - validCount;

                return (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-xs text-slate-500">
                      待处理图纸: <strong className="text-slate-800 dark:text-slate-200 font-bold">{total}</strong> 份 | 
                      合规允许上传: <strong className="text-emerald-600 font-bold">{validCount}</strong> 份
                      {invalidCount > 0 && (
                        <> | 校验未通过拦截: <strong className="text-rose-600 font-bold">{invalidCount}</strong> 份</>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setUploadModalVersion(null)}
                        className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                      >
                        取消
                      </button>
                      <button
                        type="submit"
                        disabled={validCount === 0}
                        className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg shadow-2xs cursor-pointer flex items-center gap-1.5 transition-colors"
                        title={validCount === 0 ? '当前列表无通过命名规范的图纸，无法上传' : `确认上传 ${validCount} 份通过校验的图纸`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        确认上传合规图纸 ({validCount}/{total})
                      </button>
                    </div>
                  </div>
                );
              })()}
            </form>
          </div>
        </div>
      )}

      {/* 预览模态框 */}
      {previewFile && (
        <DrawingPreviewModal 
          file={previewFile.file} 
          version={previewFile.version}
          materialName={previewFile.materialName}
          materialSpec={previewFile.materialSpec}
          onClose={() => setPreviewFile(null)} 
        />
      )}

      {/* 图号主档与关联物料编辑模态框（无需选择版本，仅选择无图号物料） */}
      {isMasterEditModalOpen && currentMaster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileEdit className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    编辑物料信息
                  </h3>
                  <p className="text-xs text-slate-500">修改图号关联的物料主档</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMasterEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 max-h-[75vh] overflow-y-auto pr-1">
              {/* 当前工程图号展示 */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  工程图号
                </label>
                <div className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                  {currentMaster.drawingNo}
                </div>
              </div>

              {/* 关联物料选择（仅无图号物料及当前物料）与联动信息展示 */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  物料信息 (仅展示无图号物料) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={masterEditData.selectedMaterialId}
                  onChange={e => handleMaterialChangeInMasterEdit(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <option value="">请选择物料...</option>
                  {availableMaterialsForEdit.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.materialCode} - {m.materialName} ({m.materialSpec || '无规格'})
                    </option>
                  ))}
                </select>

                <div className="mt-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-700/80 text-[11px] grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
                  <div>物料编码: <strong className="text-slate-800 dark:text-slate-200 font-mono">{masterEditData.materialCode || '-'}</strong></div>
                  <div>物料名称: <strong className="text-slate-800 dark:text-slate-200">{masterEditData.materialName || '-'}</strong></div>
                  <div>规格型号: <span className="text-slate-700 dark:text-slate-300">{masterEditData.materialSpec || '-'}</span></div>
                  <div>分类 / 单位: <span className="text-slate-700 dark:text-slate-300">{masterEditData.category || '-'} / {masterEditData.unit || 'PCS'}</span></div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsMasterEditModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!masterEditData.selectedMaterialId) {
                    alert('请选择关联物料档案！');
                    return;
                  }
                  if (onUpdateDrawingMasterMaterial && masterEditData.selectedMaterialId !== currentMaster.materialId) {
                    onUpdateDrawingMasterMaterial(currentMaster.drawingNo, masterEditData.selectedMaterialId);
                    setSelectedMaterialId(masterEditData.selectedMaterialId);
                  }
                  setIsMasterEditModalOpen(false);
                  showToast(`图号 [${currentMaster.drawingNo}] 关联物料信息已成功保存！`);
                }}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm cursor-pointer"
              >
                保存变更
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 图纸文件编辑模态框（草稿/驳回状态） */}
      {isFileEditModalOpen && currentMaster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileEdit className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  编辑图纸文件
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFileEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  文件名 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingFileData.fileName}
                  onChange={e => setEditingFileData(prev => ({ ...prev, fileName: e.target.value }))}
                  placeholder="例如: 电机法兰外壳_V2.step"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                可修改文件显示名称与后缀，系统将自动关联该图纸格式。
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsFileEditModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!editingFileData.fileName.trim()) {
                    alert('文件名不能为空！');
                    return;
                  }
                  if (onUpdateFileInVersion) {
                    const ext = editingFileData.fileName.split('.').pop()?.toUpperCase() || 'FILE';
                    onUpdateFileInVersion(currentMaster.drawingNo, editingFileData.versionId, editingFileData.fileId, {
                      fileName: editingFileData.fileName.trim(),
                      fileType: ext as any,
                    });
                  }
                  setIsFileEditModalOpen(false);
                  showToast(`图纸文件 [${editingFileData.fileName.trim()}] 已成功更新！`);
                }}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm cursor-pointer"
              >
                保存文件
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 通用模态框与轻量通知 */}
      {renderDeleteModal()}
      {renderReverseApprovalModal()}
      {renderBatchUploadModal()}
      {renderToast()}
      </>
      )}
      </div>
    </div>
  );
};
