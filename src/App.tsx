import React, { useState, useEffect, useMemo } from 'react';
import {
  Material,
  DrawingMaster,
  DrawingVersion,
  DrawingFile,
  VersionLog,
  BOM,
  SalesOrder,
  DrawingArchiveSnapshot,
  AuditLog,
  ImportCandidate,
  VersionStatus,
  ECNOrder,
} from './types/plm';
import {
  INITIAL_MATERIALS,
  INITIAL_DRAWING_MASTERS,
  INITIAL_BOMS,
  INITIAL_SALES_ORDERS,
  INITIAL_ARCHIVES,
  INITIAL_AUDIT_LOGS,
} from './data/mockData';
import { INITIAL_ECN_ORDERS } from './data/mockECNData';
import { loadLocalState, saveLocalState } from './utils/localPersistence';
import { Navigation, TabKey } from './components/Navigation';
import { MaterialsView } from './components/MaterialsView';
import { MaterialDrawingView } from './components/MaterialDrawingView';
import { DrawingImportView } from './components/DrawingImportView';
import { DrawingVersionsView } from './components/DrawingVersionsView';
import { BOMManagementView } from './components/BOMManagementView';
import { DrawingArchivingView } from './components/DrawingArchivingView';
import { ECNManagementView } from './components/ecn/ECNManagementView';
import { ECNNotificationCenterView } from './components/ecn/ECNNotificationCenterView';
import { generateNextVersionNo, formatFileSize, getStatusBadge } from './utils/plmHelpers';
import { Menu } from 'lucide-react';

export default function App() {
  // Global Data State with Local Cache Persistence (保留页面缓存，不随会话重载丢失)
  const [materials, setMaterials] = useState<Material[]>(() => {
    const loaded = loadLocalState('materials', INITIAL_MATERIALS);
    const deletedDrawingNos = new Set(['YZ-0043', 'DWG-05-00035', 'DWG-CD-00006-ASM', 'X0610-C004-G14', 'X0610-C005-B02', 'X0610-M001-A01']);
    const initMap = new Map(INITIAL_MATERIALS.map(im => [im.materialCode, im]));
    return (loaded || []).map((m: Material) => {
      const initMat = initMap.get(m.materialCode);
      if (m.drawingNo && deletedDrawingNos.has(m.drawingNo)) {
        m = { ...m, drawingNo: undefined, hasDrawing: false };
      }
      return {
        ...m,
        lossRate: m.lossRate !== undefined ? m.lossRate : (initMat?.lossRate ?? 0.5),
        standardCost: m.standardCost !== undefined && m.standardCost > 0 ? m.standardCost : (initMat?.standardCost ?? 180),
        stock: m.stock !== undefined ? m.stock : (initMat?.stock ?? 120),
        remarks: m.remarks || initMat?.remarks || '标准零部件，符合设计规范',
      };
    });
  });
  const [drawingMasters, setDrawingMasters] = useState<DrawingMaster[]>(() => {
    const loaded = loadLocalState('drawingMasters', INITIAL_DRAWING_MASTERS);
    const validDrawingNos = new Set(INITIAL_MATERIALS.map(m => m.drawingNo).filter(Boolean));
    const filtered = (loaded || []).filter((dm: DrawingMaster) => validDrawingNos.has(dm.drawingNo));
    return filtered.length > 0 ? filtered : INITIAL_DRAWING_MASTERS.filter(dm => validDrawingNos.has(dm.drawingNo));
  });
  const [boms, setBoms] = useState<BOM[]>(() => loadLocalState('boms', INITIAL_BOMS));
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>(() => loadLocalState('salesOrders', INITIAL_SALES_ORDERS));
  const [archives, setArchives] = useState<DrawingArchiveSnapshot[]>(() => loadLocalState('archives', INITIAL_ARCHIVES));
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => loadLocalState('auditLogs', INITIAL_AUDIT_LOGS));
  const [ecnOrders, setEcnOrders] = useState<ECNOrder[]>(() => loadLocalState('ecnOrders', INITIAL_ECN_ORDERS));

  // Sync drawingMasters with materials so all drawings in drawing management strictly exist in materials
  useEffect(() => {
    const validDrawingNos = new Set(materials.map(m => m.drawingNo).filter(Boolean));
    setDrawingMasters(prev => prev.filter(dm => validDrawingNos.has(dm.drawingNo)));
  }, [materials]);

  // UI State with Local Cache Persistence
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const cached = loadLocalState<string>('activeTab', 'materials-new');
    const validTabs: TabKey[] = [
      'materials-new',
      'drawings-new',
      'bom-new',
      'ecn',
      'ecn-notifications',
      'materials',
      'drawings',
      'bom',
      'import',
      'material-edit',
      'archiving',
    ];
    return (validTabs.includes(cached as TabKey) ? cached : 'materials-new') as TabKey;
  });
  const [selectedDrawingNo, setSelectedDrawingNo] = useState<string>(() => {
    const cached = loadLocalState('selectedDrawingNo', 'CAS-3301-RED09');
    if (['X0610-C004-G14', 'X0610-C005-B02', 'X0610-M001-A01', 'YZ-0043', 'DWG-05-00035', 'DWG-CD-00006-ASM'].includes(cached)) {
      return 'CAS-3301-RED09';
    }
    return cached;
  });
  const [selectedECNOrderIdForNav, setSelectedECNOrderIdForNav] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Sync to local cache whenever state changes
  useEffect(() => {
    saveLocalState('materials', materials);
  }, [materials]);

  useEffect(() => {
    saveLocalState('drawingMasters', drawingMasters);
  }, [drawingMasters]);

  useEffect(() => {
    saveLocalState('boms', boms);
  }, [boms]);

  useEffect(() => {
    saveLocalState('salesOrders', salesOrders);
  }, [salesOrders]);

  useEffect(() => {
    saveLocalState('archives', archives);
  }, [archives]);

  useEffect(() => {
    saveLocalState('auditLogs', auditLogs);
  }, [auditLogs]);

  useEffect(() => {
    saveLocalState('ecnOrders', ecnOrders);
  }, [ecnOrders]);

  useEffect(() => {
    saveLocalState('activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    saveLocalState('selectedDrawingNo', selectedDrawingNo);
  }, [selectedDrawingNo]);

  // 同步且实时持久化页签切换，杜绝刷新或重载导致跳回默认首页
  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    saveLocalState('activeTab', tab);
    if (tab === 'drawings' || tab === 'drawings-new') {
      setSelectedDrawingNo('');
      saveLocalState('selectedDrawingNo', '');
    }
  };

  const handleSelectDrawing = (drawingNo: string, targetTab?: TabKey) => {
    setSelectedDrawingNo(drawingNo);
    saveLocalState('selectedDrawingNo', drawingNo);
    if (targetTab) {
      setActiveTab(targetTab);
      saveLocalState('activeTab', targetTab);
    }
  };

  // Compute Metrics
  const pendingReviewsCount = drawingMasters.reduce((acc, master) => {
    return acc + master.versions.filter(v => v.status === 'PENDING_REVIEW').length;
  }, 0);

  const draftsCount = drawingMasters.reduce((acc, master) => {
    return acc + master.versions.filter(v => v.status === 'DRAFT').length;
  }, 0);

  // ECN 通知中心未读统计 (已发送通知且未读未处理的消息数量)
  const unreadECNNotificationsCount = useMemo(() => {
    try {
      const readMapSaved = localStorage.getItem('ecn_notification_read_map');
      const readMap: Record<string, { isRead: boolean }> = readMapSaved ? JSON.parse(readMapSaved) : {};
      let count = 0;
      ecnOrders.forEach((order) => {
        if (order.notifyStatus === 'SENT' || order.notifyStatus === 'NOTIFIED') {
          const depts = (order.notifyDepts && order.notifyDepts.length > 0)
            ? order.notifyDepts
            : ['机加', '采购', '仓库', 'PMC'];
          depts.forEach((dept) => {
            const id = `${order.id}-${dept}`;
            const isHandled = (order.departmentConfirmations || []).some(
              (c) => c.dept === dept && c.status === 'CONFIRMED'
            );
            const isRead = !!readMap[id]?.isRead || isHandled;
            if (!isRead && !isHandled) {
              count++;
            }
          });
        }
      });
      return count;
    } catch {
      return 0;
    }
  }, [ecnOrders]);

  // 处理 ECN 部门通知与业务协同确认 (数据双向反哺回 ECN 变更单)
  const handleECNDepartmentConfirm = (
    orderId: string,
    deptName: string,
    confirmer: string,
    remarks?: string
  ) => {
    const timeNow = new Date().toLocaleString();
    setEcnOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;

        const currentConfirms =
          order.departmentConfirmations && order.departmentConfirmations.length > 0
            ? order.departmentConfirmations
            : order.notifyDepts.map((d) => ({ dept: d, status: 'UNCONFIRMED' as const }));

        let found = false;
        const updatedConfirms = currentConfirms.map((c) => {
          if (c.dept === deptName) {
            found = true;
            return {
              ...c,
              status: 'CONFIRMED' as const,
              confirmer: confirmer || '部门操作员',
              confirmTime: timeNow,
              remarks: remarks || '已完成部门变更接收与业务协同准备',
            };
          }
          return c;
        });

        if (!found) {
          updatedConfirms.push({
            dept: deptName,
            status: 'CONFIRMED',
            confirmer: confirmer || '部门操作员',
            confirmTime: timeNow,
            remarks: remarks || '已完成部门变更接收与业务协同准备',
          });
        }

        return {
          ...order,
          departmentConfirmations: updatedConfirms,
          warehouseStatus: deptName === '仓库' || deptName.includes('仓') ? 'CONFIRMED' : order.warehouseStatus,
          warehouseConfirmer: (deptName === '仓库' || deptName.includes('仓')) ? confirmer : order.warehouseConfirmer,
          warehouseConfirmTime: (deptName === '仓库' || deptName.includes('仓')) ? timeNow : order.warehouseConfirmTime,
          updatedAt: timeNow,
          logs: [
            ...order.logs,
            {
              id: `LOG-${Date.now()}`,
              timestamp: timeNow,
              operator: `${confirmer} (${deptName})`,
              action: '通知中心处理并确认',
              details: `【${deptName}】角色已在通知中心查阅变更详情并完成处理确认，确认人: ${confirmer}，说明: ${remarks || '无'}`,
            },
          ],
        };
      })
    );
  };

  const handleNavigateToECN = (orderId?: string) => {
    if (orderId) {
      setSelectedECNOrderIdForNav(orderId);
    }
    handleTabChange('ecn');
  };

  const handleNavigateToNotifications = () => {
    handleTabChange('ecn-notifications');
  };

  // Helper for Logging
  const addAuditLog = (
    level: AuditLog['level'],
    guardType: AuditLog['guardType'],
    title: string,
    description: string,
    targetEntity: string,
    operator: string = '系统业务规则引擎'
  ) => {
    const newLog: AuditLog = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      level,
      guardType,
      title,
      description,
      operator,
      targetEntity,
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Reset to Demo Data
  const handleResetData = () => {
    if (confirm('确定要清除缓存并重置所有演示数据为初始状态吗？')) {
      const deletedDrawingNos = new Set(['X0610-C004-G14', 'X0610-C005-B02', 'X0610-M001-A01', 'YZ-0043', 'DWG-05-00035', 'DWG-CD-00006-ASM']);
      setMaterials(INITIAL_MATERIALS.map(m => m.drawingNo && deletedDrawingNos.has(m.drawingNo) ? { ...m, drawingNo: undefined, hasDrawing: false } : m));
      setDrawingMasters(INITIAL_DRAWING_MASTERS.filter(dm => !deletedDrawingNos.has(dm.drawingNo)));
      setBoms(INITIAL_BOMS);
      setSalesOrders(INITIAL_SALES_ORDERS);
      setArchives(INITIAL_ARCHIVES);
      setAuditLogs(INITIAL_AUDIT_LOGS);
      setEcnOrders(INITIAL_ECN_ORDERS);
      setSelectedDrawingNo('CAS-3301-RED09');
      setActiveTab('materials');
      alert('已清除缓存并重置为初始演示数据！');
    }
  };

  // 1. Materials Management Actions
  const handleAddMaterial = (
    newMatData: Omit<Material, 'id' | 'createdAt' | 'updatedAt' | 'hasDrawing'>,
    drawingData?: {
      drawingNo: string;
      versionNo: string;
      status: 'PUBLISHED' | 'DRAFT';
      isActive: boolean;
      changeDesc?: string;
      files?: { fileName: string; fileType: string; fileSize: number }[];
    }
  ) => {
    const newId = `MAT-${Date.now().toString().slice(-4)}`;
    const effectiveDrawingNo = drawingData?.drawingNo || newMatData.drawingNo;
    const hasDrawing = !!effectiveDrawingNo;

    const newMaterial: Material = {
      ...newMatData,
      drawingNo: effectiveDrawingNo,
      id: newId,
      hasDrawing,
      createdAt: new Date().toLocaleString(),
      updatedAt: new Date().toLocaleString(),
    };

    setMaterials(prev => [newMaterial, ...prev]);

    // 如果指定了图号，同步创建/更新图号主档和首个生效版本
    if (effectiveDrawingNo) {
      const versionNo = drawingData?.versionNo || 'V1.0';
      const versionStatus = drawingData?.status || 'PUBLISHED';
      const isVersionActive = drawingData?.isActive ?? true;
      const changeDesc = drawingData?.changeDesc || '物料建档初始关联版本';

      const initialFiles: DrawingFile[] = (drawingData?.files || []).map((f, idx) => ({
        id: `FILE-${Date.now()}-${idx}`,
        fileName: f.fileName,
        fileType: f.fileType,
        fileSize: f.fileSize,
        fileHash: `HASH-${Math.random().toString(36).substring(2, 9)}`,
        uploadTime: new Date().toLocaleString(),
        uploader: '工程师 (建档上传)',
      }));

      const newMaster: DrawingMaster = {
        id: `DWG-${Date.now().toString().slice(-4)}`,
        drawingNo: effectiveDrawingNo,
        materialId: newId,
        materialCode: newMaterial.materialCode,
        materialName: newMaterial.materialName,
        materialSpec: newMaterial.materialSpec,
        category: newMaterial.category,
        latestVersion: versionNo,
        createdAt: new Date().toLocaleString(),
        updatedAt: new Date().toLocaleString(),
        versions: [
          {
            id: `VER-${Date.now()}-1`,
            drawingNo: effectiveDrawingNo,
            versionNo: versionNo,
            status: versionStatus,
            isActive: isVersionActive,
            notes: changeDesc,
            createdAt: new Date().toLocaleString(),
            createdBy: '当前登录用户 (工程师)',
            files: initialFiles,
          },
        ],
      };

      setDrawingMasters(prev => {
        // 如果已存在同图号，则更新物料关联或追加
        const existingIdx = prev.findIndex(d => d.drawingNo === effectiveDrawingNo);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            materialId: newId,
            materialCode: newMaterial.materialCode,
            materialName: newMaterial.materialName,
          };
          return updated;
        }
        return [newMaster, ...prev];
      });
    }

    addAuditLog(
      'SUCCESS',
      'MATERIAL_ID_UNIQUE',
      '新建物料档案',
      `成功创建物料 ${newMaterial.materialName} (${newMaterial.materialCode})，分配唯一 Material ID: ${newId}${
        effectiveDrawingNo ? `，并初始化关联图号与版本 [${effectiveDrawingNo}]` : ''
      }`,
      newMaterial.materialCode,
      '工程师 (物料建档)'
    );
  };

  const handleDeleteMaterial = (idOrIds: string | string[]) => {
    const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
    setMaterials(prev => prev.filter(m => !ids.includes(m.id)));
  };

  const handleUpdateMaterial = (
    updatedMat: Material,
    drawingData?: {
      drawingNo: string;
      versionNo: string;
      status: 'PUBLISHED' | 'DRAFT';
      isActive: boolean;
      changeDesc?: string;
      files?: { fileName: string; fileType: string; fileSize: number }[];
    }
  ) => {
    const effectiveDrawingNo = drawingData?.drawingNo || updatedMat.drawingNo;
    const hasDrawing = Boolean(effectiveDrawingNo);

    setMaterials(prev =>
      prev.map(m =>
        m.id === updatedMat.id
          ? {
              ...updatedMat,
              drawingNo: effectiveDrawingNo,
              hasDrawing,
              updatedAt: new Date().toLocaleString(),
            }
          : m
      )
    );

    if (effectiveDrawingNo) {
      setDrawingMasters(prev => {
        const existingMaster = prev.find(
          d => d.drawingNo === effectiveDrawingNo || d.materialId === updatedMat.id || d.materialCode === updatedMat.materialCode
        );

        const initialFiles: DrawingFile[] = (drawingData?.files || []).map((f, idx) => ({
          id: `FILE-${Date.now()}-${idx}`,
          fileName: f.fileName,
          fileType: f.fileType,
          fileSize: f.fileSize,
          fileHash: `HASH-${Math.random().toString(36).substring(2, 9)}`,
          uploadTime: new Date().toLocaleString(),
          uploader: '当前登录用户 (物料更新)',
        }));

        if (existingMaster) {
          const versionNo = drawingData?.versionNo || existingMaster.latestVersion;
          const updatedVersions = existingMaster.versions.map(v =>
            v.versionNo === versionNo
              ? {
                  ...v,
                  status: (drawingData?.status || v.status) as VersionStatus,
                  isActive: drawingData?.isActive ?? v.isActive,
                  notes: drawingData?.changeDesc || v.notes,
                  files: initialFiles.length > 0 ? initialFiles : v.files,
                }
              : v
          );

          return prev.map(d =>
            d.id === existingMaster.id
              ? {
                  ...d,
                  drawingNo: effectiveDrawingNo,
                  materialId: updatedMat.id,
                  materialCode: updatedMat.materialCode,
                  materialName: updatedMat.materialName,
                  materialSpec: updatedMat.materialSpec,
                  category: updatedMat.category,
                  updatedAt: new Date().toLocaleString(),
                  versions: updatedVersions,
                }
              : d
          );
        } else {
          const newMaster: DrawingMaster = {
            id: `DWG-${Date.now().toString().slice(-4)}`,
            drawingNo: effectiveDrawingNo,
            materialId: updatedMat.id,
            materialCode: updatedMat.materialCode,
            materialName: updatedMat.materialName,
            materialSpec: updatedMat.materialSpec,
            category: updatedMat.category,
            latestVersion: drawingData?.versionNo || 'V1.0',
            createdAt: new Date().toLocaleString(),
            updatedAt: new Date().toLocaleString(),
            versions: [
              {
                id: `VER-${Date.now()}-1`,
                drawingNo: effectiveDrawingNo,
                versionNo: drawingData?.versionNo || 'V1.0',
                status: (drawingData?.status || 'PUBLISHED') as VersionStatus,
                isActive: drawingData?.isActive ?? true,
                notes: drawingData?.changeDesc || '物料档案更新关联版本',
                createdAt: new Date().toLocaleString(),
                createdBy: '当前登录用户',
                files: initialFiles,
              },
            ],
          };
          return [newMaster, ...prev];
        }
      });
    }

    addAuditLog(
      'SUCCESS',
      'MATERIAL_ID_UNIQUE',
      '更新物料档案',
      `成功保存物料档案 [${updatedMat.materialCode}] ${updatedMat.materialName}${
        effectiveDrawingNo ? `，同步更新关联图号 [${effectiveDrawingNo}]` : ''
      }`,
      updatedMat.materialCode,
      '当前登录用户 (物料档案)'
    );
  };

  const handleBatchImportMaterials = (batchItems: Array<Omit<Material, 'id' | 'createdAt' | 'updatedAt' | 'hasDrawing'>>) => {
    const newMaterials: Material[] = batchItems.map((item, idx) => ({
      ...item,
      id: `MAT-BATCH-${Date.now().toString().slice(-3)}-${idx}`,
      hasDrawing: false,
      createdAt: new Date().toLocaleString(),
      updatedAt: new Date().toLocaleString(),
    }));

    setMaterials(prev => [...newMaterials, ...prev]);
    addAuditLog(
      'SUCCESS',
      'MATERIAL_ID_UNIQUE',
      '批量导入物料档案',
      `批量导入 ${newMaterials.length} 条物料档案，已校验必填项并生成唯一 Material ID。`,
      `Batch (${newMaterials.length} items)`,
      'Excel 导入网关'
    );
    alert(`成功批量导入 ${newMaterials.length} 条物料数据！`);
  };

  // 2. Commit Smart Import Candidates (Core Step 2~5)
  const handleCommitImport = (candidates: ImportCandidate[]) => {
    const updatedMasters = [...drawingMasters];
    const updatedMaterials = [...materials];

    // 按目标图号归类待导入文件
    const groupedByDrawing: Record<string, ImportCandidate[]> = {};

    candidates.forEach(c => {
      const targetDrawingNo = c.matchedDrawingNo || c.parsedDrawingNo || `DWG-${c.matchedMaterialCode || 'AUTOGEN'}`;
      if (!groupedByDrawing[targetDrawingNo]) {
        groupedByDrawing[targetDrawingNo] = [];
      }
      groupedByDrawing[targetDrawingNo].push(c);
    });

    Object.entries(groupedByDrawing).forEach(([drawingNo, items]) => {
      const firstItem = items[0];
      let master = updatedMasters.find(m => m.drawingNo === drawingNo || m.materialId === firstItem.matchedMaterialId);

      const filesToAdd: DrawingFile[] = items.map((item, idx) => ({
        id: `FILE-${Date.now()}-${idx}`,
        fileName: item.rawFileName,
        fileType: item.parsedFileType,
        fileSize: item.fileSize,
        fileHash: item.fileHash,
        uploadTime: new Date().toLocaleString(),
        uploader: '批量导入服务 (系统)',
      }));

      if (!master) {
        // 创建新图号主档 + 首个草稿版本 V1
        const newVersionId = `VER-${Date.now()}-1`;
        const newMaster: DrawingMaster = {
          id: `DWG-${Date.now()}`,
          drawingNo,
          materialId: firstItem.matchedMaterialId || `MAT-${Date.now()}`,
          materialCode: firstItem.matchedMaterialCode || 'MAT-AUTO',
          materialName: firstItem.matchedMaterialName || firstItem.parsedName,
          materialSpec: firstItem.matchedMaterialSpec || firstItem.parsedSpec,
          category: '批量导入自动归档',
          latestVersion: 'V1',
          createdAt: new Date().toLocaleString(),
          updatedAt: new Date().toLocaleString(),
          versions: [
            {
              id: newVersionId,
              drawingNo,
              versionNo: 'V1',
              status: 'DRAFT',
              isActive: false,
              notes: `智能批量导入创建首个草稿版本，共归纳 ${filesToAdd.length} 份格式文件。`,
              changeDesc: '初版图纸导入草稿',
              createdAt: new Date().toLocaleString(),
              createdBy: '批量导入服务',
              files: filesToAdd,
            },
          ],
        };
        updatedMasters.push(newMaster);

        // 同步更新物料主数据的图号
        const matIdx = updatedMaterials.findIndex(m => m.id === firstItem.matchedMaterialId);
        if (matIdx >= 0) {
          updatedMaterials[matIdx] = {
            ...updatedMaterials[matIdx],
            drawingNo,
            hasDrawing: true,
            updatedAt: new Date().toLocaleString(),
          };
        }

        addAuditLog(
          'INFO',
          'DRAWING_NO_UNIQUE',
          '自动创建图号主档及首版草稿',
          `物料 ${firstItem.matchedMaterialName} 匹配成功，创建新图号 ${drawingNo} 及首个草稿版本 V1。`,
          `${drawingNo} / V1`
        );
      } else {
        // 已有图号主档
        const existingDraft = master.versions.find(v => v.status === 'DRAFT');

        if (existingDraft && firstItem.resolutionAction === 'MERGE_TO_EXISTING_DRAFT') {
          // 合并到未发布草稿
          existingDraft.files = [...existingDraft.files, ...filesToAdd];
          existingDraft.notes = `${existingDraft.notes || ''} [追加导入 ${filesToAdd.length} 份文件: ${new Date().toLocaleTimeString()}]`;
          master.updatedAt = new Date().toLocaleString();

          addAuditLog(
            'INFO',
            'VERSION_UNIQUE',
            '追加文件至已有草稿',
            `将 ${filesToAdd.length} 份图纸文件合并收纳至 ${drawingNo} 已有草稿版本 ${existingDraft.versionNo}。`,
            `${drawingNo} / ${existingDraft.versionNo}`
          );
        } else {
          // 创建下一版草稿 (如 V2)
          const allVersionNos = master.versions.map(v => v.versionNo);
          const nextVerNo = generateNextVersionNo(allVersionNos);
          const newVer: DrawingVersion = {
            id: `VER-${Date.now()}-${nextVerNo}`,
            drawingNo,
            versionNo: nextVerNo,
            status: 'DRAFT',
            isActive: false,
            notes: `批量导入创建升版草稿，归纳 ${filesToAdd.length} 份格式文件。`,
            changeDesc: '升级草稿版本',
            createdAt: new Date().toLocaleString(),
            createdBy: '批量导入服务',
            files: filesToAdd,
          };
          master.versions.push(newVer);
          master.latestVersion = nextVerNo;
          master.updatedAt = new Date().toLocaleString();

          addAuditLog(
            'INFO',
            'VERSION_UNIQUE',
            '创建下一版草稿',
            `图号 ${drawingNo} 自动创建下一版草稿 ${nextVerNo}。`,
            `${drawingNo} / ${nextVerNo}`
          );
        }
      }
    });

    setDrawingMasters(updatedMasters);
    setMaterials(updatedMaterials);
  };

  // 3. Drawing Version Lifecycle Actions
  const handleUpdateVersionStatus = (
    drawingNo: string,
    versionId: string,
    newStatus: VersionStatus,
    extraData?: Partial<DrawingVersion>
  ) => {
    const operator = extraData?.reviewer || extraData?.publisher || '当前登录用户';
    const statusActionNames: Record<string, string> = {
      PENDING_REVIEW: '提交审批',
      PUBLISHED: '审核发布',
      DRAFT: '撤回审批/转为草稿',
      REJECTED: '审批驳回',
      OBSOLETE: '版本作废',
    };
    const isReverseApproval = (extraData?.notes && extraData.notes.includes('反审批')) || false;
    const actionName = isReverseApproval ? '反审批' : (statusActionNames[newStatus] || '状态变更');

    setDrawingMasters(prev =>
      prev.map(master => {
        if (master.drawingNo !== drawingNo) return master;

        const updatedVersions = master.versions.map(ver => {
          if (ver.id === versionId) {
            let finalExtraData = { ...extraData };

            if (newStatus !== 'PUBLISHED') {
              // 规则：非发布状态不可以启用或设为默认
              finalExtraData.isActive = false;
              finalExtraData.isDefault = false;
            } else if (ver.status !== 'PUBLISHED') {
              // 从非发布状态转为发布状态时，默认启用并记录发布时间
              finalExtraData.isActive = finalExtraData.isActive ?? true;
              finalExtraData.publishTime = finalExtraData.publishTime ?? new Date().toLocaleString();
            }

            const newLog: VersionLog = {
              id: `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              timestamp: new Date().toLocaleString(),
              operator,
              action: actionName,
              details: `${operator} 执行了【${actionName}】操作，状态变更为 [${newStatus}]。${finalExtraData.notes ? `备注: ${finalExtraData.notes}` : ''}`,
            };

            return {
              ...ver,
              status: newStatus,
              ...finalExtraData,
              logs: [newLog, ...(ver.logs || [])],
            };
          }

          return ver;
        });

        // 获取最新发布的生效版本号（如存在）
        const latestPublishedVer = updatedVersions.find(v => v.status === 'PUBLISHED' && v.isActive) ||
          updatedVersions.find(v => v.status === 'PUBLISHED');

        return {
          ...master,
          currentPublishedVersion: latestPublishedVer?.versionNo,
          versions: updatedVersions,
          updatedAt: new Date().toLocaleString(),
        };
      })
    );

    addAuditLog(
      'SUCCESS',
      'IMMUTABLE_PUBLISHED',
      `版本状态流转: ${newStatus}`,
      `图号 ${drawingNo} 版本 ${versionId} 状态已流转为 [${newStatus}]。`,
      `${drawingNo} / ${versionId}`,
      operator
    );
  };

  const handleToggleVersionActive = (drawingNo: string, versionId: string, isActive: boolean) => {
    const operator = '当前登录用户';
    let targetVerNo = '';

    setDrawingMasters(prev =>
      prev.map(master => {
        if (master.drawingNo !== drawingNo) return master;

        const targetVer = master.versions.find(v => v.id === versionId);
        if (targetVer) targetVerNo = targetVer.versionNo;

        // 每个版本独立控制启用 / 停用（互不干扰）
        const updatedVersions = master.versions.map(ver => {
          if (ver.id === versionId) {
            const logItem: VersionLog = {
              id: `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              timestamp: new Date().toLocaleString(),
              operator,
              action: isActive ? '启用版本' : '停用版本',
              details: `${operator} 将版本 ${ver.versionNo} 设置为【${isActive ? '已启用' : '已停用'}】状态。${
                isActive ? '该版本可被 BOM 和生产订单正常引用。' : '该版本已被停用，禁止在下游业务中选用。'
              }`,
            };
            return { ...ver, isActive, logs: [logItem, ...(ver.logs || [])] };
          }
          return ver;
        });

        const activePubVer = updatedVersions.find(v => v.status === 'PUBLISHED' && v.isActive);

        return {
          ...master,
          currentPublishedVersion: activePubVer?.versionNo || master.currentPublishedVersion,
          versions: updatedVersions,
          updatedAt: new Date().toLocaleString(),
        };
      })
    );

    addAuditLog(
      'INFO',
      'REF_VALIDATION_ACTIVE_ONLY',
      `版本状态切换: ${isActive ? '已启用' : '已停用'}`,
      `图号 ${drawingNo} 的版本 ${targetVerNo} 已成功切换为 [${isActive ? '已启用' : '已停用'}] 状态。`,
      `${drawingNo} / ${targetVerNo}`
    );
  };

  const handleSetDefaultVersion = (drawingNo: string, versionId: string) => {
    const operator = '当前登录用户';
    let targetVerNo = '';

    const master = drawingMasters.find(m => m.drawingNo === drawingNo);
    if (!master) return;

    const targetVer = master.versions.find(v => v.id === versionId);
    if (!targetVer) return;

    // 核心规则：只有【已发布】(PUBLISHED) 的版本才可以设置为默认版本
    if (targetVer.status !== 'PUBLISHED') {
      alert(`设置失败：只有【已发布】状态的版本才可以设置为默认版本！当前版本 [${targetVer.versionNo}] 的状态为【${getStatusBadge(targetVer.status).label}】。`);
      return;
    }

    targetVerNo = targetVer.versionNo;

    setDrawingMasters(prev =>
      prev.map(m => {
        if (m.drawingNo !== drawingNo) return m;

        // 设置 targetVer 为默认版本，同时确保其处于已启用状态
        const updatedVersions = m.versions.map(ver => {
          const isThis = ver.id === versionId;
          if (isThis) {
            const logItem: VersionLog = {
              id: `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              timestamp: new Date().toLocaleString(),
              operator,
              action: '设为默认版本',
              details: `${operator} 将已发布版本 ${ver.versionNo} 设置为当前图号的【默认版本】。`,
            };
            return {
              ...ver,
              isActive: true, // 设为默认时自动启用
              isDefault: true,
              logs: [logItem, ...(ver.logs || [])],
            };
          } else {
            return {
              ...ver,
              isDefault: false,
            };
          }
        });

        return {
          ...m,
          currentPublishedVersion: targetVerNo,
          versions: updatedVersions,
          updatedAt: new Date().toLocaleString(),
        };
      })
    );

    addAuditLog(
      'SUCCESS',
      'DEFAULT_VERSION_SET',
      `设置默认版本: ${targetVerNo}`,
      `图号 ${drawingNo} 的默认生效版本已更新为已发布版本 [${targetVerNo}]。`,
      `${drawingNo} / ${targetVerNo}`,
      operator
    );
  };

  const handleCreateDrawingMaster = (materialId: string, drawingNo: string, notes?: string) => {
    const mat = materials.find(m => m.id === materialId);
    if (!mat) return;

    const existing = drawingMasters.find(dm => dm.drawingNo === drawingNo);
    if (existing) {
      alert(`图号 ${drawingNo} 已存在，请重新输入！`);
      return;
    }

    const initialNotes = notes?.trim() || '新建图号初始版本';

    const newMaster: DrawingMaster = {
      id: `DM-${Date.now()}`,
      drawingNo,
      materialId: mat.id,
      materialCode: mat.materialCode,
      materialName: mat.materialName,
      materialSpec: mat.materialSpec,
      category: mat.category,
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toLocaleString(),
      latestVersion: 'V1',
      versions: [
        {
          id: `VER-${Date.now()}-V1`,
          drawingNo,
          versionNo: 'V1',
          status: 'DRAFT',
          isActive: false,
          isDefault: false,
          notes: initialNotes,
          changeDesc: '新建图纸主档',
          createdAt: new Date().toISOString().slice(0, 10),
          createdBy: '当前登录用户',
          files: [],
          logs: [
            {
              id: `LOG-${Date.now()}`,
              timestamp: new Date().toLocaleString(),
              operator: '当前登录用户',
              action: '创建主档',
              details: `物料 ${mat.materialCode} 创建关联图号 ${drawingNo} 初始草稿 V1。${initialNotes ? `备注: ${initialNotes}` : ''}`
            }
          ]
        }
      ]
    };

    setDrawingMasters(prev => [newMaster, ...prev]);
    
    // update material with drawingNo
    setMaterials(prev => prev.map(m => {
      if (m.id === materialId) {
        return { ...m, drawingNo };
      }
      return m;
    }));

    setSelectedDrawingNo(drawingNo);

    addAuditLog(
      'INFO',
      'DRAWING_NO_UNIQUE',
      '新建图号主档',
      `为物料 ${mat.materialCode} 新建图号 ${drawingNo} 并生成初始版本 V1。`,
      drawingNo
    );
  };

  const handleUpdateDrawingNo = (oldDrawingNo: string, newDrawingNo: string) => {
    if (oldDrawingNo === newDrawingNo) return;
    
    const existing = drawingMasters.find(dm => dm.drawingNo === newDrawingNo);
    if (existing) {
      alert(`图号 ${newDrawingNo} 已存在，请重新输入！`);
      return;
    }

    setDrawingMasters(prev => prev.map(master => {
      if (master.drawingNo === oldDrawingNo) {
        return {
          ...master,
          drawingNo: newDrawingNo,
          versions: master.versions.map(v => ({ ...v, drawingNo: newDrawingNo }))
        };
      }
      return master;
    }));

    setMaterials(prev => prev.map(m => {
      if (m.drawingNo === oldDrawingNo) {
        return { ...m, drawingNo: newDrawingNo };
      }
      return m;
    }));

    if (selectedDrawingNo === oldDrawingNo) {
      setSelectedDrawingNo(newDrawingNo);
    }
    
    addAuditLog(
      'INFO',
      'DRAWING_NO_UNIQUE',
      '修改图号',
      `将图号由 ${oldDrawingNo} 修改为 ${newDrawingNo}`,
      newDrawingNo
    );
  };

  const handleCreateNewDraftVersion = (drawingNo: string, baseVersionNo?: string, copyFiles: boolean = false) => {
    const operator = '当前登录用户 (工程师)';
    let createdVerId = '';
    let nextVerNoResult = '';

    setDrawingMasters(prev =>
      prev.map(master => {
        if (master.drawingNo !== drawingNo) return master;

        // 查找要作为基准的版本（优先传入的 baseVersionNo，其次当前已发布或最新版）
        const baseVer = baseVersionNo
          ? master.versions.find(v => v.versionNo === baseVersionNo)
          : (master.versions.find(v => v.status === 'PUBLISHED' && v.isActive) || master.versions[master.versions.length - 1]);

        // 计算新版本号
        const nextVerNo = generateNextVersionNo(master.versions.map(v => v.versionNo));
        nextVerNoResult = nextVerNo;

        // 根据要求：新增版本不继承旧的图纸文件（files 为空）
        const clonedFiles: DrawingFile[] = copyFiles && baseVer && baseVer.files
          ? baseVer.files.map(f => ({
              ...f,
              id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              uploadTime: new Date().toISOString().slice(0, 16).replace('T', ' '),
              uploader: operator,
            }))
          : [];

        createdVerId = `VER-${Date.now()}-${nextVerNo}`;
        const newVer: DrawingVersion = {
          id: createdVerId,
          drawingNo,
          versionNo: nextVerNo,
          status: 'DRAFT',
          isActive: false,
          isDefault: false,
          notes: `新增草稿版本 ${nextVerNo}`,
          changeDesc: '新增工程图纸版本',
          createdAt: new Date().toISOString().slice(0, 10),
          createdBy: operator,
          files: clonedFiles,
          logs: [
            {
              id: `LOG-${Date.now()}-0`,
              timestamp: new Date().toLocaleString(),
              operator,
              action: '新增版本',
              details: `${operator} 新增了图纸版本草稿 ${nextVerNo}（全新版本，未继承旧图纸）。`,
            },
          ],
        };

        return {
          ...master,
          latestVersion: nextVerNo,
          versions: [...master.versions, newVer],
          updatedAt: new Date().toLocaleString(),
        };
      })
    );

    addAuditLog(
      'INFO',
      'VERSION_UNIQUE',
      '新增版本草稿',
      `图号 ${drawingNo} 新增版本草稿 ${nextVerNoResult || ''}（未继承旧图纸文件）。`,
      drawingNo
    );

    return createdVerId;
  };

  const handleUpdateDraftVersionNo = (drawingNo: string, versionId: string, newVersionNo: string) => {
    const cleanVerNo = newVersionNo.trim().toUpperCase();
    if (!cleanVerNo) {
      alert('版本号不能为空！');
      return;
    }

    setDrawingMasters(prev =>
      prev.map(master => {
        if (master.drawingNo !== drawingNo) return master;
        const targetVer = master.versions.find(v => v.id === versionId);
        if (!targetVer) return master;
        if (targetVer.status !== 'DRAFT') {
          alert('仅草稿状态下的版本允许修改版本号！');
          return master;
        }

        const duplicate = master.versions.some(v => v.id !== versionId && v.versionNo.toUpperCase() === cleanVerNo);
        if (duplicate) {
          alert(`图号 ${drawingNo} 下已存在版本号 [${cleanVerNo}]，版本号不可重复！`);
          return master;
        }

        const oldVerNo = targetVer.versionNo;
        const updatedVersions = master.versions.map(v => {
          if (v.id === versionId) {
            const logItem: VersionLog = {
              id: `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              timestamp: new Date().toLocaleString(),
              operator: '当前登录工程师',
              action: '修改版本号',
              details: `草稿版本号由 [${oldVerNo}] 调整为 [${cleanVerNo}]。`,
            };
            return {
              ...v,
              versionNo: cleanVerNo,
              logs: [logItem, ...(v.logs || [])],
            };
          }
          return v;
        });

        return {
          ...master,
          latestVersion: master.latestVersion === oldVerNo ? cleanVerNo : master.latestVersion,
          versions: updatedVersions,
          updatedAt: new Date().toLocaleString(),
        };
      })
    );

    addAuditLog(
      'INFO',
      'VERSION_UNIQUE',
      '修改草稿版本号',
      `图号 ${drawingNo} 的草稿版本号已调整为 [${cleanVerNo}]。`,
      `${drawingNo} / ${cleanVerNo}`
    );
  };

  const handleDeleteDraftVersion = (drawingNo: string, versionId: string) => {
    setDrawingMasters(prev =>
      prev.map(master => {
        if (master.drawingNo !== drawingNo) return master;
        const ver = master.versions.find(v => v.id === versionId);
        if (ver?.status !== 'DRAFT' && ver?.status !== 'REJECTED') {
          alert('非草稿/驳回状态版本严禁直接删除！');
          return master;
        }
        return {
          ...master,
          versions: master.versions.filter(v => v.id !== versionId),
          updatedAt: new Date().toLocaleString(),
        };
      })
    );
  };

  const handleDeleteDrawingMaster = (drawingNo: string) => {
    setDrawingMasters(prev => prev.filter(dm => dm.drawingNo !== drawingNo));
    setMaterials(prev => prev.map(m => m.drawingNo === drawingNo ? { ...m, drawingNo: undefined, hasDrawing: false } : m));
    addAuditLog(
      'WARN',
      'IMMUTABLE_PUBLISHED',
      '删除图号主档',
      `图号主档 [${drawingNo}] 及其所有版本数据已被彻底移除。`,
      drawingNo
    );
  };

  const handleUpdateDrawingMasterMaterial = (drawingNo: string, newMaterialId: string) => {
    const mat = materials.find(m => m.id === newMaterialId);
    if (!mat) return;
    setDrawingMasters(prev => prev.map(dm => {
      if (dm.drawingNo !== drawingNo) return dm;
      return {
        ...dm,
        materialId: mat.id,
        materialCode: mat.materialCode,
        materialName: mat.materialName,
        materialSpec: mat.materialSpec,
        category: mat.category,
        updatedAt: new Date().toLocaleString(),
      };
    }));
    setMaterials(prev => prev.map(m => {
      if (m.id === newMaterialId) {
        return { ...m, drawingNo, hasDrawing: true };
      }
      return m;
    }));
    addAuditLog(
      'INFO',
      'MATERIAL_ID_UNIQUE',
      '更新关联物料',
      `图号 [${drawingNo}] 已重新绑定关联至物料 [${mat.materialCode} - ${mat.materialName}]。`,
      drawingNo
    );
  };

  const handleUpdateVersionInfo = (
    drawingNo: string,
    versionId: string,
    updateData: { versionNo?: string; notes?: string; changeDesc?: string }
  ) => {
    const operator = '当前登录用户';
    setDrawingMasters(prev =>
      prev.map(master => {
        if (master.drawingNo !== drawingNo) return master;
        const updatedVersions = master.versions.map(ver => {
          if (ver.id === versionId) {
            const changes: string[] = [];
            if (updateData.versionNo && updateData.versionNo !== ver.versionNo) {
              changes.push(`版本号由 [${ver.versionNo}] 改为 [${updateData.versionNo}]`);
            }
            if (updateData.notes !== undefined && updateData.notes !== ver.notes) {
              changes.push(`备注修改为: ${updateData.notes}`);
            }
            if (updateData.changeDesc !== undefined && updateData.changeDesc !== ver.changeDesc) {
              changes.push(`变更说明修改为: ${updateData.changeDesc}`);
            }
            const logItem: VersionLog = {
              id: `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              timestamp: new Date().toLocaleString(),
              operator,
              action: '编辑版本信息',
              details: changes.length > 0 ? changes.join('；') : '修改版本详细属性',
            };
            return {
              ...ver,
              versionNo: updateData.versionNo || ver.versionNo,
              notes: updateData.notes !== undefined ? updateData.notes : ver.notes,
              changeDesc: updateData.changeDesc !== undefined ? updateData.changeDesc : ver.changeDesc,
              updatedAt: new Date().toLocaleString(),
              logs: [logItem, ...(ver.logs || [])],
            };
          }
          return ver;
        });
        return {
          ...master,
          versions: updatedVersions,
          updatedAt: new Date().toLocaleString(),
        };
      })
    );
  };

  const handleUpdateFileInVersion = (
    drawingNo: string,
    versionId: string,
    fileId: string,
    updatedFile: Partial<DrawingFile>
  ) => {
    const operator = '当前登录用户';
    setDrawingMasters(prev =>
      prev.map(master => {
        if (master.drawingNo !== drawingNo) return master;
        const updatedVersions = master.versions.map(ver => {
          if (ver.id === versionId) {
            const targetFile = ver.files.find(f => f.id === fileId);
            const oldName = targetFile?.fileName || fileId;
            const updatedFiles = ver.files.map(f => {
              if (f.id === fileId) {
                return { ...f, ...updatedFile };
              }
              return f;
            });
            const logItem: VersionLog = {
              id: `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              timestamp: new Date().toLocaleString(),
              operator,
              action: '编辑图纸文件',
              details: `${operator} 编辑了图纸文件 [${oldName}]${updatedFile.fileName ? ` 为 [${updatedFile.fileName}]` : ''}。`,
            };
            return {
              ...ver,
              files: updatedFiles,
              updatedAt: new Date().toLocaleString(),
              logs: [logItem, ...(ver.logs || [])],
            };
          }
          return ver;
        });
        return {
          ...master,
          versions: updatedVersions,
          updatedAt: new Date().toLocaleString(),
        };
      })
    );
  };

  const handleAddFileToDraft = (drawingNo: string, versionId: string, file: DrawingFile) => {
    const operator = file.uploader || '当前登录工程师';
    setDrawingMasters(prev =>
      prev.map(master => {
        if (master.drawingNo !== drawingNo) return master;
        return {
          ...master,
          versions: master.versions.map(v => {
            if (v.id !== versionId) return v;
            const logItem: VersionLog = {
              id: `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              timestamp: file.uploadTime || new Date().toLocaleString(),
              operator,
              action: '新增图纸',
              details: `${operator} 上传新增了 ${file.fileType} 格式图纸: ${file.fileName} (${formatFileSize(file.fileSize)})。`,
            };
            return {
              ...v,
              files: [...v.files, file],
              logs: [logItem, ...(v.logs || [])],
            };
          }),
        };
      })
    );

    addAuditLog(
      'INFO',
      'IMMUTABLE_PUBLISHED',
      '新增图纸文件',
      `图号 ${drawingNo} 版本 ${versionId} 新增 ${file.fileType} 格式图纸: ${file.fileName}。`,
      `${drawingNo} / ${versionId}`,
      operator
    );
  };

  const handleDeleteFileFromVersion = (
    drawingNo: string,
    versionId: string,
    fileId: string,
    fileName: string,
    fileType: string
  ) => {
    const operator = '当前登录工程师';
    setDrawingMasters(prev =>
      prev.map(master => {
        if (master.drawingNo !== drawingNo) return master;
        return {
          ...master,
          versions: master.versions.map(v => {
            if (v.id !== versionId) return v;
            const logItem: VersionLog = {
              id: `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              timestamp: new Date().toLocaleString(),
              operator,
              action: '删除图纸',
              details: `${operator} 删除了 ${fileType} 格式图纸: ${fileName}。`,
            };
            return {
              ...v,
              files: v.files.filter(f => f.id !== fileId),
              logs: [logItem, ...(v.logs || [])],
            };
          }),
          updatedAt: new Date().toLocaleString(),
        };
      })
    );

    addAuditLog(
      'WARN',
      'REF_VALIDATION_ACTIVE_ONLY',
      '删除图纸文件',
      `图号 ${drawingNo} 版本 ${versionId} 下删除了图纸: ${fileName} (${fileType})。`,
      `${drawingNo} / ${versionId}`,
      operator
    );
  };

  // 4. BOM Management Actions
  const handleUpdateBOMItemVersion = (
    bomId: string,
    itemId: string,
    drawingVersionId: string,
    versionNo: string
  ) => {
    setBoms(prev =>
      prev.map(bom => {
        if (bom.id !== bomId) return bom;
        return {
          ...bom,
          updatedAt: new Date().toLocaleString(),
          items: bom.items.map(item => {
            if (item.id !== itemId) return item;
            return {
              ...item,
              drawingVersionId,
              versionNo,
              versionStatus: 'PUBLISHED',
              isActiveVersion: true,
            };
          }),
        };
      })
    );

    addAuditLog(
      'SUCCESS',
      'REF_VALIDATION_ACTIVE_ONLY',
      'BOM 图号版本引用更新',
      `BOM ${bomId} 中物料图号版本更新为 ${versionNo} (ID: ${drawingVersionId})，符合已发布且启用规则。`,
      `BOM ${bomId} / ${versionNo}`
    );
  };

  const handleAddBOMItem = (
    bomId: string,
    materialId: string,
    drawingVersionId: string,
    quantity: number
  ) => {
    const mat = materials.find(m => m.id === materialId);
    if (!mat) return;

    const master = mat.drawingNo ? drawingMasters.find(d => d.drawingNo === mat.drawingNo) : undefined;
    const ver = master?.versions.find(v => v.id === drawingVersionId);

    const newItem = {
      id: `BOMI-${Date.now()}`,
      materialId: mat.id,
      materialCode: mat.materialCode,
      materialName: mat.materialName,
      materialSpec: mat.materialSpec,
      quantity,
      unit: mat.unit,
      drawingNo: mat.drawingNo,
      drawingVersionId,
      versionNo: ver?.versionNo || 'V1',
      versionStatus: ver?.status || 'PUBLISHED',
      isActiveVersion: ver?.isActive ?? true,
    };

    setBoms(prev =>
      prev.map(bom => {
        if (bom.id !== bomId) return bom;
        return {
          ...bom,
          updatedAt: new Date().toLocaleString(),
          items: [...bom.items, newItem],
        };
      })
    );

    addAuditLog(
      'SUCCESS',
      'REF_VALIDATION_ACTIVE_ONLY',
      '向 BOM 添加子项并绑定图号版本',
      `向 BOM ${bomId} 添加物料 ${mat.materialName}，绑定生效图号版本 ${ver?.versionNo || 'V1'}。`,
      `BOM ${bomId} / ${mat.materialCode}`
    );
  };

  const handleRemoveBOMItem = (bomId: string, itemId: string) => {
    setBoms(prev =>
      prev.map(bom => {
        if (bom.id !== bomId) return bom;
        return {
          ...bom,
          updatedAt: new Date().toLocaleString(),
          items: bom.items.filter(i => i.id !== itemId),
        };
      })
    );
  };

  // SolidWorks 插件一键导入协同处理器
  const handleSolidWorksImport = (importedData: {
    bom: BOM;
    materials: Material[];
    drawings: DrawingMaster[];
  }) => {
    // 1. 同步物料档案
    setMaterials(prev => {
      const existingCodes = new Set(prev.map(m => m.materialCode));
      const newMaterials = importedData.materials.filter(m => !existingCodes.has(m.materialCode));
      return [...newMaterials, ...prev];
    });

    // 2. 同步图号与版本档案
    setDrawingMasters(prev => {
      const masterMap = new Map<string, DrawingMaster>(prev.map(d => [d.drawingNo, { ...d }]));
      importedData.drawings.forEach(importedMaster => {
        if (masterMap.has(importedMaster.drawingNo)) {
          const exist = masterMap.get(importedMaster.drawingNo)!;
          // 合并版本并添加新版本
          const existingVerIds = new Set(exist.versions.map(v => v.id));
          const newVers = importedMaster.versions.filter(v => !existingVerIds.has(v.id));
          exist.versions = [...newVers, ...exist.versions];
          exist.updatedAt = new Date().toLocaleString();
          masterMap.set(importedMaster.drawingNo, exist);
        } else {
          masterMap.set(importedMaster.drawingNo, importedMaster);
        }
      });
      return Array.from(masterMap.values());
    });

    // 3. 同步草稿 BOM
    setBoms(prev => [importedData.bom, ...prev]);

    // 4. 记录全链路审计日志
    addAuditLog(
      'SUCCESS',
      'REF_VALIDATION_ACTIVE_ONLY',
      'SolidWorks 插件一键导入 BOM/物料/图纸模型',
      `成功通过 SolidWorks CAD 插件批量解析并导入草稿状态 BOM [${importedData.bom.bomCode}]，自动生成 ${importedData.materials.length} 项物料档案，并同步创建 ${importedData.drawings.length} 项图号三维装配体模型文件与工程图纸版本。`,
      importedData.bom.bomCode,
      'SolidWorks PLM Plugin'
    );
  };

  // 5. Drawing Archiving Actions
  const handleCreateArchiveSnapshot = (
    snapshotData: Omit<DrawingArchiveSnapshot, 'id' | 'archivedAt' | 'sealHash' | 'status'>
  ) => {
    const sealHash = `sha256:${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
    const newSnapshot: DrawingArchiveSnapshot = {
      ...snapshotData,
      id: `ARC-${Date.now()}`,
      archivedAt: new Date().toLocaleString(),
      sealHash,
      status: 'LOCKED',
    };

    setArchives(prev => [newSnapshot, ...prev]);

    addAuditLog(
      'SUCCESS',
      'IMMUTABLE_PUBLISHED',
      '生成生产图号建档锁定快照',
      `销售订单 ${newSnapshot.orderNo} 产品 ${newSnapshot.productName} 生成图号建档快照，锁定 ${newSnapshot.snapshotItems.length} 项图纸引用，防伪指纹: ${sealHash.slice(0, 18)}...`,
      newSnapshot.archiveNo,
      newSnapshot.archivedBy
    );
  };

  // 6. 从 BOM 详情页一键跳转至图号管理
  const handleNavigateToDrawingsFromBOM = (
    drawingNo: string,
    productMeta?: { productCode?: string; productName?: string; specName?: string }
  ) => {
    if (!drawingNo) return;

    // 检查 drawingMasters 中是否已有该图号或物料编码的主档记录
    const existingMaster = drawingMasters.find(
      d =>
        d.drawingNo === drawingNo ||
        (productMeta?.productCode && (d.materialCode === productMeta.productCode || d.materialId === productMeta.productCode))
    );

    if (existingMaster) {
      setSelectedDrawingNo(existingMaster.drawingNo);
    } else {
      // 自动建立该图号的主档，方便用户无缝在图号管理查阅和管理
      const newMaster: DrawingMaster = {
        id: `DWG-AUTO-${Date.now()}`,
        drawingNo,
        materialId: productMeta?.productCode || `MAT-${drawingNo}`,
        materialCode: productMeta?.productCode || drawingNo,
        materialName: productMeta?.productName || '自制零部件',
        materialSpec: productMeta?.specName || '标准规格',
        category: productMeta?.productName?.includes('罩')
          ? '钣金件'
          : productMeta?.productName?.includes('机')
          ? '高端装配'
          : '自制结构件',
        latestVersion: 'V1',
        createdAt: new Date().toLocaleString(),
        updatedAt: new Date().toLocaleString(),
        versions: [
          {
            id: `VER-${Date.now()}-1`,
            drawingNo,
            versionNo: 'V1',
            status: 'PUBLISHED',
            isActive: true,
            isDefault: true,
            notes: '来自 BOM 结构/自制件工程图纸同步建档',
            createdAt: new Date().toLocaleString(),
            createdBy: '系统同步 (BOM自制件关联)',
            files: [
              {
                id: `FILE-${Date.now()}-1`,
                fileName: `${productMeta?.productName || drawingNo}_工程图.DWG`,
                fileType: 'DWG',
                fileSize: 5850000,
                fileHash: `HASH-${Math.random().toString(36).substring(2, 9)}`,
                uploadTime: new Date().toLocaleString(),
                uploader: '工程师 (BOM关联)',
              },
              {
                id: `FILE-${Date.now()}-2`,
                fileName: `${productMeta?.productName || drawingNo}_3D模型.STEP`,
                fileType: 'STEP',
                fileSize: 14450000,
                fileHash: `HASH-${Math.random().toString(36).substring(2, 9)}`,
                uploadTime: new Date().toLocaleString(),
                uploader: 'SolidWorks 插件同步',
              },
            ],
          },
        ],
      };
      setDrawingMasters(prev => [newMaster, ...prev]);
      setSelectedDrawingNo(drawingNo);
    }

    setActiveTab('drawings');
  };

  return (
    <div className="h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans antialiased selection:bg-blue-500 selection:text-white overflow-hidden">
      {/* Mobile-only Navigation Toggle Bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-2.5 bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shrink-0">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center gap-2 text-xs font-semibold"
          aria-label="打开侧边导航"
        >
          <Menu className="w-4 h-4" />
          <span>功能菜单</span>
        </button>
        <div className="text-xs text-slate-400 font-mono">
          {activeTab === 'materials-new' && '物料档案（新）'}
          {activeTab === 'drawings-new' && '图号管理（新）'}
          {activeTab === 'bom-new' && 'BOM管理（新）'}
          {activeTab === 'ecn' && 'ECN变更单'}
          {activeTab === 'ecn-notifications' && 'ECN通知中心'}
          {activeTab === 'materials' && '物料档案'}
          {activeTab === 'import' && '一键同步'}
          {activeTab === 'drawings' && '图号版本管理'}
          {activeTab === 'bom' && 'BOM管理'}
          {activeTab === 'archiving' && '图号归档'}
        </div>
      </div>

      {/* Main Layout Body */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row w-full mx-auto max-w-[1920px] overflow-hidden">
        {/* Navigation Sidebar */}
        <Navigation
          activeTab={activeTab}
          onTabChange={handleTabChange}
          pendingReviewsCount={pendingReviewsCount}
          draftsCount={draftsCount}
          unreadECNNotificationsCount={unreadECNNotificationsCount}
          isMobileMenuOpen={isMobileMenuOpen}
          onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
        />

        {/* Dynamic Main Workspace Stage */}
        <main
          className={`flex-1 min-h-0 min-w-0 flex flex-col max-w-full ${
            [
              'materials',
              'materials-new',
              'material-edit',
              'drawings',
              'drawings-new',
              'bom',
              'bom-new',
              'ecn',
            ].includes(activeTab)
              ? 'p-0 overflow-hidden'
              : 'p-4 sm:p-6 lg:p-8 overflow-y-auto'
          }`}
        >
          {(activeTab === 'materials' || activeTab === 'materials-new') && (
            <MaterialsView
              isNoVersionMode={activeTab === 'materials-new'}
              materials={materials}
              drawingMasters={drawingMasters}
              boms={boms}
              onAddMaterial={handleAddMaterial}
              onUpdateMaterial={handleUpdateMaterial}
              onDeleteMaterial={handleDeleteMaterial}
              onBatchImportMaterials={handleBatchImportMaterials}
              onSelectDrawing={drawingNo => {
                handleSelectDrawing(drawingNo, activeTab === 'materials-new' ? 'drawings-new' : 'drawings');
              }}
              onNavigateToImport={() => handleTabChange('import')}
              onUpdateVersionStatus={handleUpdateVersionStatus}
              onToggleVersionActive={handleToggleVersionActive}
              onSetDefaultVersion={handleSetDefaultVersion}
              onCreateDrawingMaster={handleCreateDrawingMaster}
              onUpdateDrawingNo={handleUpdateDrawingNo}
              onCreateNewDraftVersion={handleCreateNewDraftVersion}
              onUpdateDraftVersionNo={handleUpdateDraftVersionNo}
              onDeleteDraftVersion={handleDeleteDraftVersion}
              onDeleteDrawingMaster={handleDeleteDrawingMaster}
              onAddFileToDraft={handleAddFileToDraft}
              onDeleteFileFromVersion={handleDeleteFileFromVersion}
              onUpdateVersionInfo={handleUpdateVersionInfo}
              onUpdateFileInVersion={handleUpdateFileInVersion}
            />
          )}

          {activeTab === 'material-edit' && (
            <MaterialDrawingView 
              onClose={() => handleTabChange('materials')} 
              materials={materials}
              drawingMasters={drawingMasters}
              onUpdateVersionStatus={handleUpdateVersionStatus}
              onToggleVersionActive={handleToggleVersionActive}
              onSetDefaultVersion={handleSetDefaultVersion}
              onCreateDrawingMaster={handleCreateDrawingMaster}
              onUpdateDrawingNo={handleUpdateDrawingNo}
              onCreateNewDraftVersion={handleCreateNewDraftVersion}
              onUpdateDraftVersionNo={handleUpdateDraftVersionNo}
              onDeleteDraftVersion={handleDeleteDraftVersion}
              onAddFileToDraft={handleAddFileToDraft}
              onDeleteFileFromVersion={handleDeleteFileFromVersion}
            />
          )}

          {activeTab === 'import' && (
            <DrawingImportView
              materials={materials}
              drawingMasters={drawingMasters}
              boms={boms}
              onCommitImport={handleCommitImport}
              onNavigateToDrawings={() => handleTabChange('drawings')}
            />
          )}

          {(activeTab === 'drawings' || activeTab === 'drawings-new') && (
            <DrawingVersionsView
              isNoVersionMode={activeTab === 'drawings-new'}
              drawingMasters={drawingMasters}
              materials={materials}
              boms={boms}
              salesOrders={salesOrders}
              selectedDrawingNo={selectedDrawingNo}
              onUpdateVersionStatus={handleUpdateVersionStatus}
              onToggleVersionActive={handleToggleVersionActive}
              onSetDefaultVersion={handleSetDefaultVersion}
              onCreateDrawingMaster={handleCreateDrawingMaster}
              onUpdateDrawingNo={handleUpdateDrawingNo}
              onCreateNewDraftVersion={handleCreateNewDraftVersion}
              onUpdateDraftVersionNo={handleUpdateDraftVersionNo}
              onDeleteDraftVersion={handleDeleteDraftVersion}
              onAddFileToDraft={handleAddFileToDraft}
              onDeleteFileFromVersion={handleDeleteFileFromVersion}
              onDeleteDrawingMaster={handleDeleteDrawingMaster}
              onUpdateDrawingMasterMaterial={handleUpdateDrawingMasterMaterial}
              onUpdateVersionInfo={handleUpdateVersionInfo}
              onUpdateFileInVersion={handleUpdateFileInVersion}
              onSolidWorksImport={handleSolidWorksImport}
            />
          )}

          {(activeTab === 'bom' || activeTab === 'bom-new') && (
            <BOMManagementView
              isNoVersionMode={activeTab === 'bom-new'}
              boms={boms}
              materials={materials}
              drawingMasters={drawingMasters}
              salesOrders={salesOrders}
              onUpdateBOMItemVersion={handleUpdateBOMItemVersion}
              onAddBOMItem={handleAddBOMItem}
              onRemoveBOMItem={handleRemoveBOMItem}
              onSolidWorksImport={handleSolidWorksImport}
              onNavigateToDrawings={(drawingNo) => {
                handleSelectDrawing(drawingNo, activeTab === 'bom-new' ? 'drawings-new' : 'drawings');
              }}
              onAuditTriggered={(title, desc, target) => {
                addAuditLog('GUARD_BLOCK', 'REF_VALIDATION_ACTIVE_ONLY', title, desc, target);
              }}
            />
          )}

          {activeTab === 'archiving' && (
            <DrawingArchivingView
              salesOrders={salesOrders}
              boms={boms}
              drawingMasters={drawingMasters}
              archives={archives}
              onCreateArchiveSnapshot={handleCreateArchiveSnapshot}
            />
          )}

          {activeTab === 'ecn' && (
            <ECNManagementView
              ecnOrders={ecnOrders}
              setEcnOrders={setEcnOrders}
              boms={boms}
              setBoms={setBoms}
              salesOrders={salesOrders}
              materials={materials}
              initialOrderId={selectedECNOrderIdForNav}
              onDepartmentConfirm={handleECNDepartmentConfirm}
              onNavigateToNotifications={handleNavigateToNotifications}
            />
          )}

          {activeTab === 'ecn-notifications' && (
            <ECNNotificationCenterView
              ecnOrders={ecnOrders}
              onDepartmentConfirm={handleECNDepartmentConfirm}
              onNavigateToECN={handleNavigateToECN}
            />
          )}
        </main>
      </div>
    </div>
  );
}
