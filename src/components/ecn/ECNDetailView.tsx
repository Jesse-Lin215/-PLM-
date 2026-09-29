import React, { useState } from 'react';
import {
  ECNOrder,
  ECNItemOperation,
} from '../../types/plm';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  Building2,
  Layers,
  Send,
  RotateCcw,
  Ban,
  UserCheck,
  CheckSquare,
  ShieldCheck,
  History,
  Info,
  Calendar,
  User,
  Hash,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  X,
} from 'lucide-react';

interface ECNDetailViewProps {
  order: ECNOrder;
  onBack: () => void;
  onApprove: (orderId: string, comment: string) => void;
  onReject: (orderId: string, comment: string) => void;
  onReverseApproval: (orderId: string) => void;
  onSendNotification: (orderId: string) => void;
  onWarehouseConfirm: (orderId: string) => void;
  onDepartmentConfirm?: (orderId: string, deptName: string, confirmer: string, remarks?: string) => void;
  onInvalidate: (orderId: string, reason: string) => void;
}

type DetailTab = 'base' | 'materials' | 'workOrders' | 'notifications' | 'logs';

export const ECNDetailView: React.FC<ECNDetailViewProps> = ({
  order,
  onBack,
  onApprove,
  onReject,
  onReverseApproval,
  onSendNotification,
  onWarehouseConfirm,
  onDepartmentConfirm,
  onInvalidate,
}) => {
  const [activeTab, setActiveTab] = useState<DetailTab>('base');
  const [showReverseModal, setShowReverseModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [modalSelectedDept, setModalSelectedDept] = useState('');
  const [modalConfirmer, setModalConfirmer] = useState('操作员');
  const [modalRemarks, setModalRemarks] = useState('已完成部门内物料及业务受影响分析');

  const allDepts = Array.from(
    new Set([
      ...(order.notifyDepts || []),
      ...((order.departmentConfirmations || []).map(c => c.dept)),
    ])
  );
  const confirmedDeptSet = new Set(
    (order.departmentConfirmations || [])
      .filter(c => c.status === 'CONFIRMED')
      .map(c => c.dept)
  );
  const confirmedCount = allDepts.filter(d => confirmedDeptSet.has(d)).length;
  const totalDeptsCount = allDepts.length;

  const [expandedWoIds, setExpandedWoIds] = useState<string[]>([]);
  const handleToggleExpandWo = (woId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedWoIds(prev =>
      prev.includes(woId) ? prev.filter(id => id !== woId) : [...prev, woId]
    );
  };

  const SECTIONS: { key: DetailTab; label: string }[] = [
    { key: 'base', label: '1. 基础信息' },
    { key: 'materials', label: '2. 物料变更明细' },
    { key: 'workOrders', label: '3. 涉及工单明细' },
    { key: 'notifications', label: '4. 审批与通知配置' },
    { key: 'logs', label: '5. 操作日志' },
  ];

  const currentSectionIndex = SECTIONS.findIndex((s) => s.key === activeTab);
  const hasPrev = currentSectionIndex > 0;
  const hasNext = currentSectionIndex < SECTIONS.length - 1;

  const handlePrev = () => {
    if (hasPrev) {
      setActiveTab(SECTIONS[currentSectionIndex - 1].key);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      setActiveTab(SECTIONS[currentSectionIndex + 1].key);
    } else {
      setActiveTab('base');
    }
  };

  const getDocStatusBadge = (status: ECNOrder['docStatus']) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 whitespace-nowrap inline-flex items-center justify-center shrink-0">
            草稿
          </span>
        );
      case 'PENDING_REVIEW':
        return (
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 whitespace-nowrap inline-flex items-center justify-center gap-1 shrink-0">
            <Clock className="w-3 h-3" />
            审批中
          </span>
        );
      case 'APPROVED':
        return (
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 whitespace-nowrap inline-flex items-center justify-center gap-1 shrink-0">
            <CheckCircle2 className="w-3 h-3" />
            已审批
          </span>
        );
      case 'OBSOLETE':
        return (
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 whitespace-nowrap inline-flex items-center justify-center gap-1 shrink-0">
            <Ban className="w-3 h-3" />
            已作废
          </span>
        );
    }
  };

  const getNotifyStatusBadge = (status: ECNOrder['notifyStatus']) => {
    switch (status) {
      case 'UNNOTIFIED':
      case 'SENDING':
      default:
        return (
          <span className="px-2.5 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 whitespace-nowrap inline-flex items-center justify-center shrink-0">
            待通知
          </span>
        );
      case 'SENT':
      case 'NOTIFIED':
        return (
          <span className="px-2.5 py-0.5 text-xs rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 whitespace-nowrap inline-flex items-center justify-center gap-1 shrink-0">
            <Send className="w-3 h-3" />
            已发送
          </span>
        );
    }
  };

  const getExecStatusBadge = (status: ECNOrder['executionStatus']) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-2.5 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 whitespace-nowrap inline-flex items-center justify-center shrink-0">
            未生效
          </span>
        );
      case 'EFFECTIVE':
        return (
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 whitespace-nowrap inline-flex items-center justify-center gap-1 shrink-0">
            <CheckCircle2 className="w-3 h-3" />
            已就地生效 (BR04/05)
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-0.5 text-xs rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-600 whitespace-nowrap inline-flex items-center justify-center shrink-0">
            已终止
          </span>
        );
    }
  };

  const getOpBadge = (op: ECNItemOperation) => {
    switch (op) {
      case 'ADD':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 whitespace-nowrap inline-flex items-center justify-center gap-1 shrink-0">
            + 新增 (ADD)
          </span>
        );
      case 'DELETE':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800 whitespace-nowrap inline-flex items-center justify-center gap-1 shrink-0">
            - 删除 (DEL)
          </span>
        );
      case 'MODIFY':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800 whitespace-nowrap inline-flex items-center justify-center gap-1 shrink-0">
            ~ 修改 (MOD)
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden select-text">
      {/* Top Header */}
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
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
                <FileText className="w-5 h-5" />
              </div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                工程变更单详情 ({order.ecnNo})
              </h1>
              {getDocStatusBadge(order.docStatus)}
              {getNotifyStatusBadge(order.notifyStatus)}
              {getExecStatusBadge(order.executionStatus)}
              <span className="px-2.5 py-0.5 text-xs font-mono font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {order.ecnNo}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Step Sub-Tabs (Aligned 1:1 with ECNEditView) */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 shrink-0 flex items-center gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('base')}
          className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
            activeTab === 'base'
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
          onClick={() => setActiveTab('materials')}
          className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
            activeTab === 'materials'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/20'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          2. 物料变更明细
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
            {order.items.length} 项变更
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('workOrders')}
          className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
            activeTab === 'workOrders'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/20'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          3. 涉及工单明细
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
            {order.workOrders.filter((w) => w.selected).length}/{order.workOrders.length} 已选
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('notifications')}
          className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
            activeTab === 'notifications'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/20'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          4. 审批与通知配置
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
            {order.notifyDepts.length} 部门
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
            activeTab === 'logs'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/20'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          5. 操作日志
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {order.logs?.length || 0} 条
          </span>
        </button>
      </div>

      {/* Main Content Workspace */}
      <div className="flex-1 p-6 overflow-y-auto min-h-0 space-y-6 text-xs">
        {/* TAB 1: Base Information */}
        {/* TAB 1: Base Information */}
        {activeTab === 'base' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Unified Base Info Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
              {/* Module Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-200 dark:border-blue-800">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                      <span>变更单基本信息</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      销售订单关联、产品项次及 BOM 联动版本详情
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                    信息集中展示
                  </span>
                </div>
              </div>

              {/* Sequential Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
                {/* 1. 编码放在第一个 */}
                <div>
                  <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span>变更单编码</span>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 font-semibold inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        系统生成
                      </span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">单据编号</span>
                  </label>
                  <div className="relative">
                    <div className="w-full pl-8 pr-3 py-2.5 bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-800 dark:text-slate-200 select-all">
                      {order.ecnNo}
                    </div>
                    <Hash className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* 2. 销售订单 */}
                <div>
                  <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center justify-between">
                    <span>销售订单</span>
                    {order.customerName && (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[150px]" title={order.customerName}>
                        {order.customerName}
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <div className="w-full pl-8 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white flex items-center justify-between">
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        {order.salesOrderNo}
                      </span>
                      {order.customerName && (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate ml-2">
                          ({order.customerName})
                        </span>
                      )}
                    </div>
                    <Building2 className="w-4 h-4 text-blue-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* 3. 项次-产品 */}
                <div>
                  <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center justify-between">
                    <span>项次 - 产品</span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-normal">
                      关联产品项
                    </span>
                  </label>
                  <div className="relative">
                    <div className="w-full pl-8 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white truncate">
                      项次 {order.orderItemNo || '01'} - [{order.productCode || 'PROD'}] {order.bomProductName || order.productName || '-'}
                    </div>
                    <Layers className="w-4 h-4 text-purple-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* 4. 产品规格 (带出) */}
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
                  <div className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-200 truncate" title={order.productSpec || '-'}>
                    {order.productSpec || '-'}
                  </div>
                </div>

                {/* 4. BOM版本 (带出) */}
                <div>
                  <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span>BOM版本</span>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 font-medium inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        自动带出
                      </span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-[130px]">
                      {order.bomCode}
                    </span>
                  </label>
                  <div className="flex items-center justify-between px-3 py-2 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 rounded-xl min-h-[42px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 text-xs">
                        {order.bomVersion || 'V1.0'}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        ({order.bomCode})
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-0.5 shrink-0">
                      就地生效
                    </span>
                  </div>
                </div>

                {/* 5. 其他信息: 变更单日期 */}
                <div>
                  <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                    变更单日期
                  </label>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium">
                    {order.ecnDate}
                  </div>
                </div>

                {/* 需求日期 */}
                <div>
                  <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                    需求日期
                  </label>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200">
                    {order.demandDate || '（未设置）'}
                  </div>
                </div>

                {/* 变更类型 */}
                <div>
                  <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                    变更类型
                  </label>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-semibold">
                    {order.changeType}
                  </div>
                </div>

                {/* 申请人 */}
                <div>
                  <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                    申请人
                  </label>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium">
                    {order.applicant}
                  </div>
                </div>

                {/* 申请部门 */}
                <div>
                  <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                    申请部门
                  </label>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium">
                    {order.applicantDept}
                  </div>
                </div>

                {/* 设计对接负责人 */}
                <div>
                  <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                    设计对接负责人
                  </label>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200">
                    {order.designOwner || '-'}
                  </div>
                </div>

                {/* 生产对接负责人 */}
                <div>
                  <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                    生产对接负责人
                  </label>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200">
                    {order.productionOwner || '-'}
                  </div>
                </div>

                {/* 通知发送模式 */}
                <div>
                  <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                    通知发送模式 (BR11)
                  </label>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium">
                    {order.notifyMode === 'AUTO' ? '审批通过自动发送通知' : '审批通过由工程手动发送通知'}
                  </div>
                </div>

                {/* 变更原因 */}
                <div className="col-span-1 md:col-span-2 lg:col-span-3">
                  <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                    变更原因:
                  </label>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {order.changeReason || '（未填写变更原因）'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Materials Redlining */}
        {activeTab === 'materials' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
              {/* Integrated Header Toolbar */}
              <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>物料变更清单</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                    共 {order.items.length} 项
                  </span>
                </div>

                <div className="flex items-center gap-3.5 text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>新增物料
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>修改用量/属性
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>删除物料
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800 whitespace-nowrap">
                      <th className="py-2.5 px-2 text-center w-12">序号</th>
                      <th className="py-2.5 px-2 text-center min-w-[80px]">变更动作</th>
                      <th className="py-2.5 px-2 text-center min-w-[110px]">物料编码</th>
                      <th className="py-2.5 px-2 text-center min-w-[130px]">物料名称</th>
                      <th className="py-2.5 px-2 text-center min-w-[100px]">规格</th>
                      <th className="py-2.5 px-2 text-center min-w-[110px]">图号</th>
                      <th className="py-2.5 px-2 text-center min-w-[60px]">单位</th>
                      <th className="py-2.5 px-2 text-center min-w-[80px]">变更前用量</th>
                      <th className="py-2.5 px-2 text-center min-w-[80px]">变更后用量</th>
                      <th className="py-2.5 px-2 text-center min-w-[80px]">用量差异(Δ)</th>
                      <th className="py-2.5 px-2 text-center min-w-[130px]">单行变更原因</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {order.items.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="py-8 text-center text-slate-400">
                          暂无物料变更行
                        </td>
                      </tr>
                    ) : (
                      order.items.map((item, idx) => {
                        const dwg = item.afterValues?.drawingNo || item.drawingNo || item.afterValues?.materialSpec || item.materialSpec || '-';
                        const displaySpec = dwg;
                        const displayDwg = dwg;

                        return (
                          <tr
                            key={item.id}
                            className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 whitespace-nowrap ${
                              item.operation === 'ADD'
                                ? 'bg-emerald-50/20 dark:bg-emerald-950/10'
                                : item.operation === 'DELETE'
                                ? 'bg-rose-50/20 dark:bg-rose-950/10'
                                : 'bg-blue-50/10 dark:bg-blue-950/5'
                            }`}
                          >
                            <td className="py-2.5 px-2 text-center font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-2.5 px-2 text-center">{getOpBadge(item.operation)}</td>
                            <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-900 dark:text-white">
                              {item.materialCode}
                            </td>
                            <td className="py-2.5 px-2 text-center text-slate-800 dark:text-slate-200 font-medium">
                              {item.materialName}
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono text-slate-600 dark:text-slate-400">
                              {displaySpec}
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono text-slate-600 dark:text-slate-400">
                              {displayDwg}
                            </td>
                            <td className="py-2.5 px-2 text-center text-slate-600 dark:text-slate-400 font-medium">
                              {item.unit || 'PCS'}
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono text-slate-500">
                              {item.beforeQty} {item.unit}
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-900 dark:text-white">
                              {item.afterQty} {item.unit}
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono font-bold">
                              {item.diffQty > 0 && (
                                <span className="text-emerald-600 dark:text-emerald-400">
                                  +{item.diffQty}
                                </span>
                              )}
                              {item.diffQty < 0 && (
                                <span className="text-rose-600 dark:text-rose-400">
                                  {item.diffQty}
                                </span>
                              )}
                              {item.diffQty === 0 && (
                                <span className="text-slate-400 font-medium">0</span>
                              )}
                            </td>
                            <td className="py-2.5 px-2 text-center text-slate-600 dark:text-slate-400 max-w-xs truncate">
                              {item.changeReason || '-'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Work Orders Synchronization */}
        {activeTab === 'workOrders' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
              {/* Integrated Header Toolbar */}
              <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs">
                  <CheckSquare className="w-4 h-4 text-purple-600" />
                  <span>涉及工单明细</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300">
                    已勾选 {order.workOrders.filter((w) => w.selected).length} / {order.workOrders.length}
                  </span>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {order.executionStatus === 'EFFECTIVE' ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">● 变更已生效，已重算快照</span>
                  ) : (
                    <span>待审批生效后同步</span>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800 whitespace-nowrap">
                      <th className="py-2.5 px-2.5 text-center w-12">同步</th>
                      <th className="py-2.5 px-2.5 text-center min-w-[120px]">工单编号</th>
                      <th className="py-2.5 px-2.5 text-center min-w-[160px]">产品名称 (编码)</th>
                      <th className="py-2.5 px-2.5 text-center min-w-[100px]">排产数量</th>
                      <th className="py-2.5 px-2.5 text-center min-w-[90px]">工单状态</th>
                      <th className="py-2.5 px-2.5 text-center min-w-[180px]">领料情况</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {order.workOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          暂无关联生产工单
                        </td>
                      </tr>
                    ) : (
                      order.workOrders.map((wo) => {
                        const isExpanded = expandedWoIds.includes(wo.id);
                        const relevantItems = order.items.filter(i => i.operation !== 'DELETE');
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
                            <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 whitespace-nowrap">
                              <td className="py-2.5 px-2.5 text-center">
                                <input
                                  type="checkbox"
                                  disabled
                                  checked={wo.selected}
                                  className="rounded border-slate-300 dark:border-slate-700 text-blue-600 cursor-default"
                                />
                              </td>
                              <td className="py-2.5 px-2.5 text-center font-mono font-bold text-slate-900 dark:text-white">
                                {wo.workOrderNo}
                              </td>
                              <td className="py-2.5 px-2.5 text-center">
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {wo.productName}
                                </span>{' '}
                                <span className="text-[11px] font-mono text-slate-400">
                                  ({wo.productCode})
                                </span>
                              </td>
                              <td className="py-2.5 px-2.5 text-center font-mono font-bold text-slate-900 dark:text-white">
                                {wo.productionQty} 台
                              </td>
                              <td className="py-2.5 px-2.5 text-center">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap inline-flex items-center justify-center ${
                                    wo.workOrderStatus === 'IN_PROGRESS'
                                      ? 'bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800'
                                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                  }`}
                                >
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

        {/* TAB 4: Approval & Notification Configuration */}
        {activeTab === 'notifications' && (
          <div className="space-y-6 animate-fadeIn">
            {/* 1. Notification Mode & Departments */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Building2 className="w-4 h-4 text-blue-600" />
                通知发送模式与接收业务部门 (BR11, BR12)
              </h3>

              {/* Mode Selection */}
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 text-xs mb-1.5">
                  通知发送模式 (BR11):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div
                    className={`p-2.5 sm:p-3 rounded-xl border flex items-center gap-2.5 transition-all ${
                      order.notifyMode === 'AUTO'
                        ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30'
                        : 'border-slate-200 dark:border-slate-800 opacity-50'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span className="truncate">审批通过自动发送通知 (AUTO)</span>
                        {order.notifyMode === 'AUTO' && (
                          <span className="px-1.5 py-0.2 bg-blue-600 text-white text-[10px] rounded-full font-medium shrink-0">
                            当前生效
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        最后一级工程审批完成后自动生效 BOM 并向配置部门发送通知
                      </div>
                    </div>
                  </div>

                  <div
                    className={`p-2.5 sm:p-3 rounded-xl border flex items-center gap-2.5 transition-all ${
                      order.notifyMode === 'MANUAL'
                        ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30'
                        : 'border-slate-200 dark:border-slate-800 opacity-50'
                    }`}
                  >
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span className="truncate">审批通过手动发送通知 (MANUAL)</span>
                        {order.notifyMode === 'MANUAL' && (
                          <span className="px-1.5 py-0.2 bg-blue-600 text-white text-[10px] rounded-full font-medium shrink-0">
                            当前生效
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        审批通过后由工程负责人确认现场准备后手动点击发送
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Departments Grid */}
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 text-xs mb-2">
                  通知接收业务部门 ({order.notifyDepts.length} 个部门已配置):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {[
                    '生产部',
                    '计划部 (PMC)',
                    '采购部',
                    '品保部 (QA)',
                    '仓储部',
                    '销售部',
                  ].map((dept) => {
                    const isSelected = order.notifyDepts.includes(dept);
                    return (
                      <div
                        key={dept}
                        className={`p-3 rounded-xl border text-center font-medium transition-all ${
                          isSelected
                            ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200 shadow-xs'
                            : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 opacity-50'
                        }`}
                      >
                        <div className="font-bold text-xs">{dept}</div>
                        <div className="text-[10px] mt-1">
                          {isSelected ? (
                            order.notifyStatus === 'NOTIFIED' ? (
                              <span className="text-emerald-600 font-semibold flex items-center justify-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> 已送达通知
                              </span>
                            ) : (
                              <span className="text-blue-600 font-semibold flex items-center justify-center gap-1">
                                <Send className="w-3 h-3" /> 已配置接收
                              </span>
                            )
                          ) : (
                            <span className="text-slate-400">未勾选</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 2. Approval Flow Tracking */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 flex-wrap gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    工程审批流转跟踪与节点意见
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    查看当前变更单在工程评审、主管复核及总监终审各节点的审批流转状态与审核意见
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse text-xs min-w-[700px]">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700 whitespace-nowrap">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-16">序号</th>
                      <th className="py-2.5 px-3 text-center w-36">审批节点</th>
                      <th className="py-2.5 px-3 text-center w-32">指定审核人</th>
                      <th className="py-2.5 px-3 text-center w-28">审核状态</th>
                      <th className="py-2.5 px-4 text-center min-w-[200px]">审批评审意见</th>
                      <th className="py-2.5 px-3 text-center w-40">处理时间</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 whitespace-nowrap">
                    {(order.approvalFlow || []).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400">
                          暂无审批流转记录
                        </td>
                      </tr>
                    ) : (
                      (order.approvalFlow || []).map((node, index) => {
                        const isApproved = node.status === 'APPROVED';
                        const isPending = node.status === 'PENDING';
                        const isRejected = node.status === 'REJECTED';

                        return (
                          <tr
                            key={node.id || index}
                            className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="py-3 px-3 text-center font-mono text-slate-500">
                              {node.stepIndex || index + 1}
                            </td>
                            <td className="py-3 px-3 text-center font-bold text-slate-800 dark:text-slate-200">
                              {node.nodeName}
                            </td>
                            <td className="py-3 px-3 text-center text-slate-700 dark:text-slate-300">
                              <span>{node.approver}</span>
                              {node.approverRole && (
                                <span className="text-slate-400 text-[11px] block">{node.approverRole}</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center">
                              {isApproved ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 inline-flex items-center justify-center gap-1 shrink-0">
                                  <CheckCircle2 className="w-3 h-3" />
                                  审核通过
                                </span>
                              ) : isRejected ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 inline-flex items-center justify-center gap-1 shrink-0">
                                  <X className="w-3 h-3" />
                                  审批驳回
                                </span>
                              ) : isPending ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 inline-flex items-center justify-center gap-1 shrink-0">
                                  <Clock className="w-3 h-3" />
                                  待审核
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-400 inline-flex items-center justify-center gap-1 shrink-0">
                                  未到达
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400 truncate max-w-[260px] mx-auto">
                              {node.comment || (isPending ? '等待审批中...' : '-')}
                            </td>
                            <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-500">
                              {node.operateTime || '-'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Department Confirmations Tracking (业务部门确认情况: 确认人、确认部门、确认时间) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 flex-wrap gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    业务部门确认情况
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    详细记录各接收部门的确认人、确认部门、确认时间及受影响物料业务评估备注
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Overall Confirmation Summary Badge */}
                  {order.notifyStatus === 'UNNOTIFIED' || order.notifyStatus === 'SENDING' ? (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-1.5 border border-slate-200 dark:border-slate-700">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      待通知 (尚未下发业务部门)
                    </span>
                  ) : (
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border ${
                        confirmedCount === totalDeptsCount && totalDeptsCount > 0
                          ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800'
                          : confirmedCount > 0
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                          : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      已确认: {confirmedCount} / {totalDeptsCount} 部门
                    </span>
                  )}

                  {/* 快捷登记部门确认按钮 (当已下发通知时可用) */}
                  {onDepartmentConfirm && (order.notifyStatus === 'NOTIFIED' || order.notifyStatus === 'SENT') && (
                    <button
                      type="button"
                      id="btn-ecn-detail-register-dept"
                      onClick={() => {
                        const firstUnconf = allDepts.find(d => !confirmedDeptSet.has(d)) || allDepts[0] || '生产部';
                        setModalSelectedDept(firstUnconf);
                        setModalConfirmer(order.applicant || '操作员');
                        setModalRemarks('已完成部门内物料及业务受影响分析');
                        setShowConfirmModal(true);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      登记部门确认
                    </button>
                  )}
                </div>
              </div>

              {/* Confirmation Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse text-xs min-w-[700px]">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700 whitespace-nowrap">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-14">序号</th>
                      <th className="py-2.5 px-3 text-center w-36">确认部门</th>
                      <th className="py-2.5 px-3 text-center w-28">确认状态</th>
                      <th className="py-2.5 px-3 text-center w-36">确认人</th>
                      <th className="py-2.5 px-3 text-center w-44">确认时间</th>
                      <th className="py-2.5 px-4 text-center min-w-[200px]">确认说明 / 业务评估备注</th>
                      {onDepartmentConfirm && (order.notifyStatus === 'NOTIFIED' || order.notifyStatus === 'SENT') && (
                        <th className="py-2.5 px-3 text-center w-20">操作</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 whitespace-nowrap">
                    {allDepts.length === 0 ? (
                      <tr>
                        <td
                          colSpan={onDepartmentConfirm && (order.notifyStatus === 'NOTIFIED' || order.notifyStatus === 'SENT') ? 7 : 6}
                          className="py-6 text-center text-slate-400"
                        >
                          当前变更单未配置通知接收部门
                        </td>
                      </tr>
                    ) : (
                      allDepts.map((deptName, idx) => {
                        const confRecord = (order.departmentConfirmations || []).find(c => c.dept === deptName);
                        const isConf = confRecord?.status === 'CONFIRMED';
                        const isNotified = order.notifyStatus === 'NOTIFIED' || order.notifyStatus === 'SENT';

                        return (
                          <tr
                            key={deptName}
                            className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="py-3 px-3 text-center font-mono text-slate-500">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-3 text-center font-bold text-slate-800 dark:text-slate-200">
                              <span className="inline-flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                {deptName}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              {!isNotified ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-500 inline-flex items-center justify-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  待通知
                                </span>
                              ) : isConf ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 inline-flex items-center justify-center gap-1 shrink-0">
                                  <CheckCircle2 className="w-3 h-3" />
                                  已确认
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 inline-flex items-center justify-center gap-1 shrink-0">
                                  <Clock className="w-3 h-3" />
                                  待确认
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center text-slate-700 dark:text-slate-300 font-medium">
                              {isConf && confRecord?.confirmer ? (
                                <span className="inline-flex items-center gap-1 text-teal-700 dark:text-teal-300 font-semibold">
                                  <User className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                                  {confRecord.confirmer}
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-600 dark:text-slate-400">
                              {isConf && confRecord?.confirmTime ? (
                                <span className="inline-flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                  {confRecord.confirmTime}
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400 truncate max-w-[260px] mx-auto">
                              {isConf && confRecord?.remarks ? (
                                confRecord.remarks
                              ) : isConf ? (
                                '已完成部门内物料及业务受影响分析'
                              ) : (
                                <span className="text-slate-400 italic">等待部门负责人确认...</span>
                              )}
                            </td>
                            {onDepartmentConfirm && isNotified && (
                              <td className="py-3 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setModalSelectedDept(deptName);
                                    setModalConfirmer(confRecord?.confirmer || order.applicant || '操作员');
                                    setModalRemarks(confRecord?.remarks || '已完成部门内物料及业务受影响分析');
                                    setShowConfirmModal(true);
                                  }}
                                  className="px-2 py-1 text-[11px] font-medium text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                                >
                                  {isConf ? '更新确认' : '登记确认'}
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Audit & Operation Logs */}
        {activeTab === 'logs' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-600" />
                  操作日志
                </h3>
                <span className="text-xs text-slate-400">
                  共 {order.logs?.length || 0} 条操作记录
                </span>
              </div>

              <div className="space-y-3">
                {order.logs && order.logs.length > 0 ? (
                  order.logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-start justify-between gap-3 text-xs border border-slate-200 dark:border-slate-700/50"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <strong className="text-slate-900 dark:text-white">{log.action}</strong>
                          <span className="text-slate-500 font-medium">操作人: {log.operator}</span>
                        </div>
                        <div className="text-slate-600 dark:text-slate-400">{log.details}</div>
                      </div>
                      <span className="text-slate-400 font-mono text-[11px] shrink-0">
                        {log.timestamp}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400">暂无操作日志记录</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Frozen Bottom Action Bar (Identical Layout & Feel to ECNEditView) */}
      <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 py-3.5 shadow-lg flex items-center justify-between shrink-0 z-20">
        <div className="text-xs text-slate-500 hidden sm:flex items-center gap-2">
          <span>
            当前查看: <strong className="text-slate-700 dark:text-slate-300 font-mono">{order.ecnNo}</strong>
          </span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span>{order.bomProductName} ({order.bomCode})</span>
        </div>

        <div className="flex items-center gap-2.5 ml-auto flex-wrap">
          {/* 返回 */}
          <button
            type="button"
            id="btn-ecn-detail-back"
            onClick={onBack}
            className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>

          {/* 上一步 */}
          <button
            type="button"
            id="btn-ecn-detail-prev"
            onClick={handlePrev}
            disabled={!hasPrev}
            className={`px-4 py-2 text-xs font-medium rounded-xl border transition-colors flex items-center gap-1.5 ${
              hasPrev
                ? 'text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-700 cursor-pointer shadow-2xs'
                : 'text-slate-400 dark:text-slate-600 bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-50'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            上一步
          </button>

          {/* 下一步 */}
          <button
            type="button"
            id="btn-ecn-detail-next"
            onClick={handleNext}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            下一步
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* 反审批 */}
          <button
            type="button"
            id="btn-ecn-detail-reverse-approval"
            onClick={() => setShowReverseModal(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            反审批
          </button>
        </div>
      </div>

      {/* 部门确认登记弹窗 */}
      {showConfirmModal && (
        <div
          id="modal-dept-confirm"
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scaleIn">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-teal-50/60 dark:bg-teal-950/30">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                    业务部门确认情况登记
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    单据编号: {order.ecnNo}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  确认部门 <span className="text-teal-600">*</span>:
                </label>
                <select
                  value={modalSelectedDept}
                  onChange={e => setModalSelectedDept(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {allDepts.map(d => {
                    const isConf = (order.departmentConfirmations || []).some(
                      c => c.dept === d && c.status === 'CONFIRMED'
                    );
                    return (
                      <option key={d} value={d}>
                        {d} {isConf ? '(已确认，可再次更新)' : '(待确认)'}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  确认人姓名 / 职务 <span className="text-teal-600">*</span>:
                </label>
                <input
                  type="text"
                  value={modalConfirmer}
                  onChange={e => setModalConfirmer(e.target.value)}
                  placeholder="例如: 张大勇 (车间主管)"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  确认时间:
                </label>
                <input
                  type="text"
                  readOnly
                  value={new Date().toISOString().replace('T', ' ').slice(0, 19)}
                  className="w-full p-2.5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 font-mono text-xs cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  业务影响说明 / 应对措施备注:
                </label>
                <textarea
                  rows={3}
                  value={modalRemarks}
                  onChange={e => setModalRemarks(e.target.value)}
                  placeholder="请输入部门内部执行受影响物料处理、产线调整方案..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-xs font-medium bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                id="btn-submit-detail-dept-confirm"
                onClick={() => {
                  if (onDepartmentConfirm && modalSelectedDept) {
                    onDepartmentConfirm(order.id, modalSelectedDept, modalConfirmer || '操作员', modalRemarks);
                  }
                  setShowConfirmModal(false);
                }}
                className="px-4 py-2 text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                确认并保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 反审批确认模态框 */}
      {showReverseModal && (
        <div
          id="modal-ecn-reverse-approval"
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scaleIn">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-amber-50/60 dark:bg-amber-950/30">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                    ECN 变更单反审批确认
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    单据编号: <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{order.ecnNo}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReverseModal(false)}
                className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">当前单据状态:</span>
                  {getDocStatusBadge(order.docStatus)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">关联 BOM:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {order.bomProductName} ({order.bomCode})
                  </span>
                </div>
              </div>

              {order.docStatus === 'DRAFT' ? (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 rounded-lg text-blue-900 dark:text-blue-200 space-y-1">
                  <div className="font-semibold text-xs flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>提示说明</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    当前变更单已处于【草稿】状态，无需进行反审批。您可直接返回并在列表中点击【编辑草稿】对物料明细或工单明细进行修改。
                  </p>
                </div>
              ) : (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 rounded-lg text-amber-900 dark:text-amber-200 space-y-1.5">
                  <div className="font-semibold text-xs flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>业务操作规则提醒</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    1. 反审批后，当前变更单状态将重置为<strong>【草稿】</strong>状态。
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    2. 审批流转节点将重置，您可重新修改物料变更明细、涉及工单配置及通知选项。
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    3. 修改完毕后，可再次点击【提交审批】重新流转工程评审。
                  </p>
                </div>
              )}
            </div>

            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowReverseModal(false)}
                className="px-4 py-2 text-xs font-medium bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer transition-colors"
              >
                {order.docStatus === 'DRAFT' ? '关闭' : '取消'}
              </button>
              {order.docStatus !== 'DRAFT' && (
                <button
                  type="button"
                  id="btn-confirm-reverse-approval"
                  onClick={() => {
                    setShowReverseModal(false);
                    onReverseApproval(order.id);
                  }}
                  className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-lg cursor-pointer transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  确认反审批
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
