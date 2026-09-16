import React,{useState,useEffect} from 'react';
import {FamilyMember,MedicalReport,AnomalyAlert} from '../types';
import {generateAiAnalysisMarkdown} from '../utils/exportGenerators';
interface DoctorQuickGlanceModalProps {isOpen:boolean;onClose:()=>void;member:FamilyMember;allMembers?:FamilyMember[];onSelectMember?:(m:FamilyMember)=>void;reports:MedicalReport[];alerts:AnomalyAlert[];onAskAiQuestion?:(q:string)=>void;}
export const DoctorQuickGlanceModal:React.FC<DoctorQuickGlanceModalProps>=({isOpen,onClose,member,allMembers=[],onSelectMember,reports,alerts,onAskAiQuestion})=>{
 const [notes,setNotes]=useState('');
 useEffect(()=>{setNotes(localStorage.getItem(`doctor_glance_notes_${member.id}`)||'');},[member.id,isOpen]);
 if(!isOpen)return null;
 const text=generateAiAnalysisMarkdown(reports.filter(r=>r.memberId===member.id),[member],alerts.filter(a=>a.memberId===member.id));
 return <div className="fixed inset-0 z-50 bg-black/60 p-6 flex items-center justify-center"><section className="bg-white dark:bg-zinc-900 dark:text-white p-6 w-full max-w-3xl max-h-[90vh] overflow-auto"><h2 className="text-xl font-bold">就医资料速览</h2><select value={member.id} onChange={e=>{const m=allMembers.find(x=>x.id===e.target.value);if(m)onSelectMember?.(m);}}>{(allMembers.length?allMembers:[member]).map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select><pre className="whitespace-pre-wrap my-4 text-sm">{text}</pre><textarea className="w-full border p-3 dark:bg-zinc-800" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="补充本次需要询问的问题"/><div className="flex gap-4 mt-4"><button onClick={()=>localStorage.setItem(`doctor_glance_notes_${member.id}`,notes)}>保存备注</button><button onClick={()=>navigator.clipboard.writeText(text+'\n'+notes)}>复制</button><button onClick={()=>{onAskAiQuestion?.('请根据当前成员已有报告整理就医问题。');onClose();}}>AI 辅助整理</button><button onClick={onClose}>关闭</button></div></section></div>;
};
