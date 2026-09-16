import React from 'react';
import {FamilyMember,MedicalReport,AnomalyAlert} from '../types';
import {generateAiAnalysisMarkdown} from '../utils/exportGenerators';
interface DoctorVisitMemoModalProps {isOpen:boolean;onClose:()=>void;member:FamilyMember;reports:MedicalReport[];alerts:AnomalyAlert[];}
export const DoctorVisitMemoModal: React.FC<DoctorVisitMemoModalProps> = ({isOpen,onClose,member,reports,alerts}) => {
 if (!isOpen) return null;
 const text=generateAiAnalysisMarkdown(reports.filter(r=>r.memberId===member.id),[member],alerts.filter(a=>a.memberId===member.id))+'\n就医备忘：请向医生核对报告差异、需要复查的项目与时间。';
 return <div className="fixed inset-0 z-50 bg-black/60 p-6 flex items-center justify-center"><section className="bg-white dark:bg-zinc-900 dark:text-white p-6 w-full max-w-3xl max-h-[90vh] overflow-auto"><h2 className="text-xl font-bold">{member.name} · 就医备忘</h2><pre className="whitespace-pre-wrap my-5 text-sm">{text}</pre><div className="flex gap-4"><button onClick={()=>navigator.clipboard.writeText(text)}>复制</button><button onClick={()=>window.print()}>打印</button><button onClick={onClose}>关闭</button></div></section></div>;
};
