import React, { useState } from 'react';
import { MedicalReport, IndicatorItem } from '../types';
import { indicatorTrendConfigs } from '../data/mockHealthData';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine, 
  ReferenceArea 
} from 'recharts';
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Sparkles, 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus,
  HelpCircle
} from 'lucide-react';

interface IndicatorComparisonViewProps {
  reports: MedicalReport[];
  initialSelectedKey?: string;
  onAskAIAboutIndicator: (indicatorName: string, historySummary: string) => void;
}

interface IndicatorTrendConfig {
  name: string;
  unit: string;
  minVal: number;
  maxVal: number;
  safeMin?: number;
  safeMax?: number;
  optimalMin?: number;
  optimalMax?: number;
  description: string;
}

export const IndicatorComparisonView: React.FC<IndicatorComparisonViewProps> = ({
  reports,
  initialSelectedKey,
  onAskAIAboutIndicator
}) => {
  // Collect all unique indicator standard keys across reports
  const availableKeys: string[] = Array.from(
    new Set(
      reports
        .flatMap((r) => r.indicators.map((i) => i.standardKey))
        .filter((k): k is string => Boolean(k))
    )
  );

  const defaultKey = initialSelectedKey && availableKeys.includes(initialSelectedKey) ? initialSelectedKey : availableKeys[0] || '';
  const [selectedKey, setSelectedKey] = useState<string>(defaultKey);

  // Extract historical points for the selected key, sorted by date ascending for chart
  const historyPoints = reports
    .map((report) => {
      const ind = report.indicators.find((i) => i.standardKey === selectedKey);
      if (!ind || ind.numericValue === undefined) return null;
      return {
        date: report.date,
        reportTitle: report.title,
        hospital: report.hospital,
        value: ind.numericValue,
        displayValue: ind.value,
        unit: ind.unit,
        status: ind.status,
        clinicalNote: ind.clinicalNote,
        referenceRange: ind.referenceRange,
        gestationalAge: report.gestationalAge
      };
    })
    .filter((pt): pt is NonNullable<typeof pt> => pt !== null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const currentConfig: IndicatorTrendConfig = indicatorTrendConfigs[selectedKey] || {
    name: reports.flatMap(r=>r.indicators).find(i=>i.standardKey===selectedKey)?.name || selectedKey,
    unit: historyPoints[0]?.unit || '',
    minVal: 0,
    maxVal: 100,
    description: '按检查日期展示用户提供的数值，请核对单位和参考范围'
  };

  // Calculate comparisons step by step
  const comparisonRows = historyPoints.map((curr, idx) => {
    if (idx === 0) {
      return {
        ...curr,
        diffAbs: 0,
        diffPct: 0,
        trend: 'first' as const,
        isAnomaly: false
      };
    }
    const prev = historyPoints[idx - 1];
    const diff = curr.value - prev.value;
    const pct = prev.value !== 0 ? (diff / prev.value) * 100 : 0;
    const trend = diff > 0.001 ? 'up' : diff < -0.001 ? 'down' : 'stable';
    
    // Check if anomaly
    const isAnomaly = curr.status === 'critical' || curr.status === 'warning' || Math.abs(pct) > 50;
    return {
      ...curr,
      diffAbs: diff,
      diffPct: pct,
      trend,
      isAnomaly,
      prevDate: prev.date,
      prevVal: prev.value
    };
  });

  const latestPoint = historyPoints[historyPoints.length - 1];
  const firstPoint = historyPoints[0];

  const handleAskAI = () => {
    const summary = historyPoints
      .map((p) => `${p.date}: ${p.value} ${p.unit} (${p.status === 'critical' ? '严重异常' : p.status === 'warning' ? '偏异' : '正常'})`)
      .join('; ');
    onAskAIAboutIndicator(currentConfig.name, summary);
  };

  return (
    <div className="space-y-6 text-[#1a1a1c]">
      {/* Indicator Selectors Pill Bar */}
      <div className="bg-white border border-[#1a1a1c] p-5 shadow-[4px_4px_0_rgba(26,26,28,0.06)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <span className="font-editorial-mono text-[10px] uppercase tracking-widest text-[#1a1a1c]/50 font-bold">
            选择需要对比监测的指标 [INDICATOR SELECTOR]
          </span>
          <span className="font-editorial-mono text-[11px] text-[#1a1a1c]/60">
            自动匹配不同时间、不同医院化验单上的同类数据
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {availableKeys.map((key) => {
            const cfg = indicatorTrendConfigs[key];
            const name = cfg ? cfg.name : reports.flatMap(r=>r.indicators).find(i=>i.standardKey===key)?.name || key;
            const isSelected = key === selectedKey;
            return (
              <button
                key={key}
                id={`select-indicator-btn-${key}`}
                onClick={() => setSelectedKey(key)}
                className={`px-3.5 py-1.5 min-h-[32px] rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-[#1a1a1c] text-[#fdfdfb] shadow-xs'
                    : 'bg-white text-[#1a1a1c]/80 hover:text-[#1a1a1c] hover:bg-[#1a1a1c]/5 border border-[#1a1a1c]/30'
                }`}
              >
                <span>{name}</span>
                {key === 'TSH' && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-editorial-mono ${isSelected ? 'bg-white/20 text-white' : 'bg-[#1a1a1c]/10 text-[#1a1a1c]'}`}>
                    重点
                  </span>
                )}
                {key === 'EOSINOPHILS_PCT' && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-editorial-mono ${isSelected ? 'bg-[#d93025] text-white' : 'border border-[#d93025] text-[#d93025]'}`}>
                    异常
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Analysis Card */}
      {historyPoints.length === 0 ? (
        <div className="bg-white border border-dashed border-[#1a1a1c]/30 p-12 text-center text-[#1a1a1c]/50">
          <Info className="w-8 h-8 mx-auto text-[#1a1a1c]/30 mb-2" />
          <p className="text-sm font-semibold">该家庭成员暂无此项指标的连续历史数据</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Chart & Key Summary */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-[#1a1a1c] p-6 shadow-[6px_6px_0_rgba(26,26,28,0.06)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1a1a1c]/10">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-editorial-serif text-2xl font-medium tracking-tight text-[#1a1a1c]">
                      {currentConfig.name}
                    </h3>
                    <span className="font-editorial-mono text-xs px-2 py-0.5 rounded border border-[#1a1a1c]/20 bg-[#fdfdfb] text-[#1a1a1c]/70">
                      单位: {currentConfig.unit}
                    </span>
                  </div>
                  <p className="text-xs text-[#1a1a1c]/65 mt-1 leading-relaxed">{currentConfig.description}</p>
                </div>

                <button
                  id="ask-ai-indicator-analysis-btn"
                  onClick={handleAskAI}
                  className="shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#1a1a1c] hover:bg-[#1a1a1c] hover:text-white text-xs font-semibold transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#5562ff]" />
                  <span>AI 解析指标波动</span>
                </button>
              </div>

              {/* Chart */}
              <div className="mt-5 h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historyPoints} margin={{ top: 15, right: 30, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1c" strokeOpacity={0.08} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#1a1a1c" 
                      tick={{ fill: '#1a1a1c', fontSize: 11, fontFamily: 'Space Mono' }}
                      tickMargin={10}
                    />
                    <YAxis 
                      stroke="#1a1a1c" 
                      tick={{ fill: '#1a1a1c', fontSize: 11, fontFamily: 'Space Mono' }}
                      domain={['dataMin - 1', 'dataMax + 1']}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#1a1a1c',
                        borderWidth: '1px',
                        boxShadow: '4px 4px 0 rgba(26,26,28,0.1)',
                        color: '#1a1a1c',
                        fontSize: '12px',
                        borderRadius: '0px'
                      }}
                      formatter={(val: any) => [`${val} ${currentConfig.unit}`, currentConfig.name]}
                      labelFormatter={(label) => `检测日期: ${label}`}
                    />

                    {/* Reference Lines if configured */}
                    {currentConfig.optimalMax && (
                      <ReferenceLine
                        y={currentConfig.optimalMax}
                        stroke="#188038"
                        strokeDasharray="4 4"
                        label={{
                          value: `健康管理黄金理想上限 (${currentConfig.optimalMax})`,
                          fill: '#188038',
                          fontSize: 10,
                          position: 'top',
                          fontFamily: 'Space Mono'
                        }}
                      />
                    )}
                    {currentConfig.safeMax && (
                      <ReferenceLine
                        y={currentConfig.safeMax}
                        stroke="#d93025"
                        strokeDasharray="3 3"
                        label={{
                          value: `常规参考上限 (${currentConfig.safeMax})`,
                          fill: '#d93025',
                          fontSize: 10,
                          position: 'insideBottomRight',
                          fontFamily: 'Space Mono'
                        }}
                      />
                    )}

                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#1a1a1c"
                      strokeWidth={2.5}
                      dot={{ r: 5, fill: '#5562ff', strokeWidth: 2, stroke: '#1a1a1c' }}
                      activeDot={{ r: 7, fill: '#1a1a1c', stroke: '#5562ff', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Chart Legend */}
              <div className="mt-2 flex flex-wrap items-center justify-between text-xs text-[#1a1a1c]/60 pt-3 border-t border-[#1a1a1c]/10">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#5562ff] border border-[#1a1a1c]" />
                    <span className="font-editorial-mono text-[11px]">历史检测值</span>
                  </span>
                  {currentConfig.optimalMax && (
                    <span className="flex items-center gap-1.5 text-[#188038]">
                      <span className="w-3 h-0.5 bg-[#188038]" />
                      <span className="font-editorial-mono text-[11px]">健康管理目标 (&lt; {currentConfig.optimalMax})</span>
                    </span>
                  )}
                  {currentConfig.safeMax && (
                    <span className="flex items-center gap-1.5 text-[#d93025]">
                      <span className="w-3 h-0.5 bg-[#d93025]" />
                      <span className="font-editorial-mono text-[11px]">警戒线 ({currentConfig.safeMax})</span>
                    </span>
                  )}
                </div>
                <span className="font-editorial-mono text-[11px]">共比对 {historyPoints.length} 次检查</span>
              </div>
            </div>

            {/* Historical Comparison Table */}
            <div className="bg-white border border-[#1a1a1c] p-6 shadow-[6px_6px_0_rgba(26,26,28,0.06)]">
              <h4 className="font-editorial-serif text-xl font-medium tracking-tight text-[#1a1a1c] mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#5562ff]" />
                <span>相同指标逐次对比明细表</span>
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#1a1a1c] text-[#1a1a1c]/60 font-editorial-mono text-[11px] bg-[#f8f8f6]">
                      <th className="p-2.5">检查时间</th>
                      <th className="p-2.5">医疗机构</th>
                      <th className="p-2.5">检测数值</th>
                      <th className="p-2.5">较上一次变化</th>
                      <th className="p-2.5">变化率 (%)</th>
                      <th className="p-2.5">状态评估</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1a1a1c]/10">
                    {comparisonRows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-[#f8f8f6] transition">
                        <td className="p-2.5 font-editorial-mono font-bold text-[#1a1a1c]">{row.date}</td>
                        <td className="p-2.5 text-[#1a1a1c]/70">{row.hospital}</td>
                        <td className="p-2.5 font-editorial-mono font-bold text-[#1a1a1c]">
                          {row.displayValue} {row.unit}
                        </td>
                        <td className="p-2.5">
                          {row.trend === 'first' ? (
                            <span className="text-[#1a1a1c]/40 font-editorial-mono">基准初值</span>
                          ) : (
                            <span
                              className={`flex items-center gap-1 font-editorial-mono font-bold ${
                                row.trend === 'up'
                                  ? 'text-[#d93025]'
                                  : row.trend === 'down'
                                  ? 'text-[#5562ff]'
                                  : 'text-[#1a1a1c]/60'
                              }`}
                            >
                              {row.trend === 'up' && <ArrowUpRight className="w-3.5 h-3.5" />}
                              {row.trend === 'down' && <ArrowDownRight className="w-3.5 h-3.5" />}
                              {row.trend === 'stable' && <Minus className="w-3.5 h-3.5" />}
                              <span>{row.diffAbs > 0 ? `+${row.diffAbs.toFixed(2)}` : row.diffAbs.toFixed(2)} {row.unit}</span>
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 font-editorial-mono">
                          {row.trend === 'first' ? (
                            <span className="text-[#1a1a1c]/40">-</span>
                          ) : (
                            <span className={`font-bold ${Math.abs(row.diffPct) > 30 ? 'text-[#d93025]' : 'text-[#1a1a1c]'}`}>
                              {row.diffPct > 0 ? `+${row.diffPct.toFixed(1)}%` : `${row.diffPct.toFixed(1)}%`}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              row.status === 'critical'
                                ? 'bg-[#fffafa] text-[#d93025] border-[#d93025]'
                                : row.status === 'warning'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-emerald-50 text-[#188038] border-emerald-300'
                            }`}
                          >
                            {row.status === 'critical' ? '严重异常' : row.status === 'warning' ? '需关注' : '正常'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Col: AI Clinical Insights & Guidance */}
          <div className="space-y-6">
            <div className="bg-white border border-[#1a1a1c] p-6 shadow-[6px_6px_0_rgba(26,26,28,0.06)] space-y-4">
              <div className="flex items-center gap-2 text-[#1a1a1c] font-semibold text-sm">
                <Sparkles className="w-4 h-4 text-[#5562ff]" />
                <span className="font-editorial-serif text-lg">AI 临床异常变化对比洞察</span>
              </div>

              <div className="text-sm leading-relaxed">
                {currentConfig.name} 共记录 {historyPoints.length} 次。请先核对不同报告中的单位、检测方法和参考范围，再解释变化；此处不预设病因或诊疗结论。
              </div>

              <button
                id="deep-dive-btn"
                onClick={handleAskAI}
                className="w-full py-2.5 px-4 min-h-[38px] rounded-full bg-[#1a1a1c] text-[#fdfdfb] font-semibold text-xs transition shadow-xs flex items-center justify-center gap-1.5 hover:bg-black cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#818cf8]" />
                <span>就此指标深度向 AI 提问</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
