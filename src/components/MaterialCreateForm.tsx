import React, { useState, useMemo, useRef } from 'react';
import { Material, DrawingMaster, BOM, DrawingVersion, DrawingFile, FileType, VersionStatus } from '../types/plm';
import { getStatusBadge, getFileTypeBadge, formatFileSize, detectFileTypeFromName, validateDrawingFileMatch } from '../utils/plmHelpers';
import { DrawingPreviewModal } from './DrawingPreviewModal';
import {
  FileText,
  Package,
  Warehouse,
  Wrench,
  Layers,
  GitBranch,
  Upload,
  Plus,
  Trash2,
  Check,
  X,
  FileCheck,
  FolderArchive,
  QrCode,
  Image as ImageIcon,
  Sparkles,
  FlaskConical,
  Wand2,
  AlertTriangle,
  Info,
  ChevronRight,
  FileUp,
  FileSpreadsheet,
  Settings2,
  Edit3,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Star,
  Eye,
  Download,
  CopyPlus,
  Snowflake,
  Ban,
  FileEdit,
  Clock,
  User,
  History,
  Box,
  Pencil,
  Send,
  CheckCircle,
  RotateCw,
  Search,
  Lock,
  Unlock,
  MessageSquare,
  XCircle
} from 'lucide-react';

interface MaterialCreateFormProps {
  onClose: () => void;
  onDelete?: (id: string) => void;
  onSave: (
    material: Omit<Material, 'id' | 'createdAt' | 'updatedAt' | 'hasDrawing'>,
    drawingData?: {
      drawingNo: string;
      versionNo: string;
      status: 'PUBLISHED' | 'DRAFT';
      isActive: boolean;
      changeDesc?: string;
      files?: { fileName: string; fileType: string; fileSize: number }[];
    },
    isEdit?: boolean,
    existingId?: string
  ) => void;
  onNavigateToDrawingManagement?: (drawingNo?: string) => void;
  initialMaterial?: Material | null;
  drawingMasters?: DrawingMaster[];
  boms?: BOM[];
  isNoVersionMode?: boolean;
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

export const MaterialCreateForm: React.FC<MaterialCreateFormProps> = ({
  onClose,
  onDelete,
  onSave,
  onNavigateToDrawingManagement,
  initialMaterial = null,
  drawingMasters = [],
  boms = [],
  isNoVersionMode = false,
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
  const isEditMode = Boolean(initialMaterial);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 当前激活的步骤/页签 (1~6)
  const [activeStep, setActiveStep] = useState<number>(1);

  // 基础信息初始化
  const [formData, setFormData] = useState(() => {
    const isEdit = Boolean(initialMaterial);
    const m = initialMaterial;
    const master = drawingMasters.find(
      d =>
        (m?.drawingNo && d.drawingNo === m.drawingNo) ||
        d.materialId === m?.id ||
        d.materialCode === m?.materialCode
    );
    const activeVer = master?.versions?.find(v => v.isActive && v.status === 'PUBLISHED') || master?.versions?.[0];

    const initialFiles = activeVer?.files && activeVer.files.length > 0
      ? activeVer.files.map(f => ({ fileName: f.fileName, fileType: f.fileType, fileSize: f.fileSize }))
      : [
          { fileName: `${m?.materialName || '0.85M接驳台'}_装配总图.dwg`, fileType: 'DWG', fileSize: 4520000 },
          { fileName: `${m?.materialName || '0.85M接驳台'}_3D总成模型.step`, fileType: 'STEP', fileSize: 18200000 },
          { fileName: `${m?.materialName || '0.85M接驳台'}_出图图纸.pdf`, fileType: 'PDF', fileSize: 1890000 },
        ];

    return {
      // Step 1: 基础信息
      materialCode: m?.materialCode || '',
      materialName: m?.materialName || '',
      category: m?.category || '机械标准件',
      materialType: '自制半成品',
      bomVersion: '0',
      hasSn: false,
      batchManage: false,
      isActive: m ? m.status === 'ACTIVE' : true,
      safetyStock: false,
      isHighValue: false,

      // 业务规格与单位
      bizAttributes: {
        sales: false,
        purchase: true,
        selfMade: true,
        outsourced: false,
        consumable: false,
        accessories: false,
      },
      purchaseLeadTime: 7,
      selfLeadTime: 3,
      materialSpec: m?.materialSpec || '',
      unit: m?.unit || '台',
      auxUnit: '',
      model: '',
      processRoute: '标准五金加工路线',

      // Step 2: 包装材质参数
      packMethod: '标准纸箱防震包装',
      packQuantity: 10,
      packSeal: '热缩膜',
      shelfLifeDays: 365,
      unitUsage: 1,
      lossRate: 0.5,
      brand: '自主品牌',
      materialQuality: 'AL6061-T6',
      materialQualityType: '铝合金',
      techParams: '阳极氧化黑色，耐盐雾48H',
      sizeSpec: '850*460*900mm',
      volume: '0.35m³',
      singleWeight: '12.5kg',
      grossWeight: '14.0kg',
      lengthCm: 85,
      widthCm: 46,
      heightCm: 90,
      meters: 0,

      // Step 3: 仓库采购成本
      defaultWarehouse: '主成品仓 / A区 / 01货架',
      warehouseArea: 'A区-精密件库',
      warehouseLocation: 'A-01-03',
      warehouseGroup: '常规结构件组',
      abcCategory: 'A类',
      inputBatch: '',
      locationManage: false,
      preciseImport: false,
      isReturnPart: false,
      hasBOM: false,
      producePurchaseMode: '自制生产',
      stockInStrategy: '按单全检入库',
      prepDays: 3,
      orderStrategy: '逐批订货',
      standardPrice: 1280,
      standardCost: 950,

      // Step 4: 工程信息
      partName: m?.materialName || '',
      typeNumber: '',
      bitNumber: '',
      surfaceTreatment: '表面喷砂阳极氧化',
      heatTreatment: 'T6热处理',
      pickingStation: 'WS-01总装工位',
      assembleType: '机械螺接',
      machineType: 'HY-460系列',
      powerSpec: '220V/50Hz 120W',
      processName: '数控精密铣削',
      reqDate: '2026-09-30',
      grindSize: '±0.02mm',
      forecastOrderNo: '',
      designer: '张工 (研发一部)',
      inciName: '',
      inciEnName: '',
      extractPart: '',
      usePurpose: '',
      enDescription: '',
      remarks: m?.remarks || '',

      // Step 5: 图号版本 (重点新增页签)
      drawingNo: m?.drawingNo || '',
      drawingName: master?.materialName || m?.materialName || '',
      drawingVersionNo: activeVer?.versionNo || master?.latestVersion || '',
      drawingStatus: (activeVer?.status === 'DRAFT' ? 'DRAFT' : 'PUBLISHED') as 'PUBLISHED' | 'DRAFT',
      isDrawingActive: activeVer?.isActive ?? true,
      ecoNumber: activeVer?.ecoNumber || '',
      drawingChangeDesc: activeVer?.notes || (isEdit ? '关联图号受控版本主档' : '首次创建物料图纸档案并发布生效'),
      drawingFiles: initialFiles,
    };
  });

  // 关联的图号主档
  const linkedMaster = useMemo(() => {
    const targetNo = formData.drawingNo?.trim();
    if (!targetNo) return undefined;
    return drawingMasters.find(
      d =>
        d.drawingNo === targetNo ||
        (initialMaterial && (d.materialId === initialMaterial.id || d.materialCode === initialMaterial.materialCode))
    );
  }, [formData.drawingNo, initialMaterial, drawingMasters]);

  // 图号版本生命周期与结构文件管理状态 (多版本/文件结构)
  const [localVersions, setLocalVersions] = useState<DrawingVersion[]>(() => {
    const m = initialMaterial;
    const targetNo = m?.drawingNo?.trim();
    if (!targetNo) {
      return [];
    }
    const master = drawingMasters.find(
      d =>
        d.drawingNo === targetNo ||
        d.materialId === m?.id ||
        d.materialCode === m?.materialCode
    );
    if (master && master.versions && master.versions.length > 0) {
      return master.versions;
    }
    return [];
  });

  // 消息提示气泡
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 3000);
  };

  // 保持 localVersions 与图号管理 (drawingMasters) 同步
  React.useEffect(() => {
    const targetNo = formData.drawingNo?.trim();
    if (!targetNo) {
      setLocalVersions([]);
      return;
    }
    const master = drawingMasters.find(
      d =>
        d.drawingNo === targetNo ||
        (initialMaterial && (d.materialId === initialMaterial.id || d.materialCode === initialMaterial.materialCode))
    );
    if (master && master.versions && master.versions.length > 0) {
      setLocalVersions(master.versions);
    } else {
      setLocalVersions([]);
    }
  }, [formData.drawingNo, drawingMasters, initialMaterial]);

  // 计算当前默认生效版本（严格与图号管理中心保持一致）
  const currentDefaultVer = useMemo(() => {
    if (!formData.drawingNo || formData.drawingNo.trim() === '') return undefined;
    if (!linkedMaster || !linkedMaster.versions || linkedMaster.versions.length === 0) return undefined;
    return linkedMaster.versions.find(v => v.isDefault) ||
           (linkedMaster.currentPublishedVersion ? linkedMaster.versions.find(v => v.versionNo === linkedMaster.currentPublishedVersion) : undefined) ||
           linkedMaster.versions.find(v => v.status === 'PUBLISHED' && v.isActive);
  }, [formData.drawingNo, linkedMaster]);

  // 当前展开的版本卡片
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(() => {
    const pub = localVersions.find(v => v.isDefault || (v.status === 'PUBLISHED' && v.isActive));
    return pub ? pub.id : (localVersions[0]?.id || null);
  });

  // 版本内部子页签：'files' (文件清单) | 'info' (变更参数)
  const [versionSubTab, setVersionSubTab] = useState<Record<string, 'files' | 'info'>>({});

  // 预览模态框数据
  const [selectedDrawingFileIds, setSelectedDrawingFileIds] = useState<string[]>([]);
  const [previewModalData, setPreviewModalData] = useState<{
    file: DrawingFile;
    version: DrawingVersion;
  } | null>(null);

  // 版本号行内编辑
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  const [editingVersionNo, setEditingVersionNo] = useState<string>('');

  // 上传文件模态框 (支持多文件批量上传)
  const [uploadModalVersion, setUploadModalVersion] = useState<DrawingVersion | null>(null);
  const [uploadModalFiles, setUploadModalFiles] = useState<Array<{
    id: string;
    file?: File;
    fileName: string;
    fileType: FileType;
    fileSize: number;
    fileHash: string;
    role: string;
  }>>([]);
  const [isDragOverUpload, setIsDragOverUpload] = useState(false);
  const materialFileInputRef = useRef<HTMLInputElement>(null);

  // 编辑图纸文件模态框
  const [editingFileData, setEditingFileData] = useState<{
    versionId: string;
    fileId: string;
    fileName: string;
    fileType: FileType;
    role: string;
  } | null>(null);

  // 提交审批模态框
  const [submitApprovalVersion, setSubmitApprovalVersion] = useState<DrawingVersion | null>(null);
  const [submitReviewer, setSubmitReviewer] = useState<string>('李工 (技术总监)');
  const [submitNotes, setSubmitNotes] = useState<string>('提交工程图纸版本审批，已完成2D/3D校验及生产受控图纸检查');

  // 审核批准模态框
  const [approveVersion, setApproveVersion] = useState<DrawingVersion | null>(null);
  const [approveReviewer, setApproveReviewer] = useState<string>('李工 (技术总监)');
  const [approveNotes, setApproveNotes] = useState<string>('技术审查通过，准予发布并投入生产');
  const [isApproveAction, setIsApproveAction] = useState<boolean>(true); // true: 批准, false: 驳回

  // 新建/关联工程图号主档模态框
  const [isLinkMasterModalOpen, setIsLinkMasterModalOpen] = useState(false);
  const [inputNewDrawingNo, setInputNewDrawingNo] = useState('');
  const [selectedExistingMasterNo, setSelectedExistingMasterNo] = useState('');

  // 新增草稿版本模态框
  const [isNewVersionModalOpen, setIsNewVersionModalOpen] = useState(false);
  const [newVersionInputNo, setNewVersionInputNo] = useState('');
  const [baseVersionNoForCopy, setBaseVersionNoForCopy] = useState<string>('');
  const [newVersionEco, setNewVersionEco] = useState('');
  const [newVersionNotes, setNewVersionNotes] = useState('');

  // 匹配的 BOM 组成
  const matchedBOM = useMemo(() => {
    if (!boms || boms.length === 0) return undefined;
    const code = formData.materialCode || initialMaterial?.materialCode;
    const name = formData.materialName || initialMaterial?.materialName;
    return boms.find(
      b => (code && b.productCode === code) || (name && b.productName === name)
    );
  }, [boms, formData.materialCode, formData.materialName, initialMaterial]);

  // 自动生成物料编码
  const handleAutoGenerateCode = () => {
    const prefixMap: Record<string, string> = {
      机械标准件: 'CD',
      电气标准件: 'EL',
      机加原材料: 'RM',
      半成品: 'CD',
      成品机器高端: 'B',
      配件或改造: 'PJ',
      '结构件/外壳': 'ST',
    };
    const prefix = prefixMap[formData.category] || 'MAT';
    const randNum = Math.floor(10000 + Math.random() * 90000);
    const code = `${prefix}-${randNum}`;
    const generatedDwgNo = `DRW-${randNum}`;
    setFormData(prev => ({
      ...prev,
      materialCode: code,
      drawingNo: prev.drawingNo || generatedDwgNo,
      drawingName: prev.drawingName || prev.materialName,
    }));
    setLocalVersions(prev =>
      prev.map(v => ({
        ...v,
        drawingNo: v.drawingNo || generatedDwgNo,
      }))
    );
  };

  // 快捷新建或关联工程图号
  const handleConfirmCreateOrLinkMaster = () => {
    let finalDwgNo = '';
    if (inputNewDrawingNo.trim()) {
      finalDwgNo = inputNewDrawingNo.trim();
    } else if (selectedExistingMasterNo.trim()) {
      finalDwgNo = selectedExistingMasterNo.trim();
    } else {
      finalDwgNo = `DRW-${formData.materialCode || Math.floor(10000 + Math.random() * 90000)}`;
    }

    setFormData(prev => ({
      ...prev,
      drawingNo: finalDwgNo,
      drawingName: prev.materialName,
    }));

    // 如果库中有此图号，载入其版本
    const existingMaster = drawingMasters.find(d => d.drawingNo === finalDwgNo);
    if (existingMaster && existingMaster.versions && existingMaster.versions.length > 0) {
      setLocalVersions(existingMaster.versions);
      const pub = existingMaster.versions.find(v => v.isDefault || (v.status === 'PUBLISHED' && v.isActive)) || existingMaster.versions[0];
      setExpandedVersionId(pub?.id || null);
    } else {
      // 自动创建标准初版 V1.0
      const initialVer: DrawingVersion = {
        id: `VER-${Date.now()}`,
        drawingNo: finalDwgNo,
        versionNo: 'V1.0',
        status: 'PUBLISHED' as VersionStatus,
        isActive: true,
        isDefault: true,
        createdAt: new Date().toLocaleString(),
        createdBy: '张工 (研发一部)',
        notes: '物料工程图纸初始建立版本',
        files: [
          {
            id: `FILE-${Date.now()}-1`,
            fileName: `${finalDwgNo}_V1.0_2D装配总图.dwg`,
            fileType: 'DWG' as FileType,
            fileSize: 4520000,
            fileHash: `SHA-256:d7a8f${Math.random().toString(36).substring(2, 8)}`,
            uploadTime: new Date().toLocaleString(),
            uploader: '张工 (研发一部)',
            cadLayers: ['0_OUTLINE', 'DIMENSIONS', 'CENTERLINES'],
          },
          {
            id: `FILE-${Date.now()}-2`,
            fileName: `${finalDwgNo}_V1.0_3D总成模型.step`,
            fileType: 'STEP' as FileType,
            fileSize: 18200000,
            fileHash: `SHA-256:9c1e4${Math.random().toString(36).substring(2, 8)}`,
            uploadTime: new Date().toLocaleString(),
            uploader: '张工 (研发一部)',
            cadLayers: ['SOLID_BODY', 'DATUM_PLANES'],
          },
          {
            id: `FILE-${Date.now()}-3`,
            fileName: `${finalDwgNo}_V1.0_受控出图.pdf`,
            fileType: 'PDF' as FileType,
            fileSize: 1890000,
            fileHash: `SHA-256:3f8b2${Math.random().toString(36).substring(2, 8)}`,
            uploadTime: new Date().toLocaleString(),
            uploader: '张工 (研发一部)',
          },
        ],
      };
      setLocalVersions([initialVer]);
      setExpandedVersionId(initialVer.id);
      if (onCreateDrawingMaster) {
        onCreateDrawingMaster(initialMaterial?.id || 'NEW_MAT', finalDwgNo, '物料工程图纸初始主档');
      }
    }

    setIsLinkMasterModalOpen(false);
    setInputNewDrawingNo('');
    setSelectedExistingMasterNo('');
    showToast(`已成功建立并关联工程图号 [${finalDwgNo}]！`);
  };

  // 创建新草稿版本
  const handleCreateDraftVersion = (baseVerNo?: string) => {
    const baseVer = localVersions.find(v => v.versionNo === baseVerNo) || localVersions[0];
    const nextVerNo = baseVer
      ? `V${(parseFloat(baseVer.versionNo.replace('V', '')) + 0.1).toFixed(1)}`
      : 'V1.1';
    setNewVersionInputNo(nextVerNo);
    setBaseVersionNoForCopy(baseVer?.versionNo || '');
    setNewVersionEco(`ECO-2026-${Math.floor(1000 + Math.random() * 9000)}`);
    setNewVersionNotes(`基于 ${baseVer?.versionNo || '前序版本'} 发起工程图纸变更迭代`);
    setIsNewVersionModalOpen(true);
  };

  const handleConfirmCreateDraftVersion = () => {
    if (!newVersionInputNo.trim()) return;
    const baseVer = localVersions.find(v => v.versionNo === baseVersionNoForCopy);
    const copiedFiles: DrawingFile[] = (baseVer?.files || []).map((f, idx) => ({
      ...f,
      id: `FILE-${Date.now()}-${idx}`,
      fileName: f.fileName.replace(baseVer?.versionNo || 'V1.0', newVersionInputNo.trim()),
      uploadTime: new Date().toLocaleString(),
      uploader: '张工 (研发一部)',
    }));

    const newVer: DrawingVersion = {
      id: `VER-${Date.now()}`,
      drawingNo: formData.drawingNo || `DRW-${formData.materialCode || '01063'}`,
      versionNo: newVersionInputNo.trim(),
      status: 'DRAFT' as VersionStatus,
      isActive: false,
      isDefault: false,
      ecoNumber: newVersionEco,
      notes: newVersionNotes,
      createdAt: new Date().toLocaleString(),
      createdBy: '张工 (研发一部)',
      files: copiedFiles,
    };

    setLocalVersions(prev => [newVer, ...prev]);
    setExpandedVersionId(newVer.id);
    setIsNewVersionModalOpen(false);

    if (onCreateNewDraftVersion && formData.drawingNo) {
      onCreateNewDraftVersion(formData.drawingNo, baseVersionNoForCopy);
    }
    showToast(`已创建新版本草稿 [${newVer.versionNo}]！`);
  };

  // 状态流转处理
  const handleUpdateVersionStatus = (versionId: string, newStatus: VersionStatus, extraData?: Partial<DrawingVersion>) => {
    setLocalVersions(prev =>
      prev.map(v => {
        if (v.id === versionId) {
          return {
            ...v,
            ...extraData,
            status: newStatus,
            isActive: newStatus === 'PUBLISHED' ? true : v.isActive,
          };
        }
        return v;
      })
    );

    if (onUpdateVersionStatus && formData.drawingNo) {
      onUpdateVersionStatus(formData.drawingNo, versionId, newStatus, extraData);
    }
  };

  // 提交审批
  const handleConfirmSubmitApproval = () => {
    if (!submitApprovalVersion) return;
    handleUpdateVersionStatus(submitApprovalVersion.id, 'PENDING_REVIEW', {
      notes: `[提交审批] 审查人: ${submitReviewer} · 备注: ${submitNotes}`,
    });
    setSubmitApprovalVersion(null);
    showToast(`版本 [${submitApprovalVersion.versionNo}] 已成功提交审批！`);
  };

  // 审核批准 / 驳回
  const handleConfirmApproveVersion = () => {
    if (!approveVersion) return;
    if (isApproveAction) {
      // 审核通过并发布
      setLocalVersions(prev =>
        prev.map(v => ({
          ...v,
          status: v.id === approveVersion.id ? 'PUBLISHED' : v.status,
          isActive: v.id === approveVersion.id ? true : v.isActive,
          isDefault: v.id === approveVersion.id ? true : false,
          notes: v.id === approveVersion.id ? `[审核发布] 审核人: ${approveReviewer} · 审批意见: ${approveNotes}` : v.notes,
        }))
      );
      if (onUpdateVersionStatus && formData.drawingNo) {
        onUpdateVersionStatus(formData.drawingNo, approveVersion.id, 'PUBLISHED', {
          isDefault: true,
          isActive: true,
          notes: `[审核发布] 审核人: ${approveReviewer} · 审批意见: ${approveNotes}`,
        });
      }
      setFormData(prev => ({
        ...prev,
        drawingVersionNo: approveVersion.versionNo,
        drawingStatus: 'PUBLISHED',
        isDrawingActive: true,
      }));
      showToast(`版本 [${approveVersion.versionNo}] 审核通过并已正式发布生效！`);
    } else {
      // 驳回至草稿
      handleUpdateVersionStatus(approveVersion.id, 'DRAFT', {
        notes: `[审批驳回] 审核人: ${approveReviewer} · 驳回原因: ${approveNotes}`,
      });
      showToast(`版本 [${approveVersion.versionNo}] 已驳回至草稿状态。`);
    }
    setApproveVersion(null);
  };

  // 设为默认生效版本
  const handleSetDefaultVersion = (versionId: string) => {
    setLocalVersions(prev =>
      prev.map(v => ({
        ...v,
        isDefault: v.id === versionId,
        isActive: v.id === versionId ? true : v.isActive,
      }))
    );
    const target = localVersions.find(v => v.id === versionId);
    if (target) {
      setFormData(prev => ({
        ...prev,
        drawingVersionNo: target.versionNo,
        drawingStatus: target.status === 'DRAFT' ? 'DRAFT' : 'PUBLISHED',
        isDrawingActive: true,
        drawingFiles: (target.files || []).map(f => ({
          fileName: f.fileName,
          fileType: f.fileType,
          fileSize: f.fileSize,
        })),
      }));
    }
    if (onSetDefaultVersion && formData.drawingNo) {
      onSetDefaultVersion(formData.drawingNo, versionId);
    }
    showToast(`已将版本 [${target?.versionNo}] 设为默认生效版本！`);
  };

  // 启用/停用版本
  const handleToggleVersionActive = (versionId: string, currentActive: boolean) => {
    const nextActive = !currentActive;
    setLocalVersions(prev =>
      prev.map(v => (v.id === versionId ? { ...v, isActive: nextActive } : v))
    );
    if (onToggleVersionActive && formData.drawingNo) {
      onToggleVersionActive(formData.drawingNo, versionId, nextActive);
    }
    showToast(`版本状态已切换为: ${nextActive ? '生效启用' : '已停用'}`);
  };

  // 删除草稿版本
  const handleDeleteDraftVersion = (versionId: string) => {
    const target = localVersions.find(v => v.id === versionId);
    if (confirm(`确定要删除草稿版本 [${target?.versionNo || versionId}] 吗？`)) {
      setLocalVersions(prev => prev.filter(v => v.id !== versionId));
      if (expandedVersionId === versionId) {
        setExpandedVersionId(null);
      }
      if (onDeleteDraftVersion && formData.drawingNo) {
        onDeleteDraftVersion(formData.drawingNo, versionId);
      }
      showToast(`已删除草稿版本 [${target?.versionNo || ''}]`);
    }
  };

  // 修改草稿版本号
  const handleSaveDraftVersionNo = (versionId: string) => {
    if (!editingVersionNo.trim()) {
      setEditingVersionId(null);
      return;
    }
    setLocalVersions(prev =>
      prev.map(v => (v.id === versionId ? { ...v, versionNo: editingVersionNo.trim() } : v))
    );
    if (onUpdateDraftVersionNo && formData.drawingNo) {
      onUpdateDraftVersionNo(formData.drawingNo, versionId, editingVersionNo.trim());
    }
    setEditingVersionId(null);
    showToast(`版本号已更新为: ${editingVersionNo.trim()}`);
  };

  // 打开上传模态框 (支持批量图纸)
  const handleOpenUploadModal = (version: DrawingVersion) => {
    const curStatus = version.status || linkedMaster?.status || formData.drawingStatus || 'PUBLISHED';
    if (curStatus === 'PUBLISHED' || curStatus === 'PENDING_REVIEW') {
      alert(`[${curStatus === 'PUBLISHED' ? '已发布' : '待审批'}] 状态下的图号不允许新增或上传图纸文件！如需修改图纸请发起工程变更并新建版本草稿。`);
      return;
    }
    setUploadModalVersion(version);
    const base = formData.drawingNo || `DRW-${formData.materialCode || '01063'}`;
    const matName = formData.materialName || '物料';
    const defaultItems = [
      {
        id: `FILE-${Date.now()}-1`,
        fileName: `${base}_${version.versionNo}_2D装配总图_${matName}.dwg`,
        fileType: 'DWG' as FileType,
        fileSize: 3450000,
        fileHash: `SHA-256:${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`,
        role: '2D装配总图',
      },
    ];
    setUploadModalFiles(defaultItems);
    setIsDragOverUpload(false);
  };

  // 添加本地文件到待上传队列
  const handleAddFilesToMaterialModal = (files: FileList | File[]) => {
    const newItems = Array.from(files).map((f, idx) => {
      const identified = detectFileTypeFromName(f.name);
      return {
        id: `FILE-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
        file: f,
        fileName: f.name,
        fileType: (identified || 'DWG') as FileType,
        fileSize: f.size || Math.floor(Math.random() * 4000000) + 2000000,
        fileHash: `SHA-256:${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`,
        role: identified === 'PDF' ? '生产受控图纸' : (identified === 'STEP' || identified === 'SLDPRT' || identified === 'SLDASM' ? '3D总成数模' : '2D装配总图'),
      };
    });
    setUploadModalFiles(prev => [...prev, ...newItems]);
    showToast(`已成功添加 ${newItems.length} 份本地图纸至待上传列表！`);
  };

  // 快捷测试用例：模拟多张图纸多种情况批量上传（包含通过、缺少物料名、图号不匹配、未遵循规范、格式不支持）
  const handleLoadMaterialTestScenarios = () => {
    if (!uploadModalVersion) return;
    const base = formData.drawingNo || `DRW-${formData.materialCode || '01063'}`;
    const vNo = uploadModalVersion.versionNo;
    const matName = formData.materialName || '零件';

    const testSuite = [
      {
        id: `TEST-${Date.now()}-1`,
        fileName: `${base}_${vNo}_2D装配总图_${matName}.dwg`,
        fileType: 'DWG' as FileType,
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
        fileType: 'DWG' as FileType,
        fileSize: 2890000,
        fileHash: 'SHA-256:4b227777d4dd1fc61c6f884f48641d02',
        testNote: '【测试3-失败】缺少物料名称（未包含「' + matName + '」）',
      },
      {
        id: `TEST-${Date.now()}-4`,
        fileName: `DRW-MISMATCH-99999_${matName}_零件下料图.dxf`,
        fileType: 'DXF' as FileType,
        fileSize: 1920000,
        fileHash: 'SHA-256:eccbc87e4b5ce2fe28308fd9f2a7baf3',
        testNote: '【测试4-失败】图号错误（未包含当前图号「' + base + '」）',
      },
      {
        id: `TEST-${Date.now()}-5`,
        fileName: `material_component_blueprint.pdf`,
        fileType: 'PDF' as FileType,
        fileSize: 1650000,
        fileHash: 'SHA-256:c4ca4238a0b923820dcc509a6f75849b',
        testNote: '【测试5-失败】未遵循规范（缺少图号与物料名称）',
      },
      {
        id: `TEST-${Date.now()}-6`,
        fileName: `${base}_${matName}_加工工艺要求说明.xlsx`,
        fileType: 'PDF' as FileType,
        fileSize: 720000,
        fileHash: 'SHA-256:8f434346648f6b96df89dda901c5176b',
        testNote: '【测试6-失败】不支持的图纸文件格式（.xlsx）',
      },
    ];

    setUploadModalFiles(testSuite);
    showToast('已载入 6 种测试场景图纸（2 份合规通过，4 份异常拦截），可在表格中查看具体校验详情！');
  };

  // 一键修复单条图纸为规范命名
  const handleAutoFixSingleMaterialFile = (fileId: string) => {
    if (!uploadModalVersion) return;
    const base = formData.drawingNo || `DRW-${formData.materialCode || '01063'}`;
    const vNo = uploadModalVersion.versionNo;
    const matName = formData.materialName || '零件';

    setUploadModalFiles(prev =>
      prev.map(f => {
        if (f.id !== fileId) return f;
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
    showToast('已自动按「图号+版本+物料名称」标准规范修复图纸文件名！');
  };

  // 一键修复全部不合规图纸
  const handleAutoFixAllMaterialFiles = () => {
    if (!uploadModalVersion) return;
    const base = formData.drawingNo || `DRW-${formData.materialCode || '01063'}`;
    const vNo = uploadModalVersion.versionNo;
    const matName = formData.materialName || '零件';

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
  const handleRemoveInvalidMaterialFiles = () => {
    const base = formData.drawingNo || `DRW-${formData.materialCode || '01063'}`;
    const matName = formData.materialName || '零件';
    setUploadModalFiles(prev =>
      prev.filter(f => validateDrawingFileMatch(f.fileName, base, matName).isValid)
    );
    showToast('已清除全部校验未通过图纸！');
  };

  // 快捷载入图纸套件
  const handleLoadMaterialPresetSuite = (suiteType: 'STANDARD_4' | 'CAD_3D') => {
    if (!uploadModalVersion) return;
    const base = formData.drawingNo || `DRW-${formData.materialCode || '01063'}`;
    const vNo = uploadModalVersion.versionNo;
    const matName = formData.materialName || '零件';

    if (suiteType === 'STANDARD_4') {
      const suite = [
        {
          id: `SUITE-${Date.now()}-1`,
          fileName: `${base}_${vNo}_2D装配总图_${matName}.dwg`,
          fileType: 'DWG' as FileType,
          fileSize: 3200000,
          fileHash: 'SHA-256:d41d8cd98f00b204e9800998ecf8427e',
          role: '2D装配总图',
        },
        {
          id: `SUITE-${Date.now()}-2`,
          fileName: `${base}_${vNo}_3D总成数模_${matName}.stp`,
          fileType: 'STEP' as FileType,
          fileSize: 14800000,
          fileHash: 'SHA-256:9e107d9d372bb6826bd81d3542a419d6',
          role: '3D总成数模',
        },
        {
          id: `SUITE-${Date.now()}-3`,
          fileName: `${base}_${vNo}_生产受控图纸_${matName}.pdf`,
          fileType: 'PDF' as FileType,
          fileSize: 1950000,
          fileHash: 'SHA-256:c4ca4238a0b923820dcc509a6f75849b',
          role: '生产受控图纸',
        },
        {
          id: `SUITE-${Date.now()}-4`,
          fileName: `${base}_${vNo}_零件下料展开图_${matName}.dxf`,
          fileType: 'DXF' as FileType,
          fileSize: 2400000,
          fileHash: 'SHA-256:eccbc87e4b5ce2fe28308fd9f2a7baf3',
          role: '2D装配总图',
        },
      ];
      setUploadModalFiles(prev => [...prev, ...suite]);
      showToast('已载入标准 4 格式图纸包 (DWG + STEP + PDF + DXF)！');
    } else {
      const suite = [
        {
          id: `SUITE-${Date.now()}-1`,
          fileName: `${base}_${vNo}_SolidWorks零件_${matName}.sldprt`,
          fileType: 'SLDPRT' as FileType,
          fileSize: 5800000,
          fileHash: 'SHA-256:a87ff679a2f3e71d9181a67b7542122c',
          role: '3D总成数模',
        },
        {
          id: `SUITE-${Date.now()}-2`,
          fileName: `${base}_${vNo}_SolidWorks装配体_${matName}.sldasm`,
          fileType: 'SLDASM' as FileType,
          fileSize: 19200000,
          fileHash: 'SHA-256:e4da3b7fbbce2345d7772b0674a318d5',
          role: '3D总成数模',
        },
      ];
      setUploadModalFiles(prev => [...prev, ...suite]);
      showToast('已载入 SolidWorks 3D 零件与装配体套件！');
    }
  };

  // 批量确认添加图纸文件到指定版本
  const handleConfirmAddFiles = () => {
    if (!uploadModalVersion || uploadModalFiles.length === 0) return;

    const base = formData.drawingNo || `DRW-${formData.materialCode || '01063'}`;
    const matName = formData.materialName || '零件';

    // 校验命名规范
    const validItems = uploadModalFiles.filter(item => {
      const val = validateDrawingFileMatch(item.fileName, base, matName);
      return val.isValid;
    });

    const invalidCount = uploadModalFiles.length - validItems.length;

    if (validItems.length === 0) {
      alert(`当前列表中的 ${uploadModalFiles.length} 份图纸均未通过「图号 + 物料名称」命名规范校验，请修改图纸文件名后再上传！`);
      return;
    }

    const newFiles: DrawingFile[] = validItems.map(item => ({
      id: `FILE-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      fileName: item.fileName.trim(),
      fileType: (detectFileTypeFromName(item.fileName) || item.fileType || 'PDF') as FileType,
      fileSize: item.fileSize,
      fileHash: item.fileHash || `SHA-256:${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`,
      uploadTime: new Date().toLocaleString(),
      uploader: '张工 (研发一部)',
      cadLayers: ['0_OUTLINE', 'DIMENSIONS', 'CENTERLINES'],
    }));

    setLocalVersions(prev =>
      prev.map(v =>
        v.id === uploadModalVersion.id
          ? { ...v, files: [...(v.files || []), ...newFiles] }
          : v
      )
    );

    if (onAddFileToDraft && formData.drawingNo) {
      newFiles.forEach(file => {
        onAddFileToDraft(formData.drawingNo, uploadModalVersion.id, file);
      });
    }

    const count = newFiles.length;
    setUploadModalVersion(null);
    setUploadModalFiles([]);

    if (invalidCount > 0) {
      showToast(`已成功挂载 ${count} 份合规图纸！自动拦截跳过 ${invalidCount} 份未通过命名规范的图纸。`);
    } else {
      showToast(`已成功批量上传并挂载全部 ${count} 份工程图纸文件！`);
    }
  };

  // 打开编辑文件模态框
  const handleOpenEditFileModal = (version: DrawingVersion, file: DrawingFile) => {
    const curStatus = version.status || linkedMaster?.status || formData.drawingStatus || 'PUBLISHED';
    if (curStatus === 'PUBLISHED') {
      alert('已发布状态下的图纸文件不允许修改信息！');
      return;
    }
    const role =
      file.fileType === 'DWG' || file.fileType === 'DXF'
        ? '2D装配总图'
        : file.fileType === 'STEP' || file.fileType === 'IGS' || file.fileType === 'SLDPRT'
        ? '3D总成数模'
        : file.fileType === 'PDF'
        ? '生产受控图纸'
        : '工艺规范说明';

    setEditingFileData({
      versionId: version.id,
      fileId: file.id,
      fileName: file.fileName,
      fileType: file.fileType,
      role: role,
    });
  };

  // 确认编辑文件
  const handleConfirmEditFile = () => {
    if (!editingFileData || !editingFileData.fileName.trim()) return;
    const { versionId, fileId, fileName, fileType } = editingFileData;

    setLocalVersions(prev =>
      prev.map(v => {
        if (v.id === versionId) {
          return {
            ...v,
            files: (v.files || []).map(f =>
              f.id === fileId
                ? {
                    ...f,
                    fileName: fileName.trim(),
                    fileType: fileType,
                    uploadTime: new Date().toLocaleString(),
                  }
                : f
            ),
          };
        }
        return v;
      })
    );

    if (onUpdateFileInVersion && formData.drawingNo) {
      onUpdateFileInVersion(formData.drawingNo, versionId, fileId, {
        fileName: fileName.trim(),
        fileType: fileType,
      });
    }

    setEditingFileData(null);
    showToast(`已成功更新图纸文件信息: ${fileName}`);
  };

  // 移除版本中的文件
  const handleRemoveFileFromVersion = (versionId: string, fileId: string, fileName?: string, fileType?: string) => {
    const targetVer = localVersions.find(v => v.id === versionId);
    const curStatus = targetVer?.status || linkedMaster?.status || formData.drawingStatus || 'PUBLISHED';
    if (curStatus === 'PUBLISHED' || curStatus === 'PENDING_REVIEW') {
      alert(`[${curStatus === 'PUBLISHED' ? '已发布' : '待审批'}] 状态下的图纸文件不允许删除！如需修改请在草稿状态下操作。`);
      return;
    }
    if (confirm(`确定要删除图纸文件 [${fileName || '该文件'}] 吗？此操作不可撤销。`)) {
      setLocalVersions(prev =>
        prev.map(v =>
          v.id === versionId
            ? { ...v, files: (v.files || []).filter(f => f.id !== fileId) }
            : v
        )
      );

      if (onDeleteFileFromVersion && formData.drawingNo) {
        onDeleteFileFromVersion(formData.drawingNo, versionId, fileId, fileName || '', fileType || 'DWG');
      }

      showToast(`已删除图纸文件: ${fileName || ''}`);
    }
  };

  // 批量下载版本图纸
  const handleBatchDownload = (version: DrawingVersion) => {
    const count = version.files?.length || 0;
    if (count === 0) {
      alert('当前版本暂无图纸文件可供下载！');
      return;
    }
    showToast(`正在打包下载 ${version.drawingNo} (${version.versionNo}) 共 ${count} 份工程图纸...`);
  };

  // 保存提交
  const handleSave = () => {
    if (!formData.materialCode.trim()) {
      alert('请填写物料编码！');
      setActiveStep(1);
      return;
    }
    if (!formData.materialName.trim()) {
      alert('请填写物料名称！');
      setActiveStep(1);
      return;
    }

    const activeOrPubVer =
      localVersions.find(v => v.isDefault) ||
      localVersions.find(v => v.status === 'PUBLISHED' && v.isActive) ||
      localVersions[0];
    const effectiveDrawingNo = formData.drawingNo.trim();

    onSave(
      {
        materialCode: formData.materialCode.trim(),
        materialName: formData.materialName.trim(),
        materialSpec: formData.materialSpec.trim() || '-',
        category: formData.category,
        unit: formData.unit || '台',
        drawingNo: effectiveDrawingNo || undefined,
        status: formData.isActive ? 'ACTIVE' : 'DISABLED',
        remarks: formData.remarks.trim(),
        lossRate: formData.lossRate !== undefined ? Number(formData.lossRate) : 0.5,
        standardCost: formData.standardCost !== undefined ? Number(formData.standardCost) : 120,
        stock: (formData as any).stock !== undefined ? Number((formData as any).stock) : 100,
      },
      effectiveDrawingNo
        ? {
            drawingNo: effectiveDrawingNo,
            versionNo: activeOrPubVer?.versionNo || formData.drawingVersionNo || 'V1.0',
            status: (activeOrPubVer?.status === 'DRAFT' ? 'DRAFT' : 'PUBLISHED') as 'PUBLISHED' | 'DRAFT',
            isActive: activeOrPubVer?.isActive ?? true,
            changeDesc: activeOrPubVer?.notes || formData.drawingChangeDesc,
            files: (activeOrPubVer?.files || []).map(f => ({
              fileName: f.fileName,
              fileType: f.fileType,
              fileSize: f.fileSize,
            })),
          }
        : undefined,
      isEditMode,
      initialMaterial?.id
    );
  };

  // 步骤配置（共6步，包含重点要求的图号版本页签）
  const steps = [
    {
      id: 1,
      title: '基础信息',
      subtitle: '编码、名称、规格与业务属性',
      icon: FileText,
    },
    {
      id: 2,
      title: '包装材质参数',
      subtitle: '包装、材质、尺寸重量',
      icon: Package,
    },
    {
      id: 3,
      title: '仓库采购成本',
      subtitle: '库存、采购、财务追溯',
      icon: Warehouse,
    },
    {
      id: 4,
      title: '工程信息',
      subtitle: '工程工艺、扩展',
      icon: Wrench,
    },
    {
      id: 5,
      title: '图纸列表',
      subtitle: isNoVersionMode ? '直连工程图纸文件 (2D/3D/PDF)' : '图号主档、版本状态与图纸文件',
      icon: GitBranch,
      isSpecial: true,
    },
    {
      id: 6,
      title: 'BOM组成',
      subtitle: '物料明细与用量工艺表',
      icon: Layers,
    },
  ];

  return (
    <div className="flex flex-col h-full bg-[#f4f7fc] dark:bg-slate-950 p-3 sm:p-4 gap-3 overflow-hidden font-sans">
      {/* 顶部面包屑与页签栏 */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-4 py-2 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-xs shrink-0">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 dark:text-slate-500">首页</span>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <span className="text-slate-400 dark:text-slate-500">查看物料档案</span>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <button
            onClick={onClose}
            className="text-slate-600 dark:text-slate-400 hover:text-blue-600 cursor-pointer"
          >
            物料档案
          </button>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <span className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            {isEditMode ? `物料详情档案 - [${formData.materialCode}] ${formData.materialName}` : '新增物料档案'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isEditMode && (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              formData.isActive
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}>
              {formData.isActive ? '状态: 已启用' : '状态: 已停用'}
            </span>
          )}
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
            title="关闭返回"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 主体左右布局 */}
      <div className="flex-1 flex gap-3 min-h-0 overflow-hidden">
        {/* 左侧：步骤导航栏 (物料建档 / 详情) */}
        <div className="w-60 sm:w-64 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 flex flex-col shrink-0 shadow-xs">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                {isEditMode ? '物料档案详情' : '物料建档'}
              </h3>
              {isEditMode && (
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.5 rounded">
                  {formData.materialCode}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {isEditMode
                ? '全景查看与维护物料基础信息、材质参数、工程属性、图号管理与BOM组成。'
                : '按区块逐步录入，必填项会在每一步集中呈现，附件与图纸随基础信息一起维护。'}
            </p>
            {/* 进度条 */}
            <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${(activeStep / steps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* 步骤列表 */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {steps.map(step => {
              const isActive = activeStep === step.id;
              const StepIcon = step.icon;

              return (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
                  className={`w-full flex items-start gap-3 p-2.5 rounded-lg text-left transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 shadow-xs'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs shrink-0 transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <StepIcon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-semibold ${
                          isActive
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {step.title}
                      </span>
                      {step.isSpecial && (
                        <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200">
                          图纸
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                      {step.subtitle}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* 底部录入统计 */}
          <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40 shrink-0 flex items-center justify-between text-xs">
            <div>
              <div className="text-[10px] text-slate-400">信息录入</div>
              <div className="font-bold text-slate-700 dark:text-slate-200">18/75</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">必填项</div>
              <div className="font-bold text-slate-700 dark:text-slate-200">5/9</div>
            </div>
          </div>
        </div>

        {/* 右侧：表单主内容区 */}
        <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          {/* 内容滚动区域 */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 text-xs">
            {/* ================= STEP 1: 基础信息 ================= */}
            {activeStep === 1 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="border-l-4 border-blue-600 pl-3">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-white">基础信息</h3>
                  <p className="text-slate-400 text-[11px]">
                    先完成基础信息、规格单位和业务属性，满足快速提交审批。
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* 基础信息 Card */}
                  <div className="bg-[#fafbfd] dark:bg-slate-800/40 p-4 rounded-lg border border-slate-200/70 dark:border-slate-700/70 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
                      <span className="font-bold text-slate-700 dark:text-slate-200">基础信息</span>
                      <span className="text-[10px] text-slate-400">建档后作为主数据检索依据</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                          <span className="text-red-500 mr-0.5">*</span>物料编码
                        </label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="如: CD-01063"
                            value={formData.materialCode}
                            onChange={e => setFormData({ ...formData, materialCode: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                          />
                          <button
                            type="button"
                            onClick={handleAutoGenerateCode}
                            className="p-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500"
                            title="根据分类自动生成编码"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                          <span className="text-red-500 mr-0.5">*</span>物料名称
                        </label>
                        <input
                          type="text"
                          placeholder="请输入物料名称"
                          value={formData.materialName}
                          onChange={e => setFormData({ ...formData, materialName: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                          <span className="text-red-500 mr-0.5">*</span>物料分类
                        </label>
                        <select
                          value={formData.category}
                          onChange={e => setFormData({ ...formData, category: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                        >
                          <option value="机械标准件">机械标准件</option>
                          <option value="电气标准件">电气标准件</option>
                          <option value="机加原材料">机加原材料</option>
                          <option value="半成品">半成品</option>
                          <option value="成品机器高端">成品机器高端</option>
                          <option value="配件或改造">配件或改造</option>
                          <option value="结构件/外壳">结构件/外壳</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                          物料类型
                        </label>
                        <input
                          type="text"
                          value={formData.materialType}
                          onChange={e => setFormData({ ...formData, materialType: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded text-slate-600 dark:text-slate-300"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                          BOM版本
                        </label>
                        <select
                          value={formData.bomVersion}
                          onChange={e => setFormData({ ...formData, bomVersion: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                        >
                          <option value="0">0 (初始版本)</option>
                          <option value="A">A</option>
                          <option value="B">B</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                          开启SN码
                        </label>
                        <div className="flex items-center gap-4 pt-1">
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name="hasSn"
                              checked={!formData.hasSn}
                              onChange={() => setFormData({ ...formData, hasSn: false })}
                              className="text-blue-600"
                            />
                            <span>否</span>
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name="hasSn"
                              checked={formData.hasSn}
                              onChange={() => setFormData({ ...formData, hasSn: true })}
                              className="text-blue-600"
                            />
                            <span>是</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* 开关选项行 */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                      <div>
                        <span className="block text-slate-500 mb-1">批次管理</span>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name="batchManage"
                              checked={!formData.batchManage}
                              onChange={() => setFormData({ ...formData, batchManage: false })}
                            />
                            <span>否</span>
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name="batchManage"
                              checked={formData.batchManage}
                              onChange={() => setFormData({ ...formData, batchManage: true })}
                            />
                            <span>是</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <span className="block text-slate-500 mb-1">
                          <span className="text-red-500 mr-0.5">*</span>是否启用
                        </span>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name="isActive"
                              checked={!formData.isActive}
                              onChange={() => setFormData({ ...formData, isActive: false })}
                            />
                            <span>否</span>
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name="isActive"
                              checked={formData.isActive}
                              onChange={() => setFormData({ ...formData, isActive: true })}
                            />
                            <span className="font-semibold text-blue-600">是</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <span className="block text-slate-500 mb-1">安全库存</span>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name="safetyStock"
                              checked={!formData.safetyStock}
                              onChange={() => setFormData({ ...formData, safetyStock: false })}
                            />
                            <span>否</span>
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name="safetyStock"
                              checked={formData.safetyStock}
                              onChange={() => setFormData({ ...formData, safetyStock: true })}
                            />
                            <span>是</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 业务规格与单位 Card */}
                  <div className="bg-[#fafbfd] dark:bg-slate-800/40 p-4 rounded-lg border border-slate-200/70 dark:border-slate-700/70 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
                      <span className="font-bold text-slate-700 dark:text-slate-200">业务规格与单位</span>
                      <span className="text-[10px] text-slate-400">定义业务属性、规格型号与工艺路线</span>
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        <span className="text-red-500 mr-0.5">*</span>业务属性
                      </label>
                      <div className="flex flex-wrap items-center gap-3">
                        {Object.entries({
                          sales: '销售',
                          purchase: '采购',
                          selfMade: '自制',
                          outsourced: '委外',
                          consumable: '耗材',
                          accessories: '辅料',
                        }).map(([key, label]) => (
                          <label key={key} className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.bizAttributes[key as keyof typeof formData.bizAttributes]}
                              onChange={e =>
                                setFormData({
                                  ...formData,
                                  bizAttributes: {
                                    ...formData.bizAttributes,
                                    [key]: e.target.checked,
                                  },
                                })
                              }
                              className="rounded text-blue-600"
                            />
                            <span>{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                          采购提前期 (天)
                        </label>
                        <input
                          type="number"
                          value={formData.purchaseLeadTime}
                          onChange={e => setFormData({ ...formData, purchaseLeadTime: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                          自制提前期 (天)
                        </label>
                        <input
                          type="number"
                          value={formData.selfLeadTime}
                          onChange={e => setFormData({ ...formData, selfLeadTime: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                        <span className="text-red-500 mr-0.5">*</span>规格
                      </label>
                      <input
                        type="text"
                        placeholder="如: HY-08SCV-V14.0"
                        value={formData.materialSpec}
                        onChange={e => setFormData({ ...formData, materialSpec: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                          <span className="text-red-500 mr-0.5">*</span>主单位
                        </label>
                        <input
                          type="text"
                          value={formData.unit}
                          onChange={e => setFormData({ ...formData, unit: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                          辅单位
                        </label>
                        <input
                          type="text"
                          placeholder="选填"
                          value={formData.auxUnit}
                          onChange={e => setFormData({ ...formData, auxUnit: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                          型号
                        </label>
                        <input
                          type="text"
                          placeholder="选填"
                          value={formData.model}
                          onChange={e => setFormData({ ...formData, model: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 底部图片与二维码 */}
                <div className="pt-2">
                  <div className="bg-[#fafbfd] dark:bg-slate-800/40 p-4 rounded-lg border border-slate-200/70 dark:border-slate-700/70 flex gap-4 max-w-xl">
                    <div className="flex-1 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-3 text-center flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                      <ImageIcon className="w-5 h-5 text-slate-400 mb-1" />
                      <span className="text-[11px] text-slate-600 dark:text-slate-300">上传图片</span>
                    </div>
                    <div className="flex-1 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-3 text-center flex flex-col items-center justify-center">
                      <QrCode className="w-5 h-5 text-slate-400 mb-1" />
                      <span className="text-[11px] text-slate-400">二维码 (生成后展示)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= STEP 2: 包装材质参数 ================= */}
            {activeStep === 2 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="border-l-4 border-blue-600 pl-3">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-white">包装材质参数</h3>
                  <p className="text-slate-400 text-[11px]">
                    维护包装口径、材质品牌、尺寸、重量和物理参数。
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* 包装与用量 */}
                  <div className="bg-[#fafbfd] dark:bg-slate-800/40 p-4 rounded-lg border border-slate-200/70 dark:border-slate-700/70 space-y-3">
                    <div className="border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
                      <span className="font-bold text-slate-700 dark:text-slate-200">包装与用量</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">包装方式</label>
                        <input
                          type="text"
                          value={formData.packMethod}
                          onChange={e => setFormData({ ...formData, packMethod: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">每箱包装数</label>
                        <input
                          type="number"
                          value={formData.packQuantity}
                          onChange={e => setFormData({ ...formData, packQuantity: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">封口封装</label>
                        <input
                          type="text"
                          value={formData.packSeal}
                          onChange={e => setFormData({ ...formData, packSeal: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">保质期 (天)</label>
                        <input
                          type="number"
                          value={formData.shelfLifeDays}
                          onChange={e => setFormData({ ...formData, shelfLifeDays: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 材质与物理参数 */}
                  <div className="bg-[#fafbfd] dark:bg-slate-800/40 p-4 rounded-lg border border-slate-200/70 dark:border-slate-700/70 space-y-3">
                    <div className="border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
                      <span className="font-bold text-slate-700 dark:text-slate-200">材质与物理参数</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">品牌</label>
                        <input
                          type="text"
                          value={formData.brand}
                          onChange={e => setFormData({ ...formData, brand: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">材质</label>
                        <input
                          type="text"
                          value={formData.materialQuality}
                          onChange={e => setFormData({ ...formData, materialQuality: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">长 (cm)</label>
                        <input
                          type="number"
                          value={formData.lengthCm}
                          onChange={e => setFormData({ ...formData, lengthCm: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">宽 (cm)</label>
                        <input
                          type="number"
                          value={formData.widthCm}
                          onChange={e => setFormData({ ...formData, widthCm: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">高 (cm)</label>
                        <input
                          type="number"
                          value={formData.heightCm}
                          onChange={e => setFormData({ ...formData, heightCm: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= STEP 3: 仓库采购成本 ================= */}
            {activeStep === 3 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="border-l-4 border-blue-600 pl-3">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-white">仓库采购成本</h3>
                  <p className="text-slate-400 text-[11px]">
                    维护仓储库存、采购策略、财务科目和批次追溯。
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-[#fafbfd] dark:bg-slate-800/40 p-4 rounded-lg border border-slate-200/70 dark:border-slate-700/70 space-y-3">
                    <div className="border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
                      <span className="font-bold text-slate-700 dark:text-slate-200">仓储库存</span>
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">默认仓库/库区/库位</label>
                      <input
                        type="text"
                        value={formData.defaultWarehouse}
                        onChange={e => setFormData({ ...formData, defaultWarehouse: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">ABC分类</label>
                        <select
                          value={formData.abcCategory}
                          onChange={e => setFormData({ ...formData, abcCategory: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200"
                        >
                          <option value="A类">A类 (重点控制)</option>
                          <option value="B类">B类 (常规物料)</option>
                          <option value="C类">C类 (通用耗材)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">货位管理</label>
                        <div className="flex items-center gap-4 pt-1.5">
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name="locationManage"
                              checked={!formData.locationManage}
                              onChange={() => setFormData({ ...formData, locationManage: false })}
                            />
                            <span>否</span>
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name="locationManage"
                              checked={formData.locationManage}
                              onChange={() => setFormData({ ...formData, locationManage: true })}
                            />
                            <span>是</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#fafbfd] dark:bg-slate-800/40 p-4 rounded-lg border border-slate-200/70 dark:border-slate-700/70 space-y-3">
                    <div className="border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
                      <span className="font-bold text-slate-700 dark:text-slate-200">财务与订货策略</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">标准价 (元)</label>
                        <input
                          type="number"
                          value={formData.standardPrice}
                          onChange={e => setFormData({ ...formData, standardPrice: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">标准成本 (元)</label>
                        <input
                          type="number"
                          value={formData.standardCost}
                          onChange={e => setFormData({ ...formData, standardCost: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= STEP 4: 工程信息 ================= */}
            {activeStep === 4 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="border-l-4 border-blue-600 pl-3">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-white">工程信息</h3>
                  <p className="text-slate-400 text-[11px]">
                    补充工程工艺、表面热处理、领料工位和设计人员。
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-[#fafbfd] dark:bg-slate-800/40 p-4 rounded-lg border border-slate-200/70 dark:border-slate-700/70 space-y-3">
                    <div className="border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
                      <span className="font-bold text-slate-700 dark:text-slate-200">工程工艺</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">部件名称</label>
                        <input
                          type="text"
                          value={formData.partName}
                          onChange={e => setFormData({ ...formData, partName: e.target.value })}
                          placeholder="如: 接驳台主体机构"
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">设计人员</label>
                        <input
                          type="text"
                          value={formData.designer}
                          onChange={e => setFormData({ ...formData, designer: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">表面处理</label>
                        <input
                          type="text"
                          value={formData.surfaceTreatment}
                          onChange={e => setFormData({ ...formData, surfaceTreatment: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">工序与工位</label>
                        <input
                          type="text"
                          value={formData.pickingStation}
                          onChange={e => setFormData({ ...formData, pickingStation: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#fafbfd] dark:bg-slate-800/40 p-4 rounded-lg border border-slate-200/70 dark:border-slate-700/70 space-y-3">
                    <div className="border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
                      <span className="font-bold text-slate-700 dark:text-slate-200">备注说明</span>
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">工程备注</label>
                      <textarea
                        rows={5}
                        placeholder="输入设计选型说明、装配要求或特殊工艺标准..."
                        value={formData.remarks}
                        onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= STEP 5: 图号管理 (图号主档与版本结构管理) ================= */}
            {activeStep === 5 && (
              <div className="space-y-4 animate-fadeIn">
                {/* 顶部概览与联动控制条 (图2样式: 左侧蓝边框竖条) */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-700/80">
                  <div className="border-l-4 border-blue-600 pl-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                        图纸列表
                      </h3>
                      {formData.drawingNo && (
                        <span className="px-2 py-0.5 text-[11px] font-mono font-bold rounded bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {formData.drawingNo}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      在此维护物料的图纸文件。
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end flex-wrap">
                    {!formData.drawingNo || formData.drawingNo.trim() === '' ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (onNavigateToDrawingManagement) {
                            onNavigateToDrawingManagement(`CREATE_MAT_${initialMaterial?.id || formData.materialCode}`);
                          } else {
                            setInputNewDrawingNo(`DRW-${formData.materialCode || Math.floor(10000 + Math.random() * 90000)}`);
                            setIsLinkMasterModalOpen(true);
                          }
                        }}
                        className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        新增图号
                      </button>
                    ) : (
                      <>
                        {!isNoVersionMode && (
                          <button
                            type="button"
                            onClick={() => handleCreateDraftVersion(localVersions[0]?.versionNo)}
                            className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                            title="发起新版本草稿"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            发起新版本变更
                          </button>
                        )}
                      </>
                    )}

                    {onNavigateToDrawingManagement && (
                      <button
                        type="button"
                        onClick={() => onNavigateToDrawingManagement(formData.drawingNo.trim() || initialMaterial?.drawingNo || initialMaterial?.id || undefined)}
                        className="px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                        title="在独立窗口中打开图号管理中心"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                        图号中心
                      </button>
                    )}
                  </div>
                </div>

                {/* 图号主档配置栏 (已关联图号时展示) */}
                {Boolean(formData.drawingNo && formData.drawingNo.trim() !== '') && (
                  <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-lg border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                    <div className={`grid grid-cols-1 sm:grid-cols-2 ${!isNoVersionMode ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-3 items-end`}>
                      {/* 1. 关联图号 */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                          <Box className="w-3.5 h-3.5 text-blue-600" />
                          关联图号
                        </label>
                        <input
                          type="text"
                          placeholder="如: DRW-01063 或 X0610-C004-G14"
                          value={formData.drawingNo}
                          onChange={e => {
                            const val = e.target.value;
                            setFormData(prev => ({ ...prev, drawingNo: val }));
                            setLocalVersions(prev => prev.map(v => ({ ...v, drawingNo: val })));
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-mono text-xs font-semibold h-[34px]"
                        />
                      </div>

                      {/* 2. 图号状态 */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                          图号状态
                        </label>
                        <div className="bg-slate-50 dark:bg-slate-900/60 px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs h-[34px]">
                          <span className="text-slate-500 text-[11px]">当前状态:</span>
                          {(() => {
                            const curStatus = linkedMaster?.status || localVersions[0]?.status || formData.drawingStatus || 'PUBLISHED';
                            if (curStatus === 'DRAFT') {
                              return <span className="font-bold px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600">草稿</span>;
                            }
                            if (curStatus === 'PENDING_REVIEW') {
                              return <span className="font-bold px-2 py-0.5 rounded text-[11px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700">待审批</span>;
                            }
                            return <span className="font-bold px-2 py-0.5 rounded text-[11px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">已发布</span>;
                          })()}
                        </div>
                      </div>

                      {/* 3. 图纸版本 */}
                      {!isNoVersionMode && (
                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                            图纸版本
                          </label>
                          <div className="bg-slate-50 dark:bg-slate-900/60 px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs h-[34px]">
                            <span className="text-slate-500 text-[11px]">已知版本:</span>
                            <span className="font-bold font-mono text-blue-600">{localVersions.length} 个版本</span>
                          </div>
                        </div>
                      )}

                      {/* 4. 总图纸文件 */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                          总图纸文件
                        </label>
                        <div className="bg-slate-50 dark:bg-slate-900/60 px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs h-[34px]">
                          <span className="text-slate-500 text-[11px]">文件数量:</span>
                          <span className="font-bold font-mono text-indigo-600">
                            {localVersions.reduce((sum, v) => sum + (v.files?.length || 0), 0)} 份
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 未关联图号时的提示 */}
                {(!formData.drawingNo || formData.drawingNo.trim() === '') ? (
                  <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 space-y-3 shadow-2xs my-4">
                    <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center mx-auto">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-white">当前物料尚未建立工程图号</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                        暂无关联的工程图号信息。点击下方按钮前往图号管理新建。
                      </p>
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (onNavigateToDrawingManagement) {
                              onNavigateToDrawingManagement(`CREATE_MAT_${initialMaterial?.id || formData.materialCode}`);
                            } else {
                              setInputNewDrawingNo(`DRW-${formData.materialCode || Math.floor(10000 + Math.random() * 90000)}`);
                              setIsLinkMasterModalOpen(true);
                            }
                          }}
                          className="px-3.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          新增图号
                        </button>
                      </div>
                    </div>
                  </div>
                ) : isNoVersionMode ? (
                  /* 无版本模式：直接展示工程图纸文件列表 */
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs overflow-hidden">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-850">
                      <div className="flex items-center gap-2">
                        <FolderArchive className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-bold text-slate-800 dark:text-white">
                          工程图纸文件清单 ({localVersions.reduce((sum, v) => sum + (v.files?.length || 0), 0)} 份)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {!(formData.drawingStatus === 'PUBLISHED' || formData.drawingStatus === 'PENDING_REVIEW') && (
                          <button
                            type="button"
                            onClick={() => {
                              const targetVer = localVersions[0] || {
                                id: 'ver-direct',
                                versionNo: '1',
                                drawingNo: formData.drawingNo,
                                status: 'PUBLISHED' as const,
                                isDefault: true,
                                isActive: true,
                                createdAt: new Date().toLocaleString(),
                                createdBy: '张工 (研发一部)',
                                notes: '物料工程图纸',
                                files: [],
                              };
                              if (localVersions.length === 0) {
                                setLocalVersions([targetVer]);
                              }
                              handleOpenUploadModal(localVersions[0] || targetVer);
                            }}
                            className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            上传/添加图纸文件
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedDrawingFileIds.length === 0) {
                              alert('请勾选要下载的工程图纸文件');
                              return;
                            }
                            showToast(`已开始批量下载选中的 ${selectedDrawingFileIds.length} 份工程图纸！`);
                          }}
                          disabled={selectedDrawingFileIds.length === 0}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer ${
                            selectedDrawingFileIds.length > 0
                              ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-2xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60'
                          }`}
                          title="勾选图纸后批量下载"
                        >
                          <Download className="w-3.5 h-3.5" />
                          批量下载 {selectedDrawingFileIds.length > 0 ? `(${selectedDrawingFileIds.length})` : ''}
                        </button>
                      </div>
                    </div>

                    <div className="p-4">
                      {localVersions.reduce((sum, v) => sum + (v.files?.length || 0), 0) === 0 ? (
                        <div className="py-12 text-center bg-slate-50/50 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                          <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                          <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
                            当前物料暂未上传图纸文件
                          </div>
                          <p className="text-xs text-slate-400">
                            支持上传 DWG、DXF、STEP、IGS、SLDPRT、PDF 等格式工程图纸
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50/80 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                                <th className="py-2.5 px-3 font-semibold w-10 text-center">
                                  <input
                                    type="checkbox"
                                    checked={(() => {
                                      const allFiles = localVersions.flatMap(v => v.files || []);
                                      return allFiles.length > 0 && allFiles.every(f => selectedDrawingFileIds.includes(f.id || f.fileName));
                                    })()}
                                    onChange={e => {
                                      const allFiles = localVersions.flatMap(v => v.files || []);
                                      const ids = allFiles.map(f => f.id || f.fileName);
                                      if (e.target.checked) {
                                        setSelectedDrawingFileIds(prev => Array.from(new Set([...prev, ...ids])));
                                      } else {
                                        setSelectedDrawingFileIds(prev => prev.filter(id => !ids.includes(id)));
                                      }
                                    }}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  />
                                </th>
                                <th className="py-2.5 px-3 font-semibold w-10 text-center">#</th>
                                <th className="py-2.5 px-3 font-semibold w-24">格式类型</th>
                                <th className="py-2.5 px-3 font-semibold">文件名</th>
                                <th className="py-2.5 px-3 font-semibold w-24">大小</th>
                                <th className="py-2.5 px-3 font-semibold w-36">SHA-256校验</th>
                                <th className="py-2.5 px-3 font-semibold w-32">上传人/时间</th>
                                <th className="py-2.5 px-3 font-semibold text-right w-36">操作</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 bg-white dark:bg-slate-800">
                              {localVersions.flatMap((version) => (version.files || []).map((file, fIdx) => {
                                const fileKey = file.id || file.fileName;
                                const isChecked = selectedDrawingFileIds.includes(fileKey);

                                return (
                                  <tr
                                    key={file.id || fIdx}
                                    className="hover:bg-blue-50/30 dark:hover:bg-slate-700/40 transition-colors"
                                  >
                                    <td className="py-2.5 px-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {
                                          setSelectedDrawingFileIds(prev =>
                                            prev.includes(fileKey) ? prev.filter(k => k !== fileKey) : [...prev, fileKey]
                                          );
                                        }}
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                      />
                                    </td>
                                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                                      {fIdx + 1}
                                    </td>
                                    <td className="py-2.5 px-3">
                                      {(() => {
                                        const ftBadge = getFileTypeBadge(file.fileType);
                                        return (
                                          <span
                                            className={`px-1.5 py-0.5 text-[10px] font-bold rounded font-mono border ${ftBadge.color}`}
                                          >
                                            {ftBadge.short || file.fileType}
                                          </span>
                                        );
                                      })()}
                                    </td>
                                    <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                      <span className="truncate max-w-xs font-mono" title={file.fileName}>
                                        {file.fileName}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 font-mono text-slate-500">
                                      {formatFileSize(file.fileSize)}
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[10px]">
                                      <span className="flex items-center gap-1">
                                        <ShieldCheck className="w-3 h-3 text-emerald-500" />
                                        {file.fileHash?.slice(0, 16) || 'SHA-256:8f2a9e...'}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                                      <div>{file.uploader || '张工'}</div>
                                      <div className="text-slate-400 text-[10px]">
                                        {file.uploadTime?.split(' ')[0] || '2026-09-01'}
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-3 text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setPreviewModalData({
                                              file,
                                              version,
                                            })
                                          }
                                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded cursor-pointer transition-colors"
                                          title="在线预览图纸/3D数模"
                                        >
                                          <Eye className="w-3.5 h-3.5" />
                                        </button>
                                        {!(formData.drawingStatus === 'PUBLISHED' || formData.drawingStatus === 'PENDING_REVIEW') && (
                                          <button
                                            type="button"
                                            onClick={() => handleOpenEditFileModal(version, file)}
                                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded cursor-pointer transition-colors"
                                            title="编辑图纸信息"
                                          >
                                            <Pencil className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() =>
                                            alert(`正在下载 ${file.fileName}...`)
                                          }
                                          className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded cursor-pointer transition-colors"
                                          title="下载原文件"
                                        >
                                          <Download className="w-3.5 h-3.5" />
                                        </button>
                                        {!(formData.drawingStatus === 'PUBLISHED' || formData.drawingStatus === 'PENDING_REVIEW') && (
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveFileFromVersion(version.id, file.id, file.fileName, file.fileType)}
                                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded cursor-pointer transition-colors"
                                            title="删除该图纸文件"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              }))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* 版本演进模式：展示版本卡片列表与完整审批、编辑、上传操作 */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-blue-600" />
                        图号版本演进与文件结构 ({localVersions.length})
                      </span>
                      <span className="text-[11px] text-slate-400">
                        支持发起草稿、图纸上传编辑、审批流转、设为默认及文件下载
                      </span>
                    </div>

                    {localVersions.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 space-y-3">
                        <GitBranch className="w-8 h-8 text-slate-400 mx-auto" />
                        <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
                          暂未建立图纸版本记录
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCreateDraftVersion()}
                          className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          新增初版 V1.0 草稿
                        </button>
                      </div>
                    ) : (
                    localVersions.map(version => {
                      const isExpanded = expandedVersionId === version.id;
                      const activeSubTab = versionSubTab[version.id] || 'files';
                      const isDraft = version.status === 'DRAFT';
                      const isPublished = version.status === 'PUBLISHED';
                      const isPending = version.status === 'PENDING_REVIEW';
                      const fileCount = version.files?.length || 0;

                      return (
                        <div
                          key={version.id}
                          className={`bg-white dark:bg-slate-800/90 rounded-xl border transition-all duration-200 shadow-2xs overflow-hidden ${
                            version.isDefault
                              ? 'border-amber-400 dark:border-amber-500/80 ring-1 ring-amber-400/20'
                              : isExpanded
                              ? 'border-blue-400 dark:border-blue-600/80'
                              : 'border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {/* 版本头部条 */}
                          <div
                            className={`p-3.5 flex flex-wrap items-center justify-between gap-3 select-none cursor-pointer transition-colors ${
                              isExpanded
                                ? 'bg-slate-50/90 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-700/80'
                                : 'hover:bg-slate-50/60 dark:hover:bg-slate-800'
                            }`}
                            onClick={() => setExpandedVersionId(isExpanded ? null : version.id)}
                          >
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <button
                                type="button"
                                className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                              >
                                <ChevronRight
                                  className={`w-4 h-4 transition-transform duration-200 ${
                                    isExpanded ? 'rotate-90 text-blue-600' : ''
                                  }`}
                                />
                              </button>

                              {/* 版本号 */}
                              {editingVersionId === version.id ? (
                                <div
                                  className="flex items-center gap-1.5"
                                  onClick={e => e.stopPropagation()}
                                >
                                  <input
                                    type="text"
                                    value={editingVersionNo}
                                    onChange={e => setEditingVersionNo(e.target.value)}
                                    className="w-20 px-2 py-0.5 text-xs font-mono font-bold bg-white dark:bg-slate-800 border border-blue-500 rounded text-blue-600 focus:outline-none"
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveDraftVersionNo(version.id)}
                                    className="p-1 bg-blue-600 text-white rounded text-[10px] cursor-pointer"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingVersionId(null)}
                                    className="p-1 bg-slate-200 text-slate-600 rounded text-[10px] cursor-pointer"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <span className="font-mono font-bold text-sm text-slate-800 dark:text-white px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700/60 flex items-center gap-1">
                                  {version.versionNo}
                                  {isDraft && (
                                    <button
                                      type="button"
                                      onClick={e => {
                                        e.stopPropagation();
                                        setEditingVersionId(version.id);
                                        setEditingVersionNo(version.versionNo);
                                      }}
                                      className="text-slate-400 hover:text-blue-600 ml-1 cursor-pointer"
                                      title="修改版本号"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                  )}
                                </span>
                              )}

                              {/* 状态徽章 */}
                              {(() => {
                                const b = getStatusBadge(version.status);
                                return (
                                  <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${b.className}`}>
                                    {b.label}
                                  </span>
                                );
                              })()}

                              {version.isActive && (
                                <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                  ● 生效中
                                </span>
                              )}

                              {/* 创建信息 */}
                              <span className="text-[11px] text-slate-400 flex items-center gap-1 ml-1">
                                <Clock className="w-3 h-3" />
                                {version.createdAt}
                              </span>
                              {version.createdBy && (
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {version.createdBy}
                                </span>
                              )}
                              {version.ecoNumber && (
                                <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                                  {version.ecoNumber}
                                </span>
                              )}
                            </div>

                            {/* 版本卡片头部右侧操作工具条 */}
                            <div
                              className="flex items-center gap-1.5"
                              onClick={e => e.stopPropagation()}
                            >
                              {/* 1. 草稿状态专属操作: 严格仅有 编辑、删除、提交审批 */}
                              {isDraft && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenUploadModal(version)}
                                    className="px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800 flex items-center gap-1 cursor-pointer transition-colors"
                                    title="编辑草稿图纸"
                                  >
                                    <FileEdit className="w-3 h-3" />
                                    编辑
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDraftVersion(version.id)}
                                    className="px-2.5 py-1 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 rounded border border-rose-200 dark:border-rose-800 flex items-center gap-1 cursor-pointer transition-colors"
                                    title="删除该草稿版本"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    删除
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSubmitApprovalVersion(version);
                                      setSubmitReviewer('李工 (技术总监)');
                                      setSubmitNotes(`提交 ${version.versionNo} 工程图纸版本审批，已完成2D/3D校验`);
                                    }}
                                    className="px-2.5 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                    title="提交图纸版本进行技术审批"
                                  >
                                    <Send className="w-3 h-3" />
                                    提交审批
                                  </button>
                                </>
                              )}

                              {/* 2. 待审核状态专属操作 */}
                              {isPending && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setApproveVersion(version);
                                      setIsApproveAction(true);
                                      setApproveNotes('技术审查通过，准予发布并投入生产');
                                    }}
                                    className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                    title="审核批准并发布生效"
                                  >
                                    <Check className="w-3 h-3" />
                                    审核批准
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setApproveVersion(version);
                                      setIsApproveAction(false);
                                      setApproveNotes('图纸装配尺寸或技术要求不符合规范，驳回修改');
                                    }}
                                    className="px-2.5 py-1 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                    title="驳回至草稿状态"
                                  >
                                    <X className="w-3 h-3" />
                                    驳回草稿
                                  </button>
                                </>
                              )}

                              {/* 3. 已发布状态操作 */}
                              {isPublished && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleVersionActive(version.id, version.isActive)}
                                    className={`px-2 py-1 text-xs font-medium rounded border flex items-center gap-1 cursor-pointer transition-colors ${
                                      version.isActive
                                        ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                        : 'text-slate-500 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                                    }`}
                                    title={version.isActive ? '点击停用该版本' : '点击启用该版本'}
                                  >
                                    <RotateCw className="w-3 h-3" />
                                    {version.isActive ? '生效中' : '已停用'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleCreateDraftVersion(version.versionNo)}
                                    className="px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded border border-slate-300 dark:border-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                                    title="基于该版本发起新版本变更"
                                  >
                                    <CopyPlus className="w-3 h-3 text-blue-600" />
                                    发起变更
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleBatchDownload(version)}
                                    className="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded cursor-pointer transition-colors"
                                    title="打包下载该版本全部图纸"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* 展开内容区域：图纸文件清单 与 变更信息 */}
                          {isExpanded && (
                            <div className="p-4 space-y-3 bg-white dark:bg-slate-800">
                              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setVersionSubTab(prev => ({ ...prev, [version.id]: 'files' }))}
                                    className={`px-2.5 py-1 text-xs font-semibold rounded cursor-pointer transition-colors flex items-center gap-1.5 ${
                                      activeSubTab === 'files'
                                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                    }`}
                                  >
                                    <FolderArchive className="w-3.5 h-3.5" />
                                    图纸文件清单 ({fileCount})
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setVersionSubTab(prev => ({ ...prev, [version.id]: 'info' }))}
                                    className={`px-2.5 py-1 text-xs font-semibold rounded cursor-pointer transition-colors flex items-center gap-1.5 ${
                                      activeSubTab === 'info'
                                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                    }`}
                                  >
                                    <Info className="w-3.5 h-3.5" />
                                    版本变更履历与工程参数
                                  </button>
                                </div>

                                <div className="flex items-center gap-2">
                                  {(version.status === 'DRAFT' || version.status === 'REJECTED') && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenUploadModal(version)}
                                      className="px-2.5 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                    >
                                      <Plus className="w-3 h-3" />
                                      上传图纸文件
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const verFiles = version.files || [];
                                      const selectedInVer = verFiles.filter(f => selectedDrawingFileIds.includes(f.id || f.fileName));
                                      if (selectedInVer.length === 0) {
                                        alert('请先勾选需要批量下载的工程图纸文件');
                                        return;
                                      }
                                      showToast(`已开始批量打包并下载选中的 ${selectedInVer.length} 份工程图纸！`);
                                    }}
                                    className={`px-2.5 py-1 text-xs font-semibold rounded border flex items-center gap-1 transition-colors cursor-pointer ${
                                      (version.files || []).some(f => selectedDrawingFileIds.includes(f.id || f.fileName))
                                        ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-2xs'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 opacity-60'
                                    }`}
                                  >
                                    <Download className="w-3 h-3" />
                                    批量下载
                                  </button>
                                </div>
                              </div>

                              {activeSubTab === 'files' ? (
                                <div className="space-y-3">
                                  {fileCount === 0 ? (
                                    <div className="py-8 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg text-xs space-y-2">
                                      <FileText className="w-6 h-6 mx-auto text-slate-300 dark:text-slate-600" />
                                      <div>该版本暂无关联图纸文件</div>
                                      {(version.status === 'DRAFT' || version.status === 'REJECTED') && (
                                        <button
                                          type="button"
                                          onClick={() => handleOpenUploadModal(version)}
                                          className="px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded border border-blue-200 cursor-pointer"
                                        >
                                          立即上传图纸
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                                      <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                          <tr className="bg-slate-50/80 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                                            <th className="py-2 px-3 font-semibold w-10 text-center">
                                              <input
                                                type="checkbox"
                                                checked={
                                                  (version.files || []).length > 0 &&
                                                  (version.files || []).every(f => selectedDrawingFileIds.includes(f.id || f.fileName))
                                                }
                                                onChange={e => {
                                                  const verFileIds = (version.files || []).map(f => f.id || f.fileName);
                                                  if (e.target.checked) {
                                                    setSelectedDrawingFileIds(prev => Array.from(new Set([...prev, ...verFileIds])));
                                                  } else {
                                                    setSelectedDrawingFileIds(prev => prev.filter(id => !verFileIds.includes(id)));
                                                  }
                                                }}
                                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                              />
                                            </th>
                                            <th className="py-2 px-3 font-semibold w-10 text-center">#</th>
                                            <th className="py-2 px-3 font-semibold w-24">格式类型</th>
                                            <th className="py-2 px-3 font-semibold">文件名</th>
                                            <th className="py-2 px-3 font-semibold w-24">大小</th>
                                            <th className="py-2 px-3 font-semibold w-36">SHA-256校验</th>
                                            <th className="py-2 px-3 font-semibold w-32">上传人/时间</th>
                                            <th className="py-2 px-3 font-semibold text-right w-36">操作</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 bg-white dark:bg-slate-800">
                                          {version.files?.map((file, fIdx) => {
                                            const fileKey = file.id || file.fileName;
                                            const isChecked = selectedDrawingFileIds.includes(fileKey);

                                            return (
                                              <tr
                                                key={file.id || fIdx}
                                                className="hover:bg-blue-50/30 dark:hover:bg-slate-700/40 transition-colors"
                                              >
                                                <td className="py-2 px-3 text-center">
                                                  <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => {
                                                      setSelectedDrawingFileIds(prev =>
                                                        prev.includes(fileKey) ? prev.filter(k => k !== fileKey) : [...prev, fileKey]
                                                      );
                                                    }}
                                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                  />
                                                </td>
                                                <td className="py-2 px-3 text-center text-slate-400 font-mono">
                                                  {fIdx + 1}
                                                </td>
                                                <td className="py-2 px-3">
                                                  {(() => {
                                                    const ftBadge = getFileTypeBadge(file.fileType);
                                                    return (
                                                      <span
                                                        className={`px-1.5 py-0.5 text-[10px] font-bold rounded font-mono border ${ftBadge.color}`}
                                                      >
                                                        {ftBadge.short || file.fileType}
                                                      </span>
                                                    );
                                                  })()}
                                                </td>
                                                <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                                  <span className="truncate max-w-xs font-mono" title={file.fileName}>
                                                    {file.fileName}
                                                  </span>
                                                </td>
                                                <td className="py-2 px-3 font-mono text-slate-500">
                                                  {formatFileSize(file.fileSize)}
                                                </td>
                                                <td className="py-2 px-3 text-slate-400 font-mono text-[10px]">
                                                  <span className="flex items-center gap-1">
                                                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                                                    {file.fileHash?.slice(0, 16) || 'SHA-256:8f2a9e...'}
                                                  </span>
                                                </td>
                                                <td className="py-2 px-3 text-slate-500 text-[11px]">
                                                  <div>{file.uploader || '张工'}</div>
                                                  <div className="text-slate-400 text-[10px]">
                                                    {file.uploadTime?.split(' ')[0] || '2026-09-01'}
                                                  </div>
                                                </td>
                                                <td className="py-2 px-3 text-right">
                                                  <div className="flex items-center justify-end gap-1">
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        setPreviewModalData({
                                                          file,
                                                          version,
                                                        })
                                                      }
                                                      className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded cursor-pointer transition-colors"
                                                      title="在线预览图纸/3D数模"
                                                    >
                                                      <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => handleOpenEditFileModal(version, file)}
                                                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded cursor-pointer transition-colors"
                                                      title="编辑图纸信息"
                                                    >
                                                      <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        alert(`正在下载 ${file.fileName}...`)
                                                      }
                                                      className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded cursor-pointer transition-colors"
                                                      title="下载原文件"
                                                    >
                                                      <Download className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => handleRemoveFileFromVersion(version.id, file.id, file.fileName, file.fileType)}
                                                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded cursor-pointer transition-colors"
                                                      title="删除该图纸文件"
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
                              ) : (
                                /* 版本变更信息页签 */
                                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 text-xs space-y-2.5">
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div>
                                      <span className="text-slate-400 block mb-0.5">ECO 变更单号:</span>
                                      <span className="font-mono font-semibold text-purple-600 dark:text-purple-400">
                                        {version.ecoNumber || 'ECO-2026-INIT'}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 block mb-0.5">创建人员:</span>
                                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                                        {version.createdBy || '张工 (研发一部)'}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 block mb-0.5">归档时间:</span>
                                      <span className="font-mono text-slate-600 dark:text-slate-400">
                                        {version.createdAt}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 block mb-0.5">受控状态:</span>
                                      <span className="font-semibold text-emerald-600">
                                        {version.status === 'PUBLISHED' ? '受控正式发布' : version.status === 'PENDING_REVIEW' ? '审批流程中' : '工程草稿'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="border-t border-slate-200 dark:border-slate-800 pt-2">
                                    <span className="text-slate-400 block mb-1">设计变更说明与审批记录:</span>
                                    <p className="text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-2.5 rounded border border-slate-200 dark:border-slate-700/80">
                                      {version.notes || '物料工程图纸初始建立版本，完成2D装配出图与3D数模校验。'}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>)}
              </div>
            )}

            {/* ================= STEP 6: BOM组成 ================= */}
            {activeStep === 6 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="border-l-4 border-blue-600 pl-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 dark:text-white">BOM组成结构</h3>
                    <p className="text-slate-400 text-[11px]">
                      维护BOM组成物料，包含子项物料编码、规格、调用图纸版本、标准用量与版本状态。
                    </p>
                  </div>
                  {matchedBOM && (
                    <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold rounded border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      已关联 BOM: {matchedBOM.bomCode} ({matchedBOM.versionNo})
                    </span>
                  )}
                </div>

                {matchedBOM ? (
                  <div className="space-y-3">
                    {/* BOM 摘要概览卡片 */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-4">
                        <div>
                          <span className="text-slate-400">BOM编号: </span>
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{matchedBOM.bomCode}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">BOM名称: </span>
                          <span className="font-semibold text-slate-700 dark:text-slate-200">{matchedBOM.name}</span>
                        </div>
                        {!isNoVersionMode && (
                          <div>
                            <span className="text-slate-400">版本: </span>
                            <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">{matchedBOM.versionNo}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-slate-400">状态: </span>
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 font-semibold text-[10px]">
                            {matchedBOM.status === 'PUBLISHED' ? '已发布生效' : matchedBOM.status === 'PUBLISHED' ? '已审核' : '草稿'}
                          </span>
                        </div>
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        共包含 <span className="font-bold text-blue-600 dark:text-blue-400">{matchedBOM.items.length}</span> 项子构件
                      </div>
                    </div>

                    {/* BOM 子件明细表格 */}
                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
                      <div className="overflow-x-auto max-h-80 overflow-y-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 font-semibold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                              <th className="py-2.5 px-3 w-12 text-center">序号</th>
                              <th className="py-2.5 px-3">子项物料编码</th>
                              <th className="py-2.5 px-3">子件名称</th>
                              <th className="py-2.5 px-3">规格</th>
                              <th className="py-2.5 px-3">关联图号</th>
                              {!isNoVersionMode && <th className="py-2.5 px-3">调用图纸版本</th>}
                              <th className="py-2.5 px-3 text-right">用量</th>
                              <th className="py-2.5 px-3 text-center">单位</th>
                              <th className="py-2.5 px-3 text-center">图纸状态</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                            {matchedBOM.items.map((item, idx) => (
                              <tr key={item.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                                <td className="py-2 px-3 font-mono font-medium text-blue-600 dark:text-blue-400">{item.materialCode}</td>
                                <td className="py-2 px-3 font-medium">{item.materialName}</td>
                                <td className="py-2 px-3 text-slate-500 max-w-[150px] truncate">{item.materialSpec || '-'}</td>
                                <td className="py-2 px-3 font-mono text-[11px]">{item.drawingNo || '-'}</td>
                                {!isNoVersionMode && (
                                  <td className="py-2 px-3">
                                    {item.versionNo ? (
                                      <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-mono text-[11px] font-semibold border border-blue-200/60 dark:border-blue-800">
                                        {item.versionNo}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400">-</span>
                                    )}
                                  </td>
                                )}
                                <td className="py-2 px-3 text-right font-mono font-semibold">{item.quantity}</td>
                                <td className="py-2 px-3 text-center text-slate-500">{item.unit || 'PCS'}</td>
                                <td className="py-2 px-3 text-center">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                    ● 已发布受控
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#fafbfd] dark:bg-slate-800/40 p-12 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-3">
                    <Layers className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                    <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                      该物料暂未建立直接 BOM 构件树
                    </div>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      当前物料可作为独立标准件/零件被其他产品 BOM 调用，亦可由工程设计团队在 BOM 管理中心新增多层装配 BOM 结构。
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 底部保存与切换栏 (与截图完全一致) */}
          <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">
                当前步骤: {activeStep} / {steps.length} - {steps.find(s => s.id === activeStep)?.title}
              </span>
            </div>

            <div className="flex items-center gap-2">

              {activeStep > 1 && (
                <button
                  type="button"
                  onClick={() => setActiveStep(prev => prev - 1)}
                  className="px-4 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  上一步
                </button>
              )}

              {activeStep < steps.length && (
                <button
                  type="button"
                  onClick={() => setActiveStep(prev => prev + 1)}
                  className="px-4 py-1.5 text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
                >
                  下一步
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
              >
                取消
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                保存
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 1. 图纸预览弹窗 */}
      {previewModalData && (
        <DrawingPreviewModal
          file={previewModalData.file}
          version={previewModalData.version}
          materialName={formData.materialName || '物料图纸'}
          materialSpec={formData.materialSpec}
          onClose={() => setPreviewModalData(null)}
        />
      )}

      {/* 2. 批量上传/添加图纸文件弹窗 */}
      {uploadModalVersion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 flex flex-col max-h-[88vh] overflow-hidden">
            {/* 头部 */}
            <div className="p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                    批量上传/挂载图纸文件
                    <span className="text-xs px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-mono font-semibold">
                      版本: {uploadModalVersion.versionNo}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    物料: <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">[{formData.materialCode}]</span> {formData.materialName}（图号: {formData.drawingNo || '未分配'}）
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

            {/* 主体 */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
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
                    handleAddFilesToMaterialModal(e.dataTransfer.files);
                  }
                }}
                className={`border-2 border-dashed rounded-xl p-5 text-center transition-all relative cursor-pointer ${
                  isDragOverUpload
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40'
                    : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 bg-slate-50/60 dark:bg-slate-800/40'
                }`}
              >
                <input 
                  type="file" 
                  ref={materialFileInputRef}
                  multiple
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleAddFilesToMaterialModal(e.target.files);
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="flex flex-col items-center justify-center pointer-events-none">
                  <div className="p-2.5 bg-blue-100/80 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full mb-2">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                    点击选择或将多张工程图纸拖拽至此处批量上传
                  </p>
                  <p className="text-slate-400 text-[11px] mt-1">
                    支持按住 <kbd className="px-1 py-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded font-mono">Ctrl</kbd> 或 <kbd className="px-1 py-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded font-mono">Shift</kbd> 一次性批量上传多张图纸（DWG / STEP / PDF / DXF / SLDPRT / SLDASM）
                  </p>
                </div>
              </div>

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
                    批量上传图纸文件名必须同时包含当前物料图号 <strong className="font-mono text-blue-700 dark:text-blue-300">「{formData.drawingNo || `DRW-${formData.materialCode || '01063'}`}」</strong> 与物料名称 <strong className="text-blue-700 dark:text-blue-300">「{formData.materialName || '零件'}」</strong>。系统会自动逐条进行语义校验，<strong>仅校验通过的合规图纸允许挂载入库</strong>，未匹配项将明确提示原因并拦截。
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
                    onClick={handleLoadMaterialTestScenarios}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                    title="一键注入 6 种测试场景：合规通过、缺物料名、错图号、无规范命名、不支持格式"
                  >
                    <FlaskConical className="w-3.5 h-3.5" />
                    测试多场景图纸上传 (合规/异常)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadMaterialPresetSuite('STANDARD_4')}
                    className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-750 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-medium rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  >
                    <Plus className="w-3 h-3" />
                    标准4件套 (DWG+STEP+PDF+DXF)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadMaterialPresetSuite('CAD_3D')}
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
                  const base = formData.drawingNo || `DRW-${formData.materialCode || '01063'}`;
                  const matName = formData.materialName || '零件';
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
                            <span>待挂载图纸清单 ({total} 份)</span>
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
                                  onClick={handleAutoFixAllMaterialFiles}
                                  className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium flex items-center gap-1 hover:underline cursor-pointer"
                                  title="批量将未匹配项按「图号+版本+物料名称」规范自动重命名"
                                >
                                  <Wand2 className="w-3 h-3" />
                                  一键修复规范命名
                                </button>
                                <span className="text-slate-300 dark:text-slate-700">|</span>
                                <button
                                  type="button"
                                  onClick={handleRemoveInvalidMaterialFiles}
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
                          <div>暂无待挂载图纸</div>
                          <div className="text-[11px] text-slate-400">请通过上方拖拽、点击选择或快捷测试按钮添加图纸</div>
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
                                            onClick={() => handleAutoFixSingleMaterialFile(item.id)}
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

              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 rounded-xl text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                <span>
                  批量上传后系统将自动进行 SHA-256 校验与 CAD 图层解析（自动提取 0_OUTLINE, DIMENSIONS,
                  CENTERLINES 等工程图层），保障与物料主数据数模一致性。
                </span>
              </div>
            </div>

            {/* 底部操作与统计栏 */}
            {(() => {
              const base = formData.drawingNo || `DRW-${formData.materialCode || '01063'}`;
              const matName = formData.materialName || '零件';
              const total = uploadModalFiles.length;
              const validCount = uploadModalFiles.filter(f => validateDrawingFileMatch(f.fileName, base, matName).isValid).length;
              const invalidCount = total - validCount;

              return (
                <div className="p-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 flex-wrap">
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
                      className="px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      disabled={validCount === 0}
                      onClick={handleConfirmAddFiles}
                      className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg cursor-pointer flex items-center gap-1.5 shadow-2xs transition-colors"
                      title={validCount === 0 ? '当前列表无通过命名规范的图纸，无法上传' : `确认上传 ${validCount} 份通过校验的图纸`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      确认批量挂载 ({validCount}/{total})
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 3. 新建版本弹窗 (NewVersionModal) */}
      {isNewVersionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                  发起工程图纸新版本变更
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewVersionModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  目标新版本号
                </label>
                <input
                  type="text"
                  placeholder="如: V1.1, V2.0"
                  value={newVersionInputNo}
                  onChange={e => setNewVersionInputNo(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-mono font-bold text-blue-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ECO 工程变更单号
                </label>
                <input
                  type="text"
                  placeholder="如: ECO-2026-0902"
                  value={newVersionEco}
                  onChange={e => setNewVersionEco(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  变更原因与设计要点
                </label>
                <textarea
                  rows={3}
                  placeholder="记录本次图号版本升级修改的装配尺寸、公差配合或技术要求..."
                  value={newVersionNotes}
                  onChange={e => setNewVersionNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              {baseVersionNoForCopy && (
                <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-500 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>
                    系统将自动复制基准版本 <strong className="text-slate-700 dark:text-slate-200 font-mono">{baseVersionNoForCopy}</strong> 的图纸文件结构至新版本草稿中。
                  </span>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsNewVersionModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmCreateDraftVersion}
                className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                创建版本草稿
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. 编辑图纸文件信息弹窗 (EditFileModal) */}
      {editingFileData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                  编辑工程图纸文件信息
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingFileData(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  文件格式类型
                </label>
                <select
                  value={editingFileData.fileType || 'DWG'}
                  onChange={e =>
                    setEditingFileData({
                      ...editingFileData,
                      fileType: e.target.value as any,
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                >
                  <option value="DWG">DWG (AutoCAD 二维图纸)</option>
                  <option value="DXF">DXF (二维数据交换格式)</option>
                  <option value="STEP">STEP (标准三维装配数模)</option>
                  <option value="IGS">IGS (三维曲面/几何数据)</option>
                  <option value="SLDPRT">SLDPRT (SolidWorks 零件模型)</option>
                  <option value="PDF">PDF (受控工程发布图纸)</option>
                  <option value="DOCX">DOCX (技术说明与工艺卡)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  图纸文件名
                </label>
                <input
                  type="text"
                  value={editingFileData.fileName || ''}
                  onChange={e =>
                    setEditingFileData({
                      ...editingFileData,
                      fileName: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  SHA-256 数据校验指纹
                </label>
                <input
                  type="text"
                  readOnly
                  value="SHA-256:d82e817a09c..."
                  className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 font-mono text-[11px]"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingFileData(null)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmEditFile}
                className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. 提交审批弹窗 (SubmitApprovalModal) */}
      {submitApprovalVersion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                  提交图纸版本审批: {submitApprovalVersion.versionNo}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSubmitApprovalVersion(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-lg text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  提交后版本状态将变更为【待审核】
                </div>
                <p className="text-[11px] text-amber-700/80 dark:text-amber-400">
                  审批通过后，该版本将自动发布并作为受控工程图纸供 BOM 及生产制造调用。
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  指定技术审批人
                </label>
                <select
                  value={submitReviewer}
                  onChange={e => setSubmitReviewer(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                >
                  <option value="李工 (技术总监)">李工 (技术总监)</option>
                  <option value="王总 (工程部主管)">王总 (工程部主管)</option>
                  <option value="赵工 (结构室主管)">赵工 (结构室主管)</option>
                  <option value="陈工 (工艺审查员)">陈工 (工艺审查员)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  审批申请说明 / 设计变更要点
                </label>
                <textarea
                  rows={3}
                  value={submitNotes}
                  onChange={e => setSubmitNotes(e.target.value)}
                  placeholder="说明本次图纸设计或变更内容，方便审批人快速审查..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  当前挂载图纸文件 ({submitApprovalVersion.files?.length || 0} 份):
                </div>
                <div className="max-h-24 overflow-y-auto space-y-1 border border-slate-200 dark:border-slate-700 rounded p-2 bg-slate-50 dark:bg-slate-900">
                  {submitApprovalVersion.files?.map((f, i) => (
                    <div key={f.id || i} className="flex items-center justify-between text-[11px]">
                      <span className="font-mono text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                        {f.fileName}
                      </span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">{f.fileType}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSubmitApprovalVersion(null)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmitApproval}
                className="px-4 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-lg cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <Send className="w-3.5 h-3.5" />
                确认提交审批
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. 审核通过 / 驳回弹窗 (ApproveVersionModal) */}
      {approveVersion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isApproveAction ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600" />
                )}
                <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                  {isApproveAction ? '审核批准工程图纸版本' : '驳回工程图纸版本至草稿'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setApproveVersion(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div
                className={`p-3 rounded-lg border text-xs ${
                  isApproveAction
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                }`}
              >
                <div className="font-semibold mb-1">
                  审核版本: <strong className="font-mono text-sm">{approveVersion.versionNo}</strong>
                </div>
                <div>
                  {isApproveAction
                    ? '批准后，此图纸版本将正式发布生效，并作为当前物料的受控图纸版本。'
                    : '驳回后，版本状态将恢复为【草稿】，设计工程师可继续修改图纸文件并重新提交。'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  审查结论与批注意见
                </label>
                <textarea
                  rows={3}
                  value={approveNotes}
                  onChange={e => setApproveNotes(e.target.value)}
                  placeholder={
                    isApproveAction
                      ? '输入审批通过的意见（如：图纸尺寸、公差配合及表面处理符合设计标准，准予发布）...'
                      : '输入驳回原因与修改建议...'
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setApproveVersion(null)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmApproveVersion}
                className={`px-4 py-1.5 text-xs font-semibold text-white rounded-lg cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                  isApproveAction
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {isApproveAction ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                {isApproveAction ? '确认批准并发布' : '确认驳回为草稿'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. 创建或关联图号主档弹窗 (LinkMasterModal) */}
      {isLinkMasterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Box className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                  建立或关联工程图号
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLinkMasterModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  工程图号 (Drawing No.)
                </label>
                <input
                  type="text"
                  placeholder="如: DRW-01063 或 X0610-C004-G14"
                  value={inputNewDrawingNo}
                  onChange={e => setInputNewDrawingNo(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-mono font-bold text-blue-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              {drawingMasters && drawingMasters.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    或从图号库选择已有图号:
                  </label>
                  <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg">
                    {drawingMasters.map((m: any) => (
                      <button
                        key={m.id || m.drawingNo}
                        type="button"
                        onClick={() => setInputNewDrawingNo(m.drawingNo)}
                        className={`w-full p-2.5 text-left text-xs flex items-center justify-between hover:bg-blue-50/50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors ${
                          inputNewDrawingNo === m.drawingNo ? 'bg-blue-50 dark:bg-slate-700 font-bold' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">
                            {m.drawingNo}
                          </span>
                          <span className="text-slate-600 dark:text-slate-300">{m.drawingName || m.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {m.versions?.length || 1} 个版本
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 rounded-lg text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  确认后系统将自动挂载该图号，并初始化标准 2D(DWG)、3D(STEP) 及 PDF 受控图纸结构，方便直接在档案中编辑。
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsLinkMasterModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmCreateOrLinkMaster}
                className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                确认关联
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. 顶部操作提示 Toast */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] bg-slate-900/90 dark:bg-slate-800/95 text-white px-4 py-2.5 rounded-lg shadow-xl text-xs font-medium flex items-center gap-2 border border-slate-700 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 物料删除确认模态框 */}
      {showDeleteConfirm && initialMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-5">
              <div className="flex items-center gap-3 text-rose-600 mb-3">
                <div className="p-2 bg-rose-50 dark:bg-rose-950/60 rounded-full border border-rose-200 dark:border-rose-900 shrink-0">
                  <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">
                    确认删除物料档案？
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    删除后该物料数据将被移出物料档案，此操作不可撤销。
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200/80 dark:border-slate-800 text-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 shrink-0">物料编码:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{initialMaterial.materialCode}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 shrink-0">物料名称:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-100">{initialMaterial.materialName}</span>
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDelete && initialMaterial) {
                    onDelete(initialMaterial.id);
                  }
                  setShowDeleteConfirm(false);
                  onClose();
                }}
                className="px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
