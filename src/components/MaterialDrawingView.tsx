import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { DrawingVersionsView } from './DrawingVersionsView';
import { Material, DrawingMaster, DrawingFile, VersionStatus } from '../types/plm';

interface MaterialDrawingViewProps {
  onClose?: () => void;
  materials: Material[];
  drawingMasters: DrawingMaster[];
  onUpdateVersionStatus: (drawingNo: string, versionId: string, newStatus: VersionStatus, extraData?: Partial<any>) => void;
  onToggleVersionActive: (drawingNo: string, versionId: string, isActive: boolean) => void;
  onSetDefaultVersion?: (drawingNo: string, versionId: string) => void;
  onCreateDrawingMaster?: (materialId: string, drawingNo: string) => void;
  onUpdateDrawingNo?: (oldDrawingNo: string, newDrawingNo: string) => void;
  onCreateNewDraftVersion: (drawingNo: string, baseVersionNo?: string) => void;
  onUpdateDraftVersionNo?: (drawingNo: string, versionId: string, newVersionNo: string) => void;
  onDeleteDraftVersion: (drawingNo: string, versionId: string) => void;
  onAddFileToDraft: (drawingNo: string, versionId: string, file: DrawingFile) => void;
  onDeleteFileFromVersion?: (drawingNo: string, versionId: string, fileId: string, fileName: string, fileType: string) => void;
}

export function MaterialDrawingView({ 
  onClose,
  materials,
  drawingMasters,
  onUpdateVersionStatus,
  onToggleVersionActive,
  onSetDefaultVersion,
  onCreateDrawingMaster,
  onUpdateDrawingNo,
  onCreateNewDraftVersion,
  onUpdateDraftVersionNo,
  onDeleteDraftVersion,
  onAddFileToDraft,
  onDeleteFileFromVersion
}: MaterialDrawingViewProps) {
  const [activeStep, setActiveStep] = useState(4); // 默认选中"工程扩展"
  const [isGuideCollapsed, setIsGuideCollapsed] = useState(false);

  const steps = [
    { id: 1, title: '基础识别', desc: '编码、名称、规格与业务属性' },
    { id: 2, title: '包装物性', desc: '包装、材质、尺寸重量' },
    { id: 3, title: '仓采财务', desc: '库存、采购、财务追溯' },
    { id: 4, title: '工程扩展', desc: '扩展' },
    { id: 5, title: '图号版本', desc: '图号主档与受控图纸版本' },
    { id: 6, title: 'BOM组成', desc: '物料明细与用量工艺表' },
  ];

  return (
    <div className="h-full flex flex-col bg-slate-50 text-slate-800 dark:bg-slate-900 dark:text-slate-200">
      {/* 顶部标题栏 */}
      <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">新增物料详情</h1>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 主体内容 */}
      <div className="flex-1 overflow-hidden flex gap-4 p-4">
        {/* 左侧引导区 */}
        <div className={`${isGuideCollapsed ? 'w-[72px]' : 'w-72'} shrink-0 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col shadow-sm transition-all duration-300 ease-in-out`}>
          <div className={`p-4 border-b border-slate-100 dark:border-slate-800/50 flex flex-col ${isGuideCollapsed ? 'items-center gap-2' : ''}`}>
            <div className={`flex items-center ${isGuideCollapsed ? 'justify-center w-full' : 'justify-between'} mb-2`}>
              {!isGuideCollapsed && <h2 className="text-base font-bold">物料建档引导</h2>}
              <button
                onClick={() => setIsGuideCollapsed(!isGuideCollapsed)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 transition-colors"
                title={isGuideCollapsed ? "展开引导" : "折叠引导"}
              >
                {isGuideCollapsed ? <Menu className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            </div>
            {!isGuideCollapsed && (
              <>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  按区块逐步录入，必填项会在每一步集中呈现，附件随基础识别一起维护。
                </p>
                {/* 进度条 */}
                <div className="mt-4 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                  <div className="h-full bg-blue-500 w-1/5"></div>
                  <div className="h-full bg-blue-500 w-1/5 border-l border-white/20"></div>
                  <div className="h-full bg-blue-500 w-1/5 border-l border-white/20"></div>
                  <div className="h-full bg-blue-500 w-1/5 border-l border-white/20"></div>
                  <div className="h-full bg-slate-200 dark:bg-slate-700 w-1/5 border-l border-white/20"></div>
                </div>
              </>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1 overflow-x-hidden">
            {steps.map((step) => {
              const isActive = step.id === activeStep;
              const isPast = step.id < activeStep;
              return (
                <div
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
                  title={isGuideCollapsed ? `${step.title}\n${step.desc}` : undefined}
                  className={`flex items-center ${isGuideCollapsed ? 'justify-center p-2' : 'items-start gap-3 p-3'} rounded-lg cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div
                    className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : isPast
                        ? 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400'
                        : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                    }`}
                  >
                    {step.id}
                  </div>
                  {!isGuideCollapsed && (
                    <div className="min-w-0">
                      <div
                        className={`text-sm font-semibold truncate ${
                          isActive ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {step.title}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-500 mt-0.5 truncate">
                        {step.desc}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 底部统计 */}
          {!isGuideCollapsed && (
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex gap-4 bg-slate-50/50 dark:bg-slate-800/20 rounded-b-xl">
              <div className="flex-1 bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">信息录入</div>
                <div className="text-lg font-bold">12/74</div>
              </div>
              <div className="flex-1 bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">必填项</div>
                <div className="text-lg font-bold">4/9</div>
              </div>
            </div>
          )}
        </div>

        {/* 右侧表单区 */}
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
          {activeStep === 4 && (
            <>
              {/* 表单头部 */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">工程扩展</h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 ml-3">
                  补充工程工艺、INCI信息和说明备注。
                </p>
              </div>

              {/* 表单滚动内容 */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  {/* 工程工艺栏 */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <h3 className="text-sm font-bold">工程工艺</h3>
                      <span className="text-xs text-slate-400">面向研发、生产和工艺路线维护</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormInput label="部件名称" placeholder="请输入部件名称" />
                      <FormInput label="类型编号" placeholder="请输入类型编号" />
                      <FormInput label="位号" placeholder="请输入位号" />
                      <FormInput label="表面处理" placeholder="请输入表面处理" />
                      <FormInput label="表热处理" placeholder="请输入表热处理" />
                      <FormInput label="领料工位" placeholder="请输入领料工位" />
                      <FormSelect label="装配类型" placeholder="请选择装配类型" options={['类型A', '类型B']} />
                      <FormInput label="机型" placeholder="请输入机型" />
                      <FormInput label="功率" placeholder="请输入功率" />
                      <FormSelect label="工序" placeholder="请选择工序" options={['工序1', '工序2']} />
                      <FormInput label="需求日期" placeholder="请选择需求日期" isDate />
                      <FormInput label="铣磨尺寸" placeholder="请输入铣磨尺寸" />
                      <FormInput label="预计/销售单号" placeholder="请输入预计/销售单号" />
                    </div>
                  </div>

                  {/* 扩展说明栏 */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <h3 className="text-sm font-bold">扩展说明</h3>
                      <span className="text-xs text-slate-400">兼容原料、化工、机械等扩展字段</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormInput label="INCI名称" placeholder="请输入INCI名称" />
                      <FormInput label="INCI英文名称" placeholder="请输入INCI英文名称" />
                      <FormInput label="植提部位" placeholder="请输入植提部位" />
                      <FormInput label="使用目的" placeholder="请输入使用目的" />
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                          英文描述
                        </label>
                        <textarea
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder-slate-400 transition-all resize-none"
                          rows={3}
                          placeholder="请输入英文描述"
                        ></textarea>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                          备注
                        </label>
                        <textarea
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder-slate-400 transition-all resize-none"
                          rows={3}
                          placeholder="请输入备注"
                        ></textarea>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeStep === 5 && (
            <div className="flex flex-col h-full">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">图号版本</h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 ml-3">
                  当前物料关联的受控图号主档、图纸版本与文件清单
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-900/50">
                {materials.length > 0 ? (
                  <DrawingVersionsView
                    fixedMaterialId={materials[0]?.id}
                    materials={materials}
                    drawingMasters={drawingMasters}
                    onUpdateVersionStatus={onUpdateVersionStatus}
                    onToggleVersionActive={onToggleVersionActive}
                    onSetDefaultVersion={onSetDefaultVersion}
                    onCreateDrawingMaster={onCreateDrawingMaster}
                    onUpdateDrawingNo={onUpdateDrawingNo}
                    onCreateNewDraftVersion={onCreateNewDraftVersion}
                    onUpdateDraftVersionNo={onUpdateDraftVersionNo}
                    onDeleteDraftVersion={onDeleteDraftVersion}
                    onAddFileToDraft={onAddFileToDraft}
                    onDeleteFileFromVersion={onDeleteFileFromVersion}
                  />
                ) : (
                  <div className="text-sm text-slate-500 py-4 text-center">暂无关联物料</div>
                )}
              </div>
            </div>
          )}

          {activeStep !== 4 && activeStep !== 5 && (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              请选择左侧的步骤进行填写
            </div>
          )}

          {/* 底部操作栏 */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end gap-3 shrink-0">
            <button 
              onClick={onClose}
              className="px-6 py-2 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              取消
            </button>
            <button className="px-6 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors">
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 辅助表单组件
function FormInput({ label, placeholder, isDate = false }: { label: string; placeholder: string; isDate?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type={isDate ? "date" : "text"}
          className={`w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder-slate-400 transition-all ${isDate ? 'text-slate-500' : ''}`}
          placeholder={placeholder}
        />
        {isDate && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
             {/* 占位给原生日期图标，或者用自定义Icon覆盖 */}
          </div>
        )}
      </div>
    </div>
  );
}

function FormSelect({ label, placeholder, options }: { label: string; placeholder: string; options: string[] }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
        {label}
      </label>
      <select
        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
        defaultValue=""
      >
        <option value="" disabled hidden>{placeholder}</option>
        {options.map((opt, idx) => (
          <option key={idx} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}
