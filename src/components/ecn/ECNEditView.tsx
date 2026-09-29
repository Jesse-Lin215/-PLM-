import React, { useState, useMemo } from 'react';
import {
  ECNOrder,
  ECNMaterialItem,
  ECNWorkOrderSync,
  ECNItemOperation,
  BOM,
  SalesOrder,
  SalesOrderItem,
  Material,
} from '../../types/plm';
import {
  ECN_CHANGE_TYPES,
  ECN_DEPARTMENTS,
  CANDIDATE_WORK_ORDERS_MAP,
} from '../../data/mockECNData';
import {
  Plus,
  Trash2,
  Edit3,
  AlertTriangle,
  RotateCcw,
  Layers,
  CheckSquare,
  Send,
  FileText,
  Building2,
  Info,
  Check,
  ArrowLeft,
  ArrowRight,
  Save,
  Search,
  CheckCircle2,
  Calendar,
  Sparkles,
  AlertCircle,
  Clock,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  PackageCheck,
  Hash,
} from 'lucide-react';

interface ECNEditViewProps {
  initialOrder?: ECNOrder | null;
  boms: BOM[];
  salesOrders: SalesOrder[];
  materials: Material[];
  existingECNOrders: ECNOrder[];
  onBack: () => void;
  onSaveDraft: (order: ECNOrder) => void;
  onSubmitApproval: (order: ECNOrder) => void;
}

// Standard applicant profiles with multiple department support
const PRESET_APPLICANTS = [
  { name: '林佳兴', departments: ['工程部', '研发中心'] },
  { name: '张立', departments: ['结构设计部', '工程部'] },
  { name: '王建国', departments: ['工程主管办', '技术部'] },
  { name: '赵勇', departments: ['生产制造部', '工艺工程部'] },
  { name: '李工', departments: ['机加工段', '工程部'] },
  { name: '陈明', departments: ['电气工程部'] },
];

// Helper to get line items (项次-产品) from a sales order
export const getSalesOrderItems = (so?: SalesOrder): SalesOrderItem[] => {
  if (!so) return [];
  if (so.items && so.items.length > 0) return so.items;
  return [
    {
      itemNo: '01',
      productCode: so.productCode,
      productName: so.productName,
      productSpec: so.productSpec,
      bomId: so.bomId,
      bomCode: so.bomCode,
      bomVersion: so.bomVersion,
      orderQuantity: so.orderQuantity,
    },
  ];
};

export const ECNEditView: React.FC<ECNEditViewProps> = ({
  initialOrder,
  boms,
  salesOrders,
  materials,
  existingECNOrders,
  onBack,
  onSaveDraft,
  onSubmitApproval,
}) => {
  const isEditing = !!initialOrder;

  // Active Section Tab inside the form
  const [activeSection, setActiveSection] = useState<'base' | 'materials' | 'workOrders' | 'approval'>('base');

  const SECTIONS: Array<'base' | 'materials' | 'workOrders' | 'approval'> = [
    'base',
    'materials',
    'workOrders',
    'approval',
  ];
  const currentSectionIndex = SECTIONS.indexOf(activeSection);
  const hasPrev = currentSectionIndex > 0;
  const hasNext = currentSectionIndex < SECTIONS.length - 1;

  const handlePrev = () => {
    if (hasPrev) {
      setActiveSection(SECTIONS[currentSectionIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      setActiveSection(SECTIONS[currentSectionIndex + 1]);
    }
  };

  // Form State
  const [ecnNo] = useState(
    initialOrder?.ecnNo ||
      `ECN${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(
        new Date().getDate()
      ).padStart(2, '0')}${String(Math.floor(Math.random() * 9000) + 1000)}`
  );
  const [ecnDate, setEcnDate] = useState(initialOrder?.ecnDate || new Date().toISOString().slice(0, 10));
  const [demandDate, setDemandDate] = useState(
    initialOrder?.demandDate || ''
  );
  const [applicant, setApplicant] = useState(initialOrder?.applicant || '林佳兴');
  const [applicantDept, setApplicantDept] = useState(initialOrder?.applicantDept || '工程部');
  const [productionOwner, setProductionOwner] = useState(initialOrder?.productionOwner || '赵勇');
  const [designOwner, setDesignOwner] = useState(initialOrder?.designOwner || '张立');
  const [changeType, setChangeType] = useState(initialOrder?.changeType || ECN_CHANGE_TYPES[0]);
  const [changeReason, setChangeReason] = useState(initialOrder?.changeReason || '');

  // Associations: Sales Order, Line Item, and BOM
  const [salesOrderId, setSalesOrderId] = useState(initialOrder?.salesOrderId || salesOrders[0]?.id || '');
  const selectedSalesOrder = useMemo(() => salesOrders.find(s => s.id === salesOrderId), [salesOrders, salesOrderId]);

  // Candidate line items (项次-产品) of the selected sales order
  const currentOrderItems = useMemo(() => getSalesOrderItems(selectedSalesOrder), [selectedSalesOrder]);

  // Selected item line number (项次)
  const [orderItemNo, setOrderItemNo] = useState(
    initialOrder?.orderItemNo || currentOrderItems[0]?.itemNo || '01'
  );

  // Active selected order item
  const selectedOrderItem = useMemo(() => {
    if (!currentOrderItems.length) return null;
    return currentOrderItems.find(it => it.itemNo === orderItemNo) || currentOrderItems[0];
  }, [currentOrderItems, orderItemNo]);

  // Selected BOM is automatically resolved from the selected order item / sales order
  const selectedBOM = useMemo(() => {
    if (!selectedOrderItem) return boms[0];
    return boms.find(b => b.id === selectedOrderItem.bomId || b.bomCode === selectedOrderItem.bomCode) || boms[0];
  }, [boms, selectedOrderItem]);

  const bomId = selectedBOM?.id || '';

  // Auto-derived Product Spec and BOM Version
  const derivedProductSpec = selectedOrderItem?.productSpec || selectedSalesOrder?.productSpec || '-';
  const derivedBomVersion = selectedBOM?.versionNo || selectedBOM?.version || selectedOrderItem?.bomVersion || selectedSalesOrder?.bomVersion || 'V1.0';
  const derivedBomCode = selectedBOM?.bomCode || selectedOrderItem?.bomCode || selectedSalesOrder?.bomCode || '-';

  // Get current applicant's available departments
  const currentApplicantProfile = useMemo(() => {
    return PRESET_APPLICANTS.find(a => a.name === applicant);
  }, [applicant]);

  const availableDepts = useMemo(() => {
    if (currentApplicantProfile) {
      return currentApplicantProfile.departments;
    }
    return [applicantDept || '工程部'];
  }, [currentApplicantProfile, applicantDept]);

  // Handle applicant change and auto-populate department
  const handleApplicantChange = (newApplicant: string) => {
    setApplicant(newApplicant);
    const profile = PRESET_APPLICANTS.find(a => a.name === newApplicant);
    if (profile && profile.departments.length > 0) {
      setApplicantDept(profile.departments[0]);
    }
  };

  // Check BR15: Single Active ECN constraint per BOM
  const existingActiveECN = useMemo(() => {
    if (!selectedBOM) return null;
    return existingECNOrders.find(
      e =>
        e.bomId === selectedBOM.id &&
        e.id !== initialOrder?.id &&
        ['DRAFT', 'PENDING_REVIEW', 'APPROVED'].includes(e.docStatus) &&
        e.notifyStatus === 'UNNOTIFIED'
    );
  }, [existingECNOrders, selectedBOM, initialOrder]);

  // Material Items State
  const [items, setItems] = useState<ECNMaterialItem[]>(initialOrder?.items || []);

  // Work Orders State
  const [workOrders, setWorkOrders] = useState<ECNWorkOrderSync[]>(() => {
    if (initialOrder?.workOrders) return initialOrder.workOrders;
    if (selectedSalesOrder) {
      const candidates = CANDIDATE_WORK_ORDERS_MAP[selectedSalesOrder.orderNo] || [
        {
          id: `WO-${Date.now()}-1`,
          workOrderNo: `WO-${selectedSalesOrder.orderNo.slice(-4)}-01`,
          productCode: selectedSalesOrder.productCode,
          productName: selectedSalesOrder.productName,
          productionQty: selectedSalesOrder.orderQuantity,
          workOrderStatus: 'IN_PROGRESS',
          selected: true,
          syncStatus: 'UNSYNCED',
          pickedQtyMap: {},
        },
      ];
      return candidates;
    }
    return [];
  });

  // Expanded Work Orders for picking details
  const [expandedWoIds, setExpandedWoIds] = useState<string[]>([]);
  const handleToggleExpandWo = (woId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedWoIds(prev =>
      prev.includes(woId) ? prev.filter(id => id !== woId) : [...prev, woId]
    );
  };

  // Notification settings
  const [notifyMode, setNotifyMode] = useState<'AUTO' | 'MANUAL'>(initialOrder?.notifyMode || 'AUTO');
  const [notifyDepts, setNotifyDepts] = useState<string[]>(
    initialOrder?.notifyDepts || ['机加', '钣金', '品检部', '采购', '仓库', 'PMC']
  );

  // Material Editor Drawer / Inline Panel
  const [showItemDrawer, setShowItemDrawer] = useState(false);
  const [itemDrawerMode, setItemDrawerMode] = useState<'ADD' | 'MODIFY'>('ADD');
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [materialSearchQuery, setMaterialSearchQuery] = useState('');
  const [selectedMatCode, setSelectedMatCode] = useState(materials[0]?.materialCode || '');
  const [selectedSourceBomItemId, setSelectedSourceBomItemId] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [itemSpec, setItemSpec] = useState('');
  const [itemDrawing, setItemDrawing] = useState('');
  const [itemReason, setItemReason] = useState('');

  // Handle sales order change (automatically brings out line items, BOM, and candidate work orders)
  const handleSalesOrderChange = (soId: string) => {
    setSalesOrderId(soId);
    const so = salesOrders.find(s => s.id === soId);
    if (so) {
      const items = getSalesOrderItems(so);
      const firstItem = items[0];
      setOrderItemNo(firstItem ? firstItem.itemNo : '01');
      const candidates = CANDIDATE_WORK_ORDERS_MAP[so.orderNo] || [];
      setWorkOrders(candidates);
    }
  };

  const handleOrderItemChange = (newItemNo: string) => {
    setOrderItemNo(newItemNo);
  };

  // Handle Quick Change Quantity for BOM Item directly in the table
  const handleQuickChangeQty = (
    bi: { id: string; materialCode: string; materialName: string; materialSpec: string; materialModel?: string; drawingNo?: string; quantity: number; unit: string },
    newQty: number
  ) => {
    const originalQty = bi.quantity;
    const bMat = materials.find(m => m.materialCode === bi.materialCode);
    const resolvedDwg = bi.drawingNo || bMat?.drawingNo || bi.materialSpec || '-';
    const resolvedSpec = resolvedDwg;

    if (newQty === originalQty) {
      // Revert modification if equal to standard quantity
      setItems(prev => prev.filter(it => !(it.operation === 'MODIFY' && (it.sourceItemId === bi.id || it.materialCode === bi.materialCode))));
      return;
    }

    const existingIdx = items.findIndex(it => (it.sourceItemId === bi.id || it.materialCode === bi.materialCode) && it.operation === 'MODIFY');
    const diff = Number((newQty - originalQty).toFixed(2));
    const modifyItem: ECNMaterialItem = {
      id: existingIdx >= 0 ? items[existingIdx].id : `ECN-ITEM-${Date.now()}-${bi.materialCode}`,
      operation: 'MODIFY',
      sourceItemId: bi.id,
      materialCode: bi.materialCode,
      materialName: bi.materialName,
      materialSpec: resolvedSpec,
      materialModel: '',
      drawingNo: resolvedDwg,
      unit: bi.unit,
      beforeQty: originalQty,
      afterQty: newQty,
      diffQty: diff,
      changeReason: existingIdx >= 0 && items[existingIdx].changeReason ? items[existingIdx].changeReason : '工程标准用量调整',
      beforeValues: {
        materialName: bi.materialName,
        materialSpec: resolvedSpec,
        materialModel: '',
        drawingNo: resolvedDwg,
        unit: bi.unit,
      },
      afterValues: {
        materialName: bi.materialName,
        materialSpec: resolvedSpec,
        materialModel: '',
        drawingNo: resolvedDwg,
        unit: bi.unit,
      },
    };

    if (existingIdx >= 0) {
      setItems(prev => prev.map((it, idx) => (idx === existingIdx ? modifyItem : it)));
    } else {
      // If was previously marked as DELETE, clear that and apply MODIFY
      setItems(prev => {
        const filtered = prev.filter(it => !(it.sourceItemId === bi.id || it.materialCode === bi.materialCode));
        return [...filtered, modifyItem];
      });
    }
  };

  // Handle in-place update for After Qty in ECN Material Items table
  const handleUpdateItemAfterQty = (itemIndex: number, newQty: number) => {
    setItems(prev => prev.map((it, idx) => {
      if (idx !== itemIndex) return it;
      const diff = Number((newQty - (it.beforeQty || 0)).toFixed(2));
      return {
        ...it,
        afterQty: newQty,
        diffQty: diff,
        afterValues: {
          ...it.afterValues,
          materialName: it.materialName,
          materialSpec: it.materialSpec,
          materialModel: it.materialModel,
          drawingNo: it.drawingNo,
          unit: it.unit,
        },
      };
    }));
  };

  // Handle in-place update for Change Reason in ECN Material Items table
  const handleUpdateItemReason = (itemIndex: number, newReason: string) => {
    setItems(prev => prev.map((it, idx) => {
      if (idx !== itemIndex) return it;
      return {
        ...it,
        changeReason: newReason,
      };
    }));
  };

  // Open item drawer for adding new item
  const handleOpenAddItem = () => {
    setItemDrawerMode('ADD');
    setEditingItemIndex(null);
    const firstMat = materials[0];
    if (firstMat) {
      setSelectedMatCode(firstMat.materialCode);
      const dwg = firstMat.drawingNo || firstMat.materialSpec || firstMat.specification || '';
      setItemSpec(dwg);
      setItemDrawing(dwg);
    }
    setItemQty(1);
    setItemReason(changeReason || '工程结构设计优化新增物料');
    setMaterialSearchQuery('');
    setShowItemDrawer(true);
  };

  // Open item drawer for modifying existing BOM item
  const handleOpenModifyItem = (sourceBomItem: { id: string; materialCode: string; materialName: string; materialSpec: string; materialModel?: string; drawingNo?: string; quantity: number; unit: string }) => {
    setItemDrawerMode('MODIFY');
    setEditingItemIndex(null);
    setSelectedSourceBomItemId(sourceBomItem.id);
    setSelectedMatCode(sourceBomItem.materialCode);
    const dwg = sourceBomItem.drawingNo || sourceBomItem.materialSpec || '';
    setItemSpec(dwg);
    setItemDrawing(dwg);
    setItemQty(sourceBomItem.quantity);
    setItemReason(changeReason || '工程用量调整');
    setShowItemDrawer(true);
  };

  // Open item drawer for editing existing ECN item
  const handleOpenEditECNItem = (item: ECNMaterialItem, index: number) => {
    setEditingItemIndex(index);
    setItemDrawerMode(item.operation === 'ADD' ? 'ADD' : 'MODIFY');
    setSelectedMatCode(item.materialCode);
    setSelectedSourceBomItemId(item.sourceItemId || '');
    const dwg = item.afterValues?.drawingNo || item.drawingNo || item.afterValues?.materialSpec || item.materialSpec || '';
    setItemSpec(dwg);
    setItemDrawing(dwg);
    setItemQty(item.afterQty || 0);
    setItemReason(item.changeReason || '');
    setShowItemDrawer(true);
  };

  // Save item from drawer
  const handleSaveItemDrawer = () => {
    const mat = materials.find(m => m.materialCode === selectedMatCode);
    const resolvedDwg = itemDrawing || mat?.drawingNo || mat?.materialSpec || mat?.specification || itemSpec || '';
    const resolvedSpec = resolvedDwg;
    const resolvedUnit = mat?.unit || 'PCS';

    if (itemDrawerMode === 'ADD') {
      if (!mat) return;

      const newItem: ECNMaterialItem = {
        id: `ECN-ITEM-${Date.now()}`,
        operation: 'ADD',
        materialCode: mat.materialCode,
        materialName: mat.materialName,
        materialSpec: resolvedSpec,
        materialModel: '',
        drawingNo: resolvedDwg,
        unit: resolvedUnit,
        beforeQty: 0,
        afterQty: Number(itemQty) || 0,
        diffQty: Number(itemQty) || 0,
        changeReason: itemReason.trim() || changeReason || '工程新增',
        afterValues: {
          materialName: mat.materialName,
          materialSpec: resolvedSpec,
          materialModel: '',
          drawingNo: resolvedDwg,
          unit: resolvedUnit,
        },
      };

      if (editingItemIndex !== null) {
        setItems(prev => prev.map((it, idx) => (idx === editingItemIndex ? newItem : it)));
      } else {
        setItems(prev => [...prev, newItem]);
      }
    } else {
      // MODIFY
      const sourceBi = selectedBOM?.items.find(bi => bi.id === selectedSourceBomItemId || bi.materialCode === selectedMatCode);
      const beforeQty = sourceBi?.quantity || 0;
      const afterQtyNum = Number(itemQty) || 0;
      const originalDwg = itemDrawing !== undefined ? itemDrawing : (sourceBi?.drawingNo || mat?.drawingNo || resolvedSpec);
      const originalSpec = originalDwg;
      const originalUnit = sourceBi?.unit || resolvedUnit;

      const newItem: ECNMaterialItem = {
        id: `ECN-ITEM-${Date.now()}`,
        operation: 'MODIFY',
        sourceItemId: selectedSourceBomItemId || sourceBi?.id,
        materialCode: selectedMatCode,
        materialName: sourceBi?.materialName || mat?.materialName || '',
        materialSpec: originalSpec,
        materialModel: '',
        drawingNo: originalDwg,
        unit: originalUnit,
        beforeQty: beforeQty,
        afterQty: afterQtyNum,
        diffQty: afterQtyNum - beforeQty,
        changeReason: itemReason.trim() || changeReason || '工程用量调整',
        beforeValues: {
          materialName: sourceBi?.materialName || '',
          materialSpec: originalSpec,
          materialModel: '',
          drawingNo: originalDwg,
          unit: originalUnit,
        },
        afterValues: {
          materialName: sourceBi?.materialName || '',
          materialSpec: originalSpec,
          materialModel: '',
          drawingNo: originalDwg,
          unit: originalUnit,
        },
      };

      if (editingItemIndex !== null) {
        setItems(prev => prev.map((it, idx) => (idx === editingItemIndex ? newItem : it)));
      } else {
        setItems(prev => {
          const filtered = prev.filter(it => !(it.operation === 'MODIFY' && (it.sourceItemId === selectedSourceBomItemId || it.materialCode === selectedMatCode)));
          return [...filtered, newItem];
        });
      }
    }

    setShowItemDrawer(false);
  };

  // Mark a BOM item as DELETED
  const handleDeleteBOMItem = (sourceBomItem: { id: string; materialCode: string; materialName: string; materialSpec: string; drawingNo?: string; quantity: number; unit: string }) => {
    const existingIndex = items.findIndex(it => it.sourceItemId === sourceBomItem.id || (it.operation === 'DELETE' && it.materialCode === sourceBomItem.materialCode));
    if (existingIndex >= 0) {
      setItems(prev => prev.filter((_, idx) => idx !== existingIndex));
      return;
    }

    const bMat = materials.find(m => m.materialCode === sourceBomItem.materialCode);
    const dwg = sourceBomItem.drawingNo || bMat?.drawingNo || sourceBomItem.materialSpec || '-';
    const spec = dwg;

    const deleteItem: ECNMaterialItem = {
      id: `ECN-ITEM-${Date.now()}`,
      operation: 'DELETE',
      sourceItemId: sourceBomItem.id,
      materialCode: sourceBomItem.materialCode,
      materialName: sourceBomItem.materialName,
      materialSpec: spec,
      materialModel: '',
      drawingNo: dwg,
      unit: sourceBomItem.unit,
      beforeQty: sourceBomItem.quantity,
      afterQty: 0,
      diffQty: -sourceBomItem.quantity,
      changeReason: changeReason || '工程结构精简删除物料',
    };
    setItems(prev => [...prev, deleteItem]);
  };

  // Remove an item from the ECN items list
  const handleRemoveECNItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Toggle work order selection
  const handleToggleWorkOrder = (woId: string) => {
    setWorkOrders(prev =>
      prev.map(wo => (wo.id === woId ? { ...wo, selected: !wo.selected } : wo))
    );
  };

  // Toggle all work orders
  const handleToggleAllWorkOrders = (select: boolean) => {
    setWorkOrders(prev => prev.map(wo => ({ ...wo, selected: select })));
  };

  // Toggle notify department
  const handleToggleDept = (dept: string) => {
    setNotifyDepts(prev =>
      prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
    );
  };

  // Build the complete ECN order object
  const buildECNOrder = (docStatus: ECNOrder['docStatus']): ECNOrder => {
    const defaultFlow = initialOrder?.approvalFlow || [
      {
        id: `APPR-${Date.now()}-1`,
        stepIndex: 1,
        level: 1,
        nodeName: '工程主管初审',
        roleName: '工程主管',
        approver: '王建国',
        status: docStatus === 'PENDING_REVIEW' ? 'PENDING' : 'SKIPPED',
        comment: '',
      },
      {
        id: `APPR-${Date.now()}-2`,
        stepIndex: 2,
        level: 2,
        nodeName: '工程总监审批',
        roleName: '工程总监',
        approver: '陈总',
        status: 'SKIPPED',
        comment: '',
      },
    ];

    return {
      id: initialOrder?.id || `ECN-ORDER-${Date.now()}`,
      ecnNo,
      salesOrderId: selectedSalesOrder?.id || '',
      salesOrderNo: selectedSalesOrder?.orderNo || '',
      customerName: selectedSalesOrder?.customerName || '',
      orderItemNo: selectedOrderItem?.itemNo || '01',
      productCode: selectedOrderItem?.productCode || selectedSalesOrder?.productCode || '',
      productSpec: derivedProductSpec,
      bomId: selectedBOM?.id || '',
      bomCode: selectedBOM?.bomCode || '',
      bomProductName: selectedOrderItem?.productName || selectedBOM?.productName || selectedSalesOrder?.productName || '',
      bomVersion: derivedBomVersion,
      ecnDate,
      demandDate,
      applicant,
      applicantDept,
      productionOwner,
      designOwner,
      changeType,
      changeReason,
      docStatus,
      notifyStatus: initialOrder?.notifyStatus || 'UNNOTIFIED',
      executionStatus: initialOrder?.executionStatus || 'NOT_EXECUTED',
      warehouseStatus: initialOrder?.warehouseStatus || 'UNCONFIRMED',
      items,
      workOrders,
      notifyDepts,
      departmentConfirmations: notifyDepts.map(d => {
        const existing = (initialOrder?.departmentConfirmations || []).find(c => c.dept === d);
        return existing || { dept: d, status: 'UNCONFIRMED' as const };
      }),
      notifyMode,
      approvalFlow: defaultFlow,
      approvalHistory: defaultFlow,
      logs: [
        ...(initialOrder?.logs || []),
        {
          id: `LOG-${Date.now()}`,
          operator: applicant,
          action: docStatus === 'DRAFT' ? '保存草稿' : '提交工程审批',
          details: `操作人: ${applicant}，包含 ${items.length} 项物料变更，${workOrders.filter(w => w.selected).length} 个同步工单`,
          timestamp: new Date().toLocaleString(),
        },
      ],
      createdAt: initialOrder?.createdAt || new Date().toLocaleString(),
      createdBy: initialOrder?.createdBy || applicant,
      updatedAt: new Date().toLocaleString(),
    };
  };

  // Validate form before save/submit
  const validateForm = (isSubmitting: boolean = false) => {
    if (!selectedSalesOrder) {
      alert('请选择关联的销售订单！');
      return false;
    }
    if (!selectedBOM) {
      alert('当前销售订单没有关联对应的 BOM！');
      return false;
    }

    if (isSubmitting) {
      if (items.length === 0) {
        alert('提交审批前必须至少录入一项物料变更（新增、修改用量/规格、删除）！');
        return false;
      }
      if (existingActiveECN) {
        alert(`同 BOM 存在未生效变更单 ${existingActiveECN.ecnNo}，禁止重复提交 (BR15)！`);
        return false;
      }
    }
    return true;
  };

  const handleSave = () => {
    if (!validateForm(false)) return;
    const order = buildECNOrder('DRAFT');
    onSaveDraft(order);
  };

  const handleSubmit = () => {
    if (!validateForm(true)) return;
    const order = buildECNOrder('PENDING_REVIEW');
    onSubmitApproval(order);
  };

  // Filtered materials in drawer
  const filteredMaterials = useMemo(() => {
    if (!materialSearchQuery.trim()) return materials.slice(0, 30);
    const q = materialSearchQuery.toLowerCase();
    return materials.filter(
      m =>
        m.materialCode.toLowerCase().includes(q) ||
        m.materialName.toLowerCase().includes(q) ||
        (m.specification && m.specification.toLowerCase().includes(q)) ||
        (m.drawingNo && m.drawingNo.toLowerCase().includes(q))
    );
  }, [materials, materialSearchQuery]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden select-text">
      {/* Top Fullscreen Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="返回列表"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
                <FileText className="w-5 h-5" />
              </div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                {isEditing ? `编辑工程变更单 (${initialOrder?.ecnNo})` : '新建工程变更单 (ECN)'}
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 whitespace-nowrap inline-flex items-center shrink-0">
                草稿编制中
              </span>
              <span className="px-2.5 py-0.5 text-xs font-mono font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 whitespace-nowrap inline-flex items-center shrink-0">
                {ecnNo}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* BR15 Conflict Warning Banner */}
      {existingActiveECN && (
        <div className="mx-6 mt-4 p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-200 shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <div>
            <strong>同 BOM 唯一在途变更单校验提示 (BR15):</strong> 当前 BOM ({selectedBOM?.bomCode}) 已存在未生效变更单 <strong>{existingActiveECN.ecnNo}</strong>（状态: {existingActiveECN.docStatus === 'DRAFT' ? '草稿' : '审批中/待通知'}）。在该单生效或作废前，系统严格禁止重复提交新单，避免并发变更冲突。
          </div>
        </div>
      )}

      {/* Step Sub-Tabs */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 shrink-0 flex items-center gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSection('base')}
          className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
            activeSection === 'base'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/20'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          1. 基础信息
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('materials')}
          className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
            activeSection === 'materials'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/20'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          2. 物料变更明细
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
            {items.length} 项变更
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('workOrders')}
          className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
            activeSection === 'workOrders'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/20'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          3. 涉及工单明细
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
            {workOrders.filter(w => w.selected).length}/{workOrders.length} 已选
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('approval')}
          className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
            activeSection === 'approval'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/20'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          4. 审批与通知配置
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
            {notifyDepts.length} 部门
          </span>
        </button>
      </div>

      {/* Main Content Workspace Filling Screen */}
      <div className="flex-1 p-6 overflow-y-auto min-h-0 space-y-6">
        {/* TAB 1: Base Information - Unified Single Input Module */}
        {activeSection === 'base' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Unified Input Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
              {/* Module Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-200 dark:border-blue-800">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                      <span>变更单基本信息录入</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      选择销售订单与项次-产品后，系统自动联动带出产品规格与 BOM 版本
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                    信息集中统一录入
                  </span>
                </div>
              </div>

              {/* Sequential Form Fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
                {/* 1. 编码放在第一个自动生成的 */}
                <div>
                  <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span>变更单编码</span>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 font-semibold inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        自动生成
                      </span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">系统编码</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      disabled
                      value={ecnNo}
                      className="w-full pl-8 pr-3 py-2.5 bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-700 dark:text-slate-300 select-all cursor-not-allowed"
                    />
                    <Hash className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* 2. 选择销售订单 */}
                <div>
                  <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center justify-between">
                    <span>销售订单 <span className="text-rose-500">*</span></span>
                    {selectedSalesOrder?.customerName && (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[150px]" title={selectedSalesOrder.customerName}>
                        {selectedSalesOrder.customerName}
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <select
                      value={salesOrderId}
                      onChange={(e) => handleSalesOrderChange(e.target.value)}
                      className="w-full pl-8 pr-8 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs transition-colors appearance-none"
                    >
                      {salesOrders.map(so => (
                        <option key={so.id} value={so.id}>
                          {so.orderNo} ({so.customerName})
                        </option>
                      ))}
                    </select>
                    <Building2 className="w-4 h-4 text-blue-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* 3. 选择项次-产品 */}
                <div>
                  <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center justify-between">
                    <span>项次 - 产品 <span className="text-rose-500">*</span></span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-normal">
                      共 {currentOrderItems.length} 个项次
                    </span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedOrderItem?.itemNo || '01'}
                      onChange={(e) => handleOrderItemChange(e.target.value)}
                      className="w-full pl-8 pr-8 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs transition-colors appearance-none truncate"
                    >
                      {currentOrderItems.map(it => (
                        <option key={it.itemNo} value={it.itemNo}>
                          项次 {it.itemNo} - [{it.productCode}] {it.productName}
                        </option>
                      ))}
                    </select>
                    <Layers className="w-4 h-4 text-purple-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* 4. 带出产品的规格 */}
                <div>
                  <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span>产品规格</span>
                      <span className="text-[10px] text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800 font-medium inline-flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-blue-500" />
                        自动带出
                      </span>
                    </span>
                  </label>
                  <input
                    type="text"
                    disabled
                    value={derivedProductSpec}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-200 cursor-not-allowed select-all truncate"
                    title={derivedProductSpec}
                  />
                </div>

                {/* 4. 带出BOM版本 */}
                <div>
                  <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span>BOM版本</span>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 font-medium inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        自动带出
                      </span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-[130px]" title={derivedBomCode}>
                      {derivedBomCode}
                    </span>
                  </label>
                  <div className="flex items-center justify-between px-3 py-2 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 rounded-xl min-h-[42px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 text-xs">
                        {derivedBomVersion}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        ({derivedBomCode})
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-0.5 shrink-0">
                      就地生效
                    </span>
                  </div>
                </div>

                {/* 5. 录其他信息: 变更单日期 */}
                <div>
                  <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                    变更单日期 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={ecnDate}
                    onChange={(e) => setEcnDate(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* 需求日期 */}
                <div>
                  <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center justify-between">
                    <span>需求日期</span>
                    <span className="text-slate-400 font-normal text-[10px]">(选填)</span>
                  </label>
                  <input
                    type="date"
                    value={demandDate}
                    onChange={(e) => setDemandDate(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* 变更类型 */}
                <div>
                  <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                    变更类型 <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={changeType}
                    onChange={(e) => setChangeType(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    {ECN_CHANGE_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* 申请人 */}
                <div>
                  <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                    申请人 <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={applicant}
                    onChange={(e) => handleApplicantChange(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    {PRESET_APPLICANTS.map(a => (
                      <option key={a.name} value={a.name}>
                        {a.name} ({a.departments.join(' / ')})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 申请部门 */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-semibold text-slate-800 dark:text-slate-200">
                      申请部门 <span className="text-rose-500">*</span>
                    </label>
                    {availableDepts.length > 1 && (
                      <span className="text-[10px] text-blue-600 dark:text-blue-400">
                        (多部门支持单选)
                      </span>
                    )}
                  </div>
                  {availableDepts.length > 1 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {availableDepts.map(dept => {
                        const isSelected = applicantDept === dept;
                        return (
                          <button
                            key={dept}
                            type="button"
                            onClick={() => setApplicantDept(dept)}
                            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                          >
                            {dept}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={applicantDept}
                      onChange={(e) => setApplicantDept(e.target.value)}
                      className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      placeholder="部门名称"
                    />
                  )}
                </div>

                {/* 设计负责人 */}
                <div>
                  <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                    设计负责人 <span className="text-slate-400 font-normal">(选填)</span>
                  </label>
                  <input
                    type="text"
                    value={designOwner}
                    onChange={(e) => setDesignOwner(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="图纸/结构设计负责人"
                  />
                </div>

                {/* 生产负责人 */}
                <div>
                  <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                    生产负责人 <span className="text-slate-400 font-normal">(选填)</span>
                  </label>
                  <input
                    type="text"
                    value={productionOwner}
                    onChange={(e) => setProductionOwner(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="生产对接负责人"
                  />
                </div>

                {/* 变更原因 (多行文本框，跨整行) */}
                <div className="col-span-1 md:col-span-2 lg:col-span-3">
                  <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center justify-between">
                    <span>变更原因 <span className="text-slate-400 font-normal">(选填)</span></span>
                    <span className="text-[10px] text-slate-400">详细描述变更原因及业务影响</span>
                  </label>
                  <textarea
                    rows={3}
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    placeholder="请输入引起工程变更的原因（如：现场装配干涉、设计优化、客户要求加装防护盖、原物料停产替代等，选填）..."
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Materials Redlining */}
        {activeSection === 'materials' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Redline Items Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
              {/* Integrated Header Toolbar */}
              <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white text-xs">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span>物料变更清单</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                      共 {items.length} 项
                    </span>
                  </div>

                  {items.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-medium border border-emerald-200/60 dark:border-emerald-800/40">
                        新增 +{items.filter(i => i.operation === 'ADD').length}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 font-medium border border-amber-200/60 dark:border-amber-800/40">
                        修改 Δ{items.filter(i => i.operation === 'MODIFY').length}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-medium border border-rose-200/60 dark:border-rose-800/40">
                        删除 -{items.filter(i => i.operation === 'DELETE').length}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={handleOpenAddItem}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    新增物料行
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-center text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold whitespace-nowrap">
                      <th className="py-2.5 px-2 w-12 text-center">序号</th>
                      <th className="py-2.5 px-2 text-center min-w-[80px]">操作类型</th>
                      <th className="py-2.5 px-2 text-center min-w-[110px]">物料编码</th>
                      <th className="py-2.5 px-2 text-center min-w-[130px]">物料名称</th>
                      <th className="py-2.5 px-2 text-center min-w-[100px]">规格</th>
                      <th className="py-2.5 px-2 text-center min-w-[110px]">图号</th>
                      <th className="py-2.5 px-2 text-center min-w-[60px]">单位</th>
                      <th className="py-2.5 px-2 text-center min-w-[80px]">变更前用量</th>
                      <th className="py-2.5 px-2 text-center min-w-[120px]">变更后用量</th>
                      <th className="py-2.5 px-2 text-center min-w-[80px]">用量差异(Δ)</th>
                      <th className="py-2.5 px-2 text-center min-w-[160px]">变更原因</th>
                      <th className="py-2.5 px-2 text-center w-16">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="py-12 text-center text-slate-400">
                          <Layers className="w-8 h-8 mx-auto mb-2 text-slate-300 opacity-60" />
                          <p>暂无物料变更记录，请在下方原 BOM 列表中直接修改标准用量或点击「删除」，或点击上方「新增物料行」</p>
                        </td>
                      </tr>
                    ) : (
                      items.map((item, idx) => {
                        const mat = materials.find(m => m.materialCode === item.materialCode);
                        const dwg = item.afterValues?.drawingNo || item.drawingNo || mat?.drawingNo || item.afterValues?.materialSpec || item.materialSpec || mat?.materialSpec || '-';
                        const displaySpec = dwg;
                        const displayDrawing = dwg;

                        return (
                          <tr
                            key={item.id || idx}
                            className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors whitespace-nowrap ${
                              item.operation === 'ADD'
                                ? 'bg-emerald-50/30 dark:bg-emerald-950/10'
                                : item.operation === 'DELETE'
                                ? 'bg-rose-50/30 dark:bg-rose-950/10'
                                : 'bg-amber-50/30 dark:bg-amber-950/10'
                            }`}
                          >
                            <td className="py-2.5 px-2 text-center text-slate-400 font-mono">{idx + 1}</td>
                            <td className="py-2.5 px-2 text-center">
                              <div className="flex items-center justify-center">
                                {item.operation === 'ADD' && (
                                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 inline-flex items-center justify-center gap-1 whitespace-nowrap">
                                    <Plus className="w-3 h-3" /> 新增
                                  </span>
                                )}
                                {item.operation === 'MODIFY' && (
                                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 inline-flex items-center justify-center gap-1 whitespace-nowrap">
                                    <Edit3 className="w-3 h-3" /> 修改
                                  </span>
                                )}
                                {item.operation === 'DELETE' && (
                                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 inline-flex items-center justify-center gap-1 whitespace-nowrap">
                                    <Trash2 className="w-3 h-3" /> 删除
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono font-medium text-slate-900 dark:text-white">
                              {item.materialCode}
                            </td>
                            <td className="py-2.5 px-2 text-center font-medium text-slate-900 dark:text-white">
                              {item.materialName}
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono text-slate-600 dark:text-slate-400">
                              {displaySpec}
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono text-slate-600 dark:text-slate-400">
                              {displayDrawing}
                            </td>
                            <td className="py-2.5 px-2 text-center text-slate-600 dark:text-slate-400 font-medium">
                              {item.unit || mat?.unit || 'PCS'}
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono text-slate-500">
                              {item.beforeQty} {item.unit}
                            </td>
                            
                            {/* Directly Editable 变更后用量 */}
                            <td className="py-2 px-2 text-center">
                              {item.operation === 'DELETE' ? (
                                <span className="text-rose-500 font-mono font-bold text-xs">0 {item.unit}</span>
                              ) : (
                                <div className="inline-flex items-center justify-center gap-1 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                                  <button
                                    type="button"
                                    disabled={item.afterQty <= 0}
                                    onClick={() => handleUpdateItemAfterQty(idx, Math.max(0, Number((item.afterQty - 1).toFixed(2))))}
                                    className="w-5 h-5 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs disabled:opacity-30 cursor-pointer"
                                    title="减少用量"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={item.afterQty}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value);
                                      handleUpdateItemAfterQty(idx, isNaN(val) ? 0 : Math.max(0, val));
                                    }}
                                    className="w-12 text-center font-mono font-bold text-xs py-0.5 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-slate-900 dark:text-white"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateItemAfterQty(idx, Number((item.afterQty + 1).toFixed(2)))}
                                    className="w-5 h-5 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
                                    title="增加用量"
                                  >
                                    +
                                  </button>
                                  <span className="text-[11px] text-slate-400 pl-0.5">{item.unit}</span>
                                </div>
                              )}
                            </td>

                            <td className="py-2.5 px-2 text-center font-mono font-bold">
                              {item.diffQty > 0 && <span className="text-emerald-600 dark:text-emerald-400">+{item.diffQty}</span>}
                              {item.diffQty < 0 && <span className="text-rose-600 dark:text-rose-400">{item.diffQty}</span>}
                              {item.diffQty === 0 && <span className="text-slate-400">0</span>}
                            </td>

                            {/* Directly Editable 变更原因 */}
                            <td className="py-2 px-2 text-center min-w-[160px]">
                              <input
                                type="text"
                                value={item.changeReason || ''}
                                onChange={(e) => handleUpdateItemReason(idx, e.target.value)}
                                placeholder="输入变更原因..."
                                className="w-full text-xs px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                              />
                            </td>

                            {/* Action: Only Remove / Delete Icon */}
                            <td className="py-2.5 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveECNItem(idx)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors cursor-pointer"
                                title="移除此变更"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Original BOM Reference & Quick Actions */}
            {selectedBOM && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-500" />
                    原 BOM 清单物料对照 ({selectedBOM.bomCode} - {selectedBOM.productName})
                  </h4>
                  <span className="text-xs text-slate-400">修改用量或点击「删除」快速加入变更单</span>
                </div>

                <div className="overflow-x-auto max-h-72 overflow-y-auto">
                  <table className="w-full text-center text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700 whitespace-nowrap">
                        <th className="py-2.5 px-2 text-center w-12">序号</th>
                        <th className="py-2.5 px-2 text-center min-w-[110px]">物料编码</th>
                        <th className="py-2.5 px-2 text-center min-w-[130px]">物料名称</th>
                        <th className="py-2.5 px-2 text-center min-w-[100px]">规格</th>
                        <th className="py-2.5 px-2 text-center min-w-[110px]">图号</th>
                        <th className="py-2.5 px-2 text-center min-w-[60px]">单位</th>
                        <th className="py-2.5 px-2 text-center min-w-[120px]">标准用量</th>
                        <th className="py-2.5 px-2 text-center w-24">快捷操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {selectedBOM.items.map((bi, bIdx) => {
                        const modItem = items.find(it => (it.sourceItemId === bi.id || it.materialCode === bi.materialCode) && it.operation === 'MODIFY');
                        const isDeleted = items.some(it => (it.sourceItemId === bi.id || it.materialCode === bi.materialCode) && it.operation === 'DELETE');
                        const bMat = materials.find(m => m.materialCode === bi.materialCode);
                        const bDwg = bi.drawingNo || bMat?.drawingNo || bi.materialSpec || '-';
                        const bSpec = bDwg;
                        const currentQty = isDeleted ? 0 : (modItem ? modItem.afterQty : bi.quantity);
                        const isModified = modItem !== undefined && modItem.afterQty !== bi.quantity;

                        return (
                          <tr
                            key={bi.id}
                            className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 whitespace-nowrap transition-colors ${
                              isDeleted ? 'bg-rose-50/30 dark:bg-rose-950/20 opacity-75' : isModified ? 'bg-amber-50/30 dark:bg-amber-950/20' : ''
                            }`}
                          >
                            <td className="py-2.5 px-2 text-center font-mono text-slate-400">{bIdx + 1}</td>
                            <td className="py-2.5 px-2 text-center font-mono font-medium text-slate-800 dark:text-slate-200">
                              {bi.materialCode}
                            </td>
                            <td className="py-2.5 px-2 text-center text-slate-800 dark:text-slate-200">{bi.materialName}</td>
                            <td className="py-2.5 px-2 text-center font-mono text-slate-600 dark:text-slate-300">{bSpec}</td>
                            <td className="py-2.5 px-2 text-center font-mono text-slate-600 dark:text-slate-300">{bDwg}</td>
                            <td className="py-2.5 px-2 text-center text-slate-500 font-medium">{bi.unit || bMat?.unit || 'PCS'}</td>

                            {/* 标准用量: Direct Stepper / Manual Number Input */}
                            <td className="py-2 px-2 text-center">
                              {isDeleted ? (
                                <span className="text-rose-500 line-through font-mono font-bold text-xs">{bi.quantity} {bi.unit}</span>
                              ) : (
                                <div className="inline-flex items-center justify-center gap-1 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                                  <button
                                    type="button"
                                    disabled={currentQty <= 0}
                                    onClick={() => handleQuickChangeQty(bi, Math.max(0, Number((currentQty - 1).toFixed(2))))}
                                    className="w-5 h-5 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs disabled:opacity-30 cursor-pointer"
                                    title="减少用量"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={currentQty}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value);
                                      handleQuickChangeQty(bi, isNaN(val) ? 0 : Math.max(0, val));
                                    }}
                                    className={`w-12 text-center font-mono font-bold text-xs py-0.5 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded ${
                                      isModified ? 'text-amber-600 dark:text-amber-400 font-extrabold' : 'text-slate-900 dark:text-white'
                                    }`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleQuickChangeQty(bi, Number((currentQty + 1).toFixed(2)))}
                                    className="w-5 h-5 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
                                    title="增加用量"
                                  >
                                    +
                                  </button>
                                  <span className="text-[11px] text-slate-400 pl-0.5">{bi.unit}</span>
                                </div>
                              )}
                            </td>

                            <td className="py-2.5 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteBOMItem(bi)}
                                className={`px-2.5 py-1 text-[11px] font-medium rounded-lg flex items-center justify-center gap-1 mx-auto transition-colors cursor-pointer ${
                                  isDeleted
                                    ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300'
                                    : 'bg-slate-100 dark:bg-slate-800 text-rose-600 hover:bg-rose-50'
                                }`}
                              >
                                <Trash2 className="w-3 h-3" />
                                {isDeleted ? '已删除' : '删除'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Work Orders Synchronization */}
        {activeSection === 'workOrders' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Work Orders Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
              {/* Integrated Header Toolbar */}
              <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-purple-600" />
                  <span className="font-bold text-slate-900 dark:text-white text-xs">
                    涉及工单明细
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300">
                    已勾选 {workOrders.filter(w => w.selected).length} / {workOrders.length}
                  </span>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => handleToggleAllWorkOrders(true)}
                    className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs"
                  >
                    一键全选
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleAllWorkOrders(false)}
                    className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs"
                  >
                    清空勾选
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-center text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold whitespace-nowrap">
                      <th className="py-2.5 px-2.5 w-12 text-center">勾选</th>
                      <th className="py-2.5 px-2.5 text-center min-w-[120px]">生产工单号</th>
                      <th className="py-2.5 px-2.5 text-center min-w-[160px]">生产产品</th>
                      <th className="py-2.5 px-2.5 text-center min-w-[100px]">计划生产数量</th>
                      <th className="py-2.5 px-2.5 text-center min-w-[90px]">工单状态</th>
                      <th className="py-2.5 px-2.5 text-center min-w-[180px]">领料情况</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {workOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-slate-400">
                          当前销售订单暂无已下达生产工单
                        </td>
                      </tr>
                    ) : (
                      workOrders.map((wo) => {
                        const isExpanded = expandedWoIds.includes(wo.id);
                        const relevantItems = items.filter(i => i.operation !== 'DELETE');
                        const neededSummary = relevantItems.map(item => {
                          const needed = (item.afterQty || 0) * wo.productionQty;
                          const picked = wo.pickedQtyMap?.[item.materialCode] || 0;
                          return {
                            code: item.materialCode,
                            name: item.materialName,
                            needed,
                            picked,
                            unpicked: Math.max(0, needed - picked)
                          };
                        });

                        return (
                          <React.Fragment key={wo.id}>
                            <tr
                              onClick={() => handleToggleWorkOrder(wo.id)}
                              className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 cursor-pointer transition-colors whitespace-nowrap ${
                                wo.selected ? 'bg-purple-50/20 dark:bg-purple-950/10' : ''
                              }`}
                            >
                              <td className="py-2.5 px-2.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={wo.selected}
                                  onChange={() => handleToggleWorkOrder(wo.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                                />
                              </td>
                              <td className="py-2.5 px-2.5 text-center font-mono font-bold text-slate-900 dark:text-white">
                                {wo.workOrderNo}
                              </td>
                              <td className="py-2.5 px-2.5 text-center text-slate-800 dark:text-slate-200">
                                {wo.productName} ({wo.productCode})
                              </td>
                              <td className="py-2.5 px-2.5 text-center font-mono font-bold text-slate-900 dark:text-white">
                                {wo.productionQty} 台
                              </td>
                              <td className="py-2.5 px-2.5 text-center">
                                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap inline-flex items-center justify-center ${wo.workOrderStatus === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800' : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}>
                                  {wo.workOrderStatus === 'IN_PROGRESS' ? '进行中' : '暂停'}
                                </span>
                              </td>
                              <td className="py-2.5 px-2.5 text-center text-slate-600 dark:text-slate-400">
                                <button
                                  type="button"
                                  onClick={(e) => handleToggleExpandWo(wo.id, e)}
                                  className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50 rounded-md transition-colors border border-purple-200 dark:border-purple-800/50"
                                >
                                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                  <span>展开明细</span>
                                </button>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800/50">
                                <td colSpan={6} className="p-0">
                                  <div className="p-3 pl-14 overflow-x-auto">
                                    <table className="w-full max-w-3xl text-xs text-left border-collapse border border-slate-200 dark:border-slate-700 shadow-sm rounded-lg overflow-hidden bg-white dark:bg-slate-900">
                                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                        <tr>
                                          <th className="p-2 border-b border-r border-slate-200 dark:border-slate-700 font-semibold w-1/4">物料编码</th>
                                          <th className="p-2 border-b border-r border-slate-200 dark:border-slate-700 font-semibold w-1/4">物料名称</th>
                                          <th className="p-2 border-b border-r border-slate-200 dark:border-slate-700 font-semibold text-center w-1/6">需领数量</th>
                                          <th className="p-2 border-b border-r border-slate-200 dark:border-slate-700 font-semibold text-center w-1/6">已领数量</th>
                                          <th className="p-2 border-b border-slate-200 dark:border-slate-700 font-semibold text-center w-1/6">未领数量</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {neededSummary.map(summary => (
                                          <tr key={summary.code} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="p-2 border-b border-r border-slate-200 dark:border-slate-700 font-mono text-slate-700 dark:text-slate-300">{summary.code}</td>
                                            <td className="p-2 border-b border-r border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 truncate max-w-[150px]" title={summary.name}>{summary.name}</td>
                                            <td className="p-2 border-b border-r border-slate-200 dark:border-slate-700 text-center font-bold text-slate-900 dark:text-slate-100">{summary.needed}</td>
                                            <td className="p-2 border-b border-r border-slate-200 dark:border-slate-700 text-center font-bold text-emerald-600 dark:text-emerald-400">{summary.picked}</td>
                                            <td className="p-2 border-b border-slate-200 dark:border-slate-700 text-center font-bold text-rose-600 dark:text-rose-400">{summary.unpicked}</td>
                                          </tr>
                                        ))}
                                        {neededSummary.length === 0 && (
                                          <tr>
                                            <td colSpan={5} className="p-4 text-center text-slate-400">无可计算的变更物料</td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Notification Settings */}
        {activeSection === 'approval' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Notification Mode & Departments */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Building2 className="w-4 h-4 text-blue-600" />
                通知发送模式与接收部门
              </h3>

              {/* Mode Selection */}
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 text-xs mb-1.5">
                  通知发送模式 (BR11):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <label
                    className={`p-2.5 sm:p-3 rounded-xl border-2 flex items-center gap-2.5 cursor-pointer transition-all ${
                      notifyMode === 'AUTO'
                        ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 shadow-2xs'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="notifyMode"
                      checked={notifyMode === 'AUTO'}
                      onChange={() => setNotifyMode('AUTO')}
                      className="text-blue-600 focus:ring-blue-500 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>审批通过自动发送 (推荐)</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        终审通过后系统自动完成单据生效并实时下发通知
                      </div>
                    </div>
                  </label>

                  <label
                    className={`p-2.5 sm:p-3 rounded-xl border-2 flex items-center gap-2.5 cursor-pointer transition-all ${
                      notifyMode === 'MANUAL'
                        ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 shadow-2xs'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="notifyMode"
                      checked={notifyMode === 'MANUAL'}
                      onChange={() => setNotifyMode('MANUAL')}
                      className="text-blue-600 focus:ring-blue-500 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>审批通过手动发送 (BR14)</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        终审通过后保留待发送，发送前支持反审批回退
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Department Checkboxes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-medium text-slate-700 dark:text-slate-300 text-xs">
                    通知接收业务部门 (BR12):
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNotifyDepts([...ECN_DEPARTMENTS])}
                      className="text-xs text-blue-600 hover:underline cursor-pointer"
                    >
                      全选部门
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setNotifyDepts([])}
                      className="text-xs text-slate-500 hover:underline cursor-pointer"
                    >
                      清空
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {ECN_DEPARTMENTS.map(dept => {
                    const checked = notifyDepts.includes(dept);
                    return (
                      <label
                        key={dept}
                        className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer text-xs font-semibold transition-colors ${
                          checked
                            ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 text-blue-700 dark:text-blue-300'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleDept(dept)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                        {dept}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Frozen Bottom Action Bar */}
      <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 py-3.5 shadow-lg flex items-center justify-end gap-3 shrink-0 z-20">
        {/* 取消 */}
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
        >
          取消
        </button>

        {/* 上一步 (根据具体页面判断是否有此按钮) */}
        {hasPrev && (
          <button
            type="button"
            onClick={handlePrev}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            上一步
          </button>
        )}

        {/* 下一步 (根据具体页面判断是否有此按钮) */}
        {hasNext && (
          <button
            type="button"
            onClick={handleNext}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            下一步
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        {/* 保存草稿 */}
        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Save className="w-4 h-4 text-slate-500" />
          保存草稿
        </button>

        {/* 提交审批 */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!!existingActiveECN}
          className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Send className="w-4 h-4" />
          提交审批
        </button>
      </div>

      {/* Full-width Material Item Add/Edit Drawer (Replaces cramped nested modal) */}
      {showItemDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex justify-end animate-fadeIn">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col animate-slideLeft">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600 text-white rounded-xl">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    {itemDrawerMode === 'ADD' ? '新增变更物料行' : '修改原 BOM 物料行参数'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {itemDrawerMode === 'ADD'
                      ? '从物料库选择物料并设定工程用量与规格'
                      : `修改物料 [${selectedMatCode}] 的工程用量、规格或图号`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowItemDrawer(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5 rotate-180" />
              </button>
            </div>

            {/* Drawer Body Scrollable */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
              {itemDrawerMode === 'ADD' && (
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    从物料主档中搜索并选择物料 <span className="text-rose-500">*</span>:
                  </label>
                  <div className="relative mb-2">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={materialSearchQuery}
                      onChange={(e) => setMaterialSearchQuery(e.target.value)}
                      placeholder="搜索物料编码、物料名称、规格型号或图号..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredMaterials.map(m => {
                      const mDwg = m.drawingNo || m.materialSpec || m.specification || '无';
                      const mSpec = mDwg;
                      const mUnit = m.unit || 'PCS';

                      return (
                        <div
                          key={m.id}
                          onClick={() => {
                            setSelectedMatCode(m.materialCode);
                            setItemSpec(mDwg);
                            setItemDrawing(mDwg);
                          }}
                          className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                            selectedMatCode === m.materialCode
                              ? 'bg-blue-50 dark:bg-blue-950/60 font-semibold text-blue-700 dark:text-blue-300'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div>
                            <div className="font-mono">{m.materialCode} - {m.materialName}</div>
                            <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                              规格: <span className="text-slate-600 dark:text-slate-300 font-mono">{mSpec}</span> | 图号: <span className="text-slate-600 dark:text-slate-300 font-mono">{mDwg}</span> | 单位: <span className="text-slate-600 dark:text-slate-300">{mUnit}</span>
                            </div>
                          </div>
                          {selectedMatCode === m.materialCode && (
                            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Material Details Display & Rule Explanation */}
              {(() => {
                const curMat = materials.find(m => m.materialCode === selectedMatCode);
                const curDwg = curMat?.drawingNo || curMat?.materialSpec || curMat?.specification || itemDrawing || itemSpec || '-';
                const curSpec = curDwg;
                const curUnit = curMat?.unit || 'PCS';

                return (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700 pb-2">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>当前物料:</span>
                        <span className="font-mono text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded">{selectedMatCode}</span>
                        <span className="font-medium text-slate-700 dark:text-slate-200">{curMat?.materialName}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                        单物料属性已锁定
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                        <span className="text-slate-400 block text-[11px]">唯一规格 / 图号:</span>
                        <span className="font-semibold font-mono text-slate-800 dark:text-slate-200 mt-0.5 block">{curSpec}</span>
                      </div>
                      <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                        <span className="text-slate-400 block text-[11px]">唯一单位:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">{curUnit}</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      * 基础规则：一个物料仅有1个规格图号和1个单位（从物料档案锁定）。如需其他规格，请直接更换物料编码。
                    </p>
                  </div>
                );
              })()}

              {/* Quantity & Drawing */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    {itemDrawerMode === 'ADD' ? '单台新增用量' : '变更后单台用量'} <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={itemQty}
                    onChange={(e) => setItemQty(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    对应图号 (选填):
                  </label>
                  <input
                    type="text"
                    value={itemDrawing}
                    onChange={(e) => setItemDrawing(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="如: DWG-2026-001"
                  />
                </div>
              </div>

              {/* Item Change Reason */}
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  该物料变更的具体原因:
                </label>
                <textarea
                  rows={2}
                  value={itemReason}
                  onChange={(e) => setItemReason(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="说明此物料用量或规格修改的技术依据..."
                />
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50/70 dark:bg-slate-900/70">
              <button
                type="button"
                onClick={() => setShowItemDrawer(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveItemDrawer}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                确认并保存变更行
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
