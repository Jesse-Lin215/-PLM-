import React, { useState } from 'react';
import { AuditLog } from '../types/plm';
import {
  ShieldCheck,
  CheckCircle2,
  AlertOctagon,
  Lock,
  Layers,
  Fingerprint,
  FileCheck2,
  Search,
  Filter,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';

interface UniquenessAuditViewProps {
  auditLogs: AuditLog[];
}

export const UniquenessAuditView: React.FC<UniquenessAuditViewProps> = ({ auditLogs }) => {
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = auditLogs.filter(log => {
    const matchesLevel = filterLevel === 'ALL' || log.level === filterLevel;
    const matchesSearch =
      log.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.targetEntity.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  const safeguardCards = [
    {
      level: '1. 物料层 (Material)',
      rule: 'material_id 内部唯一',
      purpose: '保证系统内部物料身份绝对稳定，不因名称改动而错乱',
      icon: Layers,
      color: 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20',
      status: '实时强校验',
    },
    {
      level: '2. 图号层 (Drawing Master)',
      rule: 'drawing_no 全局唯一',
      purpose: '保证图号主档不重复，严格 1:1 锚定对应物料主数据',
      icon: FileCheck2,
      color: 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20',
      status: '实时强校验',
    },
    {
      level: '3. 版本层 (Drawing Version)',
      rule: 'drawing_no + version_no 联合唯一',
      purpose: '保证同一图号下不会重复创建同一版本号，版本树清晰严谨',
      icon: Fingerprint,
      color: 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20',
      status: '实时强校验',
    },
    {
      level: '4. 文件层 (File Assets)',
      rule: 'version_id + file_type + SHA256 去重',
      purpose: '防止同一版本下重复上传相同文件，多格式自动归拢',
      icon: ShieldCheck,
      color: 'border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20',
      status: '实时强校验',
    },
    {
      level: '5. 生效层 (Published Immutable)',
      rule: '已发布版本不可覆盖与删除',
      purpose: '历史版本只允许申请作废或升版，严禁覆盖历史生产图纸',
      icon: Lock,
      color: 'border-violet-500 text-violet-600 dark:text-violet-400 bg-violet-50/50 dark:bg-violet-950/20',
      status: '规则锁死',
    },
    {
      level: '6. 业务引用层 (Reference Guard)',
      rule: '只允许引用“已发布 + 启用”版本',
      purpose: '防止草稿、待审核、作废或已停用版本流入 BOM 与生产快照',
      icon: ShieldAlert,
      color: 'border-rose-500 text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20',
      status: '网关阻断',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-bold rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                规范 5.3 核心机制
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">6 重唯一性与数据合规保障看板</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-4xl">
              规范答复客户标准：<strong className="text-slate-800 dark:text-slate-200">“我们不是单纯依赖文件名来保证唯一性，文件名主要用于导入识别，系统内部会通过物料ID、图号、图号版本、文件哈希、版本状态和业务引用规则进行多层校验。”</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>所有安全守卫在线运行</span>
            </div>
          </div>
        </div>
      </div>

      {/* 6 Safeguard Layers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {safeguardCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`p-4 rounded-xl border-l-4 border bg-white dark:bg-slate-900 shadow-xs space-y-2 text-xs transition-all ${card.color}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white">{card.level}</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-white/80 dark:bg-slate-800 shadow-2xs">
                  {card.status}
                </span>
              </div>

              <div className="font-mono font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{card.rule}</span>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {card.purpose}
              </p>
            </div>
          );
        })}
      </div>

      {/* Audit Log Stream */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              实时合规审计与拦截日志 ({filteredLogs.length})
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              记录所有唯一性冲突拦截、版本流转审批与异常越权尝试
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜索日志..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-8 pr-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <select
              value={filterLevel}
              onChange={e => setFilterLevel(e.target.value)}
              className="px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
            >
              <option value="ALL">全部日志级别</option>
              <option value="GUARD_BLOCK">守卫拦截 (GUARD_BLOCK)</option>
              <option value="SUCCESS">操作成功 (SUCCESS)</option>
              <option value="INFO">系统记录 (INFO)</option>
            </select>
          </div>
        </div>

        <div className="space-y-2.5">
          {filteredLogs.map(log => {
            const isBlock = log.level === 'GUARD_BLOCK';
            const isSuccess = log.level === 'SUCCESS';

            return (
              <div
                key={log.id}
                className={`p-3.5 rounded-xl border text-xs space-y-1 transition-all ${
                  isBlock
                    ? 'bg-rose-50/50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/60 text-rose-900 dark:text-rose-200'
                    : isSuccess
                    ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200'
                    : 'bg-slate-50 border-slate-200 dark:bg-slate-850 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded font-mono ${
                        isBlock
                          ? 'bg-rose-600 text-white'
                          : isSuccess
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {log.level}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">{log.title}</span>
                    <span className="text-[10px] font-mono text-slate-400">[{log.guardType}]</span>
                  </div>

                  <span className="text-[11px] text-slate-400 font-mono">{log.timestamp}</span>
                </div>

                <p className="text-[11px] leading-relaxed mt-1">
                  {log.description}
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800/60 text-[10px] text-slate-400">
                  <span>目标实体: <strong className="font-mono text-slate-700 dark:text-slate-300">{log.targetEntity}</strong></span>
                  <span>触发源: {log.operator}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
