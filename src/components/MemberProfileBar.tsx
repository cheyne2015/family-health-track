import React from 'react';
import { FamilyMember } from '../types';
interface MemberProfileBarProps {
 member: FamilyMember; reportCount: number; anomalyCount: number;
 onAskAIAboutMember: () => void; onEditMember?: () => void;
 onOpenCreateMember?: () => void; onOpenVoiceMemo?: () => void;
}
export const MemberProfileBar: React.FC<MemberProfileBarProps> = ({member,reportCount,anomalyCount,onAskAIAboutMember,onEditMember,onOpenCreateMember,onOpenVoiceMemo}) => (
 <section className="border-b bg-white dark:bg-zinc-900 p-5 text-zinc-900 dark:text-zinc-100">
  <div className="max-w-7xl mx-auto space-y-3">
   <div className="flex flex-wrap items-center gap-4"><strong>{member.name}</strong><span>{member.relationship} · {member.age}岁</span><span>报告 {reportCount} 份 · 关注事项 {anomalyCount} 项</span>
    <button id={`edit-member-btn-${member.id}`} onClick={onEditMember}>编辑成员</button><button onClick={onOpenCreateMember}>添加成员</button><button onClick={onOpenVoiceMemo}>就医记录</button><button id="ask-ai-member-btn" onClick={onAskAIAboutMember}>AI 辅助问答</button>
   </div><p className="text-sm">{member.healthStatusSummary || '暂无健康摘要'}</p>
  </div>
 </section>
);
