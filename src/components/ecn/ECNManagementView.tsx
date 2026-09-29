import React, { useState } from 'react';
import {
  ECNOrder,
  ECNApprovalNode,
  BOM,
  SalesOrder,
  Material,
} from '../../types/plm';
import { ECNListView } from './ECNListView';
import { ECNDetailView } from './ECNDetailView';
import { ECNEditView } from './ECNEditView';
import {
  Ban,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  FileText,
} from 'lucide-react';

interface ECNManagementViewProps {
  ecnOrders: ECNOrder[];
  setEcnOrders: React.Dispatch<React.SetStateAction<ECNOrder[]>>;
  boms: BOM[];
  setBoms: React.Dispatch<React.SetStateAction<BOM[]>>;
  salesOrders: SalesOrder[];
  materials: Material[];
  initialOrderId?: string | null;
  initialViewMode?: 'list' | 'create' | 'edit' | 'detail';
  onDepartmentConfirm?: (orderId: string, deptName: string, confirmer: string, remarks?: string) => void;
  onNavigateToNotifications?: () => void;
}

export const ECNManagementView: React.FC<ECNManagementViewProps> = ({
  ecnOrders,
  setEcnOrders,
  boms,
  setBoms,
  salesOrders,
  materials,
  initialOrderId = null,
  initialViewMode = 'list',
  onDepartmentConfirm: externalDeptConfirm,
  onNavigateToNotifications,
}) => {
  // Navigation / View Mode State matching BOM & Materials modules
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit' | 'detail'>(() => {
    return initialOrderId ? 'detail' : initialViewMode;
  });
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(() => initialOrderId);

  // Sync if initialOrderId prop changes externally
  React.useEffect(() => {
    if (initialOrderId) {
      setSelectedOrderId(initialOrderId);
      setViewMode('detail');
    }
  }, [initialOrderId]);

  // Invalidate dialog state for list view quick action
  const [orderToInvalidate, setOrderToInvalidate] = useState<ECNOrder | null>(null);
  const [invalidateReason, setInvalidateReason] = useState('');

  // Toast / notification feedback
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const openCreate = () => {
    setSelectedOrderId(null);
    setViewMode('create');
  };

  const openEdit = (order: ECNOrder) => {
    setSelectedOrderId(order.id);
    setViewMode('edit');
  };

  const openDetail = (order: ECNOrder) => {
    setSelectedOrderId(order.id);
    setViewMode('detail');
  };

  const backToList = () => {
    setViewMode('list');
    setSelectedOrderId(null);
  };

  const currentOrder = ecnOrders.find((o) => o.id === selectedOrderId) || null;

  // Helper: Apply ECN material changes to Target BOM (In-place update without changing BOM version - BR04, BR05)
  const applyECNChangesToBOM = (order: ECNOrder) => {
    setBoms((prevBoms) =>
      prevBoms.map((b) => {
        if (b.id !== order.bomId) return b;

        let updatedItems = [...b.items];

        order.items.forEach((item) => {
          if (item.operation === 'ADD') {
            updatedItems.push({
              id: `BOM-ITEM-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              materialCode: item.materialCode,
              materialName: item.materialName,
              materialSpec: item.afterValues?.materialSpec || item.materialSpec,
              drawingNo: item.afterValues?.drawingNo || item.drawingNo || '',
              quantity: item.afterQty,
              unit: item.unit,
              businessAttr: item.afterValues?.businessAttr || '自制',
              isKeyPart: false,
              isECNModified: true,
              ecnNo: order.ecnNo,
            });
          } else if (item.operation === 'MODIFY') {
            updatedItems = updatedItems.map((bi) => {
              if (bi.id === item.sourceItemId || bi.materialCode === item.materialCode) {
                return {
                  ...bi,
                  materialName: item.afterValues?.materialName || item.materialName,
                  materialSpec: item.afterValues?.materialSpec || item.materialSpec,
                  drawingNo: item.afterValues?.drawingNo !== undefined ? item.afterValues.drawingNo : bi.drawingNo,
                  quantity: item.afterQty,
                  unit: item.unit,
                  isECNModified: true,
                  ecnNo: order.ecnNo,
                };
              }
              return bi;
            });
          } else if (item.operation === 'DELETE') {
            updatedItems = updatedItems.filter(
              (bi) => bi.id !== item.sourceItemId && bi.materialCode !== item.materialCode
            );
          }
        });

        return {
          ...b,
          items: updatedItems,
          updatedAt: new Date().toLocaleString(),
          notes: `${b.notes ? b.notes + ' | ' : ''}已执行ECN变更 [${order.ecnNo}]`,
        };
      })
    );
  };

  // 1. Save Draft
  const handleSaveDraft = (order: ECNOrder) => {
    setEcnOrders((prev) => {
      const exists = prev.some((o) => o.id === order.id);
      if (exists) {
        return prev.map((o) => (o.id === order.id ? order : o));
      }
      return [order, ...prev];
    });
    backToList();
    showToast(`变更单 ${order.ecnNo} 已成功保存为草稿`);
  };

  // 2. Submit Approval
  const handleSubmitApproval = (order: ECNOrder) => {
    const updatedOrder: ECNOrder = {
      ...order,
      docStatus: 'PENDING_REVIEW',
      updatedAt: new Date().toLocaleString(),
      logs: [
        ...order.logs,
        {
          id: `LOG-${Date.now()}`,
          timestamp: new Date().toLocaleString(),
          operator: order.applicant,
          action: '提交审批',
          details: '单据进入多级工程评审流程',
        },
      ],
    };

    setEcnOrders((prev) => {
      const exists = prev.some((o) => o.id === updatedOrder.id);
      if (exists) {
        return prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o));
      }
      return [updatedOrder, ...prev];
    });
    backToList();
    showToast(`变更单 ${order.ecnNo} 已提交审批，进入工程主管评审流程`);
  };

  // 3. Approve Step
  const handleApprove = (orderId: string, comment: string) => {
    let wasFullyApproved = false;
    let isAutoMode = true;

    setEcnOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;

        let isFullyApproved = false;
        const currentFlow =
          order.approvalFlow && order.approvalFlow.length > 0
            ? order.approvalFlow
            : order.approvalHistory || [];
        let nextHistory = [...currentFlow];

        const pendingIdx = nextHistory.findIndex((n) => n.status === 'PENDING');
        if (pendingIdx !== -1) {
          nextHistory[pendingIdx] = {
            ...nextHistory[pendingIdx],
            status: 'APPROVED',
            comment,
            timestamp: new Date().toLocaleString(),
          };

          if (pendingIdx + 1 < nextHistory.length) {
            nextHistory[pendingIdx + 1] = {
              ...nextHistory[pendingIdx + 1],
              status: 'PENDING',
            };
          } else {
            isFullyApproved = true;
          }
        } else {
          isFullyApproved = true;
        }

        wasFullyApproved = isFullyApproved;
        const isAuto = !order.notifyMode || order.notifyMode === 'AUTO';
        isAutoMode = isAuto;

        let nextDocStatus: ECNOrder['docStatus'] = isFullyApproved ? 'APPROVED' : 'PENDING_REVIEW';
        let nextNotifyStatus = order.notifyStatus;
        let nextExecutionStatus = order.executionStatus;

        if (isFullyApproved) {
          if (isAuto) {
            nextNotifyStatus = 'NOTIFIED';
            nextExecutionStatus = 'EFFECTIVE';
            applyECNChangesToBOM(order);
          } else {
            // 手动发送通知模式：审批后单据状态为已审批，通知状态仍为待通知 (UNNOTIFIED)
            nextNotifyStatus = 'UNNOTIFIED';
            nextExecutionStatus = 'NOT_EXECUTED';
          }
        }

        const updated: ECNOrder = {
          ...order,
          docStatus: nextDocStatus,
          notifyStatus: nextNotifyStatus,
          executionStatus: nextExecutionStatus,
          approvalFlow: nextHistory,
          approvalHistory: nextHistory,
          updatedAt: new Date().toLocaleString(),
          logs: [
            ...order.logs,
            {
              id: `LOG-${Date.now()}`,
              timestamp: new Date().toLocaleString(),
              operator: pendingIdx !== -1 ? nextHistory[pendingIdx].approver : '审核人',
              action: isFullyApproved ? '工程终审通过' : '工程一级评审通过',
              details: `审批意见: ${comment || '同意'}${
                isFullyApproved
                  ? isAuto
                    ? '（已按默认自动模式下发部门通知，通知状态已变更为已发送，BOM结构已就地生效）'
                    : '（当前配置为手动通知模式，单据状态变更为已审批，通知状态为待通知，需手动在操作栏点击【通知】）'
                  : ''
              }`,
            },
          ],
        };

        return updated;
      })
    );

    if (wasFullyApproved) {
      if (isAutoMode) {
        showToast('审批通过！单据状态变更为【已审批】，通知状态已转变为【已发送】');
      } else {
        showToast('审批通过！单据状态变更为【已审批】，通知状态为【待通知】，请在操作栏点击【通知】发送');
      }
    } else {
      showToast('审批操作成功！已流转至下一审批节点');
    }
  };

  // 4. Reject Step
  const handleReject = (orderId: string, comment: string) => {
    setEcnOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;

        const currentFlow =
          order.approvalFlow && order.approvalFlow.length > 0
            ? order.approvalFlow
            : order.approvalHistory || [];

        const nextHistory = currentFlow.map((n) =>
          n.status === 'PENDING'
            ? { ...n, status: 'REJECTED' as const, comment, timestamp: new Date().toLocaleString() }
            : n
        );

        return {
          ...order,
          docStatus: 'DRAFT',
          approvalFlow: nextHistory,
          approvalHistory: nextHistory,
          updatedAt: new Date().toLocaleString(),
          logs: [
            ...order.logs,
            {
              id: `LOG-${Date.now()}`,
              timestamp: new Date().toLocaleString(),
              operator: '审核人',
              action: '审批驳回',
              details: `驳回意见: ${comment || '不予通过，退回重新修改'}（单据已回退至草稿状态）`,
            },
          ],
        };
      })
    );
    showToast('变更单已驳回并退回至草稿状态，可重新编辑', 'info');
  };

  // 5. Reverse Approval (BR14)
  const handleReverseApproval = (orderId: string) => {
    setEcnOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;

        const currentFlow =
          order.approvalFlow && order.approvalFlow.length > 0
            ? order.approvalFlow
            : order.approvalHistory || [];

        const resetFlow = currentFlow.map((n, idx) => ({
          ...n,
          status: (idx === 0 ? 'PENDING' : 'SKIPPED') as ECNApprovalNode['status'],
          comment: '',
          timestamp: undefined,
        }));

        return {
          ...order,
          docStatus: 'DRAFT',
          notifyStatus: 'UNNOTIFIED',
          executionStatus: 'PENDING',
          warehouseStatus: 'UNCONFIRMED',
          warehouseConfirmer: undefined,
          warehouseConfirmTime: undefined,
          approvalFlow: resetFlow,
          approvalHistory: resetFlow,
          updatedAt: new Date().toLocaleString(),
          logs: [
            ...order.logs,
            {
              id: `LOG-${Date.now()}`,
              timestamp: new Date().toLocaleString(),
              operator: order.applicant || '工程管理员',
              action: '反审批',
              details: '执行反审批操作，变更单状态已回退至草稿，可重新修改编辑并重新提交审批',
            },
          ],
        };
      })
    );
    showToast('反审批成功！单据已回退至草稿状态，可重新编辑', 'info');
  };

  // 6. Send Notification (BR11, BR12)
  const handleSendNotification = (orderId: string) => {
    let affectedOrder: ECNOrder | null = null;
    setEcnOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;
        affectedOrder = order;

        return {
          ...order,
          notifyStatus: 'NOTIFIED',
          executionStatus: 'EFFECTIVE',
          updatedAt: new Date().toLocaleString(),
          logs: [
            ...order.logs,
            {
              id: `LOG-${Date.now()}`,
              timestamp: new Date().toLocaleString(),
              operator: '工程部',
              action: '发送部门通知',
              details: `向 ${order.notifyDepts.join('、')} 发送变更通知；通知状态已转变为已发送，BOM物料结构就地生效`,
            },
          ],
        };
      })
    );

    if (affectedOrder) {
      applyECNChangesToBOM(affectedOrder);
    }
    showToast('通知已发送！通知状态已转变为【已发送】');
  };

  // 7. Department Confirmation (动态支持通知配置中的任意部门确认，记录确认人、确认部门、确认时间及备注)
  const handleDepartmentConfirm = (orderId: string, deptName: string, confirmer: string, remarks?: string) => {
    if (externalDeptConfirm) {
      externalDeptConfirm(orderId, deptName, confirmer, remarks);
      showToast(`【${deptName}】确认情况登记成功，已更新变更单！`);
      return;
    }

    const timeNow = new Date().toLocaleString();
    let allConfirmed = false;

    setEcnOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;

        const currentConfirms = order.departmentConfirmations || order.notifyDepts.map(d => ({ dept: d, status: 'UNCONFIRMED' as const }));
        
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

        // Check if all notifyDepts are confirmed
        const confirmedDepts = updatedConfirms.filter(c => c.status === 'CONFIRMED').map(c => c.dept);
        allConfirmed = order.notifyDepts.length > 0 && order.notifyDepts.every(d => confirmedDepts.includes(d));

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
              action: '部门接收确认',
              details: `【${deptName}】已完成工程变更通知接收确认情况登记。确认人: ${confirmer}，说明: ${remarks || '无'}`,
            },
          ],
        };
      })
    );

    if (allConfirmed) {
      showToast(`【${deptName}】确认成功！所有通知配置部门已全部完成接收确认。`, 'success');
    } else {
      showToast(`【${deptName}】部门确认情况已提交成功（确认人: ${confirmer}）`, 'success');
    }
  };

  // 兼容原有 handleWarehouseConfirm
  const handleWarehouseConfirm = (orderId: string) => {
    handleDepartmentConfirm(orderId, '仓库', '总装仓库主管', '仓库已确认工程变更通知，库位与备料计划已调整');
  };

  // 8. Invalidate (BR16)
  const handleInvalidate = (orderId: string, reason: string) => {
    setEcnOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;
        return {
          ...order,
          docStatus: 'OBSOLETE',
          executionStatus: 'CANCELLED',
          updatedAt: new Date().toLocaleString(),
          logs: [
            ...order.logs,
            {
              id: `LOG-${Date.now()}`,
              timestamp: new Date().toLocaleString(),
              operator: '工程管理员',
              action: '作废变更单',
              details: `作废原因: ${reason}（已释放 BOM 在途唯一名额）`,
            },
          ],
        };
      })
    );
    setOrderToInvalidate(null);
    setInvalidateReason('');
    showToast('变更单已作废，BOM 未生效名额已释放', 'info');
  };

  // 9. Delete Draft
  const handleDeleteDraft = (orderId: string) => {
    if (!confirm('确定要删除该草稿变更单吗？删除后将彻底释放 BOM 名额。')) return;
    setEcnOrders((prev) => prev.filter((o) => o.id !== orderId));
    if (selectedOrderId === orderId) {
      backToList();
    }
    showToast('草稿变更单已删除', 'info');
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f7fc] dark:bg-slate-950 p-3 sm:p-4 gap-3 overflow-hidden font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-80 animate-slideDown">
          <div
            className={`px-4 py-3 rounded-xl shadow-xl border flex items-center gap-3 text-xs font-semibold backdrop-blur-md ${
              toastMessage.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-400'
                : toastMessage.type === 'error'
                ? 'bg-rose-600 text-white border-rose-400'
                : 'bg-slate-800 text-white border-slate-700'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* 顶部面包屑与页头卡片 (与物料档案、图号管理、BOM管理完全对齐) */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-4 py-2 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-xs shrink-0">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 dark:text-slate-500">图号管控</span>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <button
            type="button"
            onClick={backToList}
            className={`cursor-pointer ${
              viewMode === 'list'
                ? 'font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5'
                : 'text-slate-600 dark:text-slate-400 hover:text-blue-600 flex items-center gap-1.5'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            ECN变更单
          </button>
          {viewMode === 'create' && (
            <>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                新建变更单 (草稿)
              </span>
            </>
          )}
          {viewMode === 'edit' && currentOrder && (
            <>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                编辑: {currentOrder.ecnNo}
              </span>
            </>
          )}
          {viewMode === 'detail' && currentOrder && (
            <>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                {currentOrder.ecnNo} ({currentOrder.bomProductName})
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {viewMode === 'list' ? (
            <>
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md text-xs">
                <span className="px-2.5 py-1 rounded bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-medium shadow-xs">
                  变更单列表
                </span>
              </div>
              <span className="text-xs text-slate-400 border-l border-slate-200 dark:border-slate-700 pl-2 ml-1">
                共 {ecnOrders.length} 份变更单据
              </span>
            </>
          ) : (
            <button
              type="button"
              onClick={backToList}
              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 cursor-pointer font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              返回变更单列表
            </button>
          )}
        </div>
      </div>

      {/* 主体内容区域 */}
      <div className="flex-1 flex gap-3 min-h-0 overflow-hidden">
        {viewMode === 'list' && (
          <ECNListView
            orders={ecnOrders}
            onOpenCreate={openCreate}
            onViewDetail={(order) => openDetail(order)}
            onEdit={(order) => openEdit(order)}
            onDeleteDraft={handleDeleteDraft}
            onSubmitApproval={handleSubmitApproval}
            onApprove={(orderId, comment) => handleApprove(orderId, comment || '原型测试：快速通过工程评审')}
            onSendNotification={handleSendNotification}
            onReverseApproval={handleReverseApproval}
            onWarehouseConfirm={handleWarehouseConfirm}
            onDepartmentConfirm={handleDepartmentConfirm}
            onInvalidatePrompt={(order) => {
              setOrderToInvalidate(order);
              setInvalidateReason('');
            }}
            onNavigateToNotifications={onNavigateToNotifications}
          />
        )}

        {viewMode === 'create' && (
          <ECNEditView
            boms={boms}
            salesOrders={salesOrders}
            materials={materials}
            existingECNOrders={ecnOrders}
            onBack={backToList}
            onSaveDraft={handleSaveDraft}
            onSubmitApproval={handleSubmitApproval}
          />
        )}

        {viewMode === 'edit' && currentOrder && (
          <ECNEditView
            initialOrder={currentOrder}
            boms={boms}
            salesOrders={salesOrders}
            materials={materials}
            existingECNOrders={ecnOrders}
            onBack={backToList}
            onSaveDraft={handleSaveDraft}
            onSubmitApproval={handleSubmitApproval}
          />
        )}

        {viewMode === 'detail' && currentOrder && (
          <ECNDetailView
            order={currentOrder}
            onBack={backToList}
            onApprove={handleApprove}
            onReject={handleReject}
            onReverseApproval={handleReverseApproval}
            onSendNotification={handleSendNotification}
            onWarehouseConfirm={handleWarehouseConfirm}
            onDepartmentConfirm={handleDepartmentConfirm}
            onInvalidate={handleInvalidate}
          />
        )}
      </div>

      {/* 作废确认弹窗 */}
      {orderToInvalidate && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-scaleIn">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2 text-rose-600">
              <Ban className="w-5 h-5" />
              作废工程变更单 ({orderToInvalidate.ecnNo})
            </h3>
            <p className="text-xs text-slate-500">
              作废后将释放当前 BOM ({orderToInvalidate.bomCode}) 的未生效在途名额，允许重新发起其他变更单。
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                作废原因 <span className="text-rose-500">*</span>:
              </label>
              <textarea
                value={invalidateReason}
                onChange={(e) => setInvalidateReason(e.target.value)}
                placeholder="请详细说明作废业务原因..."
                rows={3}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setOrderToInvalidate(null);
                  setInvalidateReason('');
                }}
                className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                disabled={!invalidateReason.trim()}
                onClick={() => handleInvalidate(orderToInvalidate.id, invalidateReason)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 rounded-lg cursor-pointer"
              >
                确认作废
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

