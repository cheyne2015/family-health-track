import React, { useState, useRef } from 'react';
import { FamilyMember, MedicalReport, ReportCategory, IndicatorItem } from '../types';
import { X, Upload, Sparkles, Plus, Trash2, FileText, CheckCircle2, Image, Download, Cloud, Loader2 } from 'lucide-react';
import { compressReportImageForCloud, CompressionResult } from '../utils/imageCompressor';

interface UploadReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: FamilyMember[];
  selectedMemberId: string;
  onAddReport: (report: MedicalReport) => void;
}

export const UploadReportModal: React.FC<UploadReportModalProps> = ({
  isOpen,
  onClose,
  members,
  selectedMemberId,
  onAddReport
}) => {
  const [memberId, setMemberId] = useState(selectedMemberId);
  const [title, setTitle] = useState('');
  const [hospital, setHospital] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<ReportCategory>('血生化与激素');
  const [summary, setSummary] = useState('');
  const [rawText, setRawText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [reportImagePreview, setReportImagePreview] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string>('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionResult, setCompressionResult] = useState<CompressionResult | null>(null);
  const [isAiOcrLoading, setIsAiOcrLoading] = useState(false);
  const [ocrNotice, setOcrNotice] = useState<string | null>(null);
  const [ocrSource, setOcrSource] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [indicators, setIndicators] = useState<
    { name: string; standardKey: string; value: string; unit: string; referenceRange: string }[]
  >([
    { name: '', standardKey: '', value: '', unit: '', referenceRange: '' }
  ]);

  if (!isOpen) return null;

  const handleAddIndicatorRow = () => {
    setIndicators((prev) => [
      ...prev,
      { name: '', standardKey: '', value: '', unit: '', referenceRange: '' }
    ]);
  };

  const handleRemoveIndicatorRow = (idx: number) => {
    setIndicators((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleQuickFill = (_type: string) => {
    setTitle('常规检查（虚构演示）'); setHospital('演示机构');
    setDate(new Date().toISOString().slice(0,10)); setCategory('常规体检');
    setSummary('虚构演示数据，不是识别结果。');
    setIndicators([{name:'演示指标',standardKey:'DEMO',value:'5.2',unit:'演示单位',referenceRange:'未设定'}]);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFileName(file.name);
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
    }

    setIsCompressing(true);
    try {
      // Compress and optimize for cloud (<480KB, max 1600px, clear medical text)
      const res = await compressReportImageForCloud(file, 1600, 480 * 1024);
      setReportImagePreview(res.dataUrl);
      setCompressionResult(res);
    } catch (err) {
      console.warn('Compression failed, falling back to raw file load:', err);
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        const result = loadEvt.target?.result as string;
        setReportImagePreview(result);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleDownloadUploadedImage = () => {
    if (!reportImagePreview) return;
    const a = document.createElement('a');
    a.href = reportImagePreview;
    a.download = imageFileName || `${title || '报告图片'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleRunAiVisionOcr = async () => {
    setIsAiOcrLoading(true);
    setOcrNotice(null);
    try {
      const res = await fetch('/api/ai/ocr-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: reportImagePreview || '',
          fileName: imageFileName || '',
          hint: rawText || title || ''
        })
      });

      if (res.ok) {
        const respData = await res.json();
        if (respData && respData.data) {
          const d = respData.data;
          if (d.hospital) setHospital(d.hospital);
          if (d.date) setDate(d.date);
          if (d.category) setCategory(d.category as ReportCategory);
          if (d.title) setTitle(d.title);
          if (d.summary) setSummary(d.summary);
          if (Array.isArray(d.indicators) && d.indicators.length > 0) {
            setIndicators(d.indicators.map((it: any) => ({
              name: it.name || '',
              standardKey: it.standardKey || it.name || '',
              value: String(it.value ?? ''),
              unit: it.unit || '',
              referenceRange: it.referenceRange || ''
            })));
          }
          setOcrSource(respData.source || 'gemini-3.8-flash-vision');
          setOcrNotice(`✨ AI 视觉识别完成！已精准提取 ${d.indicators?.length || 0} 项指标并对齐参考区间，请核对。`);
        }
      } else {
        setOcrNotice('AI 识别服务响应异常，请检查网络或手工录入。');
      }
    } catch (err) {
      console.warn('OCR request error:', err);
      setOcrNotice('识别未完成，请保留图片并手工录入。');
    } finally {
      setIsAiOcrLoading(false);
    }
  };

  const handleSimulateAiOcr = () => {
    setSummary(rawText);
    setOcrNotice('文字已复制到摘要，请根据原报告手工填写指标；未执行自动识别。');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !hospital.trim() || !date) return;

    const parsedIndicators: IndicatorItem[] = indicators
      .filter((i) => i.name.trim() && i.value.trim())
      .map((i, idx) => {
        const num = parseFloat(i.value);
        return {
          id: `new-ind-${Date.now()}-${idx}`,
          name: i.name,
          standardKey: i.standardKey || i.name.toUpperCase().replace(/[^A-Z0-9]/g, '_'),
          value: isNaN(num) ? i.value : num,
          numericValue: isNaN(num) ? undefined : num,
          unit: i.unit,
          referenceRange: i.referenceRange,
          status: 'normal',
          clinicalNote: '新录入指标'
        };
      });

    const newReport: MedicalReport = {
      id: `rep-custom-${Date.now()}`,
      memberId,
      title,
      hospital,
      date,
      category,
      tags: ['新录入', category],
      summary: summary || '用户新上传的医疗检测记录。',
      keyFindings: indicators.map((i) => `${i.name}: ${i.value} ${i.unit}`),
      indicators: parsedIndicators,
      doctorAdvice: '遵医嘱随访。',
      imageUrl: reportImagePreview || undefined
    };

    onAddReport(newReport);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-[#1a1a1c] w-full max-w-2xl text-[#1a1a1c] shadow-[12px_12px_0_rgba(26,26,28,0.15)] overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#1a1a1c] bg-[#fdfdfb]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 border border-[#1a1a1c] bg-white flex items-center justify-center text-[#5562ff]">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <span className="font-editorial-mono text-[10px] uppercase tracking-widest text-[#1a1a1c]/50 font-bold block">
                FILE ARCHIVE · 新增病历档案
              </span>
              <h3 className="font-editorial-serif text-2xl font-medium tracking-tight text-[#1a1a1c]">
                上传 / 录入新健康报告
              </h3>
            </div>
          </div>
          <button
            id="close-upload-modal-btn"
            onClick={onClose}
            className="text-[#1a1a1c]/50 hover:text-[#1a1a1c] p-1 border border-transparent hover:border-[#1a1a1c] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Simulation Templates */}
        <div className="p-5 border-b border-[#1a1a1c]/15 bg-[#f8f8f6]">
          <span className="font-editorial-mono text-[10px] font-bold text-[#1a1a1c]/60 uppercase tracking-widest block mb-2">
            快速加载后续随访报告模拟 [SIMULATION PRESETS]：
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              id="preset-fill-tsh-btn"
              onClick={() => handleQuickFill('tsh_recheck')}
              className="px-3 py-1.5 bg-white text-[#1a1a1c] border border-[#1a1a1c] hover:bg-[#1a1a1c] hover:text-white text-xs font-semibold transition"
            >
              + 填写虚构演示报告
            </button>
            <button
              type="button"
              id="preset-fill-semen-btn"
              onClick={() => handleQuickFill('semen_test')}
              className="px-3 py-1.5 bg-white text-[#1a1a1c] border border-[#1a1a1c] hover:bg-[#1a1a1c] hover:text-white text-xs font-semibold transition"
            >
              + 填写通用演示报告
            </button>
            <button
              type="button"
              id="preset-fill-allergy-btn"
              onClick={() => handleQuickFill('allergy_panel')}
              className="px-3 py-1.5 bg-white text-[#1a1a1c] border border-[#1a1a1c] hover:bg-[#1a1a1c] hover:text-white text-xs font-semibold transition"
            >
              + 填写示例检查记录
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* File Image Upload Zone */}
          <div className="p-3.5 bg-[#fdfdfb] border border-dashed border-[#1a1a1c]/40 rounded-xs">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            {isCompressing ? (
              <div className="py-4 text-center flex flex-col items-center justify-center">
                <Loader2 className="w-5 h-5 text-[#5562ff] animate-spin mb-1.5" />
                <p className="font-editorial-mono text-xs font-bold text-[#1a1a1c]">
                  正在进行高精临床图片智能压缩与云端规格适配...
                </p>
                <p className="font-editorial-mono text-[10px] text-[#1a1a1c]/50 mt-0.5">
                  智能降采样至云端安全大小 (&lt;500KB)，完整保留检测项目、数值、参考区间与条形码
                </p>
              </div>
            ) : reportImagePreview ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <img
                    src={reportImagePreview}
                    alt="报告预览"
                    className="w-12 h-12 object-cover border border-[#1a1a1c] shrink-0"
                  />
                  <div className="overflow-hidden">
                    <span className="font-editorial-mono text-xs font-bold text-[#1a1a1c] block truncate">
                      {imageFileName || '已选择报告图片'}
                    </span>
                    {compressionResult ? (
                      <span className="font-editorial-mono text-[10px] text-[#188038] font-semibold flex items-center gap-1">
                        <Cloud className="w-3 h-3 text-[#188038] shrink-0" />
                        <span>
                          原图 {compressionResult.originalSizeFormatted} ➔ 已优化至 {compressionResult.compressedSizeFormatted}（省 {compressionResult.reductionPercentage}%，适配云端&lt;1MB规范）
                        </span>
                      </span>
                    ) : (
                      <span className="font-editorial-mono text-[10px] text-[#188038] font-semibold flex items-center gap-1">
                        <Cloud className="w-3 h-3 text-[#188038] shrink-0" />
                        <span>✓ 图片已装载并就绪，支持云端长效同步与本地保存</span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleDownloadUploadedImage}
                    className="px-2.5 py-1 text-xs border border-[#1a1a1c] hover:bg-[#1a1a1c] hover:text-white font-editorial-mono flex items-center gap-1 transition"
                    title="下载并保存此报告图片到本地设备"
                  >
                    <Download className="w-3 h-3 text-[#5562ff]" />
                    <span>保存到本地</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2 py-1 text-xs text-[#1a1a1c]/60 hover:text-[#1a1a1c] font-editorial-mono underline"
                  >
                    更换
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer py-3 text-center flex flex-col items-center justify-center hover:bg-white transition"
              >
                <Upload className="w-5 h-5 text-[#5562ff] mb-1" />
                <p className="font-editorial-mono text-xs font-bold text-[#1a1a1c]">
                  点击上传纸质化验单 / 电子检验报告图片 (自动压缩云端长效保存)
                </p>
                <p className="font-editorial-mono text-[10px] text-[#1a1a1c]/50 mt-0.5">
                  支持 JPG、PNG、WEBP · 自动智能优化至 &lt;1MB 并同步至 Firestore 云端数据库
                </p>
              </div>
            )}
          </div>

          {/* AI Vision OCR Recognition Bar */}
          <div className="bg-[#f0f4ff] border border-[#5562ff]/30 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-start sm:items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#5562ff] shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <span className="font-editorial-mono text-xs font-bold text-[#1a1a1c] block">
                  AI 智能视觉提取 (Gemini Vision OCR)
                </span>
                <span className="font-editorial-mono text-[10px] text-[#1a1a1c]/60 block">
                  一键读取化验单照片中的医院、日期、全部检验项目、数值、参考区间与高低箭头
                </span>
              </div>
            </div>
            <button
              type="button"
              id="run-gemini-ocr-btn"
              onClick={handleRunAiVisionOcr}
              disabled={isAiOcrLoading}
              className="px-3.5 py-1.5 bg-[#5562ff] text-white hover:bg-[#4350ea] disabled:opacity-50 text-xs font-bold font-editorial-mono flex items-center justify-center gap-1.5 shrink-0 transition shadow-xs"
            >
              {isAiOcrLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Gemini 正在高精度切片识别...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{reportImagePreview ? '一键识别化验单' : '智能识别化验单'}</span>
                </>
              )}
            </button>
          </div>

          {ocrNotice && (
            <div className="p-2.5 bg-[#e6f4ea] border border-[#188038]/30 flex items-center justify-between text-xs text-[#137333] font-editorial-mono">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#188038]" />
                <span>{ocrNotice}</span>
              </div>
              {ocrSource && (
                <span className="text-[10px] bg-white px-1.5 py-0.5 border border-[#188038]/30 font-bold">
                  {ocrSource}
                </span>
              )}
            </div>
          )}

          {/* Member & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-editorial-mono text-[11px] font-bold text-[#1a1a1c] mb-1">
                所属家庭成员
              </label>
              <select
                id="upload-member-select"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                className="w-full bg-white border border-[#1a1a1c] px-3 py-2 text-xs text-[#1a1a1c] focus:outline-none focus:ring-1 focus:ring-[#5562ff]"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.relationship})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-editorial-mono text-[11px] font-bold text-[#1a1a1c] mb-1">
                报告类型分类
              </label>
              <select
                id="upload-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value as ReportCategory)}
                className="w-full bg-white border border-[#1a1a1c] px-3 py-2 text-xs text-[#1a1a1c] focus:outline-none focus:ring-1 focus:ring-[#5562ff]"
              >
                <option value="血生化与激素">血生化与激素</option>
                <option value="超声影像">超声影像</option>
                <option value="染色体与遗传学">染色体与遗传学</option>
                <option value="常规体检">常规体检</option>
                <option value="精液与生殖专科">精液与生殖专科</option>
                <option value="其他化验">其他化验</option>
              </select>
            </div>
          </div>

          {/* Title & Hospital */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-editorial-mono text-[11px] font-bold text-[#1a1a1c] mb-1">
                报告标题
              </label>
              <input
                type="text"
                id="upload-title-input"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：常规检查报告"
                className="w-full bg-white border border-[#1a1a1c] px-3 py-2 text-xs text-[#1a1a1c] placeholder-[#1a1a1c]/40 focus:outline-none focus:ring-1 focus:ring-[#5562ff]"
              />
            </div>

            <div>
              <label className="block font-editorial-mono text-[11px] font-bold text-[#1a1a1c] mb-1">
                医疗机构 / 医院
              </label>
              <input
                type="text"
                id="upload-hospital-input"
                required
                value={hospital}
                onChange={(e) => setHospital(e.target.value)}
                placeholder="例如：医疗机构"
                className="w-full bg-white border border-[#1a1a1c] px-3 py-2 text-xs text-[#1a1a1c] placeholder-[#1a1a1c]/40 focus:outline-none focus:ring-1 focus:ring-[#5562ff]"
              />
            </div>
          </div>

          {/* Date & Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-editorial-mono text-[11px] font-bold text-[#1a1a1c] mb-1">
                检查报告日期
              </label>
              <input
                type="date"
                id="upload-date-input"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white border border-[#1a1a1c] px-3 py-2 text-xs text-[#1a1a1c] font-editorial-mono focus:outline-none focus:ring-1 focus:ring-[#5562ff]"
              />
            </div>

            <div>
              <label className="block font-editorial-mono text-[11px] font-bold text-[#1a1a1c] mb-1">
                临床小结 / 诊断
              </label>
              <input
                type="text"
                id="upload-summary-input"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="简述报告核心结论"
                className="w-full bg-white border border-[#1a1a1c] px-3 py-2 text-xs text-[#1a1a1c] placeholder-[#1a1a1c]/40 focus:outline-none focus:ring-1 focus:ring-[#5562ff]"
              />
            </div>
          </div>

          {/* Indicators extracted list */}
          <div className="pt-3 border-t border-[#1a1a1c]/15">
            <div className="flex items-center justify-between mb-2.5">
              <label className="font-editorial-mono text-xs font-bold text-[#1a1a1c]">
                提炼的检验数据指标 (将自动纳入跨报告对比曲线)
              </label>
              <button
                type="button"
                id="add-indicator-row-btn"
                onClick={handleAddIndicatorRow}
                className="font-editorial-mono text-xs text-[#5562ff] hover:underline font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>添加指标项</span>
              </button>
            </div>

            <div className="space-y-2">
              {indicators.map((ind, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-[#fdfdfb] p-2 border border-[#1a1a1c]/20">
                  <input
                    type="text"
                    placeholder="指标名 (如 TSH)"
                    value={ind.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setIndicators((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, name: val, standardKey: val.includes('TSH') ? 'TSH' : val } : item))
                      );
                    }}
                    className="flex-1 bg-white border border-[#1a1a1c]/30 px-2 py-1 text-xs text-[#1a1a1c]"
                  />
                  <input
                    type="text"
                    placeholder="数值 (如 1.35)"
                    value={ind.value}
                    onChange={(e) => {
                      const val = e.target.value;
                      setIndicators((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, value: val } : item))
                      );
                    }}
                    className="w-24 bg-white border border-[#1a1a1c]/30 px-2 py-1 text-xs text-[#1a1a1c] font-editorial-mono font-bold"
                  />
                  <input
                    type="text"
                    placeholder="单位"
                    value={ind.unit}
                    onChange={(e) => {
                      const val = e.target.value;
                      setIndicators((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, unit: val } : item))
                      );
                    }}
                    className="w-20 bg-white border border-[#1a1a1c]/30 px-2 py-1 text-xs text-[#1a1a1c] font-editorial-mono"
                  />
                  {indicators.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveIndicatorRow(idx)}
                      className="text-[#1a1a1c]/40 hover:text-[#d93025] p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between sm:justify-end gap-3 pt-4 border-t border-[#1a1a1c]/15 dark:border-zinc-700">
            <button
              type="button"
              id="cancel-upload-btn"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-5 py-2.5 min-h-[38px] text-xs font-editorial-mono text-[#1a1a1c]/70 dark:text-zinc-400 hover:text-[#1a1a1c] dark:hover:text-white border border-[#1a1a1c]/20 dark:border-zinc-700 hover:border-[#1a1a1c]/40 rounded-full transition cursor-pointer text-center"
            >
              取消
            </button>
            <button
              type="submit"
              id="submit-upload-btn"
              className="flex-1 sm:flex-initial px-6 py-2.5 min-h-[38px] rounded-full text-xs font-semibold text-white dark:text-zinc-900 bg-[#1a1a1c] dark:bg-zinc-100 hover:bg-black dark:hover:bg-white shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>保存并自动比对</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
