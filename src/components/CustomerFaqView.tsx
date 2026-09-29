import React, { useState } from 'react';
import { PendingQuestionItem } from '../types/plm';
import { copyToClipboard } from '../utils/plmHelpers';
import {
  MessageSquareText,
  Copy,
  Check,
  HelpCircle,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Edit3,
} from 'lucide-react';

interface CustomerFaqViewProps {
  pendingQuestions: PendingQuestionItem[];
  onUpdateQuestion: (id: string, newStatus: PendingQuestionItem['currentStatus'], notes?: string) => void;
}

export const CustomerFaqView: React.FC<CustomerFaqViewProps> = ({
  pendingQuestions,
  onUpdateQuestion,
}) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [activeQuestionTab, setActiveQuestionTab] = useState<'ALL' | 'CONFIRMED' | 'PENDING'>('ALL');

  const handleCopy = (text: string, sectionId: string) => {
    copyToClipboard(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const shortReplyText = `我们建议先按轻量 PLM 方式实现图纸管理。流程上先导入物料主数据，再批量导入图纸文件；图纸文件通过物料名称和规格型号识别归属物料，系统自动在对应图号下创建草稿版本。草稿版本经提交审核后发布，发布后不可删除，只能作废，并保留历史记录。

在业务使用上，BOM 选择物料时需要选择该物料的图号版本，图号建档时选择销售订单、产品、BOM版本后，系统带出物料清单和对应图号版本，用户勾选后生成建档记录。

唯一性方面，系统不会只依赖文件名，而是通过物料ID唯一、图号唯一、图号+版本唯一、文件hash去重、已发布版本不可覆盖、业务引用只允许已发布且启用版本等规则共同保证。`;

  const filteredQuestions = pendingQuestions.filter(q => {
    if (activeQuestionTab === 'ALL') return true;
    return q.currentStatus === activeQuestionTab;
  });

  return (
    <div className="space-y-6">
      {/* Top Section 7: Recommended Short Reply Box */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-xl p-6 shadow-md border border-blue-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/30 flex items-center justify-center border border-blue-400/40">
              <MessageSquareText className="w-4 h-4 text-blue-200" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200 bg-blue-800/80 px-2 py-0.5 rounded">
                规范 第 7 节
              </span>
              <h3 className="text-base font-bold text-white mt-0.5">推荐给客户的简短官方回复</h3>
            </div>
          </div>

          <button
            onClick={() => handleCopy(shortReplyText, 'short-reply')}
            className="px-4 py-2 text-xs font-bold bg-white hover:bg-slate-100 text-blue-900 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer shrink-0"
          >
            {copiedSection === 'short-reply' ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">已复制标准回复文本！</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>一键复制简短回复</span>
              </>
            )}
          </button>
        </div>

        <div className="bg-slate-950/60 p-4 rounded-xl border border-blue-500/30 text-xs text-blue-100 leading-relaxed font-sans whitespace-pre-line select-all">
          {shortReplyText}
        </div>
      </div>

      {/* Section 1: Customer Questions Matrix */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-500" />
            客户三大核心问题标准答复表 (规范第 1 节)
          </h3>
          <span className="text-[11px] text-slate-400">标准结论对照</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700 uppercase">
              <tr>
                <th className="py-3 px-4 w-1/4">客户问题</th>
                <th className="py-3 px-4 w-1/3">回答方向</th>
                <th className="py-3 px-4">本方案结论</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                  图纸从哪里开始进入系统，整体流程怎么走？
                </td>
                <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                  先导入物料，再批量导入图纸，系统自动创建图号版本草稿。
                </td>
                <td className="py-3.5 px-4 font-medium text-blue-600 dark:text-blue-400">
                  以“物料主数据 ➔ 图纸导入 ➔ 草稿版本 ➔ 审核发布 ➔ BOM / 图号建档引用”为主流程。
                </td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                  图号版本如何升级、审核和作废？
                </td>
                <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                  图号下维护多个版本，版本状态流转，启用开关控制是否可被选择。
                </td>
                <td className="py-3.5 px-4 font-medium text-emerald-600 dark:text-emerald-400">
                  状态为“草稿、待审核、已发布、作废”，启用/停用只是开关，不是状态。
                </td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                  如何确保图纸和版本唯一性？
                </td>
                <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                  文件名只用于识别归属，系统内部用物料ID、图号、版本、文件哈希等多层校验。
                </td>
                <td className="py-3.5 px-4 font-medium text-indigo-600 dark:text-indigo-400">
                  通过“物料ID唯一、图号唯一、图号+版本唯一、文件hash去重、发布后不可覆盖、引用只取已发布启用版本”保证。
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 8: Pending Questions Tracker (Q1~Q6) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-500" />
              待确认问题协作跟踪器 (规范第 8 节 Q1~Q6)
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              记录跨部门共识、建议确认人及落地规则
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveQuestionTab('ALL')}
              className={`px-2.5 py-1 text-xs rounded-lg transition-colors cursor-pointer ${
                activeQuestionTab === 'ALL' ? 'bg-blue-600 text-white font-medium' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              全部 ({pendingQuestions.length})
            </button>
            <button
              onClick={() => setActiveQuestionTab('CONFIRMED')}
              className={`px-2.5 py-1 text-xs rounded-lg transition-colors cursor-pointer ${
                activeQuestionTab === 'CONFIRMED' ? 'bg-emerald-600 text-white font-medium' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              已达成共识 ({pendingQuestions.filter(q => q.currentStatus === 'CONFIRMED').length})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredQuestions.map(item => (
            <div
              key={item.id}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 space-y-2.5 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
                  {item.code}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">建议确认: <strong>{item.suggestedRole}</strong></span>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {item.currentStatus === 'CONFIRMED' ? '已确认方案' : '讨论中'}
                  </span>
                </div>
              </div>

              <div className="font-bold text-slate-900 dark:text-white">
                {item.question}
              </div>

              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold block mb-0.5">
                  ● 系统当前共识设计：
                </span>
                {item.consensusValue}
              </div>

              {item.notes && (
                <div className="text-[10px] text-slate-400 italic">
                  备注: {item.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
