import React, { useState } from 'react';
import { Database, UploadCloud, FileSpreadsheet, GitBranch, Menu, ChevronLeft, ChevronDown, Layers, ShieldCheck, FileText, Bell } from 'lucide-react';

export type TabKey =
  | 'materials-new'
  | 'drawings-new'
  | 'bom-new'
  | 'ecn'
  | 'ecn-notifications'
  | 'materials'
  | 'drawings'
  | 'bom'
  | 'import'
  | 'material-edit'
  | 'archiving';

interface NavigationProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  pendingReviewsCount: number;
  draftsCount: number;
  unreadECNNotificationsCount?: number;
  isMobileMenuOpen: boolean;
  onCloseMobileMenu: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  pendingReviewsCount,
  draftsCount,
  unreadECNNotificationsCount = 0,
  isMobileMenuOpen,
  onCloseMobileMenu,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    '图号版本管控': true,
    '系统功能': true,
  });

  const toggleSection = (title: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const navSections = [
    {
      title: '图号管控',
      badge: '新架构',
      icon: Layers,
      items: [
        {
          id: 'materials-new' as TabKey,
          label: '物料档案（新）',
          icon: Database,
        },
        {
          id: 'drawings-new' as TabKey,
          label: '图号管理（新）',
          icon: GitBranch,
        },
        {
          id: 'bom-new' as TabKey,
          label: 'BOM管理（新）',
          icon: FileSpreadsheet,
        },
        {
          id: 'ecn' as TabKey,
          label: 'ECN变更单',
          icon: FileText,
        },
        {
          id: 'ecn-notifications' as TabKey,
          label: 'ECN通知中心',
          icon: Bell,
          badgeCount: unreadECNNotificationsCount,
        },
      ],
    },
    {
      title: '图号版本管控',
      icon: ShieldCheck,
      items: [
        {
          id: 'materials' as TabKey,
          label: '物料档案',
          icon: Database,
        },
        {
          id: 'drawings' as TabKey,
          label: '图号版本管理',
          icon: GitBranch,
        },
        {
          id: 'bom' as TabKey,
          label: 'BOM管理',
          icon: FileSpreadsheet,
        },
      ],
    },
    {
      title: '系统功能',
      items: [
        {
          id: 'import' as TabKey,
          label: '一键同步',
          icon: UploadCloud,
        },
      ],
    },
  ];

  const handleSelect = (tab: TabKey) => {
    onTabChange(tab);
    onCloseMobileMenu();
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div
          onClick={onCloseMobileMenu}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 z-40 h-screen ${isCollapsed ? 'w-[72px]' : 'w-60'} bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col justify-between transition-all duration-300 ease-in-out md:translate-x-0 shrink-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-3 space-y-4 overflow-y-auto overflow-x-hidden">
          {/* Header */}
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-2 py-2 mb-1 border-b border-slate-800/80 pb-3`}>
            {!isCollapsed && (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center text-white font-bold text-xs">
                  PLM
                </div>
                <span className="text-xs font-bold text-slate-200 tracking-wide truncate">
                  图号管控中心
                </span>
              </div>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              title={isCollapsed ? "展开菜单" : "折叠菜单"}
            >
              {isCollapsed ? <Menu className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Nav Sections */}
          <div className="space-y-3">
            {navSections.map((section, idx) => {
              const isSectionCollapsed = !!collapsedSections[section.title];
              return (
                <div key={idx} className="space-y-1">
                  {!isCollapsed && (
                    <button
                      type="button"
                      onClick={() => toggleSection(section.title)}
                      className="w-full px-2.5 py-1.5 flex items-center justify-between text-[11px] font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer select-none group"
                    >
                      <span className="flex items-center gap-1.5 text-slate-300 uppercase tracking-wider">
                        {section.icon && <section.icon className="w-3.5 h-3.5 text-blue-400" />}
                        {section.title}
                        {section.badge && (
                          <span className="px-1.5 py-0.2 bg-blue-950/80 text-blue-400 border border-blue-800/60 rounded text-[10px] font-mono normal-case">
                            {section.badge}
                          </span>
                        )}
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-transform duration-200 ${
                          isSectionCollapsed ? '-rotate-90' : 'rotate-0'
                        }`}
                      />
                    </button>
                  )}

                  {/* 子菜单列表（侧栏折叠模式下始终显示图标，侧栏展开模式下遵循 section 折叠状态） */}
                  {(!isCollapsed ? !isSectionCollapsed : true) && (
                    <nav className="space-y-0.5">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        const isNewBadge = item.id.endsWith('-new');
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleSelect(item.id)}
                            title={isCollapsed ? item.label : undefined}
                            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-3 py-2 rounded-lg text-xs font-medium transition-all group cursor-pointer text-left ${
                              isActive
                                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                            }`}
                          >
                            <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : 'gap-2.5 min-w-0'}`}>
                              <Icon
                                className={`w-4 h-4 shrink-0 transition-colors ${
                                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'
                                }`}
                              />
                              {!isCollapsed && (
                                <span className="truncate">{item.label}</span>
                              )}
                            </div>
                            {!isCollapsed && isNewBadge && (
                              <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                                isActive ? 'bg-white/20 text-white' : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                              }`}>
                                NEW
                              </span>
                            )}
                            {!isCollapsed && (item as any).badgeCount > 0 && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-rose-500 text-white animate-pulse">
                                {(item as any).badgeCount}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </nav>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
};
