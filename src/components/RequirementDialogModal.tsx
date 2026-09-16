import React from 'react';
interface RequirementDialogModalProps {isOpen:boolean;onClose:()=>void;onAnswerQuestion?:(answer:string)=>void;}
export const RequirementDialogModal:React.FC<RequirementDialogModalProps>=({isOpen,onClose})=>isOpen?<div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6"><section className="bg-white dark:bg-zinc-900 dark:text-white p-6 max-w-xl space-y-4"><h2>家庭健康档案管理</h2><p>按成员整理报告，根据统一指标标识匹配不同时间、不同机构的同类数据。比较前请核对单位与参考范围。</p><p>AI 识别与问答需要配置服务。输出需人工核对；上传和导出不包含自动身份遮盖。</p><button onClick={onClose}>关闭</button></section></div>:null;
