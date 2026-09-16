import React, { useState } from 'react';
import { MedicalReport, ReportCategory } from '../types';
import { 
  Calendar, 
  Building2, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle, 
  Search, 
  Sparkles, 
  FileText,
  Clock,
  ArrowRight,
  Eye,
  Download,
  Trash2
} from 'lucide-react';
import { ReportDetailModal } from './ReportDetailModal';
import { saveReportImageLocally } from '../utils/reportImageSaver';

interface TimelineViewProps {
  reports: MedicalReport[];
  memberName: string;
  onAskAIAboutReport: (report: MedicalReport) => void;
  onSelectIndicatorForTrend: (indicatorKey: string) => void;
  onDeleteReport?: (reportId: string, reportTitle?: string) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  reports,
  memberName,
  onAskAIAboutReport,
  onSelectIndicatorForTrend,
  onDeleteReport
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedReportIds, setExpandedReportIds] = useState<Record<string, boolean>>({
    [reports[0]?.id || '']: true // expand latest by default
  });
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [detailModalReport, setDetailModalReport] = useState<MedicalReport | null>(null);

  const categories: { label: string; value: string }[] = [
    { label: '全部报告', value: 'all' },
    { label: '血生化与激素', value: '血生化与激素' },
    { label: '超声影像', value: '超声影像' },
    { label: '染色体与遗传学', value: '染色体与遗传学' },
    { label: '常规体检', value: '常规体检' }
  ];

  const filteredReports = reports
    .filter((r) => {
      const matchCat = selectedCategory === 'all' || r.category === selectedCategory;
      const matchSearch =
        searchTerm === '' ||
        r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.hospital.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.indicators.some((ind) =>
          ind.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          String(ind.value).toLowerCase().includes(searchTerm.toLowerCase())
        );
      return matchCat && matchSearch;
    })
    .sort((a, b) => {
      return sortOrder === 'desc'
        ? new Date(b.date).getTime() - new Date(a.date).getTime()
        : new Date(a.date).getTime() - new Date(b.date).getTime();
    });

  const toggleExpand = (id: string) => {
    setExpandedReportIds((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Group reports by date or render chronological timeline sections
  const groupedByDate: Record<string, MedicalReport[]> = filteredReports.reduce((acc: Record<string, MedicalReport[]>, rep) => {
    if (!acc[rep.date]) acc[rep.date] = [];
    acc[rep.date].push(rep);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
    return sortOrder === 'desc'
      ? new Date(b).getTime() - new Date(a).getTime()
      : new Date(a).getTime() - new Date(b).getTime();
  });

  return (
    <div className="space-y-8 text-[#1a1a1c] dark:text-zinc-100">
      {/* Editorial Filter and Search Bar */}
      <div className="bg-white dark:bg-[#18181b] border border-[#1a1a1c] dark:border-zinc-700 p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-[4px_4px_0_rgba(26,26,28,0.06)] dark:shadow-[4px_4px_0_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0 max-w-full">
          {categories.map((cat) => (
            <button
              key={cat.value}
              id={`filter-cat-${cat.value}`}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-3 py-1.5 min-h-[32px] rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition cursor-pointer ${
                selectedCategory === cat.value
                  ? 'bg-[#1a1a1c] text-[#fdfdfb] dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs'
                  : 'bg-transparent text-[#1a1a1c]/60 dark:text-zinc-400 hover:text-[#1a1a1c] dark:hover:text-zinc-200 hover:bg-[#1a1a1c]/5 dark:hover:bg-zinc-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-60">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#1a1a1c]/40 dark:text-zinc-500" />
            <input
              type="text"
              id="report-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索指标或医院..."
              className="w-full bg-[#fdfdfb] dark:bg-[#121214] border border-[#1a1a1c]/20 dark:border-zinc-700 rounded-full pl-8 pr-3 py-1.5 min-h-[34px] text-xs text-[#1a1a1c] dark:text-zinc-100 placeholder-[#1a1a1c]/40 dark:placeholder-zinc-500 focus:outline-none focus:border-[#1a1a1c] dark:focus:border-zinc-400"
            />
          </div>

          <button
            id="toggle-sort-order-btn"
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] rounded-full border border-[#1a1a1c] dark:border-zinc-700 bg-white dark:bg-[#18181b] text-xs font-editorial-mono hover:bg-[#1a1a1c]/5 dark:hover:bg-zinc-800 text-[#1a1a1c] dark:text-zinc-200 cursor-pointer shrink-0"
            title="切换时间排序"
          >
            <Clock className="w-3.5 h-3.5 text-[#1a1a1c]/60 dark:text-zinc-400" />
            <span>{sortOrder === 'desc' ? '最新优先' : '正序'}</span>
          </button>
        </div>
      </div>

      {/* Timeline Section Feed */}
      {filteredReports.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#18181b] border border-dashed border-[#1a1a1c]/30 dark:border-zinc-700 text-[#1a1a1c]/50 dark:text-zinc-400">
          <FileText className="w-10 h-10 mx-auto text-[#1a1a1c]/30 dark:text-zinc-500 mb-2" />
          <p className="text-sm font-semibold">未找到符合条件的报告</p>
          <p className="text-xs text-[#1a1a1c]/40 dark:text-zinc-500 mt-1">请尝试更换搜索词或选择全部类别</p>
        </div>
      ) : (
        <div className="space-y-10">
          {sortedDates.map((dateStr) => {
            const dateReports = groupedByDate[dateStr];
            return (
              <div key={dateStr} className="report-section">
                {/* Monospace Date divider from Variation 3 */}
                <div className="font-editorial-mono text-xl sm:text-2xl font-bold mb-4 flex items-center gap-4 text-[#1a1a1c] dark:text-zinc-100">
                  <span>{dateStr.replace(/-/g, '.')}</span>
                  <div className="flex-1 h-[1px] bg-[#1a1a1c]/15 dark:bg-zinc-700" />
                  <span className="text-xs font-normal text-[#1a1a1c]/40 dark:text-zinc-500 uppercase tracking-widest">
                    {dateReports.length} 份报告
                  </span>
                </div>

                {/* Grid of Report Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {dateReports.map((report) => {
                    const isExpanded = !!expandedReportIds[report.id];
                    const hasCritical = report.indicators.some((i) => i.status === 'critical') || report.category === '染色体与遗传学';
                    const hasWarning = report.indicators.some((i) => i.status === 'warning');

                    return (
                      <div
                        key={report.id}
                        className={`p-6 border transition relative ${
                          hasCritical
                            ? 'bg-[#fffafa] dark:bg-[#221013] border-[#d93025] dark:border-rose-900/80 shadow-[6px_6px_0_rgba(217,48,37,0.08)] dark:shadow-[6px_6px_0_rgba(0,0,0,0.5)]'
                            : 'bg-white dark:bg-[#18181b] border-[#1a1a1c] dark:border-zinc-700 shadow-[6px_6px_0_rgba(26,26,28,0.06)] dark:shadow-[6px_6px_0_rgba(0,0,0,0.4)]'
                        }`}
                      >
                        {/* Tag & Hospital */}
                        <div className="flex items-center justify-between mb-3">
                          <span
                            className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                              hasCritical
                                ? 'border-[#d93025] text-[#d93025] dark:border-rose-400 dark:text-rose-400'
                                : 'border-[#1a1a1c] text-[#1a1a1c] dark:border-zinc-500 dark:text-zinc-300'
                            }`}
                          >
                            {report.category}
                          </span>

                          <span className="font-editorial-mono text-[11px] text-[#1a1a1c]/50 dark:text-zinc-400">
                            {report.hospital}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="font-editorial-serif text-xl font-medium tracking-tight text-[#1a1a1c] dark:text-zinc-100 mb-2 leading-snug">
                          {report.title}
                        </h3>

                        {/* Gestational age if present */}
                        {report.gestationalAge && (
                          <div className="mb-2">
                            <span className="text-[11px] font-editorial-mono px-2 py-0.5 bg-[#5562ff]/10 dark:bg-[#5562ff]/20 text-[#5562ff] dark:text-[#9aa2ff] font-semibold">
                              孕周阶段: {report.gestationalAge}
                            </span>
                          </div>
                        )}

                        {/* Summary */}
                        <p className="text-xs text-[#1a1a1c]/75 dark:text-zinc-300 leading-relaxed mb-4">
                          {report.summary}
                        </p>

                        {/* Indicator Items with dashed border (Variation 3 style) */}
                        <div className="border-t border-[#1a1a1c]/10 dark:border-zinc-700/60 pt-2 mb-4">
                          {report.indicators.map((ind) => {
                            const isDanger = ind.status === 'critical' || (ind.differenceFromPrev?.anomalyReason && ind.status === 'warning');
                            const isSuccess = ind.status === 'normal' && ind.standardKey === 'TSH';

                            return (
                              <div
                                key={ind.id}
                                className="flex items-center justify-between py-2 border-b border-dashed border-[#1a1a1c]/15 dark:border-zinc-700/60 text-xs"
                              >
                                <span className="font-editorial-mono text-[11px] text-[#1a1a1c]/60 dark:text-zinc-400">
                                  {ind.name}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`font-bold font-editorial-mono ${
                                      isDanger
                                        ? 'text-[#d93025] dark:text-rose-400'
                                        : isSuccess
                                        ? 'text-[#188038] dark:text-emerald-400'
                                        : 'text-[#1a1a1c] dark:text-zinc-200'
                                    }`}
                                  >
                                    {ind.value} {ind.unit}
                                  </span>

                                  {ind.differenceFromPrev && (
                                    <span className="text-[10px] font-editorial-mono text-[#d93025] dark:text-rose-400">
                                      ({ind.differenceFromPrev.trend === 'up' ? '↑' : ind.differenceFromPrev.trend === 'down' ? '↓' : '→'})
                                    </span>
                                  )}

                                  <button
                                    onClick={() => onSelectIndicatorForTrend(ind.standardKey)}
                                    className="text-[10px] font-editorial-mono text-[#5562ff] dark:text-[#9aa2ff] hover:underline cursor-pointer"
                                    title="查看此指标历史走势"
                                  >
                                    走势&rarr;
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Expandable Table for Deep Clinical Data */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-[#1a1a1c]/15 dark:border-zinc-700 text-xs space-y-3 bg-[#fdfdfb] dark:bg-[#121214] p-3 border border-[#1a1a1c]/10 dark:border-zinc-700">
                            <div className="font-editorial-mono text-[10px] uppercase text-[#1a1a1c]/50 dark:text-zinc-400 font-bold">
                              指标历史对比详情
                            </div>
                            <div className="space-y-2">
                              {report.indicators.map((ind) => (
                                <div key={ind.id} className="text-[11px]">
                                  <div className="flex justify-between font-semibold">
                                    <span className="dark:text-zinc-300">{ind.name} (参考: {ind.referenceRange})</span>
                                    <span className={ind.status === 'critical' ? 'text-[#d93025] dark:text-rose-400' : 'text-[#1a1a1c] dark:text-zinc-200'}>
                                      {ind.value} {ind.unit}
                                    </span>
                                  </div>
                                  {ind.differenceFromPrev && (
                                    <p className="text-[10px] text-[#d93025] dark:text-rose-400 font-medium mt-0.5">
                                      ⚠️ 较前次 ({ind.differenceFromPrev.prevDate} 数值 {ind.differenceFromPrev.prevValue}): {ind.differenceFromPrev.anomalyReason}
                                    </p>
                                  )}
                                  {ind.clinicalNote && (
                                    <p className="text-[10px] text-[#1a1a1c]/60 dark:text-zinc-400 mt-0.5">{ind.clinicalNote}</p>
                                  )}
                                </div>
                              ))}
                            </div>

                            {report.doctorAdvice && (
                              <div className="text-[11px] p-2 bg-white dark:bg-[#1c1c20] border border-[#1a1a1c]/10 dark:border-zinc-700 mt-2 dark:text-zinc-300">
                                <strong className="text-[#1a1a1c] dark:text-zinc-100">医嘱处置：</strong> {report.doctorAdvice}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action strip */}
                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 mt-4 pt-3 border-t border-[#1a1a1c]/10 dark:border-zinc-700/60 w-full min-w-0">
                          <button
                            id={`expand-report-details-${report.id}`}
                            onClick={() => toggleExpand(report.id)}
                            className="font-editorial-mono text-[11px] text-[#1a1a1c]/60 dark:text-zinc-400 hover:text-[#1a1a1c] dark:hover:text-zinc-200 flex items-center gap-1 cursor-pointer py-1 min-h-[32px] self-start"
                          >
                            <span>{isExpanded ? '收起明细' : '展开检验明细'}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 justify-start xl:justify-end w-full xl:w-auto min-w-0">
                            <button
                              id={`view-lab-sheet-${report.id}`}
                              onClick={() => setDetailModalReport(report)}
                              className="px-2.5 sm:px-3 py-1.5 min-h-[32px] text-xs rounded border border-[#1a1a1c]/30 dark:border-zinc-600 hover:border-[#1a1a1c] dark:hover:border-zinc-400 hover:bg-[#f8f8f6] dark:hover:bg-zinc-800 font-editorial-mono flex items-center gap-1 transition text-[#1a1a1c] dark:text-zinc-200 cursor-pointer"
                              title="查看医院标准格式报告化验单"
                            >
                              <Eye className="w-3 h-3 text-[#1a1a1c]/60 dark:text-zinc-400" />
                              <span>原始单据</span>
                            </button>

                            <button
                              id={`save-image-card-${report.id}`}
                              onClick={() => saveReportImageLocally(report, memberName)}
                              className="px-2.5 sm:px-3 py-1.5 min-h-[32px] text-xs rounded border border-[#1a1a1c]/30 dark:border-zinc-600 hover:border-[#1a1a1c] dark:hover:border-zinc-400 hover:bg-[#f8f8f6] dark:hover:bg-zinc-800 font-editorial-mono flex items-center gap-1 transition text-[#1a1a1c] dark:text-zinc-200 cursor-pointer"
                              title="保存此份化验报告图片至本地电脑或手机相册"
                            >
                              <Download className="w-3 h-3 text-[#5562ff] dark:text-[#9aa2ff]" />
                              <span>保存图片</span>
                            </button>

                            <button
                              id={`ask-ai-report-${report.id}`}
                              onClick={() => onAskAIAboutReport(report)}
                              className="px-3 py-1.5 min-h-[32px] rounded-full border border-[#1a1a1c] dark:border-zinc-600 hover:bg-[#1a1a1c] hover:text-white dark:hover:bg-zinc-200 dark:hover:text-zinc-900 text-xs font-semibold flex items-center gap-1 transition-all text-[#1a1a1c] dark:text-zinc-200 cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-[#5562ff] dark:text-[#9aa2ff]" />
                              <span>AI 解读</span>
                            </button>

                            {onDeleteReport && (
                              <button
                                id={`delete-report-${report.id}`}
                                onClick={() => {
                                  if (window.confirm(`确定要删除《${report.title}》吗？\n\n此操作将同步从云端永久移除。`)) {
                                    onDeleteReport(report.id, report.title);
                                  }
                                }}
                                className="p-1.5 min-h-[32px] min-w-[32px] flex items-center justify-center text-[#1a1a1c]/40 hover:text-[#d93025] dark:hover:text-rose-400 hover:bg-[#d93025]/5 rounded transition cursor-pointer"
                                title="删除该病历记录"
                                aria-label="删除病历"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lab Sheet Detail Modal */}
      <ReportDetailModal
        report={detailModalReport}
        memberName={memberName}
        onClose={() => setDetailModalReport(null)}
        onAskAI={onAskAIAboutReport}
        onSelectIndicatorForTrend={onSelectIndicatorForTrend}
        onDeleteReport={onDeleteReport}
      />
    </div>
  );
};

