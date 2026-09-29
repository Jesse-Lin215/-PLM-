import { FileType, VersionStatus, Material, DrawingMaster } from '../types/plm';

export interface ParsedFileNameResult {
  isValid: boolean;
  materialName?: string;
  materialSpec?: string;
  drawingNo?: string;
  fileType?: FileType;
  rawExtension?: string;
  errorMessage?: string;
}

export function parseDrawingFileName(fileName: string): ParsedFileNameResult {
  if (!fileName || !fileName.includes('.')) {
    return { isValid: false, errorMessage: '文件名缺少有效格式扩展名' };
  }

  const lastDotIndex = fileName.lastIndexOf('.');
  const ext = fileName.substring(lastDotIndex + 1).toUpperCase();
  const nameWithoutExt = fileName.substring(0, lastDotIndex);

  let fileType: FileType = 'PDF';
  if (ext === 'PDF') fileType = 'PDF';
  else if (ext === 'DWG' || ext === 'DXF') fileType = 'DWG';
  else if (ext === 'STEP' || ext === 'STP' || ext === 'IGES' || ext === 'IGS') fileType = 'STEP';
  else if (['PNG', 'JPG', 'JPEG', 'WEBP', 'SVG'].includes(ext)) fileType = 'IMAGE';
  else {
    return { isValid: false, rawExtension: ext, errorMessage: `不支持的文件格式: .${ext}（支持 PDF, DWG, STEP, 图片）` };
  }

  // 尝试以下划线分割
  const parts = nameWithoutExt.split('_');
  if (parts.length < 2) {
    return {
      isValid: false,
      fileType,
      rawExtension: ext,
      errorMessage: '文件名未遵循规范（需至少包含：物料名称_规格型号_文件类型）',
    };
  }

  // 模式1: 推荐要求 物料名称_规格型号_图号_文件类型
  // 例如: 电气安装盒_G14_X0610-C004-G14_PDF
  if (parts.length >= 4) {
    return {
      isValid: true,
      materialName: parts[0].trim(),
      materialSpec: parts[1].trim(),
      drawingNo: parts[2].trim(),
      fileType,
      rawExtension: ext,
    };
  }

  // 模式2: 最低要求 物料名称_规格型号_文件类型
  // 例如: 电气安装盒_G14_PDF
  if (parts.length === 3) {
    return {
      isValid: true,
      materialName: parts[0].trim(),
      materialSpec: parts[1].trim(),
      drawingNo: undefined,
      fileType,
      rawExtension: ext,
    };
  }

  // 模式3: 降级尝试 物料名称_规格型号
  if (parts.length === 2) {
    return {
      isValid: true,
      materialName: parts[0].trim(),
      materialSpec: parts[1].trim(),
      drawingNo: undefined,
      fileType,
      rawExtension: ext,
    };
  }

  return { isValid: false, errorMessage: '无法解析文件名结构' };
}

export interface DrawingFileValidationResult {
  isValid: boolean;
  hasDrawingNo: boolean;
  hasMaterialName: boolean;
  isSupportedFormat: boolean;
  reason: string;
}

/**
 * 校验批量上传图纸文件命名规范：
 * 图纸文件名必须同时包含当前图号 (drawingNo) 与物料名称 (materialName)，且属于合法工程图纸格式扩展名
 */
export function validateDrawingFileMatch(
  fileName: string,
  targetDrawingNo?: string,
  targetMaterialName?: string
): DrawingFileValidationResult {
  const name = (fileName || '').trim();
  if (!name) {
    return {
      isValid: false,
      hasDrawingNo: false,
      hasMaterialName: false,
      isSupportedFormat: false,
      reason: '文件名不能为空',
    };
  }

  // 1. 检查扩展名是否属于受支持的工程图纸/CAD格式
  const validExts = [
    'dwg', 'dxf', 'step', 'stp', 'pdf', 'sldprt', 'sldasm', 'igs', 'iges',
    'prt', 'asm', 'catpart', 'catproduct', 'ipt', 'iam', 'x_t', 'x_b'
  ];
  const lastDot = name.lastIndexOf('.');
  const ext = lastDot !== -1 ? name.slice(lastDot + 1).toLowerCase() : '';
  const isSupportedFormat = validExts.includes(ext);

  // 2. 检查图号匹配 (大小写不敏感匹配)
  const cleanDrw = (targetDrawingNo || '').trim().toLowerCase();
  const lowerName = name.toLowerCase();
  const hasDrawingNo = cleanDrw ? lowerName.includes(cleanDrw) : true;

  // 3. 检查物料名称匹配 (大小写不敏感匹配)
  const cleanMat = (targetMaterialName || '').trim().toLowerCase();
  const hasMaterialName = cleanMat ? lowerName.includes(cleanMat) : true;

  if (!isSupportedFormat) {
    return {
      isValid: false,
      hasDrawingNo,
      hasMaterialName,
      isSupportedFormat: false,
      reason: `不支持的图纸格式「.${ext || '无后缀'}」（仅支持 DWG/DXF/STEP/PDF/SLDPRT 等工程格式）`,
    };
  }

  if (hasDrawingNo && hasMaterialName) {
    return {
      isValid: true,
      hasDrawingNo: true,
      hasMaterialName: true,
      isSupportedFormat: true,
      reason: '图号与物料名称完全匹配，符合命名规范（允许上传）',
    };
  }

  if (!hasDrawingNo && !hasMaterialName) {
    return {
      isValid: false,
      hasDrawingNo: false,
      hasMaterialName: false,
      isSupportedFormat: true,
      reason: `未包含当前图号「${targetDrawingNo}」与物料名称「${targetMaterialName}」`,
    };
  }

  if (!hasDrawingNo) {
    return {
      isValid: false,
      hasDrawingNo: false,
      hasMaterialName: true,
      isSupportedFormat: true,
      reason: `图号不匹配（文件名未包含当前图号「${targetDrawingNo}」）`,
    };
  }

  return {
    isValid: false,
    hasDrawingNo: true,
    hasMaterialName: false,
    isSupportedFormat: true,
    reason: `缺少物料名称（文件名未包含物料名称「${targetMaterialName}」）`,
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getStatusBadge(status: VersionStatus | string) {
  switch (status) {
    case 'DRAFT':
      return {
        label: '草稿',
        className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
        dotColor: 'bg-slate-400',
      };
    case 'PENDING_REVIEW':
    case 'PENDING':
      return {
        label: '待审批',
        className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
        dotColor: 'bg-amber-500 animate-pulse',
      };
    case 'PUBLISHED':
    case 'APPROVED':
      return {
        label: '已发布',
        className: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
        dotColor: 'bg-blue-500',
      };
    case 'REJECTED':
      return {
        label: '驳回',
        className: 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800',
        dotColor: 'bg-red-500',
      };
    case 'OBSOLETE':
      return {
        label: '已作废',
        className: 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-500 border border-slate-300 dark:border-slate-700',
        dotColor: 'bg-slate-400',
      };
    default:
      return {
        label: '草稿',
        className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
        dotColor: 'bg-slate-400',
      };
  }
}

export function detectFileTypeFromName(fileName: string): string {
  if (!fileName || !fileName.includes('.')) return 'OTHER';
  const ext = fileName.split('.').pop()?.toUpperCase() || 'FILE';
  if (ext === 'PDF') return 'PDF';
  if (ext === 'DWG') return 'DWG';
  if (ext === 'DXF') return 'DXF';
  if (ext === 'STEP' || ext === 'STP') return 'STEP';
  if (ext === 'IGES' || ext === 'IGS') return 'IGES';
  if (['PNG', 'JPG', 'JPEG', 'WEBP', 'SVG', 'BMP', 'GIF', 'TIFF'].includes(ext)) return 'IMAGE';
  if (['SLDPRT', 'SLDASM', 'PRT', 'IPT', 'CATPART', 'CATPRODUCT', 'X_T', 'X_B', 'PARASOLID'].includes(ext)) return ext;
  return ext;
}

export function getFileTypeBadge(fileType: FileType) {
  const ft = (fileType || '').toUpperCase();
  switch (ft) {
    case 'PDF':
      return {
        label: 'PDF 矢量工程图',
        short: 'PDF',
        color: 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
      };
    case 'DWG':
      return {
        label: 'AutoCAD DWG 二维图',
        short: 'DWG',
        color: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
      };
    case 'DXF':
      return {
        label: 'DXF 二维交换格式',
        short: 'DXF',
        color: 'text-cyan-600 bg-cyan-50 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800',
      };
    case 'STEP':
    case 'STP':
      return {
        label: 'STEP 三维实体模型',
        short: 'STEP',
        color: 'text-violet-600 bg-violet-50 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800',
      };
    case 'IGES':
    case 'IGS':
      return {
        label: 'IGES 三维曲面模型',
        short: 'IGES',
        color: 'text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
      };
    case 'SLDPRT':
    case 'PRT':
    case 'IPT':
    case 'CATPART':
      return {
        label: 'SolidWorks 零件三维图',
        short: 'SLDPRT',
        color: 'text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
      };
    case 'SLDASM':
    case 'ASM':
    case 'CATPRODUCT':
      return {
        label: 'SolidWorks 装配体文件',
        short: 'SLDASM',
        color: 'text-indigo-600 bg-indigo-50 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
      };
    case 'IMAGE':
    case 'PNG':
    case 'JPG':
    case 'JPEG':
    case 'WEBP':
    case 'SVG':
      return {
        label: '渲染图/图片',
        short: 'IMG',
        color: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
      };
    default:
      return {
        label: `${ft} 文件`,
        short: ft || 'FILE',
        color: 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
      };
  }
}

export function copyToClipboard(text: string): Promise<boolean> {
  return navigator.clipboard.writeText(text)
    .then(() => true)
    .catch(() => false);
}

export function generateNextVersionNo(existingVersions: string[]): string {
  if (!existingVersions || existingVersions.length === 0) return 'V1';
  const nums = existingVersions
    .map(v => {
      const match = v.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    })
    .filter(n => !isNaN(n));
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `V${max + 1}`;
}

export interface BatchDrawingUploadValidationResult {
  isValid: boolean;
  scenario?: 1 | 2 | 3 | 4 | 5;
  scenarioTitle?: string;
  errorMessage?: string;
  matchedMaster?: DrawingMaster;
  matchedMaterial?: Material;
  existingDrawingNo?: string;
  existingMaterialName?: string;
}

/**
 * 校验批量导入图纸的5大异常场景：
 * 场景1（图号存在物料不一样）：图号 [图号] 关联物料为 [已有物料]，与上传的物料名称 [上传物料] 不一致。
 * 场景2（物料存在，但是物料没有图号）：物料 [物料] 存在，但无关联图号。
 * 场景3（物料存在，但是物料图号不一样）：物料 [物料] 关联图号为 [已有图号]，与上传的图号 [上传图号] 不一致。
 * 场景4（图号和物料都不存在）：图号 [图号] 物料 [物料] 不存在。
 * 场景5（物料图号都存在，但是图号不是操作状态）：图号 [图号] 当前处于 [状态] 状态，不可进行图纸上传操作。
 */
export function validateBatchDrawingUpload(
  uploadDrawingNo: string,
  uploadMaterialName: string,
  drawingMasters: DrawingMaster[],
  materials: Material[]
): BatchDrawingUploadValidationResult {
  const drw = (uploadDrawingNo || '').trim();
  const mat = (uploadMaterialName || '').trim();

  // 1. 查找图号主档
  const foundMaster = drawingMasters.find(
    m => m.drawingNo.trim().toLowerCase() === drw.toLowerCase()
  );

  // 2. 查找物料主档 (支持按物料名称或物料编码查找)
  const foundMaterial = materials.find(
    m => m.materialName.trim().toLowerCase() === mat.toLowerCase() ||
         m.materialCode.trim().toLowerCase() === mat.toLowerCase()
  );

  // 物料关联的已有图号
  const materialAssociatedMaster = drawingMasters.find(
    m => (foundMaterial && m.materialId === foundMaterial.id) ||
         (foundMaterial && m.materialName.trim().toLowerCase() === foundMaterial.materialName.trim().toLowerCase())
  );
  const existingDrawingNo = (foundMaterial?.drawingNo || materialAssociatedMaster?.drawingNo || '').trim();

  // 图号关联的已有物料名称
  const masterAssociatedMaterial = materials.find(
    m => foundMaster && m.id === foundMaster.materialId
  );
  const existingMaterialName = (foundMaster?.materialName || masterAssociatedMaterial?.materialName || '').trim();

  // 场景4（图号和物料都不存在）
  // 提示语：图号 [图号] 物料 [物料] 不存在。
  if (!foundMaster && !foundMaterial) {
    return {
      isValid: false,
      scenario: 4,
      scenarioTitle: '图号和物料都不存在',
      errorMessage: `图号 [${drw || '空'}] 物料 [${mat || '空'}] 不存在。`,
    };
  }

  // 场景2（物料存在，但是物料没有图号）
  // 提示语：物料 [物料] 存在，但无关联图号。
  if (foundMaterial && !existingDrawingNo) {
    return {
      isValid: false,
      scenario: 2,
      scenarioTitle: '物料存在，但无关联图号',
      matchedMaterial: foundMaterial,
      errorMessage: `物料 [${mat}] 存在，但无关联图号。`,
    };
  }

  // 场景3（物料存在，但是物料图号不一样）
  // 提示语：物料 [物料] 关联图号为 [已有图号]，与上传的图号 [上传图号] 不一致。
  if (foundMaterial && existingDrawingNo && existingDrawingNo.toLowerCase() !== drw.toLowerCase()) {
    return {
      isValid: false,
      scenario: 3,
      scenarioTitle: '物料存在，但是物料图号不一样',
      matchedMaterial: foundMaterial,
      existingDrawingNo,
      errorMessage: `物料 [${mat}] 关联图号为 [${existingDrawingNo}]，与上传的图号 [${drw}] 不一致。`,
    };
  }

  // 场景1（图号存在物料不一样）
  // 提示语：图号 [图号] 关联物料为 [已有物料]，与上传的物料名称 [上传物料] 不一致。
  if (foundMaster && existingMaterialName && existingMaterialName.toLowerCase() !== mat.toLowerCase()) {
    return {
      isValid: false,
      scenario: 1,
      scenarioTitle: '图号存在物料不一样',
      matchedMaster: foundMaster,
      existingMaterialName,
      errorMessage: `图号 [${drw}] 关联物料为 [${existingMaterialName}]，与上传的物料名称 [${mat}] 不一致。`,
    };
  }

  // 场景5（物料图号都存在，但是图号不是操作状态）
  // 提示语：图号 [图号] 当前处于 [状态] 状态，不可进行图纸上传操作。
  if (foundMaster) {
    const pendingVer = foundMaster.versions.find(v => v.status === 'PENDING_REVIEW');
    const draftVer = foundMaster.versions.find(v => v.status === 'DRAFT');
    const rejectedVer = foundMaster.versions.find(v => v.status === 'REJECTED');
    const defaultVer = foundMaster.versions.find(v => v.status === 'PUBLISHED' && v.isDefault) ||
      foundMaster.versions.find(v => v.status === 'PUBLISHED' && v.isActive) ||
      foundMaster.versions.find(v => v.status === 'PUBLISHED');

    // 只有具有草稿(DRAFT)或已驳回(REJECTED)版本才属于可直接操作上传图纸状态
    const hasOperableDraft = !!(draftVer || rejectedVer);
    const activeVer = pendingVer || draftVer || rejectedVer || defaultVer || foundMaster.versions[0];
    const masterStatus = activeVer ? activeVer.status : 'PUBLISHED';
    const statusLabel = getStatusBadge(masterStatus).label;

    if (!hasOperableDraft) {
      return {
        isValid: false,
        scenario: 5,
        scenarioTitle: '图号不是操作状态',
        matchedMaster: foundMaster,
        matchedMaterial: foundMaterial,
        errorMessage: `图号 [${drw}] 当前处于 [${statusLabel}] 状态，不可进行图纸上传操作。`,
      };
    }
  }

  // 正常合规场景（物料图号都存在且一致，且图号属于草稿/可操作状态）
  return {
    isValid: true,
    matchedMaster: foundMaster,
    matchedMaterial: foundMaterial,
    errorMessage: undefined,
  };
}

/**
 * 从工程图纸文件名自动猜测提取图号与物料名称
 */
export function extractDrawingNoAndMaterialNameFromFileName(
  fileName: string,
  drawingMasters: DrawingMaster[],
  materials: Material[]
): { drawingNo: string; materialName: string } {
  const cleanName = fileName.replace(/\.[^/.]+$/, '').trim();

  // 1. 先尝试在文件名中寻找匹配的已有图号
  let matchedDrw = '';
  for (const m of drawingMasters) {
    if (cleanName.toLowerCase().includes(m.drawingNo.toLowerCase())) {
      matchedDrw = m.drawingNo;
      break;
    }
  }

  // 2. 尝试在文件名中寻找匹配的已有物料名称
  let matchedMat = '';
  for (const m of materials) {
    if (cleanName.toLowerCase().includes(m.materialName.toLowerCase())) {
      matchedMat = m.materialName;
      break;
    }
  }

  // 3. 常见下划线分割处理
  const parts = cleanName.split(/[_]/).map(p => p.trim()).filter(Boolean);

  if (!matchedDrw && !matchedMat && parts.length >= 2) {
    const looksLikeDrawingNo = (s: string) => /^[A-Za-z0-9]+[-_A-Za-z0-9]*$/.test(s) && /\d/.test(s);
    if (looksLikeDrawingNo(parts[0])) {
      matchedDrw = parts[0];
      matchedMat = parts[1];
    } else {
      matchedMat = parts[0];
      matchedDrw = parts[1];
    }
  } else if (!matchedDrw && matchedMat) {
    const remParts = parts.filter(p => !p.includes(matchedMat));
    if (remParts.length > 0) {
      matchedDrw = remParts[0];
    }
  } else if (matchedDrw && !matchedMat) {
    const remParts = parts.filter(p => !p.includes(matchedDrw) && !p.toLowerCase().startsWith('v') && !['cad', 'step', 'pdf', 'dwg', 'stp'].includes(p.toLowerCase()));
    if (remParts.length > 0) {
      matchedMat = remParts[0];
    }
  }

  return {
    drawingNo: matchedDrw || parts[0] || 'DRW-UNKNOWN',
    materialName: matchedMat || parts[1] || '未知物料',
  };
}

