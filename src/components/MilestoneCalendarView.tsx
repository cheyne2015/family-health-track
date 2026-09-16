import React, { useState, useEffect } from 'react';
import { FamilyMember, HealthMilestone, MedicationScheduleItem } from '../types';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Pill,
  Sparkles,
  Check,
  ChevronRight,
  Stethoscope,
  Trash2,
  CalendarCheck,
  Info
} from 'lucide-react';

interface MilestoneCalendarViewProps {
  member: FamilyMember;
  onNavigateToAi?: (question: string) => void;
}

export const MilestoneCalendarView: React.FC<MilestoneCalendarViewProps> = ({
  member,
  onNavigateToAi
}) => {
  const defaultMilestones: HealthMilestone[] = [];
  const defaultMedications: MedicationScheduleItem[] = [];

  const [milestones, setMilestones] = useState<HealthMilestone[]>(() => {
    const saved = localStorage.getItem(`milestones_${member.id}`);
    return saved ? JSON.parse(saved) : defaultMilestones;
  });

  const [medications, setMedications] = useState<MedicationScheduleItem[]>(() => {
    const saved = localStorage.getItem(`medications_${member.id}`);
    return saved ? JSON.parse(saved) : defaultMedications;
  });

  const todayStr = new Date().toISOString().split('T')[0];

  // Save changes
  useEffect(() => {
    localStorage.setItem(`milestones_${member.id}`, JSON.stringify(milestones));
  }, [milestones, member.id]);

  useEffect(() => {
    localStorage.setItem(`medications_${member.id}`, JSON.stringify(medications));
  }, [medications, member.id]);

  // Modal for adding a new milestone
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newCategory, setNewCategory] = useState<HealthMilestone['category']>('复查');
  const [newHospital, setNewHospital] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newPriority, setNewPriority] = useState<HealthMilestone['priority']>('medium');

  const handleToggleMilestoneStatus = (id: string) => {
    setMilestones((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          const nextStatus = m.status === 'completed' ? 'pending' : 'completed';
          return {
            ...m,
            status: nextStatus,
            completedAt: nextStatus === 'completed' ? new Date().toISOString() : undefined
          };
        }
        return m;
      })
    );
  };

  const handleDeleteMilestone = (id: string) => {
    setMilestones((prev) => prev.filter((m) => m.id !== id));
  };

  const handleToggleMedicationToday = (id: string) => {
    setMedications((prev) =>
      prev.map((med) => {
        if (med.id === id) {
          const currentChecks = med.historyCheckDates || [];
          const isCheckedToday = currentChecks.includes(todayStr);
          const updatedChecks = isCheckedToday
            ? currentChecks.filter((d) => d !== todayStr)
            : [...currentChecks, todayStr];
          return { ...med, historyCheckDates: updatedChecks };
        }
        return med;
      })
    );
  };

  const handleAddMilestoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDate) return;

    const newItem: HealthMilestone = {
      id: `ms-${Date.now()}`,
      memberId: member.id,
      title: newTitle.trim(),
      targetDate: newDate,
      category: newCategory,
      status: 'pending',
      priority: newPriority,
      hospital: newHospital,
      clinicalNote: newNote.trim() || '自定随访备忘'
    };

    setMilestones((prev) => [...prev, newItem].sort((a, b) => a.targetDate.localeCompare(b.targetDate)));
    setNewTitle('');
    setNewDate('');
    setNewNote('');
    setIsAddModalOpen(false);
  };

  const completedMedCount = medications.filter((m) => (m.historyCheckDates || []).includes(todayStr)).length;
  const medCompliancePct = medications.length > 0 ? Math.round((completedMedCount / medications.length) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Top Banner: Milestone & Routine Overview */}
      <div className="bg-white border border-[#1a1a1c] p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-[#5562ff] text-white shrink-0 mt-0.5">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-editorial-sans text-xl font-bold text-[#1a1a1c]">
                  随访复查提醒与健康管理里程碑日程
                </h2>
                <span className="px-2 py-0.5 bg-[#f0f0ea] border border-[#1a1a1c]/30 text-xs font-editorial-mono font-bold text-[#1a1a1c]">
                  {member.name}
                </span>
              </div>
              <p className="font-editorial-mono text-xs text-[#1a1a1c]/70 mt-1">
                记录用户自行添加的复查事项和就医安排，不预置治疗日程。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              id="add-new-milestone-btn"
              onClick={() => setIsAddModalOpen(true)}
              className="w-full sm:w-auto px-3.5 py-2 min-h-[36px] bg-[#1a1a1c] hover:bg-[#5562ff] text-white text-xs font-bold font-editorial-mono flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新建复查/就诊提醒</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Milestone Timeline */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#5562ff]" />
              <h3 className="font-editorial-mono text-sm font-bold uppercase tracking-wider text-[#1a1a1c]">
                重要就诊与检验倒计时日程 (CLINICAL MILESTONES)
              </h3>
            </div>
            <span className="text-xs font-editorial-mono text-[#1a1a1c]/60">
              共 {milestones.length} 项关键节点
            </span>
          </div>

          <div className="space-y-3">
            {milestones.map((item) => {
              const isCompleted = item.status === 'completed';
              const target = new Date(item.targetDate);
              const today = new Date(todayStr);
              const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 3600 * 24));

              return (
                <div
                  key={item.id}
                  className={`p-4 border transition ${
                    isCompleted
                      ? 'bg-[#f7f7f4] border-[#1a1a1c]/20 opacity-75'
                      : 'bg-white border-[#1a1a1c] hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleMilestoneStatus(item.id)}
                        className={`mt-0.5 p-1 rounded-xs transition ${
                          isCompleted
                            ? 'bg-[#188038] text-white'
                            : 'border border-[#1a1a1c]/40 hover:border-[#5562ff] text-transparent hover:text-[#5562ff]'
                        }`}
                        title={isCompleted ? '标记为未完成' : '标记为已完成'}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`font-editorial-mono text-xs font-bold px-2 py-0.5 border ${
                              item.priority === 'high'
                                ? 'bg-[#ffebee] text-[#b3261e] border-[#b3261e]/30'
                                : 'bg-[#e8f0fe] text-[#5562ff] border-[#5562ff]/30'
                            }`}
                          >
                            {item.category}
                          </span>
                          <h4
                            className={`font-editorial-mono text-sm font-bold ${
                              isCompleted ? 'line-through text-[#1a1a1c]/50' : 'text-[#1a1a1c]'
                            }`}
                          >
                            {item.title}
                          </h4>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs font-editorial-mono text-[#1a1a1c]/70 mt-1.5">
                          <span className="flex items-center gap-1 font-bold text-[#1a1a1c]">
                            <Clock className="w-3.5 h-3.5 text-[#5562ff]" />
                            <span>计划日期: {item.targetDate}</span>
                          </span>
                          {item.hospital && (
                            <span className="flex items-center gap-1 text-[#1a1a1c]/60">
                              <Stethoscope className="w-3.5 h-3.5" />
                              <span>{item.hospital}</span>
                            </span>
                          )}
                        </div>

                        <p className="font-editorial-mono text-xs text-[#1a1a1c]/80 mt-2 leading-relaxed bg-[#f9f9f6] p-2 border border-[#1a1a1c]/10">
                          <span className="font-bold text-[#5562ff]">临床意义：</span>
                          {item.clinicalNote}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {!isCompleted ? (
                        <span
                          className={`font-editorial-mono text-xs px-2 py-0.5 font-bold ${
                            diffDays <= 0
                              ? 'bg-[#ffebee] text-[#b3261e]'
                              : diffDays <= 7
                              ? 'bg-[#fff8e1] text-[#b26a00]'
                              : 'bg-[#e8f0fe] text-[#5562ff]'
                          }`}
                        >
                          {diffDays === 0
                            ? '就是今天！'
                            : diffDays > 0
                            ? `还有 ${diffDays} 天`
                            : `已过期 ${Math.abs(diffDays)} 天`}
                        </span>
                      ) : (
                        <span className="font-editorial-mono text-[11px] text-[#188038] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>已按时复查</span>
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteMilestone(item.id)}
                        className="text-[#1a1a1c]/40 hover:text-[#b3261e] p-1 transition"
                        title="删除此项"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Daily Regimen & Compliance Checklist */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pill className="w-4 h-4 text-[#5562ff]" />
              <h3 className="font-editorial-mono text-sm font-bold uppercase tracking-wider text-[#1a1a1c]">
                每日用药与营养素打卡 (DAILY REGIMEN)
              </h3>
            </div>
            <span className="text-xs font-editorial-mono text-[#188038] font-bold">
              今日完成 {completedMedCount}/{medications.length}
            </span>
          </div>

          <div className="bg-white border border-[#1a1a1c] p-4 space-y-4">
            {/* Progress bar */}
            <div>
              <div className="flex items-center justify-between text-xs font-editorial-mono font-bold mb-1">
                <span>今日服药依从度</span>
                <span className="text-[#5562ff]">{medCompliancePct}%</span>
              </div>
              <div className="w-full bg-[#f0f0ea] h-2 rounded-xs overflow-hidden">
                <div
                  className="bg-[#5562ff] h-full transition-all duration-300"
                  style={{ width: `${medCompliancePct}%` }}
                />
              </div>
            </div>

            {/* Checklist items */}
            <div className="space-y-2.5">
              {medications.map((med) => {
                const isCheckedToday = (med.historyCheckDates || []).includes(todayStr);

                return (
                  <div
                    key={med.id}
                    onClick={() => handleToggleMedicationToday(med.id)}
                    className={`p-3 border cursor-pointer transition ${
                      isCheckedToday
                        ? 'bg-emerald-50/50 border-[#188038]/50 text-[#188038]'
                        : 'bg-[#fdfdfb] border-[#1a1a1c]/20 hover:border-[#1a1a1c]'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5">
                        {isCheckedToday ? (
                          <CheckCircle2 className="w-4 h-4 text-[#188038]" />
                        ) : (
                          <div className="w-4 h-4 border border-[#1a1a1c]/40 rounded-xs bg-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-1">
                          <span className="font-editorial-mono text-xs font-bold text-[#1a1a1c] truncate">
                            {med.name}
                          </span>
                          <span className="font-editorial-mono text-[10px] text-[#5562ff] font-bold shrink-0">
                            {med.timing}
                          </span>
                        </div>
                        <div className="text-[11px] font-editorial-mono text-[#1a1a1c]/70 mt-0.5">
                          剂量: <span className="font-bold">{med.dosage}</span>
                        </div>
                        <div className="text-[10px] font-editorial-mono text-[#1a1a1c]/50 mt-1">
                          {med.purpose}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3 bg-[#f5f8ff] border border-[#5562ff]/30 text-xs font-editorial-mono text-[#1a1a1c]">
              <div className="flex items-center gap-1.5 font-bold text-[#5562ff] mb-1">
                <Info className="w-3.5 h-3.5" />
                <span>记录提示：</span>
              </div>
              <p className="text-[11px] text-[#1a1a1c]/80 leading-relaxed">
                用药与复查安排应来自本人实际就诊记录；系统不预置药品、剂量或服用时间。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Milestone Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#fcfcf9] border-2 border-[#1a1a1c] w-full max-w-lg shadow-2xl p-5">
            <h3 className="font-editorial-sans text-lg font-bold text-[#1a1a1c] mb-1">
              新建复查与健康管理里程碑事项
            </h3>
            <p className="font-editorial-mono text-xs text-[#1a1a1c]/60 mb-4">
              为 {member.name} 设置定时随访与关键检验提醒
            </p>

            <form onSubmit={handleAddMilestoneSubmit} className="space-y-3.5">
              <div>
                <label className="block font-editorial-mono text-xs font-bold text-[#1a1a1c] mb-1">
                  提醒事项标题 *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="例如：携带报告进行复诊"
                  className="w-full bg-white border border-[#1a1a1c] p-2 text-xs font-editorial-mono focus:outline-none focus:ring-1 focus:ring-[#5562ff]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-editorial-mono text-xs font-bold text-[#1a1a1c] mb-1">
                    计划目标日期 *
                  </label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-white border border-[#1a1a1c] p-2 text-xs font-editorial-mono focus:outline-none focus:ring-1 focus:ring-[#5562ff]"
                  />
                </div>

                <div>
                  <label className="block font-editorial-mono text-xs font-bold text-[#1a1a1c] mb-1">
                    事项类别
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full bg-white border border-[#1a1a1c] p-2 text-xs font-editorial-mono focus:outline-none focus:ring-1 focus:ring-[#5562ff]"
                  >
                    <option value="复查">复查</option>
                    <option value="门诊">门诊</option>
                    <option value="检查">检查</option>
                    <option value="健康管理里程碑">健康管理里程碑</option>
                    <option value="用药随访">用药随访</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-editorial-mono text-xs font-bold text-[#1a1a1c] mb-1">
                    医院机构 (选填)
                  </label>
                  <input
                    type="text"
                    value={newHospital}
                    onChange={(e) => setNewHospital(e.target.value)}
                    placeholder="例如：附属妇儿医院"
                    className="w-full bg-white border border-[#1a1a1c] p-2 text-xs font-editorial-mono focus:outline-none focus:ring-1 focus:ring-[#5562ff]"
                  />
                </div>

                <div>
                  <label className="block font-editorial-mono text-xs font-bold text-[#1a1a1c] mb-1">
                    优先级
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full bg-white border border-[#1a1a1c] p-2 text-xs font-editorial-mono focus:outline-none focus:ring-1 focus:ring-[#5562ff]"
                  >
                    <option value="high">高优先级 (核心复查)</option>
                    <option value="medium">中等优先级</option>
                    <option value="low">普通备忘</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-editorial-mono text-xs font-bold text-[#1a1a1c] mb-1">
                  临床意义与注意要点 (选填)
                </label>
                <textarea
                  rows={2}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="记录该复查项需要注意的事项，如空腹抽血、服药时间要求等..."
                  className="w-full bg-white border border-[#1a1a1c] p-2 text-xs font-editorial-mono focus:outline-none focus:ring-1 focus:ring-[#5562ff]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#1a1a1c]/20">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-[#1a1a1c] text-xs font-bold font-editorial-mono hover:bg-[#1a1a1c] hover:text-white transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#5562ff] text-white text-xs font-bold font-editorial-mono hover:bg-[#4350ea] transition shadow-xs"
                >
                  保存提醒
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
