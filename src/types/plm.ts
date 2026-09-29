export type VersionStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'OBSOLETE';

export type FileType = 'PDF' | 'DWG' | 'STEP' | 'IMAGE' | 'DXF' | 'IGES' | string;

export interface DrawingFile {
  id: string;
  fileName: string;
  fileType: FileType;
  fileSize: number; // in bytes
  fileHash: string;
  uploadTime: string;
  uploader: string;
  previewUrl?: string;
  sheetCount?: number;
  cadLayers?: string[];
}

export interface VersionLog {
  id: string;
  timestamp: string;
  operator: string;
  action: string;
  details: string;
}

export interface DrawingVersion {
  id: string;
  drawingNo: string;
  versionNo: string; // e.g. "V1", "V2"
  status: VersionStatus;
  isActive: boolean; // 是否启用 (true: 已启用, false: 已停用)
  isDefault?: boolean; // 是否默认版本
  publishTime?: string;
  publisher?: string;
  reviewer?: string;
  reviewTime?: string;
  notes?: string;
  changeDesc?: string;
  ecoNumber?: string;
  updatedAt?: string;
  files: DrawingFile[];
  logs?: VersionLog[]; // 每个版本的操作变更日志
  createdAt: string;
  createdBy: string;
}

export interface DrawingMaster {
  id: string;
  drawingNo: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  materialSpec: string;
  category: string;
  currentPublishedVersion?: string;
  latestVersion: string;
  versions: DrawingVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface Material {
  id: string;
  materialCode: string;
  materialName: string;
  materialSpec: string; // 唯一规格
  materialModel?: string; // 唯一型号
  model?: string; // 兼容别名
  category: string;
  unit: string; // 唯一计量单位
  drawingNo?: string;
  hasDrawing: boolean;
  status: 'ACTIVE' | 'DISABLED';
  createdAt: string;
  updatedAt: string;
  remarks?: string;
  lossRate?: number; // 损耗率 (%)
  standardCost?: number; // 标准成本
  stock?: number; // 可用库存
}

export type BOMStatus = 'DRAFT' | 'PENDING' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'FROZEN' | 'OBSOLETE';

export interface BOMVersionInfo {
  id: string;
  versionNo: string;
  status: BOMStatus;
  creator: string;
  updateTime: string;
  isDefault: boolean;
  isCurrent?: boolean;
  notes?: string;
  itemsCount?: number;
}

export interface BOMCategory {
  id: string;
  name: string;
  count?: number;
  children?: BOMCategory[];
}

export interface BOMStructureNode {
  id: string;
  materialCode: string;
  materialName: string;
  businessAttr?: string; // 销售、采购、自制
  versionNo?: string;
  image?: string;
  category: string;
  spec: string; // 唯一规格
  model?: string; // 唯一型号
  brand?: string;
  stock?: number;
  unit: string; // 唯一计量单位
  standardQty: number;
  standardCost?: number;
  lossRate?: number;
  remarks?: string;
  route?: string; // 钣金工艺路线、车床路线等
  level: number;
  parentId?: string;
  drawingNo?: string;
  drawingVersionNo?: string;
  children?: BOMStructureNode[];
}

export interface BOMDrawingLink {
  id: string;
  drawingNo: string;
  fileName: string;
  fileType: FileType;
  fileSize?: number;
  materialCode: string;
  materialName: string;
  category: string;
  updateTime: string;
  previewUrl?: string;
  versionNo?: string;
  sourceType?: 'CURRENT_MATERIAL' | 'SUB_MATERIAL' | 'PRODUCT_ROOT';
  relationPath?: string;
  level?: number;
}

export interface BOMOperationLog {
  id: string;
  bomId: string;
  versionNo: string;
  opType: 'CREATE' | 'UPGRADE' | 'STRUCTURE_UPDATE' | 'ITEM_ADD' | 'ITEM_DELETE' | 'QTY_CHANGE' | 'SET_DEFAULT' | 'SUBMIT_AUDIT' | 'AUDIT_APPROVE' | 'AUDIT_REJECT' | 'REVERSE_APPROVAL' | 'DRAWING_BIND' | 'PROPERTY_UPDATE';
  opTypeName: string;
  title: string;
  details: string;
  operator: string;
  timestamp: string;
  ip?: string;
  oldVal?: string;
  newVal?: string;
}

export interface BOMApprovalRecord {
  id: string;
  bomId: string;
  versionNo: string;
  nodeName: string; // 节点名称，如：发起审批、结构主管审核、工艺总监审批、反审批回退
  fromStatus: BOMStatus;
  toStatus: BOMStatus;
  action: 'CREATE' | 'SUBMIT' | 'APPROVE' | 'REJECT' | 'REVERSE_APPROVAL' | 'FREEZE' | 'UNFREEZE';
  actionName: string; // 如：新建草稿、提交审批、审批通过、审批驳回、反审批
  approver: string; // 审批人/操作人
  department?: string; // 所属部门/角色
  timestamp: string; // 审批/流转时间
  comment: string; // 审批意见/说明
  opinionType?: 'AGREE' | 'DISAGREE' | 'REVERT' | 'INFO';
}

export interface BOMItem {
  id: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  materialSpec: string; // 唯一规格
  materialModel?: string; // 唯一型号
  model?: string; // 兼容别名
  quantity: number;
  unit: string; // 唯一计量单位
  drawingNo?: string;
  drawingVersionId?: string;
  versionNo?: string;
  versionStatus?: VersionStatus;
  isActiveVersion?: boolean;
  sortOrder?: number;
  businessAttr?: string;
  coverImage?: string;
  category?: string;
  brand?: string;
  stock?: number;
  standardCost?: number;
  routing?: string;
  scrapRate?: number;
  remark?: string;
}

export interface BOM {
  id: string;
  bomCode: string;
  name: string;
  versionNo: string;
  productCode: string;
  productName: string;
  specName?: string;
  unit?: string;
  drawingNo?: string;
  drawingVersionNo?: string;
  isDefault?: boolean;
  status: BOMStatus;
  preFreezeStatus?: BOMStatus;
  mechanicalOwner?: string;
  electricalOwner?: string;
  remark?: string;
  category?: string;
  items: BOMItem[];
  versions?: BOMVersionInfo[];
  structureTree?: BOMStructureNode[];
  drawings?: BOMDrawingLink[];
  operationLogs?: BOMOperationLog[];
  approvalRecords?: BOMApprovalRecord[];
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface SalesOrderItem {
  itemNo: string; // 项次，如 "01", "02"
  productCode: string;
  productName: string;
  productSpec: string;
  bomId: string;
  bomCode: string;
  bomVersion: string;
  orderQuantity?: number;
  deliveryDate?: string;
}

export interface SalesOrder {
  id: string;
  orderNo: string;
  workOrderNo?: string;
  customerName: string;
  productCode: string;
  productName: string;
  productSpec: string;
  bomId: string;
  bomCode: string;
  bomVersion: string;
  orderQuantity: number;
  deliveryDate: string;
  status: 'IN_PRODUCTION' | 'PENDING' | 'COMPLETED';
  items?: SalesOrderItem[];
}

export interface DrawingArchiveItem {
  id: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  materialSpec: string;
  drawingNo: string;
  drawingVersionId: string;
  versionNo: string;
  fileTypes: FileType[];
  selectedForArchive: boolean;
}

export interface DrawingArchiveSnapshot {
  id: string;
  archiveNo: string;
  orderNo: string;
  customerName: string;
  productCode: string;
  productName: string;
  bomCode: string;
  bomVersion: string;
  archivedAt: string;
  archivedBy: string;
  snapshotItems: DrawingArchiveItem[];
  sealHash: string; // 防篡改数字指纹
  status: 'LOCKED';
  notes?: string;
}

export interface ImportCandidate {
  id: string;
  rawFileName: string;
  fileSize: number;
  fileHash: string;
  parsedName: string;
  parsedSpec: string;
  parsedDrawingNo?: string;
  parsedFileType: FileType;
  matchStatus: 'MATCHED' | 'UNMATCHED' | 'PARSE_ERROR' | 'DUPLICATE_HASH';
  matchedMaterialId?: string;
  matchedMaterialCode?: string;
  matchedMaterialName?: string;
  matchedMaterialSpec?: string;
  matchedDrawingNo?: string;
  existingDraftVersionId?: string;
  hasExistingDraft: boolean;
  resolutionAction: 'CREATE_MASTER_AND_DRAFT_V1' | 'NEW_DRAFT_NEXT_VER' | 'MERGE_TO_EXISTING_DRAFT' | 'SKIP_DUPLICATE' | 'MANUAL_BIND';
  targetDraftVersionId?: string; // 用户具体指定的草稿版本 ID
  manualMaterialId?: string;
  errorMessage?: string;
  selected: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'GUARD_BLOCK' | 'SUCCESS';
  guardType: 'MATERIAL_ID_UNIQUE' | 'DRAWING_NO_UNIQUE' | 'VERSION_UNIQUE' | 'HASH_DEDUPLICATION' | 'IMMUTABLE_PUBLISHED' | 'REF_VALIDATION_ACTIVE_ONLY' | 'DEFAULT_VERSION_SET';
  title: string;
  description: string;
  operator: string;
  targetEntity: string;
}

export interface PendingQuestionItem {
  id: string;
  code: string;
  question: string;
  suggestedRole: string;
  currentStatus: 'PENDING' | 'CONFIRMED' | 'IN_DISCUSSION';
  consensusValue?: string;
  notes?: string;
}

// ================= ECN 工程变更管理模块核心类型 =================
export type ECNDocStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'OBSOLETE';
export type ECNNotifyStatus = 'UNNOTIFIED' | 'SENDING' | 'SENT' | 'NOTIFIED' | 'FAILED';
export type ECNExecutionStatus = 'NOT_EXECUTED' | 'PENDING' | 'EXECUTING' | 'EFFECTIVE' | 'CANCELLED' | 'FAILED';
export type ECNWarehouseStatus = 'UNCONFIRMED' | 'CONFIRMED';
export type ECNItemOperation = 'ADD' | 'DELETE' | 'MODIFY';

export interface ECNMaterialItem {
  id: string;
  sourceItemId?: string; // 关联的原 BOMItem ID (修改/删除必填)
  operation: ECNItemOperation;
  materialId?: string;
  materialCode: string;
  materialName: string;
  materialSpec: string; // 唯一规格
  materialModel?: string; // 唯一型号
  model?: string; // 兼容别名
  drawingNo?: string;
  unit: string; // 唯一计量单位
  beforeQty?: number; // 变更前标准用量 (单台用量)
  afterQty?: number; // 变更后标准用量 (单台用量)
  diffQty?: number; // 用量差额 (afterQty - beforeQty)
  beforeValues?: {
    materialName: string;
    materialSpec: string;
    materialModel?: string;
    drawingNo?: string;
    unit: string;
    businessAttr?: string;
  };
  afterValues?: {
    materialName: string;
    materialSpec: string;
    materialModel?: string;
    drawingNo?: string;
    unit: string;
    businessAttr?: string;
  };
  changeReason?: string;
  isRestored?: boolean; // 草稿中撤销删除或撤销修改
}

export interface ECNWorkOrderSync {
  id: string;
  workOrderNo: string;
  productCode: string;
  productName: string;
  productSpec?: string;
  productionQty: number; // 工单生产台数
  workOrderStatus: 'IN_PROGRESS' | 'PAUSED' | string;
  selected: boolean; // 是否勾选同步
  syncStatus: 'SYNCED' | 'UNSYNCED' | 'FAILED';
  syncTime?: string;
  pickedQtyMap?: Record<string, number>; // materialCode -> 已领料数量
}

export interface ECNApprovalNode {
  id: string;
  stepIndex?: number;
  level?: number;
  roleName?: string;
  nodeName: string; // 例如: "工程主管初审", "工程总监审批", "生产技术复核"
  approver: string;
  approverRole?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED';
  comment?: string;
  timestamp?: string;
  operateTime?: string;
}

export interface ECNDepartmentNotification {
  departmentName: string; // 机加, 钣金, 品检部, 采购, 仓库, PMC 等
  status: 'PENDING' | 'DELIVERED' | 'FAILED';
  deliveredTime?: string;
}

export interface ECNDepartmentConfirmation {
  id?: string;
  dept: string; // 部门名称 (如: 生产部/机加/钣金/品检部/采购/仓库/PMC/销售部等)
  status: 'CONFIRMED' | 'UNCONFIRMED';
  confirmer?: string; // 确认人
  confirmTime?: string; // 确认时间
  remarks?: string; // 确认说明或执行措施
}

export interface ECNLog {
  id: string;
  timestamp: string;
  operator: string;
  action: string;
  details: string;
}

export interface ECNOrder {
  id: string;
  ecnNo: string; // 变更单编号 (唯一)
  ecnDate: string; // 变更单日期
  demandDate: string; // 需求日期 (BR20: 本次变更涉及物料的需要时间)
  applicant: string; // 变更申请人
  applicantDept: string; // 申请部门
  productionOwner: string; // 生产负责人
  designOwner: string; // 设计负责人
  changeType: string; // 变更类型 (设计优化/结构变更/降本替代/清单遗漏/生产工艺调整/客户需求变更)
  changeReason: string; // 变更原因及业务影响说明
  
  // 关联对象 (BR03: 一张ECN限定一个销售订单和一个BOM)
  salesOrderId: string;
  salesOrderNo: string;
  customerName?: string;
  orderItemNo?: string; // 选中的项次 (如 "01")
  productCode?: string; // 选中的产品编码
  productSpec?: string; // 自动带出的产品规格
  bomId: string;
  bomCode: string;
  bomProductName: string;
  productDrawingNo?: string;
  bomVersion: string; // BOM版本号不升级 (BR05)
  
  // 状态维度分别保存 (6.3)
  docStatus: ECNDocStatus; // 单据状态
  notifyStatus: ECNNotifyStatus; // 通知状态
  executionStatus: ECNExecutionStatus; // 更新生效状态
  warehouseStatus?: ECNWarehouseStatus; // 兼容仓库确认状态
  
  // 通知设置 (BR10, BR11)
  notifyMode: 'AUTO' | 'MANUAL'; // 自动通知 / 手动通知
  notifyDepts: string[]; // 接收部门 (机加/钣金/品检部/采购/仓库/PMC等)
  departmentNotifications?: ECNDepartmentNotification[];
  departmentConfirmations?: ECNDepartmentConfirmation[]; // 各部门动态确认流转记录 (确认人/确认部门/确认时间/备注)
  
  // 变更明细与工单
  items: ECNMaterialItem[];
  workOrders: ECNWorkOrderSync[];
  
  // 审批与执行
  approvalFlow: ECNApprovalNode[];
  approvalHistory?: ECNApprovalNode[];
  
  // 仓库确认 (兼容历史字段)
  warehouseConfirmer?: string;
  warehouseConfirmTime?: string;
  
  // 审计追踪
  auditor?: string;
  auditTime?: string;
  sentBy?: string;
  sentTime?: string;
  invalidatedBy?: string;
  invalidatedTime?: string;
  invalidatedReason?: string;
  logs: ECNLog[];
  
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

