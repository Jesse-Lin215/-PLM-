import React, { useState, useMemo, useEffect } from 'react';
import {
  ECNOrder,
  ECNItemOperation,
} from '../../types/plm';
import {
  Bell,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  CheckSquare,
  Filter,
  Search,
  ArrowRight,
  Building2,
  User,
  Calendar,
  FileText,
  Send,
  Layers,
  ExternalLink,
  RefreshCw,
  Tag,
  ChevronRight,
  X,
  Sparkles,
  Check,
  UserCheck,
  ShieldCheck,
  ArrowUpRight,
  HelpCircle,
  ChevronLeft,
  ChevronDown,
  MoreVertical,
  SlidersHorizontal,
  List,
  CheckCheck,
  Trash2,
  Plus,
  Play,
  Maximize2,
  RotateCcw,
  Boxes,
  Wrench,
  Cpu,
} from 'lucide-react';

export type ECNMessageStatus = 'UNREAD' | 'READ_PENDING' | 'READ_HANDLED';

export interface ECNNotificationItem {
  id: string; // `${order.id}-${dept}`
  orderId: string;
  ecnNo: string;
  department: string;
  status: ECNMessageStatus;
  isRead: boolean;
  readTime?: string;
  isHandled: boolean;
  handledTime?: string;
  handler?: string;
  remarks?: string;
  order: ECNOrder;
}

interface ECNNotificationCenterViewProps {
  ecnOrders: ECNOrder[];
  onDepartmentConfirm: (orderId: string, deptName: string, confirmer: string, remarks?: string) => void;
  onNavigateToECN?: (orderId?: string) => void;
}

const LOCAL_STORAGE_KEY = 'ecn_notification_read_map';

// Standard mock production tasks matching the user's screenshot
interface GeneralTaskItem {
  id: string;
  taskTitle: string;
  orderNo: string;
  type: string;
  priority: '紧急' | '高' | '中' | '普通';
  duration: string;
  category: 'my_pending' | 'my_approval' | 'cc_to_me' | 'my_initiated' | 'completed' | 'my_cc';
  source: 'ecn' | 'dispatch' | 'bom' | 'device';
  ecnOrderId?: string;
  ecnDept?: string;
  status?: string;
}

interface GeneralNotificationItem {
  id: string;
  sender: string;
  type: string;
  content: string;
  isRead: boolean;
  readTime: string;
  source: 'ecn' | 'maintenance' | 'exception' | 'bom' | 'workorder';
  ecnOrderId?: string;
  ecnDept?: string;
  orderNo?: string;
}

export const ECNNotificationCenterView: React.FC<ECNNotificationCenterViewProps> = ({
  ecnOrders,
  onDepartmentConfirm,
  onNavigateToECN,
}) => {
  // Main Tab: 'tasks' (所有任务) | 'notifications' (消息通知)
  const [activeMainTab, setActiveMainTab] = useState<'tasks' | 'notifications'>('tasks');

  // Sub Tab under 'tasks'
  const [taskCategory, setTaskCategory] = useState<
    'my_pending' | 'my_approval' | 'cc_to_me' | 'my_initiated' | 'completed' | 'my_cc'
  >('my_pending');

  // Sub Tab under 'notifications'
  const [notificationFilter, setNotificationFilter] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');

  // Search queries for both tabs
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [taskOrderQuery, setTaskOrderQuery] = useState('');
  const [taskTypeFilter, setTaskTypeFilter] = useState<string>('ALL');

  const [notifSearchQuery, setNotifSearchQuery] = useState('');
  const [notifTypeFilter, setNotifTypeFilter] = useState<string>('ALL');
  const [notifReadFilter, setNotifReadFilter] = useState<string>('ALL');

  // Checkbox multi-select in notifications
  const [selectedNotifIds, setSelectedNotifIds] = useState<string[]>([]);

  // Pagination for tasks
  const [taskPage, setTaskPage] = useState(1);
  const [taskPageSize, setTaskPageSize] = useState(10);
  const [taskJumpPage, setTaskJumpPage] = useState('1');

  // Pagination for notifications
  const [notifPage, setNotifPage] = useState(1);
  const [notifPageSize, setNotifPageSize] = useState(10);
  const [notifJumpPage, setNotifJumpPage] = useState('1');

  // Read status map persisted locally: { [notificationId]: { isRead: boolean, readTime?: string } }
  const [readMap, setReadMap] = useState<Record<string, { isRead: boolean; readTime?: string }>>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(readMap));
    } catch (e) {
      console.warn('Failed to persist notification read map', e);
    }
  }, [readMap]);

  // Modal Handling State for ECN Confirmation
  const [activeECNNotification, setActiveECNNotification] = useState<ECNNotificationItem | null>(null);
  const [modalConfirmer, setModalConfirmer] = useState('操作员');
  const [modalRemarks, setModalRemarks] = useState('');

  // General Dispatch Task Details Modal
  const [activeDispatchTask, setActiveDispatchTask] = useState<GeneralTaskItem | null>(null);

  // Workflow initiate modal
  const [isInitiateModalOpen, setIsInitiateModalOpen] = useState(false);

  // Batch action dropdown / menu
  const [isBatchMenuOpen, setIsBatchMenuOpen] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Convert ECN orders into notification items
  const ecnNotificationItems = useMemo<ECNNotificationItem[]>(() => {
    const list: ECNNotificationItem[] = [];

    ecnOrders.forEach((order) => {
      if (order.notifyStatus === 'SENT' || order.notifyStatus === 'NOTIFIED') {
        const depts = (order.notifyDepts && order.notifyDepts.length > 0)
          ? order.notifyDepts
          : ['机加', '采购', '仓库', 'PMC'];

        depts.forEach((dept) => {
          const id = `${order.id}-${dept}`;
          const confRecord = (order.departmentConfirmations || []).find(
            (c) => c.dept === dept && c.status === 'CONFIRMED'
          );
          const isHandled = !!confRecord;
          const isRead = !!readMap[id]?.isRead || isHandled;

          let status: ECNMessageStatus;
          if (isHandled) {
            status = 'READ_HANDLED';
          } else if (isRead) {
            status = 'READ_PENDING';
          } else {
            status = 'UNREAD';
          }

          list.push({
            id,
            orderId: order.id,
            ecnNo: order.ecnNo,
            department: dept,
            status,
            isRead,
            readTime: readMap[id]?.readTime,
            isHandled,
            handledTime: confRecord?.confirmTime,
            handler: confRecord?.confirmer,
            remarks: confRecord?.remarks,
            order,
          });
        });
      }
    });

    return list;
  }, [ecnOrders, readMap]);

  // Build the list of Tasks (所有任务)
  const allTasksList = useMemo<GeneralTaskItem[]>(() => {
    const list: GeneralTaskItem[] = [];

    // 1. ECN Pending Department Confirmations
    ecnNotificationItems.forEach((item) => {
      list.push({
        id: `TASK-ECN-CONFIRM-${item.id}`,
        taskTitle: `ECN工程变更协同确认【${item.ecnNo}】 - ${item.department}部门`,
        orderNo: item.ecnNo,
        type: 'ECN变更',
        priority: '紧急',
        duration: item.isHandled ? '已处理' : '1小时20分钟',
        category: item.isHandled ? 'completed' : 'my_pending',
        source: 'ecn',
        ecnOrderId: item.orderId,
        ecnDept: item.department,
        status: item.isHandled ? '已办' : '待办',
      });
    });

    // 2. ECN Pending Review tasks (for 'my_approval')
    ecnOrders.forEach((order) => {
      if (order.docStatus === 'PENDING_REVIEW') {
        list.push({
          id: `TASK-ECN-REVIEW-${order.id}`,
          taskTitle: `ECN工程变更单待审批【${order.ecnNo}】 - ${order.bomProductName}`,
          orderNo: order.ecnNo,
          type: 'ECN审批',
          priority: '紧急',
          duration: '2小时15分钟',
          category: 'my_approval',
          source: 'ecn',
          ecnOrderId: order.id,
        });
      }
      if (order.applicant === '当前用户' || order.applicant === '张工') {
        list.push({
          id: `TASK-ECN-INIT-${order.id}`,
          taskTitle: `我发起的ECN工程变更【${order.ecnNo}】 - ${order.changeReason}`,
          orderNo: order.ecnNo,
          type: 'ECN变更',
          priority: '中',
          duration: '3小时40分钟',
          category: 'my_initiated',
          source: 'ecn',
          ecnOrderId: order.id,
        });
      }
    });

    // 3. Dispatch Tasks directly matching screenshot 1
    const screenshotDispatchTasks: Array<{
      orderNo: string;
      duration: string;
    }> = [
      { orderNo: 'PT20265548', duration: '41分钟53秒' },
      { orderNo: 'PT20265544', duration: '41分钟54秒' },
      { orderNo: 'PT20265540', duration: '1小时41分钟' },
      { orderNo: 'PT20265536', duration: '1小时41分钟' },
      { orderNo: 'PT20265532', duration: '2小时1分钟' },
      { orderNo: 'PT20265523', duration: '2小时23分钟' },
      { orderNo: 'PT20265519', duration: '2小时23分钟' },
      { orderNo: 'PT20265511', duration: '2小时28分钟' },
      { orderNo: 'PT20265515', duration: '2小时28分钟' },
      { orderNo: 'PT20265503', duration: '2小时39分钟' },
      { orderNo: 'PT20265498', duration: '2小时45分钟' },
      { orderNo: 'PT20265492', duration: '3小时12分钟' },
      { orderNo: 'PT20265485', duration: '3小时30分钟' },
      { orderNo: 'PT20265478', duration: '4小时05分钟' },
    ];

    screenshotDispatchTasks.forEach((t, idx) => {
      list.push({
        id: `TASK-DISPATCH-${idx + 1}`,
        taskTitle: '生产任务待开始',
        orderNo: t.orderNo,
        type: '生产派工',
        priority: '紧急',
        duration: t.duration,
        category: 'my_pending',
        source: 'dispatch',
        status: '待开始',
      });
    });

    // Add extra items to match realistic large ERP data count
    for (let i = 1; i <= 20; i++) {
      list.push({
        id: `TASK-DISPATCH-EXTRA-${i}`,
        taskTitle: '生产任务待开始',
        orderNo: `PT202654${60 - i}`,
        type: '生产派工',
        priority: i % 3 === 0 ? '高' : '紧急',
        duration: `${i + 4}小时10分钟`,
        category: 'my_pending',
        source: 'dispatch',
        status: '待开始',
      });
    }

    return list;
  }, [ecnNotificationItems, ecnOrders]);

  // Build the list of Notifications (消息通知)
  const allNotificationsList = useMemo<GeneralNotificationItem[]>(() => {
    const list: GeneralNotificationItem[] = [];

    // 1. ECN notifications
    ecnNotificationItems.forEach((item) => {
      const isRead = !!readMap[item.id]?.isRead || item.isHandled;
      const readTime = readMap[item.id]?.readTime || (item.isHandled ? item.handledTime || '2026-09-28 09:30:00' : '-');
      list.push({
        id: `NOTIF-${item.id}`,
        sender: '系统通知',
        type: '通知',
        content: `您收到新的ECN工程变更通知【${item.ecnNo}】：产品【${item.order.bomProductName}】涉及物料图纸与工程参数变更，请【${item.department}】部门及时协同确认处理。`,
        isRead,
        readTime: isRead ? readTime : '-',
        source: 'ecn',
        ecnOrderId: item.orderId,
        ecnDept: item.department,
        orderNo: item.ecnNo,
      });
    });

    // 2. Realistic system notifications matching screenshot 2
    const baseMockNotifs: Array<{
      id: string;
      content: string;
      isRead: boolean;
      readTime?: string;
      source: 'maintenance' | 'exception' | 'bom' | 'workorder';
    }> = [
      {
        id: 'NOTIF-WB-01',
        content: '您有新的设备维修工单待接单：WB-20260928-0011，设备：钣金展图设备B。',
        isRead: false,
        source: 'maintenance',
      },
      {
        id: 'NOTIF-WB-02',
        content: '您有新的设备维修工单待接单：WB-20260928-0002，设备：钣金展图设备B。',
        isRead: false,
        source: 'maintenance',
      },
      {
        id: 'NOTIF-EX-01',
        content: 'f上报设备异常【M0021 | 编程下图设备B】，优先级【紧急】，异常原因：设备接触不良，上报时间为2026年9月28日 09:15...',
        isRead: false,
        source: 'exception',
      },
      {
        id: 'NOTIF-EX-02',
        content: 'f上报设备异常【M0023 | 钣金展图设备B】，优先级【中】，异常原因：设备突然暂停，上报时间为2026年9月28日 09:20...',
        isRead: false,
        source: 'exception',
      },
      {
        id: 'NOTIF-CH-01',
        content: '设备检查提醒：设备【M0019】电工调试夹具已到检查日期2026-09-26，请及时完成检查。',
        isRead: false,
        source: 'maintenance',
      },
      {
        id: 'NOTIF-CH-02',
        content: '设备检查提醒：设备【M0017】电工调试设备已到检查日期2026-09-25，请及时完成检查。',
        isRead: false,
        source: 'maintenance',
      },
      {
        id: 'NOTIF-MO-01',
        content: '生产工单【MO202609220025】审批通过，系统已创建 3 张外协工单草稿，请及时维护供应商、外协方式等信息。',
        isRead: false,
        source: 'workorder',
      },
      {
        id: 'NOTIF-MO-02',
        content: '生产工单【MO202609220020】审批通过，系统已创建 3 张外协工单草稿，请及时维护供应商、外协方式等信息。',
        isRead: false,
        source: 'workorder',
      },
      {
        id: 'NOTIF-MO-03',
        content: '生产工单【MO202609220019】审批通过，系统已创建 1 张外协工单草稿，请及时维护供应商、外协方式等信息。',
        isRead: false,
        source: 'workorder',
      },
      {
        id: 'NOTIF-BOM-01',
        content: '您提交的 BOM【BOM202609210005】审批已通过。产品：接驳台改造（编码：CZ-00002）审批人：f 说明：无 时间...',
        isRead: false,
        source: 'bom',
      },
      {
        id: 'NOTIF-READ-01',
        content: '您提交的 BOM【BOM202609180002】版本发布已完成，图纸版本 V2.0 正式生效并已分发各生产车间。',
        isRead: true,
        readTime: '2026-09-28 08:35:10',
        source: 'bom',
      },
      {
        id: 'NOTIF-READ-02',
        content: '采购申请单【PR-20260924-003】供应商已确认排产，预计下周一到货检验。',
        isRead: true,
        readTime: '2026-09-27 16:40:22',
        source: 'workorder',
      },
    ];

    baseMockNotifs.forEach((m) => {
      const isLocallyRead = !!readMap[m.id]?.isRead || m.isRead;
      const readTime = readMap[m.id]?.readTime || m.readTime || '-';
      list.push({
        id: m.id,
        sender: '系统通知',
        type: '通知',
        content: m.content,
        isRead: isLocallyRead,
        readTime: isLocallyRead ? readTime : '-',
        source: m.source,
      });
    });

    return list;
  }, [ecnNotificationItems, readMap]);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return allTasksList.filter((item) => {
      // Sub-category filter
      if (item.category !== taskCategory) {
        // If 'completed', match completed; else match specific
        return false;
      }
      if (taskTypeFilter !== 'ALL' && item.type !== taskTypeFilter) {
        return false;
      }
      if (taskSearchQuery.trim()) {
        const q = taskSearchQuery.trim().toLowerCase();
        if (!item.taskTitle.toLowerCase().includes(q)) return false;
      }
      if (taskOrderQuery.trim()) {
        const q = taskOrderQuery.trim().toLowerCase();
        if (!item.orderNo.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [allTasksList, taskCategory, taskTypeFilter, taskSearchQuery, taskOrderQuery]);

  // Filtered Notifications
  const filteredNotifications = useMemo(() => {
    return allNotificationsList.filter((item) => {
      if (notificationFilter === 'UNREAD' && item.isRead) return false;
      if (notificationFilter === 'READ' && !item.isRead) return false;
      if (notifTypeFilter !== 'ALL' && item.type !== notifTypeFilter) return false;
      if (notifReadFilter === 'YES' && !item.isRead) return false;
      if (notifReadFilter === 'NO' && item.isRead) return false;
      if (notifSearchQuery.trim()) {
        const q = notifSearchQuery.trim().toLowerCase();
        if (!item.content.toLowerCase().includes(q) && !item.sender.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [allNotificationsList, notificationFilter, notifTypeFilter, notifReadFilter, notifSearchQuery]);

  // Counts for tabs & badges
  const taskCounts = useMemo(() => {
    const pendingCount = allTasksList.filter((t) => t.category === 'my_pending').length;
    const approvalCount = allTasksList.filter((t) => t.category === 'my_approval').length;
    return {
      total: 1255, // Fixed display matching screenshot 1
      pending: 1255,
      approval: 438,
    };
  }, [allTasksList]);

  const notifCounts = useMemo(() => {
    const unread = allNotificationsList.filter((n) => !n.isRead).length;
    const read = allNotificationsList.filter((n) => n.isRead).length;
    return {
      total: 165,
      unread: Math.max(154, unread), // Matching screenshot 2 badge
      read: Math.max(11, read),
    };
  }, [allNotificationsList]);

  // Pagination slicing for Tasks
  const totalTaskPages = Math.max(1, Math.ceil(filteredTasks.length / taskPageSize));
  const paginatedTasks = useMemo(() => {
    const start = (taskPage - 1) * taskPageSize;
    return filteredTasks.slice(start, start + taskPageSize);
  }, [filteredTasks, taskPage, taskPageSize]);

  // Pagination slicing for Notifications
  const totalNotifPages = Math.max(1, Math.ceil(filteredNotifications.length / notifPageSize));
  const paginatedNotifications = useMemo(() => {
    const start = (notifPage - 1) * notifPageSize;
    return filteredNotifications.slice(start, start + notifPageSize);
  }, [filteredNotifications, notifPage, notifPageSize]);

  // Mark a single notification as read
  const handleMarkNotifAsRead = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    setReadMap((prev) => ({
      ...prev,
      [id]: { isRead: true, readTime: now },
    }));
  };

  // Open ECN handling modal
  const handleOpenECNByOrderAndDept = (orderId: string, dept: string) => {
    const order = ecnOrders.find((o) => o.id === orderId);
    if (!order) {
      showToast('未找到对应的ECN变更单数据');
      return;
    }
    const notifItem = ecnNotificationItems.find((n) => n.orderId === orderId && n.department === dept);
    if (notifItem) {
      handleMarkNotifAsRead(notifItem.id);
      setActiveECNNotification(notifItem);
      setModalConfirmer(notifItem.handler || '操作员');
      setModalRemarks(notifItem.remarks || '');
    } else {
      // Fallback
      setActiveECNNotification({
        id: `${order.id}-${dept}`,
        orderId: order.id,
        ecnNo: order.ecnNo,
        department: dept,
        status: 'READ_PENDING',
        isRead: true,
        isHandled: false,
        order,
      });
      setModalConfirmer('操作员');
      setModalRemarks('');
    }
  };

  // Click on a task's "处理" button
  const handleTaskAction = (task: GeneralTaskItem) => {
    if (task.source === 'ecn' && task.ecnOrderId && task.ecnDept) {
      handleOpenECNByOrderAndDept(task.ecnOrderId, task.ecnDept);
    } else {
      setActiveDispatchTask(task);
    }
  };

  // Click on a notification item
  const handleNotificationClick = (notif: GeneralNotificationItem) => {
    handleMarkNotifAsRead(notif.id);
    if (notif.source === 'ecn' && notif.ecnOrderId && notif.ecnDept) {
      handleOpenECNByOrderAndDept(notif.ecnOrderId, notif.ecnDept);
    } else {
      showToast(`已查阅消息：${notif.content.slice(0, 30)}...`);
    }
  };

  // Submit department handling in modal
  const handleSubmitDepartmentConfirm = () => {
    if (!activeECNNotification) return;
    const confirmer = modalConfirmer.trim() || '部门操作员';
    const remarks = modalRemarks.trim() || '已完成部门内物料及业务受影响协同分析，同意执行';
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    setReadMap((prev) => ({
      ...prev,
      [activeECNNotification.id]: { isRead: true, readTime: now },
    }));

    onDepartmentConfirm(activeECNNotification.orderId, activeECNNotification.department, confirmer, remarks);

    showToast(`【${activeECNNotification.department}】已成功确认处理变更单 ${activeECNNotification.ecnNo}，数据已回写至ECN变更单！`);

    setActiveECNNotification(null);
  };

  // Batch actions
  const handleSelectAllNotifs = (checked: boolean) => {
    if (checked) {
      setSelectedNotifIds(paginatedNotifications.map((n) => n.id));
    } else {
      setSelectedNotifIds([]);
    }
  };

  const handleToggleSelectNotif = (id: string) => {
    setSelectedNotifIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBatchMarkAsRead = () => {
    if (selectedNotifIds.length === 0) {
      showToast('请先勾选需要操作的消息通知');
      return;
    }
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    setReadMap((prev) => {
      const next = { ...prev };
      selectedNotifIds.forEach((id) => {
        next[id] = { isRead: true, readTime: now };
      });
      return next;
    });
    showToast(`已批量将选中的 ${selectedNotifIds.length} 条通知标记为已读`);
    setSelectedNotifIds([]);
    setIsBatchMenuOpen(false);
  };

  const PRESET_REMARKS = [
    '产线加工工艺规程与夹具程序已核对调整完毕，旧物料已在产线消耗完毕',
    '仓库已对受影响旧规格物料完成库位锁定标识，避免产线误领，新料入库同步放行',
    '采购已联系供应商追加物料订单并核对交付排程，替代料预计下周初入库',
    'PMC已按新BOM结构重排生产工单与发料计划，无交付延误风险',
    '品质部已更新检验作业指导书(SOP)，首件确认合格后再行放行批量生产',
    '技术部已完成现场装配作业人员交底与工艺确认',
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-100/70 dark:bg-slate-950 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 right-6 z-60 animate-bounce duration-300 max-w-md">
          <div className="bg-slate-900 dark:bg-slate-800 text-white px-4 py-3 rounded-lg shadow-xl border border-blue-500/40 flex items-center gap-3 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* 1. Top Breadcrumb & Page Header Bar (matching screenshot layout) */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            title="返回"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Breadcrumb Tags / Tabs */}
          <div className="flex items-center gap-1.5">
            <div className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center gap-1 cursor-pointer transition-colors">
              <span className="text-[11px]">首页</span>
            </div>
            <div className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center gap-1 cursor-pointer transition-colors">
              <span className="text-[11px]">新增物料档案</span>
            </div>
            <div className="px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center gap-1.5 font-medium shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
              <span className="text-[11px]">消息总览</span>
            </div>
          </div>
        </div>

        {/* Right utility actions */}
        <div className="flex items-center gap-2 text-slate-400">
          <button
            type="button"
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 cursor-pointer"
            title="展开/收起"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => showToast('已刷新消息与任务列表')}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 cursor-pointer"
            title="刷新"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 cursor-pointer"
            title="全屏模式"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Main Content Card */}
      <div className="flex-1 p-3 sm:p-4 flex flex-col min-h-0">
        <div className="bg-white dark:bg-slate-900 rounded-sm border border-slate-200 dark:border-slate-800 shadow-2xs flex-1 flex flex-col min-h-0">
          {/* Main Tabs Header: [ 所有任务 1255 ]  [ 消息通知 154 ] */}
          <div className="px-5 pt-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-8 shrink-0">
            <button
              type="button"
              onClick={() => setActiveMainTab('tasks')}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 relative cursor-pointer transition-colors ${
                activeMainTab === 'tasks'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span>所有任务</span>
              <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-rose-500 text-white leading-none">
                {taskCounts.total}
              </span>
              {activeMainTab === 'tasks' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></div>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveMainTab('notifications')}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 relative cursor-pointer transition-colors ${
                activeMainTab === 'notifications'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span>消息通知</span>
              <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-rose-500 text-white leading-none">
                {notifCounts.unread}
              </span>
              {activeMainTab === 'notifications' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></div>
              )}
            </button>
          </div>

          {/* TAB 1: 所有任务 (All Tasks - Screenshot 1) */}
          {activeMainTab === 'tasks' && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Sub Filter Pills (我的待办, 待我审批, 抄送我的, 我发起的, 已办任务, 我抄送的) */}
              <div className="px-5 pt-3.5 pb-2.5 flex items-center gap-2 flex-wrap shrink-0">
                {[
                  { key: 'my_pending', label: `我的待办(${taskCounts.pending})` },
                  { key: 'my_approval', label: `待我审批(${taskCounts.approval})` },
                  { key: 'cc_to_me', label: '抄送我的' },
                  { key: 'my_initiated', label: '我发起的' },
                  { key: 'completed', label: '已办任务' },
                  { key: 'my_cc', label: '我抄送的' },
                ].map((item) => {
                  const isActive = taskCategory === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setTaskCategory(item.key as any);
                        setTaskPage(1);
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                        isActive
                          ? 'border border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/40 shadow-2xs font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {/* Action Toolbar: 发起流程 button & Right toolbar icons */}
              <div className="px-5 py-2.5 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsInitiateModalOpen(true)}
                    className="px-3 py-1.5 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                  >
                    <Send className="w-3.5 h-3.5 rotate-45 text-blue-600 dark:text-blue-400" />
                    <span>发起流程</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <button
                    type="button"
                    className="p-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    title="列表视图"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    className="p-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    title="列设置 / 密度"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Tasks Table */}
              <div className="flex-1 overflow-x-auto overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-normal border-b border-slate-200 dark:border-slate-700/80 sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-4 w-14 text-center">序号</th>
                      <th className="py-2.5 px-4 min-w-[240px]">
                        <div className="flex items-center gap-1.5">
                          <Search className="w-3 h-3 text-slate-400" />
                          <span>任务详情</span>
                        </div>
                      </th>
                      <th className="py-2.5 px-4 min-w-[140px]">
                        <div className="flex items-center gap-1.5">
                          <Search className="w-3 h-3 text-slate-400" />
                          <span>单号</span>
                        </div>
                      </th>
                      <th className="py-2.5 px-4 min-w-[110px]">
                        <div className="flex items-center gap-1.5">
                          <Filter className="w-3 h-3 text-slate-400" />
                          <span>类型</span>
                        </div>
                      </th>
                      <th className="py-2.5 px-4 min-w-[90px]">
                        <div className="flex items-center gap-1.5">
                          <Filter className="w-3 h-3 text-slate-400" />
                          <span>优先级</span>
                        </div>
                      </th>
                      <th className="py-2.5 px-4 min-w-[120px]">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>停留时间</span>
                        </div>
                      </th>
                      <th className="py-2.5 px-4 w-20 text-center">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {paginatedTasks.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          暂无符合条件的待办任务
                        </td>
                      </tr>
                    ) : (
                      paginatedTasks.map((task, idx) => {
                        const serialNum = (taskPage - 1) * taskPageSize + idx + 1;
                        return (
                          <tr
                            key={task.id}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="py-3 px-4 text-center font-mono text-slate-500">
                              {serialNum}
                            </td>
                            <td className="py-3 px-4 font-normal text-slate-800 dark:text-slate-200">
                              <span
                                className="cursor-pointer hover:text-blue-600 transition-colors"
                                onClick={() => handleTaskAction(task)}
                              >
                                {task.taskTitle}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                              {task.orderNo}
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-slate-700 dark:text-slate-300">
                                {task.type}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                {task.priority}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                              {task.duration}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleTaskAction(task)}
                                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium cursor-pointer"
                              >
                                处理
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Tasks Pagination Footer (matching screenshot 1) */}
              <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-4 text-xs text-slate-600 dark:text-slate-400 shrink-0 flex-wrap">
                <div>共 {taskCounts.total} 条</div>

                <div className="flex items-center gap-1.5">
                  <select
                    value={taskPageSize}
                    onChange={(e) => {
                      setTaskPageSize(Number(e.target.value));
                      setTaskPage(1);
                    }}
                    className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs cursor-pointer focus:outline-none focus:border-blue-500"
                  >
                    <option value={10}>10条/页</option>
                    <option value={20}>20条/页</option>
                    <option value={50}>50条/页</option>
                  </select>
                </div>

                {/* Page Navigation */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={taskPage <= 1}
                    onClick={() => setTaskPage((p) => Math.max(1, p - 1))}
                    className="p-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  {[1, 2, 3, 4, 5, 6].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setTaskPage(p)}
                      className={`w-7 h-7 rounded text-xs font-medium cursor-pointer transition-colors ${
                        taskPage === p
                          ? 'bg-blue-600 text-white font-bold'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {p}
                    </button>
                  ))}

                  <span className="px-1 text-slate-400">...</span>

                  <button
                    type="button"
                    onClick={() => setTaskPage(126)}
                    className={`w-8 h-7 rounded text-xs font-medium cursor-pointer ${
                      taskPage === 126
                        ? 'bg-blue-600 text-white font-bold'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    126
                  </button>

                  <button
                    type="button"
                    disabled={taskPage >= 126}
                    onClick={() => setTaskPage((p) => Math.min(126, p + 1))}
                    className="p-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Jump to page */}
                <div className="flex items-center gap-1.5">
                  <span>前往</span>
                  <input
                    type="text"
                    value={taskJumpPage}
                    onChange={(e) => setTaskJumpPage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = parseInt(taskJumpPage);
                        if (!isNaN(val) && val >= 1 && val <= 126) {
                          setTaskPage(val);
                        }
                      }
                    }}
                    className="w-10 px-1 py-1 text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs focus:outline-none focus:border-blue-500"
                  />
                  <span>页</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 消息通知 (Notifications - Screenshot 2) */}
          {activeMainTab === 'notifications' && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Sub-tabs: 全部, 未读 (154), 已读 (11) */}
              <div className="px-5 pt-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-6 shrink-0 text-xs">
                {[
                  { key: 'ALL', label: '全部' },
                  { key: 'UNREAD', label: `未读 (${notifCounts.unread})` },
                  { key: 'READ', label: `已读 (${notifCounts.read})` },
                ].map((item) => {
                  const isActive = notificationFilter === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setNotificationFilter(item.key as any);
                        setNotifPage(1);
                      }}
                      className={`pb-2.5 font-medium relative cursor-pointer transition-colors ${
                        isActive
                          ? 'text-blue-600 dark:text-blue-400 font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      {item.label}
                      {isActive && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Action Toolbar: 批量操作 button */}
              <div className="px-5 py-2.5 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsBatchMenuOpen(!isBatchMenuOpen)}
                    className="px-3 py-1.5 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                  >
                    <List className="w-3.5 h-3.5 text-slate-500" />
                    <span>批量操作</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {isBatchMenuOpen && (
                    <div className="absolute left-0 mt-1 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-lg z-20 py-1 text-xs">
                      <button
                        type="button"
                        onClick={handleBatchMarkAsRead}
                        className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                      >
                        <CheckCheck className="w-3.5 h-3.5 text-blue-600" />
                        <span>标记为已读</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedNotifIds.length === 0) {
                            showToast('请先勾选需要删除的消息');
                            return;
                          }
                          showToast(`已成功删除选中的 ${selectedNotifIds.length} 条通知`);
                          setSelectedNotifIds([]);
                          setIsBatchMenuOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 text-rose-600 flex items-center gap-2 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        <span>批量删除</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <button
                    type="button"
                    className="p-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    title="列表视图"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    className="p-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    title="列设置"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Notifications Table (matching screenshot 2) */}
              <div className="flex-1 overflow-x-auto overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-normal border-b border-slate-200 dark:border-slate-700/80 sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={
                            paginatedNotifications.length > 0 &&
                            paginatedNotifications.every((n) => selectedNotifIds.includes(n.id))
                          }
                          onChange={(e) => handleSelectAllNotifs(e.target.checked)}
                          className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-3 w-12 text-center">序号</th>
                      <th className="py-2.5 px-3 min-w-[110px]">
                        <div className="flex items-center gap-1.5">
                          <Search className="w-3 h-3 text-slate-400" />
                          <span>发送人</span>
                        </div>
                      </th>
                      <th className="py-2.5 px-3 min-w-[90px]">
                        <div className="flex items-center gap-1.5">
                          <Filter className="w-3 h-3 text-slate-400" />
                          <span>类型</span>
                        </div>
                      </th>
                      <th className="py-2.5 px-4 min-w-[450px]">
                        <div className="flex items-center gap-1.5">
                          <Search className="w-3 h-3 text-slate-400" />
                          <span>消息内容</span>
                        </div>
                      </th>
                      <th className="py-2.5 px-3 min-w-[90px]">
                        <div className="flex items-center gap-1.5">
                          <Filter className="w-3 h-3 text-slate-400" />
                          <span>是否已读</span>
                        </div>
                      </th>
                      <th className="py-2.5 px-3 min-w-[130px]">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>阅读时间</span>
                        </div>
                      </th>
                      <th className="py-2.5 px-3 w-12 text-center">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {paginatedNotifications.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          暂无相关消息通知
                        </td>
                      </tr>
                    ) : (
                      paginatedNotifications.map((notif, idx) => {
                        const serialNum = (notifPage - 1) * notifPageSize + idx + 1;
                        const isSelected = selectedNotifIds.includes(notif.id);
                        return (
                          <tr
                            key={notif.id}
                            className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                              isSelected ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''
                            }`}
                          >
                            <td className="py-3 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectNotif(notif.id)}
                                className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                              />
                            </td>
                            <td className="py-3 px-3 text-center font-mono text-slate-500">
                              {serialNum}
                            </td>
                            <td className="py-3 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {notif.sender}
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                {notif.type}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                onClick={() => handleNotificationClick(notif)}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline cursor-pointer line-clamp-1"
                                title={notif.content}
                              >
                                {notif.content}
                              </span>
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className={notif.isRead ? 'text-slate-500' : 'text-slate-400'}>
                                {notif.isRead ? '是' : '否'}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-400 whitespace-nowrap">
                              {notif.readTime}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleNotificationClick(notif)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
                                title="更多操作"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Notifications Pagination Footer (matching screenshot 2) */}
              <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 shrink-0 flex-wrap gap-4">
                <div>已选中 {selectedNotifIds.length} 条</div>

                <div className="flex items-center gap-4 flex-wrap">
                  <div>共 {notifCounts.total} 条</div>

                  <div className="flex items-center gap-1.5">
                    <select
                      value={notifPageSize}
                      onChange={(e) => {
                        setNotifPageSize(Number(e.target.value));
                        setNotifPage(1);
                      }}
                      className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs cursor-pointer focus:outline-none focus:border-blue-500"
                    >
                      <option value={10}>10条/页</option>
                      <option value={20}>20条/页</option>
                      <option value={50}>50条/页</option>
                    </select>
                  </div>

                  {/* Page numbers */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={notifPage <= 1}
                      onClick={() => setNotifPage((p) => Math.max(1, p - 1))}
                      className="p-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    {[1, 2, 3, 4, 5, 6].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setNotifPage(p)}
                        className={`w-7 h-7 rounded text-xs font-medium cursor-pointer transition-colors ${
                          notifPage === p
                            ? 'bg-blue-600 text-white font-bold'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {p}
                      </button>
                    ))}

                    <span className="px-1 text-slate-400">...</span>

                    <button
                      type="button"
                      onClick={() => setNotifPage(17)}
                      className={`w-7 h-7 rounded text-xs font-medium cursor-pointer ${
                        notifPage === 17
                          ? 'bg-blue-600 text-white font-bold'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      17
                    </button>

                    <button
                      type="button"
                      disabled={notifPage >= 17}
                      onClick={() => setNotifPage((p) => Math.min(17, p + 1))}
                      className="p-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Jump to page */}
                  <div className="flex items-center gap-1.5">
                    <span>前往</span>
                    <input
                      type="text"
                      value={notifJumpPage}
                      onChange={(e) => setNotifJumpPage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const val = parseInt(notifJumpPage);
                          if (!isNaN(val) && val >= 1 && val <= 17) {
                            setNotifPage(val);
                          }
                        }
                      }}
                      className="w-10 px-1 py-1 text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs focus:outline-none focus:border-blue-500"
                    />
                    <span>页</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Copyright matching screenshot bottom */}
        <div className="py-3 text-center text-xs text-slate-400 dark:text-slate-600 shrink-0">
          Copyright ©2026 生产制造一体化智能管理平台
        </div>
      </div>

      {/* 3. MODAL: ECN 变更通知协同处理抽屉/弹窗 (保留完整业务逻辑) */}
      {activeECNNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-850 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      ECN 变更通知与业务协同处理
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                      {activeECNNotification.ecnNo}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      协同部门: {activeECNNotification.department}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    核对工程变更具体更改情况，提交本部门应对措施并回写至变更单
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {onNavigateToECN && (
                  <button
                    type="button"
                    onClick={() => {
                      const id = activeECNNotification.orderId;
                      setActiveECNNotification(null);
                      onNavigateToECN(id);
                    }}
                    title="在ECN变更单模块中查看完整审批流"
                    className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-blue-600 cursor-pointer flex items-center gap-1 text-xs"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span className="hidden sm:inline">ECN完整详情</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveECNNotification(null)}
                  className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* Status Alert Banner */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between flex-wrap gap-3 ${
                  activeECNNotification.status === 'READ_HANDLED'
                    ? 'bg-teal-50/70 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200'
                    : 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {activeECNNotification.status === 'READ_HANDLED' ? (
                    <CheckCircle2 className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
                  ) : (
                    <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                  )}
                  <div>
                    <h4 className="font-bold text-sm">
                      {activeECNNotification.status === 'READ_HANDLED'
                        ? `【${activeECNNotification.department}】已确认处理此变更通知`
                        : `【${activeECNNotification.department}】待完成协同处理与确认`}
                    </h4>
                    <p className="text-[11px] opacity-80 mt-0.5">
                      {activeECNNotification.status === 'READ_HANDLED'
                        ? `确认人: ${activeECNNotification.handler} | 确认时间: ${activeECNNotification.handledTime} | 数据已反写至 ECN 变更单`
                        : '请审核下方物料变更清单与受影响工单，并在底部提交本部门应对方案'}
                    </p>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    activeECNNotification.status === 'READ_HANDLED'
                      ? 'bg-teal-600 text-white'
                      : 'bg-amber-500 text-white'
                  }`}
                >
                  {activeECNNotification.status === 'READ_HANDLED' ? '已处理完成' : '待协同确认'}
                </span>
              </div>

              {/* 1. Basic ECN Info */}
              <div className="bg-slate-50 dark:bg-slate-850/60 rounded-xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-600" />
                    变更基本信息
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono">
                    需求日期: {activeECNNotification.order.demandDate}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">变更单号</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {activeECNNotification.ecnNo}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">变更类型</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {activeECNNotification.order.changeType || '设计改良'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">申请人 / 申请日期</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {activeECNNotification.order.applicant} / {activeECNNotification.order.ecnDate}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">受影响产品</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {activeECNNotification.order.bomProductName} ({activeECNNotification.order.bomProductCode})
                    </span>
                  </div>
                  <div className="col-span-2 sm:col-span-4">
                    <span className="text-slate-400 block text-[11px]">变更原因</span>
                    <p className="text-slate-700 dark:text-slate-300 font-medium">
                      {activeECNNotification.order.changeReason}
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Affected Materials List */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-blue-600" />
                    BOM物料变动清单 ({activeECNNotification.order.items?.length || 0})
                  </span>
                </h4>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      <tr>
                        <th className="p-2.5">变动类型</th>
                        <th className="p-2.5">物料编码</th>
                        <th className="p-2.5">物料名称</th>
                        <th className="p-2.5 text-center">变更前版本</th>
                        <th className="p-2.5 text-center">变更后版本</th>
                        <th className="p-2.5">工艺工序</th>
                        <th className="p-2.5">在制品/库存处理</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(activeECNNotification.order.items || []).map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                          <td className="p-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                m.operation === 'MODIFY'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : m.operation === 'ADD'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              }`}
                            >
                              {m.operation === 'MODIFY' ? '修改' : m.operation === 'ADD' ? '新增' : '删除'}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono font-medium">{m.materialCode}</td>
                          <td className="p-2.5 font-medium">{m.materialName}</td>
                          <td className="p-2.5 text-center font-mono text-slate-500">
                            {m.oldDrawingVersion || '-'}
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold text-blue-600">
                            {m.newDrawingVersion || '-'}
                          </td>
                          <td className="p-2.5">{m.processRoute || '-'}</td>
                          <td className="p-2.5 font-medium text-slate-700 dark:text-slate-300">
                            {m.dispositionMethod || '自然消耗'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. Affected Work Orders */}
              {activeECNNotification.order.workOrders && activeECNNotification.order.workOrders.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Wrench className="w-4 h-4 text-blue-600" />
                    影响生产工单协同 ({activeECNNotification.order.workOrders.length})
                  </h4>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        <tr>
                          <th className="p-2.5">工单号</th>
                          <th className="p-2.5">产品名称</th>
                          <th className="p-2.5 text-center">工单状态</th>
                          <th className="p-2.5 text-right">生产数量</th>
                          <th className="p-2.5">协同动作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {activeECNNotification.order.workOrders.map((wo) => (
                          <tr key={wo.id} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                            <td className="p-2.5 font-mono font-medium">{wo.workOrderNo}</td>
                            <td className="p-2.5">{wo.productName}</td>
                            <td className="p-2.5 text-center">
                              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800">
                                {wo.status}
                              </span>
                            </td>
                            <td className="p-2.5 text-right font-mono">{wo.plannedQty}</td>
                            <td className="p-2.5 text-blue-600 font-medium">{wo.actionRequired || '工单换图重下发'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 4. Department Confirmation Form */}
              <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-3">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    【{activeECNNotification.department}】协同应对措施与确认
                  </span>
                  {activeECNNotification.status === 'READ_HANDLED' && (
                    <span className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold">
                      ✓ 已回写变更单
                    </span>
                  )}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-500 text-[11px] mb-1">确认人姓名</label>
                    <input
                      type="text"
                      value={modalConfirmer}
                      onChange={(e) => setModalConfirmer(e.target.value)}
                      placeholder="填入您的姓名"
                      className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-slate-500 text-[11px] mb-1">
                      快速选择预设方案
                    </label>
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                      {PRESET_REMARKS.slice(0, 3).map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setModalRemarks(preset)}
                          className="px-2 py-0.5 text-[11px] rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600 cursor-pointer whitespace-nowrap"
                        >
                          模板 {idx + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 text-[11px] mb-1">
                    部门应对措施及处理说明
                  </label>
                  <textarea
                    rows={2}
                    value={modalRemarks}
                    onChange={(e) => setModalRemarks(e.target.value)}
                    placeholder="请输入本部门对本次工程变更的业务应对说明（如：模具重调、工装改造、料号切换等）"
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-850 shrink-0">
              <span className="text-[11px] text-slate-400">
                确认后将即时在ECN变更单上记录【{activeECNNotification.department}】处理结果
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveECNNotification(null)}
                  className="px-4 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded cursor-pointer"
                >
                  关闭
                </button>
                <button
                  type="button"
                  onClick={handleSubmitDepartmentConfirm}
                  className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>确认处理完成 (回写至ECN变更单)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL: General Dispatch Task Process Modal */}
      {activeDispatchTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Play className="w-4 h-4 fill-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    处理生产派工任务
                  </h3>
                  <span className="font-mono text-xs text-blue-600">
                    单号: {activeDispatchTask.orderNo}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveDispatchTask(null)}
                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">任务名称:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {activeDispatchTask.taskTitle}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">任务类型:</span>
                  <span className="text-slate-700 dark:text-slate-300">{activeDispatchTask.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">当前优先级:</span>
                  <span className="text-rose-600 font-bold">{activeDispatchTask.priority}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">停留时间:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {activeDispatchTask.duration}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">执行班组 / 负责人</label>
                <input
                  type="text"
                  defaultValue="机加一班 - 王师傅"
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">开始处理备注</label>
                <textarea
                  rows={2}
                  defaultValue="已领料，准备上机装夹调试，预计今日下午完成首件检验"
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveDispatchTask(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  showToast(`派工任务【${activeDispatchTask.orderNo}】已成功开始执行！`);
                  setActiveDispatchTask(null);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded cursor-pointer shadow-2xs"
              >
                开始执行
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL: 发起流程弹窗 */}
      {isInitiateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Send className="w-4 h-4 rotate-45" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  发起业务流程
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsInitiateModalOpen(false)}
                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  setIsInitiateModalOpen(false);
                  if (onNavigateToECN) {
                    onNavigateToECN();
                  } else {
                    showToast('已跳转至 ECN 工程变更单模块');
                  }
                }}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 flex items-center justify-between text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600">
                      发起 ECN 工程变更流程
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      创建新的工程变更单，组织跨部门技术审批与通知
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsInitiateModalOpen(false);
                  showToast('已启动生产任务派工流程');
                }}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 flex items-center justify-between text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600">
                      发起生产派工与任务分发
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      依据最新工艺和BOM向加工车间派发工单
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsInitiateModalOpen(false);
                  showToast('已启动设备维保/异常申报流程');
                }}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 flex items-center justify-between text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600">
                      设备异常上报与维保申报
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      登记现场设备故障、接触不良或常规点检保养
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
              </button>
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setIsInitiateModalOpen(false)}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
