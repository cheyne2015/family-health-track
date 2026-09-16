import { FamilyMember, MedicalReport, AnomalyAlert } from '../types';

// Independently invented demonstration records; no patient-derived values.
export const initialFamilyMembers: FamilyMember[] = [{
  id: 'member-1', name: '演示成员', relationship: '演示', age: 30, gender: 'male',
  tags: ['虚构演示数据'], avatarColor: 'from-blue-600 to-indigo-700',
  healthStatusSummary: '以下检查记录均为虚构，仅用于演示报告归档与跨机构指标对比。'
}];
export const initialMedicalReports: MedicalReport[] = [
  ['2030-01-10', '演示机构 A', 5.0],
  ['2030-02-10', '演示机构 B', 5.3],
  ['2030-03-10', '演示机构 A', 5.1],
].map(([date, hospital, value], index) => ({
  id: `demo-report-${index}`, memberId: 'member-1', title: '常规检查（虚构演示）',
  hospital: String(hospital), date: String(date), category: '常规体检', tags: ['虚构'],
  summary: '独立编造的演示记录，不代表个人检查结果。', keyFindings: [],
  indicators: [{ id: `demo-indicator-${index}`, name: '演示指标', standardKey: 'DEMO',
    value: Number(value), numericValue: Number(value), unit: '演示单位', referenceRange: '未设定', status: 'info' }]
}));
export const initialAnomalyAlerts: AnomalyAlert[] = [];
export const indicatorTrendConfigs: Record<string, {name:string;unit:string;minVal:number;maxVal:number;safeMin?:number;safeMax?:number;optimalMin?:number;optimalMax?:number;description:string}> = {};
