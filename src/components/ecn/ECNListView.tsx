import React, { useState, useMemo } from 'react';
import {
  ECNOrder,
  ECNDocStatus,
  ECNNotifyStatus,
} from '../../types/plm';
import { ECN_CHANGE_TYPES } from '../../data/mockECNData';
import {
  Plus,
  Search,
  RotateCcw,
  Eye,
  Edit3,
  Send,
  Ban,
  CheckCircle2,
  Clock,
  UserCheck,
  Trash2,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ShieldCheck,
  MoreVertical,
  Bell,
} from 'lucide-react';

interface ECNListViewProps {
  orders: ECNOrder[];
  onOpenCreate: () => void;
  onViewDetail: (order: ECNOrder) => void;
  onEdit: (order: ECNOrder) => void;
  onDeleteDraft: (orderId: string) => void;
  onSubmitApproval: (order: ECNOrder) => void;
  onApprove: (orderId: string, comment?: string) => void;
  onSendNotification: (orderId: string) => void;
  onReverseApproval: (orderId: string) => void;
  onWarehouseConfirm: (orderId: string) => void;
  onDepartmentConfirm?: (orderId: string, deptName: string, confirmer: string, remarks?: string) => void;
  onInvalidatePrompt: (order: ECNOrder) => void;
  onNavigateToNotifications?: () => void;
}

export const ECNListView: React.FC<ECNListViewProps> = ({
  orders,
  onOpenCreate,
  onViewDetail,
  onEdit,
  onDeleteDraft,
  onSubmitApproval,
  onApprove,
  onSendNotification,
  onReverseApproval,
  onWarehouseConfirm,
  onDepartmentConfirm,
  onInvalidatePrompt,
  onNavigateToNotifications,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'EFFECTIVE' | 'OBSOLETE'>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [notifyFilter, setNotifyFilter] = useState<string>('ALL');
  const [deptConfirmFilter, setDeptConfirmFilter] = useState<string>('ALL');

  // Quick department confirm modal state
  const [confirmModalOrder, setConfirmModalOrder] = useState<ECNOrder | null>(null);
  const [modalSelectedDept, setModalSelectedDept] = useState<string>('');
  const [modalConfirmer, setModalConfirmer] = useState<string>('操作员');
  const [modalRemarks, setModalRemarks] = useState<string>('已完成部门内物料及业务受影响分析');

  // Operation menu state (matching other pages like BOM management)
  const [openActionMenuOrderId, setOpenActionMenuOrderId] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Status counts
  const totalCount = orders.length;
  const draftCount = orders.filter((o) => o.docStatus === 'DRAFT').length;
  const pendingReviewCount = orders.filter((o) => o.docStatus === 'PENDING_REVIEW').length;
  const approvedCount = orders.filter((o) => o.docStatus === 'APPROVED').length;
  const obsoleteCount = orders.filter((o) => o.docStatus === 'OBSOLETE').length;

  const handleSearch = () => {
    setSearchTerm(searchInput);
    setCurrentPage(1);
  };

  const handleReset = () => {
    setSearchInput('');
    setSearchTerm('');
    setStatusFilter('ALL');
    setTypeFilter('ALL');
    setNotifyFilter('ALL');
    setDeptConfirmFilter('ALL');
    setCurrentPage(1);
  };

  // Helper to compute department confirmation info
  const getDeptConfirmStats = (order: ECNOrder) => {
    const depts = order.notifyDepts || [];
    const confirms = order.departmentConfirmations || [];
    const confirmedList = confirms.filter(c => c.status === 'CONFIRMED' && depts.includes(c.dept));
    const total = depts.length;
    const confirmed = confirmedList.length;
    const isAllConfirmed = total > 0 && confirmed >= total;
    const isPartial = confirmed > 0 && confirmed < total;
    const isNone = confirmed === 0;
    return {
      depts,
      confirms,
      confirmedList,
      total,
      confirmed,
      isAllConfirmed,
      isPartial,
      isNone,
    };
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Status filter
      if (statusFilter === 'DRAFT' && order.docStatus !== 'DRAFT') return false;
      if (statusFilter === 'PENDING_REVIEW' && order.docStatus !== 'PENDING_REVIEW') return false;
      if (statusFilter === 'APPROVED' && order.docStatus !== 'APPROVED') return false;
      if (statusFilter === 'OBSOLETE' && order.docStatus !== 'OBSOLETE') return false;

      // Type filter
      if (typeFilter !== 'ALL' && order.changeType !== typeFilter) return false;

      // Notify filter
      const isNotified = order.notifyStatus === 'NOTIFIED' || order.notifyStatus === 'SENT';
      if (notifyFilter === 'UNNOTIFIED' && isNotified) return false;
      if (notifyFilter === 'NOTIFIED' && !isNotified) return false;

      // Department Confirm filter
      if (deptConfirmFilter !== 'ALL') {
        const stats = getDeptConfirmStats(order);
        if (deptConfirmFilter === 'ALL_CONFIRMED' && !stats.isAllConfirmed) return false;
        if (deptConfirmFilter === 'PARTIAL_CONFIRMED' && !stats.isPartial) return false;
        if (deptConfirmFilter === 'UNCONFIRMED' && !stats.isNone) return false;
      }

      // Keyword search
      const q = searchTerm.toLowerCase().trim();
      if (!q) return true;

      return (
        order.ecnNo.toLowerCase().includes(q) ||
        order.salesOrderNo.toLowerCase().includes(q) ||
        order.bomCode.toLowerCase().includes(q) ||
        order.bomProductName.toLowerCase().includes(q) ||
        order.applicant.toLowerCase().includes(q) ||
        (order.customerName && order.customerName.toLowerCase().includes(q))
      );
    });
  }, [orders, statusFilter, typeFilter, notifyFilter, deptConfirmFilter, searchTerm]);

  // Paginated data
  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  const getDocStatusBadge = (status: ECNDocStatus) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 whitespace-nowrap inline-flex items-center justify-center shrink-0">
            草稿
          </span>
        );
      case 'PENDING_REVIEW':
        return (
          <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800 whitespace-nowrap inline-flex items-center justify-center gap-1 shrink-0">
            <Clock className="w-3 h-3" />
            审批中
          </span>
        );
      case 'APPROVED':
        return (
          <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800 whitespace-nowrap inline-flex items-center justify-center gap-1 shrink-0">
            <CheckCircle2 className="w-3 h-3" />
            已审批
          </span>
        );
      case 'OBSOLETE':
        return (
          <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800 whitespace-nowrap inline-flex items-center justify-center gap-1 shrink-0">
            <Ban className="w-3 h-3" />
            已作废
          </span>
        );
    }
  };

  const getNotifyStatusBadge = (status: ECNNotifyStatus) => {
    switch (status) {
      case 'UNNOTIFIED':
      case 'SENDING':
      default:
        return (
          <span className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 dark:bg-slate-800 text-slate-500 whitespace-nowrap inline-flex items-center justify-center shrink-0">
            待通知
          </span>
        );
      case 'SENT':
      case 'NOTIFIED':
        return (
          <span className="px-1.5 py-0.5 text-[10px] rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-medium whitespace-nowrap inline-flex items-center justify-center shrink-0">
            已发送
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 flex flex-col flex-1 min-w-0 shadow-xs overflow-hidden">
      {/* 顶部搜索与状态筛选区 (完全对齐图号管理/BOM/物料档案标准结构) */}
      <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        {/* 左侧状态过滤标签 (Pill Style) */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg text-xs font-medium overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => {
              setStatusFilter('ALL');
              setCurrentPage(1);
            }}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'ALL'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            全部 ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('DRAFT');
              setCurrentPage(1);
            }}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'DRAFT'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            草稿 ({draftCount})
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('PENDING_REVIEW');
              setCurrentPage(1);
            }}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'PENDING_REVIEW'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            待审批 ({pendingReviewCount})
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('APPROVED');
              setCurrentPage(1);
            }}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'APPROVED'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            已审批 ({approvedCount})
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('OBSOLETE');
              setCurrentPage(1);
            }}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'OBSOLETE'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            已作废 ({obsoleteCount})
          </button>
        </div>

        {/* 右侧搜索与重置按钮 */}
        <div className="flex items-center gap-2">
          <div className="relative w-48 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="搜索变更单号/订单/BOM/申请人..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            type="button"
            onClick={handleSearch}
            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/80 rounded-md text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            搜索
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
            title="重置所有筛选"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            重置
          </button>
        </div>
      </div>

      {/* 操作工具栏与二级筛选栏 */}
      <div className="px-3 py-2 bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onOpenCreate}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新建 ECN 变更单</span>
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />

          {/* 变更类型筛选 */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="py-1 px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="ALL">变更类型: 全部</option>
            {ECN_CHANGE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* 通知状态筛选 */}
          <select
            value={notifyFilter}
            onChange={(e) => {
              setNotifyFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="py-1 px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-700 dark:text-slate-300 focus:outline-none hidden md:block"
          >
            <option value="ALL">通知状态: 全部</option>
            <option value="UNNOTIFIED">待通知</option>
            <option value="NOTIFIED">已发送</option>
          </select>

          {/* 部门确认筛选 */}
          <select
            value={deptConfirmFilter}
            onChange={(e) => {
              setDeptConfirmFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="py-1 px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-700 dark:text-slate-300 focus:outline-none hidden lg:block"
          >
            <option value="ALL">部门确认情况: 全部</option>
            <option value="ALL_CONFIRMED">已全部确认</option>
            <option value="PARTIAL_CONFIRMED">部分部门确认</option>
            <option value="UNCONFIRMED">待确认</option>
          </select>
        </div>

        <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
          {onNavigateToNotifications && (
            <button
              type="button"
              onClick={onNavigateToNotifications}
              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>通知协同中心</span>
            </button>
          )}
          <span>共找到 <strong className="text-slate-700 dark:text-slate-200">{filteredOrders.length}</strong> 条变更记录</span>
        </div>
      </div>

      {/* 主表格区域 */}
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-center border-collapse text-xs min-w-[1050px]">
          <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-700 text-xs z-10 whitespace-nowrap">
            <tr>
              <th className="py-2.5 px-3 text-center min-w-[150px]">变更单编号</th>
              <th className="py-2.5 px-2 text-center w-24">变更类型</th>
              <th className="py-2.5 px-3 text-center min-w-[150px]">关联销售订单</th>
              <th className="py-2.5 px-3 text-center min-w-[190px]">关联BOM与产品 (版本不变)</th>
              <th className="py-2.5 px-2 text-center w-24">需求日期</th>
              <th className="py-2.5 px-2 text-center min-w-[110px]">申请人/部门</th>
              <th className="py-2.5 px-2 text-center w-24">单据状态</th>
              <th className="py-2.5 px-2 text-center w-24">通知状态</th>
              <th className="py-2.5 px-2 text-center min-w-[130px]">部门确认情况</th>
              <th className="py-2.5 px-3 text-center w-16">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 whitespace-nowrap">
            {paginatedOrders.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-400 dark:text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                    <span>暂无符合条件的工程变更单</span>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedOrders.map((order) => {
                const isNotified = order.notifyStatus === 'NOTIFIED' || order.notifyStatus === 'SENT';
                const canSendManual =
                  order.docStatus === 'APPROVED' &&
                  !isNotified &&
                  order.notifyMode === 'MANUAL';
                const canApprove = order.docStatus === 'PENDING_REVIEW';
                const canReverse =
                  order.docStatus === 'APPROVED' ||
                  order.docStatus === 'PENDING_REVIEW' ||
                  order.executionStatus === 'EFFECTIVE';
                
                const deptStats = getDeptConfirmStats(order);
                const canDeptConfirm = isNotified && deptStats.total > 0;

                const canSubmit = order.docStatus === 'DRAFT';
                const canEdit = order.docStatus === 'DRAFT';
                const canInvalidate =
                  order.notifyStatus === 'UNNOTIFIED' && order.docStatus !== 'OBSOLETE' && order.docStatus !== 'DRAFT';

                return (
                  <tr
                    key={order.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors whitespace-nowrap"
                  >
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => onViewDetail(order)}
                        className="font-mono font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer inline-block"
                      >
                        {order.ecnNo}
                      </button>
                      <span className="text-[10px] text-slate-400 block mt-0.5 font-mono text-center">
                        {order.ecnDate}
                      </span>
                    </td>

                    <td className="py-2.5 px-2 text-center">
                      <span className="px-1.5 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium inline-block whitespace-nowrap">
                        {order.changeType}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 font-mono text-center">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {order.salesOrderNo}
                      </div>
                      {order.customerName && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[150px] mx-auto">
                          {order.customerName}
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 font-mono">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {order.bomCode}
                        </span>
                        <span className="px-1 py-0.2 rounded text-[10px] bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-medium border border-blue-200/50 dark:border-blue-900/50">
                          {order.bomVersion}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate max-w-[180px] mx-auto">
                        {order.bomProductName}
                      </div>
                    </td>

                    <td className="py-2.5 px-2 text-center text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                      {order.demandDate || '-'}
                    </td>

                    <td className="py-2.5 px-2 text-center text-slate-700 dark:text-slate-300">
                      <div>{order.applicant}</div>
                      <div className="text-[10px] text-slate-400">{order.applicantDept}</div>
                    </td>

                    <td className="py-2.5 px-2 text-center">
                      {getDocStatusBadge(order.docStatus)}
                    </td>

                    <td className="py-2.5 px-2 text-center">
                      {getNotifyStatusBadge(order.notifyStatus)}
                    </td>

                    <td className="py-2.5 px-2 text-center">
                      {!isNotified ? (
                        <span className="text-slate-400 dark:text-slate-500 text-[11px] whitespace-nowrap">待通知</span>
                      ) : deptStats.total === 0 ? (
                        <span className="text-slate-400 text-[11px] whitespace-nowrap">无通知部门</span>
                      ) : deptStats.isAllConfirmed ? (
                        <span
                          className="px-2 py-0.5 rounded text-[11px] bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800 font-semibold whitespace-nowrap inline-flex items-center justify-center gap-1 shrink-0"
                          title={deptStats.confirmedList.map(c => `${c.dept}: ${c.confirmer} (${c.confirmTime})`).join('\n')}
                        >
                          <UserCheck className="w-3 h-3" />
                          全部确认 ({deptStats.confirmed}/{deptStats.total})
                        </span>
                      ) : deptStats.isPartial ? (
                        <span
                          className="px-2 py-0.5 rounded text-[11px] bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-medium whitespace-nowrap inline-flex items-center justify-center gap-1 shrink-0"
                          title={`已确认: ${deptStats.confirmedList.map(c => c.dept).join('、')}\n待确认: ${deptStats.depts.filter(d => !deptStats.confirmedList.some(c => c.dept === d)).join('、')}`}
                        >
                          <Clock className="w-3 h-3" />
                          部分确认 ({deptStats.confirmed}/{deptStats.total})
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-normal whitespace-nowrap inline-flex items-center justify-center shrink-0">
                          待确认 (0/{deptStats.total})
                        </span>
                      )}
                    </td>

                    <td
                      className="py-2.5 px-3 text-center relative"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="relative inline-block text-left">
                        <button
                          type="button"
                          id={`btn-action-menu-${order.id}`}
                          onClick={e => {
                            e.stopPropagation();
                            setOpenActionMenuOrderId(prev => (prev === order.id ? null : order.id));
                          }}
                          className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                          title="操作"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* 弹出气泡菜单 (与其他页面操作列保持完全一致，以文字形式展示具体操作) */}
                        {openActionMenuOrderId === order.id && (
                          <>
                            {/* 点击外部关闭遮罩 */}
                            <div
                              className="fixed inset-0 z-30 cursor-default"
                              onClick={e => {
                                e.stopPropagation();
                                setOpenActionMenuOrderId(null);
                              }}
                            />
                            <div
                              className="absolute right-0 top-full mt-1.5 z-40 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 shadow-xl rounded-xl py-1 px-1 min-w-[100px] flex flex-col items-stretch animate-in fade-in zoom-in-95 duration-100"
                              onClick={e => e.stopPropagation()}
                            >
                              {/* 顶部小三角气泡指针 */}
                              <div className="absolute -top-1.5 right-2.5 w-3 h-3 bg-white dark:bg-slate-900 border-t border-l border-slate-200/90 dark:border-slate-700 rotate-45 pointer-events-none" />

                              {/* 草稿状态: 编辑, 提交审批, 删除 */}
                              {order.docStatus === 'DRAFT' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionMenuOrderId(null);
                                      onEdit(order);
                                    }}
                                    className="px-3 py-1.5 text-[13px] font-normal text-blue-600 dark:text-blue-400 hover:bg-blue-50/70 dark:hover:bg-slate-800 rounded text-center transition-colors cursor-pointer whitespace-nowrap"
                                  >
                                    编辑
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionMenuOrderId(null);
                                      onSubmitApproval(order);
                                    }}
                                    className="px-3 py-1.5 text-[13px] font-normal text-amber-500 dark:text-amber-400 hover:bg-amber-50/70 dark:hover:bg-slate-800 rounded text-center transition-colors cursor-pointer whitespace-nowrap"
                                  >
                                    提交审批
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionMenuOrderId(null);
                                      onDeleteDraft(order.id);
                                    }}
                                    className="px-3 py-1.5 text-[13px] font-normal text-rose-500 dark:text-rose-400 hover:bg-rose-50/70 dark:hover:bg-slate-800 rounded text-center transition-colors cursor-pointer whitespace-nowrap"
                                  >
                                    删除
                                  </button>
                                </>
                              )}

                              {/* 待审批状态: 工程审批 */}
                              {order.docStatus === 'PENDING_REVIEW' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionMenuOrderId(null);
                                    onApprove(order.id, '原型测试：快速通过工程评审');
                                  }}
                                  className="px-3 py-1.5 text-[13px] font-normal text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50/70 dark:hover:bg-slate-800 rounded text-center transition-colors cursor-pointer whitespace-nowrap"
                                >
                                  工程审批
                                </button>
                              )}

                              {/* 已审批状态: 通知 (仅限手动通知模式且待通知时), 部门确认情况, 反审批, 作废 */}
                              {order.docStatus === 'APPROVED' && (
                                <>
                                  {canSendManual && (
                                    <button
                                      type="button"
                                      id={`btn-ecn-notify-${order.id}`}
                                      onClick={() => {
                                        setOpenActionMenuOrderId(null);
                                        onSendNotification(order.id);
                                      }}
                                      className="px-3 py-1.5 text-[13px] font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50/70 dark:hover:bg-slate-800 rounded text-center transition-colors cursor-pointer whitespace-nowrap"
                                    >
                                      通知
                                    </button>
                                  )}
                                  {canDeptConfirm && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionMenuOrderId(null);
                                        setConfirmModalOrder(order);
                                        const unconfirmedDept =
                                          order.notifyDepts.find(
                                            d =>
                                              !(order.departmentConfirmations || []).some(
                                                c => c.dept === d && c.status === 'CONFIRMED'
                                              )
                                          ) ||
                                          order.notifyDepts[0] ||
                                          '生产部';
                                        setModalSelectedDept(unconfirmedDept);
                                        setModalConfirmer(order.applicant || '操作员');
                                        setModalRemarks('已完成部门内物料及业务受影响分析');
                                      }}
                                      className="px-3 py-1.5 text-[13px] font-normal text-teal-600 dark:text-teal-400 hover:bg-teal-50/70 dark:hover:bg-slate-800 rounded text-center transition-colors cursor-pointer whitespace-nowrap"
                                    >
                                      部门确认情况
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionMenuOrderId(null);
                                      onReverseApproval(order.id);
                                    }}
                                    className="px-3 py-1.5 text-[13px] font-normal text-amber-600 dark:text-amber-400 hover:bg-amber-50/70 dark:hover:bg-slate-800 rounded text-center transition-colors cursor-pointer whitespace-nowrap"
                                  >
                                    反审批
                                  </button>
                                  {canInvalidate && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionMenuOrderId(null);
                                        onInvalidatePrompt(order);
                                      }}
                                      className="px-3 py-1.5 text-[13px] font-normal text-rose-500 dark:text-rose-400 hover:bg-rose-50/70 dark:hover:bg-slate-800 rounded text-center transition-colors cursor-pointer whitespace-nowrap"
                                    >
                                      作废
                                    </button>
                                  )}
                                </>
                              )}
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

      {/* 底部标准分页栏 */}
      <div className="p-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <span>共 {filteredOrders.length} 条</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="py-0.5 px-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value={10}>10条/页</option>
            <option value={20}>20条/页</option>
            <option value={50}>50条/页</option>
          </select>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(1)}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="首页"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="上一页"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="px-2 py-0.5 text-xs text-slate-700 dark:text-slate-300 font-medium font-mono">
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="下一页"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(totalPages)}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="末页"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 部门确认情况弹窗 */}
      {confirmModalOrder && (
        <div className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2 text-teal-600 dark:text-teal-400">
                <UserCheck className="w-5 h-5" />
                部门确认情况登记 ({confirmModalOrder.ecnNo})
              </h3>
              <button
                type="button"
                onClick={() => setConfirmModalOrder(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              工程变更单生效后，通知配置中的各个部门需分别进行接收确认并记录确认人、确认部门、确认时间及应对措施。
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  确认部门 <span className="text-teal-600">*</span>:
                </label>
                <select
                  value={modalSelectedDept}
                  onChange={(e) => setModalSelectedDept(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  {confirmModalOrder.notifyDepts.map((d) => {
                    const isConf = (confirmModalOrder.departmentConfirmations || []).some(
                      (c) => c.dept === d && c.status === 'CONFIRMED'
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
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  确认人 <span className="text-teal-600">*</span>:
                </label>
                <input
                  type="text"
                  value={modalConfirmer}
                  onChange={(e) => setModalConfirmer(e.target.value)}
                  placeholder="请输入确认人姓名..."
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  确认说明 / 业务协同措施:
                </label>
                <textarea
                  value={modalRemarks}
                  onChange={(e) => setModalRemarks(e.target.value)}
                  placeholder="请输入该部门针对本次变更的接收确认意见、现场物料清理或业务安排..."
                  rows={3}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {/* 现有部门确认情况列表预览 */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                  通知部门确认进度:
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  {confirmModalOrder.notifyDepts.map((d) => {
                    const cRecord = (confirmModalOrder.departmentConfirmations || []).find((c) => c.dept === d);
                    const isDone = cRecord && cRecord.status === 'CONFIRMED';
                    return (
                      <div
                        key={d}
                        className={`p-1.5 rounded-lg border flex flex-col justify-between ${
                          isDone
                            ? 'bg-teal-50/60 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200'
                            : 'bg-slate-100/60 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-500'
                        }`}
                      >
                        <div className="font-bold flex items-center justify-between">
                          <span>{d}</span>
                          {isDone ? <span>✓ 已确认</span> : <span>待确认</span>}
                        </div>
                        {isDone && (
                          <div className="text-[9px] text-teal-600 dark:text-teal-400 mt-0.5 truncate">
                            {cRecord.confirmer} ({cRecord.confirmTime?.split(' ')[0] || ''})
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmModalOrder(null)}
                className="px-3.5 py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                disabled={!modalSelectedDept || !modalConfirmer.trim()}
                onClick={() => {
                  if (onDepartmentConfirm) {
                    onDepartmentConfirm(
                      confirmModalOrder.id,
                      modalSelectedDept,
                      modalConfirmer.trim(),
                      modalRemarks.trim()
                    );
                  } else {
                    onWarehouseConfirm(confirmModalOrder.id);
                  }
                  setConfirmModalOrder(null);
                }}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 disabled:opacity-50 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5" />
                提交部门确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

