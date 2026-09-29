import React, { useState } from 'react';
import { SalesOrder, BOM, DrawingMaster, DrawingArchiveSnapshot, DrawingArchiveItem } from '../types/plm';
import {
  Archive,
  CheckCircle2,
  ShieldCheck,
  Lock,
  FileCheck,
  Calendar,
  Layers,
  ArrowRight,
  Sparkles,
  Search,
  Eye,
  Hash,
} from 'lucide-react';

interface DrawingArchivingViewProps {
  salesOrders: SalesOrder[];
  boms: BOM[];
  drawingMasters: DrawingMaster[];
  archives: DrawingArchiveSnapshot[];
  onCreateArchiveSnapshot: (snapshot: Omit<DrawingArchiveSnapshot, 'id' | 'archivedAt' | 'sealHash' | 'status'>) => void;
}

export const DrawingArchivingView: React.FC<DrawingArchivingViewProps> = ({
  salesOrders,
  boms,
  drawingMasters,
  archives,
  onCreateArchiveSnapshot,
}) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string>(salesOrders[0]?.id || '');
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  const [archiveNotes, setArchiveNotes] = useState('');
  const [activeSnapshotDetail, setActiveSnapshotDetail] = useState<DrawingArchiveSnapshot | null>(null);

  const currentOrder = salesOrders.find(o => o.id === selectedOrderId) || salesOrders[0];
  const currentBOM = boms.find(b => b.id === currentOrder?.bomId) || boms[0];

  // 默认全部勾选 BOM 物料
  React.useEffect(() => {
    if (currentBOM) {
      const initialMap: Record<string, boolean> = {};
      currentBOM.items.forEach(item => {
        initialMap[item.id] = true;
      });
      setSelectedItems(initialMap);
    }
  }, [currentBOM?.id]);

  const handleToggleSelect = (itemId: string) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleGenerateArchive = () => {
    if (!currentOrder || !currentBOM) return;

    const itemsToArchive: DrawingArchiveItem[] = currentBOM.items
      .filter(item => selectedItems[item.id])
      .map(item => {
        const master = drawingMasters.find(d => d.drawingNo === item.drawingNo);
        const ver = master?.versions.find(v => v.id === item.drawingVersionId);
        const fileTypes = ver ? Array.from(new Set(ver.files.map(f => f.fileType))) : [];

        return {
          id: `AI-${Date.now()}-${item.id}`,
          materialId: item.materialId,
          materialCode: item.materialCode,
          materialName: item.materialName,
          materialSpec: item.materialSpec,
          drawingNo: item.drawingNo || 'N/A',
          drawingVersionId: item.drawingVersionId || 'N/A',
          versionNo: item.versionNo || 'V1',
          fileTypes,
          selectedForArchive: true,
        };
      });

    if (itemsToArchive.length === 0) {
      alert('请至少勾选一项物料图号版本进行建档！');
      return;
    }

    const archiveNo = `ARC-${currentOrder.orderNo.replace('SO-', '')}-${Date.now().toString().slice(-4)}`;

    onCreateArchiveSnapshot({
      archiveNo,
      orderNo: currentOrder.orderNo,
      customerName: currentOrder.customerName,
      productCode: currentOrder.productCode,
      productName: currentOrder.productName,
      bomCode: currentBOM.bomCode,
      bomVersion: currentBOM.versionNo,
      archivedBy: '文控管理员 (当前登录)',
      notes: archiveNotes.trim() || `生产投产图纸基线归档 (${currentOrder.orderNo})`,
      snapshotItems: itemsToArchive,
    });

    setArchiveNotes('');
    alert(`【图号建档成功】快照凭证编号: ${archiveNo}\n已锁定 ${itemsToArchive.length} 项图纸引用，生成不可篡改数字指纹！`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Guidance */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-bold rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200">
                规范 5.2 流程
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">销售订单 / 产品图号建档快照</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-4xl">
              规范定义：<strong className="text-slate-800 dark:text-slate-200">图号建档是销售订单 / 产品 / BOM 维度的图纸引用快照，不是重新创建图号版本</strong>。
              系统自动从 BOM 级联带出图号版本，保证生产基线与工程设计一致性，杜绝版本脱节。
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700 px-3 py-1.5 rounded-lg font-semibold shrink-0">
            <Lock className="w-4 h-4 text-emerald-500" />
            <span>防篡改快照机制</span>
          </div>
        </div>
      </div>

      {/* Main Archiving Generator Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Step 1~5 Form Controls (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4 text-xs">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              创建新图号建档快照
            </h3>

            {/* Step 1: Select Sales Order */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                步骤 1: 选择销售订单 (Sales Order)
              </label>
              <select
                value={selectedOrderId}
                onChange={e => setSelectedOrderId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
              >
                {salesOrders.map(so => (
                  <option key={so.id} value={so.id}>
                    {so.orderNo} - {so.customerName} ({so.productName})
                  </option>
                ))}
              </select>
            </div>

            {/* Auto Cascade Details: Step 2 & 3 */}
            {currentOrder && currentBOM && (
              <div className="space-y-2 bg-slate-50 dark:bg-slate-850 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  步骤 2 & 3: 自动级联产品与 BOM 信息
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block">客户名称</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                      {currentOrder.customerName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">订单数量 / 交期</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      {currentOrder.orderQuantity} 台 · {currentOrder.deliveryDate}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">投产产品</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {currentOrder.productName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">关联 BOM 版本</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      {currentBOM.bomCode} ({currentBOM.versionNo})
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                建档备注 / 生产批次说明
              </label>
              <textarea
                rows={2}
                placeholder="例如: 2026年9月批次量产试制图纸快照锁定..."
                value={archiveNotes}
                onChange={e => setArchiveNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <button
              onClick={handleGenerateArchive}
              className="w-full py-2.5 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>生成不可篡改图号建档快照 ({Object.values(selectedItems).filter(Boolean).length} 项)</span>
            </button>
          </div>
        </div>

        {/* Step 4~6: Cascade Items Check List (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  步骤 4~6: BOM 自动带出物料清单与图号版本
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  勾选确认需要归档至生产快照的图纸项
                </p>
              </div>

              <button
                onClick={() => {
                  const allSelected = currentBOM.items.every(i => selectedItems[i.id]);
                  const newMap: Record<string, boolean> = {};
                  currentBOM.items.forEach(i => {
                    newMap[i.id] = !allSelected;
                  });
                  setSelectedItems(newMap);
                }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                全选 / 全不选
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {currentBOM?.items.map(item => {
                const master = drawingMasters.find(d => d.drawingNo === item.drawingNo);
                const ver = master?.versions.find(v => v.id === item.drawingVersionId);
                const isChecked = !!selectedItems[item.id];

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 flex items-center justify-between gap-3 text-xs transition-colors ${
                      isChecked
                        ? 'bg-blue-50/40 dark:bg-blue-950/20'
                        : 'bg-white dark:bg-slate-900 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleSelect(item.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                      />
                      <div className="truncate">
                        <div className="font-semibold text-slate-900 dark:text-white truncate">
                          {item.materialName} <span className="font-mono text-slate-400">[{item.materialSpec}]</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          物料编码: {item.materialCode} · 数量: {item.quantity} {item.unit}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        {item.drawingNo}
                      </div>
                      <div className="flex items-center gap-1.5 justify-end mt-0.5">
                        <span className="px-1.5 py-0.2 text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded font-mono">
                          {item.versionNo}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          ({ver?.files.length || 0} 份图纸文件)
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Historical Archiving Snapshots List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Archive className="w-4 h-4 text-emerald-500" />
            已生成图号建档快照归档库 ({archives.length})
          </h3>
          <span className="text-[11px] text-slate-400">
            只读快照 · 不可覆盖
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {archives.map(arch => (
            <div
              key={arch.id}
              onClick={() => setActiveSnapshotDetail(arch)}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850 hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer text-xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  {arch.archiveNo}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  <Lock className="w-3 h-3" /> 已锁定归档
                </span>
              </div>

              <div className="text-slate-800 dark:text-slate-200 font-semibold">
                {arch.customerName} - {arch.productName}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <span>订单号: </span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{arch.orderNo}</span>
                </div>
                <div>
                  <span>关联BOM: </span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{arch.bomCode} ({arch.bomVersion})</span>
                </div>
                <div>
                  <span>建档条目: </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{arch.snapshotItems.length} 个物料图纸</span>
                </div>
                <div>
                  <span>建档时间: </span>
                  <span>{arch.archivedAt}</span>
                </div>
              </div>

              <div className="text-[10px] font-mono text-slate-400 truncate flex items-center gap-1">
                <Hash className="w-3 h-3 text-slate-400" />
                <span>防篡改指纹: {arch.sealHash}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Snapshot Detail Modal */}
      {activeSnapshotDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-fadeIn space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-500" />
                  图号建档快照详情 ({activeSnapshotDetail.archiveNo})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  归档人: {activeSnapshotDetail.archivedBy} · 归档时间: {activeSnapshotDetail.archivedAt}
                </p>
              </div>
              <button
                onClick={() => setActiveSnapshotDetail(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
              >
                关闭
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs space-y-1">
              <div><strong>客户:</strong> {activeSnapshotDetail.customerName} · <strong>产品:</strong> {activeSnapshotDetail.productName}</div>
              <div><strong>销售订单:</strong> {activeSnapshotDetail.orderNo} · <strong>基线 BOM:</strong> {activeSnapshotDetail.bomCode} ({activeSnapshotDetail.bomVersion})</div>
              <div><strong>备注:</strong> {activeSnapshotDetail.notes || '无'}</div>
              <div className="font-mono text-[10px] text-slate-400 truncate"><strong>数字防伪指纹:</strong> {activeSnapshotDetail.sealHash}</div>
            </div>

            <div className="overflow-x-auto max-h-72 border border-slate-200 dark:border-slate-800 rounded-lg">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold uppercase">
                  <tr>
                    <th className="py-2.5 px-3">物料名称</th>
                    <th className="py-2.5 px-3">规格</th>
                    <th className="py-2.5 px-3">锁定图号</th>
                    <th className="py-2.5 px-3">锁定版本</th>
                    <th className="py-2.5 px-3">收纳格式</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {activeSnapshotDetail.snapshotItems.map(item => (
                    <tr key={item.id}>
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">{item.materialName}</td>
                      <td className="py-2.5 px-3 font-mono">{item.materialSpec}</td>
                      <td className="py-2.5 px-3 font-mono text-blue-600 dark:text-blue-400">{item.drawingNo}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">{item.versionNo}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1">
                          {item.fileTypes.map(t => (
                            <span key={t} className="px-1.5 py-0.2 text-[10px] rounded bg-slate-200 dark:bg-slate-700 font-mono">
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
