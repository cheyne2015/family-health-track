import React, { useState } from 'react';
import { MedicalReport } from '../types';
import { X, Bot, Printer, Download, FileText, ArrowUpRight, ArrowDownRight, AlertTriangle, CheckCircle2, Check, Trash2 } from 'lucide-react';
import { saveReportImageLocally } from '../utils/reportImageSaver';

interface ReportDetailModalProps {
  report: MedicalReport | null;
  memberName?: string;
  onClose: () => void;
  onAskAI: (report: MedicalReport) => void;
  onSelectIndicatorForTrend?: (key: string) => void;
  onDeleteReport?: (reportId: string, reportTitle?: string) => void;
}

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  report,
  memberName = '家庭成员',
  onClose,
  onAskAI,
  onSelectIndicatorForTrend,
  onDeleteReport
}) => {
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  if (!report) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDelete = () => {
    if (!onDeleteReport) return;
    if (window.confirm(`确定要删除这份病历记录《${report.title}》吗？\n\n注意：此操作将同步从云端数据库中永久移除，且不可撤销。`)) {
      onDeleteReport(report.id, report.title);
      onClose();
    }
  };

  const handleSaveImage = async () => {
    try {
      setIsSavingImage(true);
      const filename = await saveReportImageLocally(report, memberName);
      setSaveSuccessMsg(`已下载：${filename}`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Failed to save image:', err);
      alert('保存报告图片失败，请重试');
    } finally {
      setIsSavingImage(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-[#1a1a1c] w-full max-w-3xl text-[#1a1a1c] shadow-[12px_12px_0_rgba(26,26,28,0.15)] overflow-hidden my-6">
        {/* Top Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 border-b border-[#1a1a1c] bg-[#f8f8f6] gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-editorial-mono text-[10px] uppercase tracking-widest text-[#1a1a1c]/60 font-bold">
              OFFICIAL MEDICAL RECORD · 原始报告单据档案
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold border border-[#1a1a1c] bg-white">
              {report.category}
            </span>
          </div>

          <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 justify-end">
            <button
              id="save-report-image-btn"
              onClick={handleSaveImage}
              disabled={isSavingImage}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 min-h-[32px] text-xs border border-[#1a1a1c] bg-[#fdfdfb] hover:bg-[#1a1a1c] hover:text-white transition font-editorial-mono font-bold shadow-xs cursor-pointer"
              title="将原始检验报告单以高清图片格式保存至您的电脑或手机相册"
            >
              {saveSuccessMsg ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#188038]" />
                  <span className="text-[#188038]">已保存</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-[#5562ff]" />
                  <span className="hidden sm:inline">{isSavingImage ? '正在生成图片...' : '保存报告图片到本地'}</span>
                  <span className="sm:hidden">{isSavingImage ? '生成中...' : '保存图片'}</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 min-h-[32px] text-xs border border-[#1a1a1c] bg-white hover:bg-[#1a1a1c] hover:text-white transition font-editorial-mono cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>打印</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onAskAI(report);
              }}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 min-h-[32px] text-xs bg-[#5562ff] text-white hover:bg-[#4350ea] transition font-semibold cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>AI 解读</span>
            </button>

            {onDeleteReport && (
              <button
                id="delete-report-modal-btn"
                onClick={handleDelete}
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 min-h-[32px] text-xs border border-[#d93025]/40 text-[#d93025] hover:bg-[#d93025] hover:text-white transition font-editorial-mono font-medium rounded-xs cursor-pointer"
                title="删除该条病历记录"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">删除记录</span>
                <span className="sm:hidden">删除</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 min-h-[32px] min-w-[32px] flex items-center justify-center text-[#1a1a1c]/50 hover:text-[#1a1a1c] border border-transparent hover:border-[#1a1a1c] transition cursor-pointer"
              aria-label="关闭"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Banner if saved */}
        {saveSuccessMsg && (
          <div className="bg-[#188038]/10 border-b border-[#188038]/30 px-4 py-2 flex items-center justify-between text-xs text-[#188038] font-editorial-mono">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              {saveSuccessMsg} (已下载至您的本地下载目录)
            </span>
          </div>
        )}

        {/* Authentic Hospital Lab Sheet Layout */}
        <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto bg-white">
          {/* Hospital Header & Title */}
          <div className="text-center pb-5 border-b-2 border-[#1a1a1c]">
            <h2 className="font-editorial-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#1a1a1c]">
              {report.hospital}
            </h2>
            <div className="font-editorial-mono text-sm tracking-widest uppercase text-[#1a1a1c]/70 mt-1">
              CLINICAL LABORATORY & DIAGNOSTIC REPORT
            </div>
            <h3 className="font-editorial-serif text-lg font-medium text-[#1a1a1c] mt-2 underline decoration-[#1a1a1c]/30 underline-offset-4">
              {report.title}
            </h3>
          </div>

          {/* Patient & Report Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-[#fdfdfb] border border-[#1a1a1c]/20 text-xs font-editorial-mono">
            <div>
              <span className="text-[#1a1a1c]/50 block">检查日期 / DATE</span>
              <span className="font-bold text-[#1a1a1c]">{report.date}</span>
            </div>
            <div>
              <span className="text-[#1a1a1c]/50 block">就诊科室 / DEPT</span>
              <span className="font-bold text-[#1a1a1c]">{report.department || '未填写科室'}</span>
            </div>
            <div>
              <span className="text-[#1a1a1c]/50 block">报告状态 / STATUS</span>
              <span className="font-bold text-[#188038] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 已审核归档
              </span>
            </div>
            <div>
              <span className="text-[#1a1a1c]/50 block">孕周阶段 / GESTATION</span>
              <span className="font-bold text-[#1a1a1c]">{report.gestationalAge || '未填写'}</span>
            </div>
          </div>

          {/* Clinical Summary Banner */}
          <div className="p-4 border border-[#1a1a1c] bg-[#fafaf8]">
            <span className="font-editorial-mono text-[10px] uppercase font-bold text-[#1a1a1c]/60 tracking-wider block mb-1">
              CLINICAL DIAGNOSIS & SUMMARY · 检查结论与临床小结
            </span>
            <p className="text-sm leading-relaxed text-[#1a1a1c] font-medium">
              {report.summary}
            </p>
          </div>

          {/* Test Indicators Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-editorial-mono text-xs font-bold text-[#1a1a1c] tracking-wider uppercase">
                TEST ITEMS & PARAMETERS · 检验项目测定明细
              </span>
              <span className="text-[11px] font-editorial-mono text-[#1a1a1c]/50">
                共测定 {report.indicators.length} 项参数
              </span>
            </div>

            <div className="border border-[#1a1a1c] overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f8f8f6] border-b border-[#1a1a1c] font-editorial-mono text-[11px] text-[#1a1a1c]/70">
                    <th className="p-2.5 font-bold">项目名称 (ITEM)</th>
                    <th className="p-2.5 font-bold">测定结果 (RESULT)</th>
                    <th className="p-2.5 font-bold">异常标记 (FLAG)</th>
                    <th className="p-2.5 font-bold">参考区间 (REFERENCE)</th>
                    <th className="p-2.5 font-bold">单位 (UNIT)</th>
                    <th className="p-2.5 font-bold text-right">时序分析 (TREND)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a1a1c]/10">
                  {report.indicators.map((ind) => {
                    const isCritical = ind.status === 'critical';
                    const isWarning = ind.status === 'warning';
                    const isNormal = ind.status === 'normal';

                    return (
                      <tr
                        key={ind.id}
                        className={`hover:bg-[#f8f8f6] transition ${
                          isCritical ? 'bg-[#fffafa]' : ''
                        }`}
                      >
                        <td className="p-2.5 font-medium text-[#1a1a1c]">
                          <div>{ind.name}</div>
                          {ind.standardKey && ind.standardKey !== ind.name && (
                            <span className="font-editorial-mono text-[10px] text-[#1a1a1c]/50">
                              [{ind.standardKey}]
                            </span>
                          )}
                        </td>

                        <td className="p-2.5 font-editorial-mono font-bold text-sm text-[#1a1a1c]">
                          {ind.value}
                        </td>

                        <td className="p-2.5">
                          {isCritical && (
                            <span className="inline-flex items-center gap-1 font-editorial-mono text-[10px] font-bold px-1.5 py-0.5 bg-[#d93025]/10 text-[#d93025] border border-[#d93025]">
                              <AlertTriangle className="w-3 h-3" /> 显著异常
                            </span>
                          )}
                          {isWarning && (
                            <span className="inline-flex items-center gap-1 font-editorial-mono text-[10px] font-bold px-1.5 py-0.5 bg-[#f2994a]/10 text-[#f2994a] border border-[#f2994a]">
                              偏离基线
                            </span>
                          )}
                          {isNormal && (
                            <span className="font-editorial-mono text-[10px] text-[#188038]">
                              正常
                            </span>
                          )}
                        </td>

                        <td className="p-2.5 font-editorial-mono text-[#1a1a1c]/60">
                          {ind.referenceRange || '见附注'}
                        </td>

                        <td className="p-2.5 font-editorial-mono text-[#1a1a1c]/60">
                          {ind.unit || '-'}
                        </td>

                        <td className="p-2.5 text-right">
                          {onSelectIndicatorForTrend && ind.standardKey ? (
                            <button
                              onClick={() => {
                                onClose();
                                onSelectIndicatorForTrend(ind.standardKey);
                              }}
                              className="font-editorial-mono text-[10px] text-[#5562ff] hover:underline font-bold"
                            >
                              查看历史对比 &rarr;
                            </button>
                          ) : (
                            <span className="text-[#1a1a1c]/30 font-editorial-mono">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Footnote & Clinical Disclaimer */}
          <div className="pt-4 border-t border-[#1a1a1c]/20 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-[#1a1a1c]/50 font-editorial-mono gap-2">
            <div>
              <span>检验师 / 报告审核：系统智能OCR归档 · 唯一单据号：MD-{report.id}</span>
            </div>
            <div>
              <span>* 本化验单据由医疗机构合法出具，系统提供智能归档与横向对比服务</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
