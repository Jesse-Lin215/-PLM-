import React, { useState } from 'react';
import { copyToClipboard } from '../utils/plmHelpers';
import { MessageSquareText, X, Copy, Check, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface CustomerReplyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomerReplyModal: React.FC<CustomerReplyModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const replyContent = `我们建议先按轻量 PLM 方式实现图纸管理。流程上先导入物料主数据，再批量导入图纸文件；图纸文件通过物料名称和规格型号识别归属物料，系统自动在对应图号下创建草稿版本。草稿版本经提交审核后发布，发布后不可删除，只能作废，并保留历史记录。

在业务使用上，BOM 选择物料时需要选择该物料的图号版本，图号建档时选择销售订单、产品、BOM版本后，系统带出物料清单和对应图号版本，用户勾选后生成建档记录。

唯一性方面，系统不会只依赖文件名，而是通过物料ID唯一、图号唯一、图号+版本唯一、文件hash去重、已发布版本不可覆盖、业务引用只允许已发布且启用版本等规则共同保证。`;

  const handleCopy = () => {
    copyToClipboard(replyContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-fadeIn space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <MessageSquareText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              推荐给客户的简短回复 (规范第 7 节)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-1 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          该回复整合了物料主数据导入、批量图纸解析草稿、版本审核发布、BOM与图号建档引用及6重唯一性保障，可直接用于客户技术交流。
        </p>

        <div className="bg-slate-900 p-4 rounded-xl text-xs text-slate-100 font-sans leading-relaxed whitespace-pre-line border border-slate-700 select-all max-h-80 overflow-y-auto">
          {replyContent}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>符合 PLM ISO/IEC 数字化工程规范</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              关闭
            </button>
            <button
              onClick={handleCopy}
              className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>已复制至剪贴板</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>一键复制全文</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
