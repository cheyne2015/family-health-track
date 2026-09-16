import JSZip from 'jszip';
import { FamilyMember, MedicalReport, AnomalyAlert, AIChatMessage } from '../types';
import { getReportImageBlob, downloadFile, downloadText } from './reportImageSaver';

/**
 * Format date nicely for human reading
 */
export function formatExportDate(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const h = pad(d.getHours());
  const min = pad(d.getMinutes());
  const s = pad(d.getSeconds());
  return `${y}-${m}-${day} ${h}:${min}:${s}`;
}

/**
 * 1. Generates 聊天记录.md content in clean, readable GitHub-flavored Markdown
 */
export function generateChatMarkdown(
  messages: AIChatMessage[],
  members: FamilyMember[],
  targetMemberId?: string
): string {
  const memberMap = new Map<string, FamilyMember>();
  members.forEach((m) => memberMap.set(m.id, m));

  const filteredMessages = targetMemberId && targetMemberId !== 'all'
    ? messages.filter((msg) => !msg.memberId || msg.memberId === targetMemberId)
    : messages;

  const targetMember = targetMemberId && targetMemberId !== 'all' ? memberMap.get(targetMemberId) : null;
  const targetName = targetMember ? `${targetMember.name} (${targetMember.relationship})` : '全部家庭成员';

  let md = '';
  md += `# 家庭健康管理系统 · AI 临床顾问全量咨询会话记录\n\n`;
  md += `> **导出时间**：${formatExportDate()}  \n`;
  md += `> **档案对象**：${targetName}  \n`;
  md += `> **会话总轮数**：${filteredMessages.length} 条记录  \n`;
  md += `> **模型引擎**：Google Gemini 2.5 临床医学跨报告推理内核  \n`;
  md += `---\n\n`;

  if (filteredMessages.length === 0) {
    md += `*暂无此成员的咨询会话记录。*\n\n`;
    return md;
  }

  // Group messages by member if exporting all, or list sequentially
  let currentGroupMemberId = '';

  filteredMessages.forEach((msg, idx) => {
    const mem = msg.memberId ? memberMap.get(msg.memberId) : null;
    const memName = mem ? `${mem.name} (${mem.relationship})` : (msg.relatedMemberName || '全家通用');

    if (msg.memberId && msg.memberId !== currentGroupMemberId) {
      currentGroupMemberId = msg.memberId;
      md += `## 👤 咨询档案归属：${memName}\n\n`;
    }

    const timeStr = msg.timestamp || (msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : `记录 #${idx + 1}`);

    if (msg.role === 'user') {
      md += `### 💬 用户提问 [${timeStr}]\n\n`;
      md += `> **提问者**：${memName}\n`;
      if (msg.relatedIndicator) {
        md += `> **关联指标**：\`${msg.relatedIndicator}\`\n`;
      }
      md += `\n${msg.content.trim()}\n\n`;
    } else {
      md += `### 🩺 AI 临床顾问建议 (Gemini 2.5) [${timeStr}]\n\n`;
      if (msg.relatedIndicator) {
        md += `*针对指标 \`${msg.relatedIndicator}\` 的临床跨报告综合交叉分析：*\n\n`;
      }
      md += `${msg.content.trim()}\n\n`;
      md += `---\n\n`;
    }
  });

  md += `\n## ⚠️ 临床免责说明\n\n`;
  md += `此文件汇总用户已有记录，未自动脱敏。内容仅供资料整理，不替代医生诊断与处方。\n`;

  return md;
}

/**
 * 2. Generates comprehensive ai分析.md report content
 */
export function generateAiAnalysisMarkdown(
  reports: MedicalReport[],
  members: FamilyMember[],
  alerts: AnomalyAlert[]
): string {
  let md = `# 家庭健康记录汇总\n\n导出时间：${formatExportDate()}\n\n`;
  if (!reports.length) md += '暂无报告。\n';
  for (const member of members) {
    md += `\n## ${member.name}\n\n${member.healthStatusSummary || '暂无健康摘要'}\n`;
    for (const report of reports.filter(r => r.memberId === member.id).sort((a,b)=>a.date.localeCompare(b.date))) {
      md += `\n### ${report.date} · ${report.title}\n机构：${report.hospital}\n\n${report.summary}\n`;
      for (const item of report.indicators) md += `- ${item.name}：${item.value} ${item.unit}（参考：${item.referenceRange}）\n`;
    }
    for (const alert of alerts.filter(a=>a.memberId === member.id)) md += `\n关注事项：${alert.title} — ${alert.description}\n`;
  }
  return md + '\n仅汇总用户已有记录，不自动生成诊断或处方。\n';
}

export async function generateFullArchiveZip(
  members: FamilyMember[],
  reports: MedicalReport[],
  alerts: AnomalyAlert[],
  chatMessages: AIChatMessage[],
  onProgress?: (progress: number, currentTask: string) => void
): Promise<Blob> {
  const zip = new JSZip();

  // 1. Generate 聊天记录.md
  if (onProgress) onProgress(10, '正在生成聊天记录.md...');
  const chatMd = generateChatMarkdown(chatMessages, members, 'all');
  zip.file('聊天记录.md', chatMd);

  // 2. Generate ai分析.md
  if (onProgress) onProgress(25, '正在生成 ai分析.md (全量深度病历总结)...');
  const aiAnalysisMd = generateAiAnalysisMarkdown(reports, members, alerts);
  zip.file('ai分析.md', aiAnalysisMd);

  // 3. Generate JSON backup
  if (onProgress) onProgress(40, '正在打包全量结构化数据 (JSON)...');
  const fullBackupData = {
    exportVersion: '2.0',
    exportDate: new Date().toISOString(),
    members,
    reports,
    alerts,
    chatMessages,
    summary: {
      totalMembers: members.length,
      totalReports: reports.length,
      totalAlerts: alerts.length,
      totalChatMessages: chatMessages.length
    }
  };
  zip.file('全量健康数据备份.json', JSON.stringify(fullBackupData, null, 2));

  // 4. Generate README
  const readmeContent = `家庭健康档案备份\n包含用户提供的报告、咨询记录及附件。此备份未自动脱敏，请妥善保管。`;
  zip.file('README_档案使用与恢复说明.txt', readmeContent);

  // 5. Generate and add all Report Images
  const imgFolder = zip.folder('报告图片');
  const memberMap = new Map<string, string>();
  members.forEach((m) => memberMap.set(m.id, m.name));

  const totalReports = reports.length;
  for (let i = 0; i < totalReports; i++) {
    const rep = reports[i];
    const memberName = memberMap.get(rep.memberId) || '家庭成员';
    const progressPct = 40 + Math.round(((i + 1) / totalReports) * 45);
    if (onProgress) {
      onProgress(progressPct, `正在渲染报告图片 [${i + 1}/${totalReports}]: ${rep.title}...`);
    }

    try {
      const { blob, filename } = await getReportImageBlob(rep, memberName, 'image/jpeg');
      if (imgFolder) {
        imgFolder.file(filename, blob);
      }
    } catch (err) {
      console.warn(`Failed to export image for report ${rep.id}:`, err);
    }
  }

  // 6. Zip compression
  if (onProgress) onProgress(90, '正在压缩并打包 ZIP 归档文件...');
  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    },
    (metadata) => {
      if (onProgress) {
        onProgress(90 + Math.round(metadata.percent * 0.1), `压缩打包中: ${Math.round(metadata.percent)}%`);
      }
    }
  );

  if (onProgress) onProgress(100, '打包完成！正在启动浏览器本地下载...');
  return zipBlob;
}