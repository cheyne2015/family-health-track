import React, { useState, useRef, useEffect } from 'react';
import { AIChatMessage, FamilyMember, MedicalReport, AnomalyAlert } from '../types';
import { 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  HelpCircle, 
  ShieldCheck, 
  RotateCcw, 
  Pill, 
  Activity, 
  Dna, 
  FileText,
  Stethoscope,
  Cloud,
  Download
} from 'lucide-react';
import { DoctorVisitMemoModal } from './DoctorVisitMemoModal';
import { 
  chatMessagesCol, 
  saveChatMessageToCloud, 
  clearChatMessagesFromCloud, 
  getAllChatMessagesFromCloud,
  onSnapshot, 
  query, 
  where 
} from '../lib/firebase';

interface AiConsultantViewProps {
  currentMember: FamilyMember;
  reports: MedicalReport[];
  alerts?: AnomalyAlert[];
  initialQuestion?: string;
  onOpenExport?: () => void;
}

export const AiConsultantView: React.FC<AiConsultantViewProps> = ({
  currentMember,
  reports,
  alerts = [],
  initialQuestion,
  onOpenExport
}) => {
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      id: 'msg-welcome',
      role: 'assistant',
      content: `您好，您可以围绕 ${currentMember.name} 的已有报告提问。AI 服务需要配置后使用，回答需人工核对。`,
      timestamp: '刚刚'
    }
  ]);

  const [inputQuery, setInputQuery] = useState(initialQuestion || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMemoOpen, setIsMemoOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync chat messages from Firestore (via Server Tunnel and real-time listener)
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let pollInterval: any;

    async function fetchChat() {
      try {
        const msgs = await getAllChatMessagesFromCloud(currentMember.id);
        if (msgs && msgs.length > 0) {
          setMessages(msgs);
        }
      } catch (e) {}
    }

    fetchChat();
    // Poll every 8 seconds for resilient multi-device sync in Mainland China
    pollInterval = setInterval(fetchChat, 8000);

    try {
      const q = query(chatMessagesCol, where('memberId', '==', currentMember.id));
      unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const remoteMsgs: AIChatMessage[] = [];
          snapshot.forEach((d) => {
            remoteMsgs.push(d.data() as AIChatMessage);
          });
          remoteMsgs.sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeA - timeB;
          });
          if (remoteMsgs.length > 0) {
            setMessages(remoteMsgs);
          }
        }
      }, (err) => {
        // Direct listener error (expected in Mainland China) - server tunnel continues seamlessly
      });
    } catch (e) {
      console.warn('Could not initialize direct chat listener:', e);
    }

    return () => {
      if (unsubscribe) unsubscribe();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [currentMember.id, currentMember.name]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  // Set initial question if passed from other views
  useEffect(() => {
    if (initialQuestion && initialQuestion.trim()) {
      setInputQuery(initialQuestion);
    }
  }, [initialQuestion]);

  const presetQuestions = [
    { icon: <Activity className="w-3.5 h-3.5" />, text: '请汇总已有报告中同类指标的变化。' },
    { icon: <FileText className="w-3.5 h-3.5" />, text: '比较不同医院的报告时，需要核对哪些信息？' },
    { icon: <HelpCircle className="w-3.5 h-3.5" />, text: '请根据现有记录整理就医时需要询问的问题。' }
  ];

  const handleSend = async (queryToSend?: string) => {
    const q = queryToSend || inputQuery;
    if (!q.trim() || isGenerating) return;

    const userMsg: AIChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      relatedMemberName: currentMember.name,
      memberId: currentMember.id,
      createdAt: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsGenerating(true);

    // Persist user question to Firestore Cloud
    saveChatMessageToCloud(userMsg, currentMember.id);

    try {
      const response = await fetch('/api/ai/consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member: currentMember,
          reports: reports,
          question: q,
          alerts: alerts
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.answer) {
          const assistantMsg: AIChatMessage = {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            content: data.answer,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            relatedMemberName: currentMember.name,
            memberId: currentMember.id,
            createdAt: new Date().toISOString()
          };
          setMessages((prev) => [...prev, assistantMsg]);
          setIsGenerating(false);
          // Persist assistant reply to Firestore Cloud
          saveChatMessageToCloud(assistantMsg, currentMember.id);
          return;
        }
      }
    } catch (e) {
      console.warn('API /api/ai/consult unavailable, switching to local inference:', e);
    }

    // AI intelligent clinical logic response based on medical history
    setTimeout(() => {
      const aiReply = 'AI 服务暂不可用，未生成健康分析。请检查服务配置后重试；已有报告仍可浏览和导出。';

      const assistantMsg: AIChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: aiReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        relatedMemberName: currentMember.name,
        memberId: currentMember.id,
        createdAt: new Date().toISOString()
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setIsGenerating(false);
      // Persist fallback AI reply to Firestore Cloud
      saveChatMessageToCloud(assistantMsg, currentMember.id);
    }, 600);
  };

  const handleClearChat = async () => {
    if (window.confirm(`确定要清空【${currentMember.name}】的全部历史AI咨询记录吗？这将同步从云端数据库中移除。`)) {
      await clearChatMessagesFromCloud(currentMember.id);
      setMessages([
        {
          id: `msg-welcome-new-${Date.now()}`,
          role: 'assistant',
          content: `对话记录已重置。您可以针对 **${currentMember.name}** 的病历随时发起新的咨询。`,
          timestamp: '刚刚',
          memberId: currentMember.id,
          createdAt: new Date().toISOString()
        }
      ]);
    }
  };

  return (
    <div className="space-y-6 text-[#1a1a1c]">
      {/* Top Context Notification Card */}
      <div className="bg-white border border-[#1a1a1c] p-5 shadow-[4px_4px_0_rgba(26,26,28,0.06)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 border border-[#1a1a1c] bg-[#fdfdfb] flex items-center justify-center text-[#5562ff] shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-editorial-mono text-[10px] uppercase tracking-widest text-[#1a1a1c]/50 font-bold">
                AI CLINICAL CONSULTANT · 智能全病历问答
              </span>
              <span className="font-editorial-mono text-[10px] px-2 py-0.2 rounded border border-[#188038] text-[#188038] bg-emerald-50 font-bold flex items-center gap-1">
                <Cloud className="w-3 h-3" />
                已连通云端数据库 · 记录实时保存
              </span>
              <span className="font-editorial-mono text-[10px] px-2 py-0.2 rounded border border-[#5562ff] text-[#5562ff] bg-indigo-50/50 font-bold">
                AI 服务接口 · Gemini 2.5
              </span>
            </div>
            <h3 className="font-editorial-serif text-xl font-medium tracking-tight text-[#1a1a1c] mt-0.5">
              当前提问对象：{currentMember.name} ({currentMember.relationship}, {currentMember.age}岁)
            </h3>
            <p className="text-xs text-[#1a1a1c]/60 mt-0.5">
              结合当前成员提供的历史报告整理信息，未提供的内容不作推断
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onOpenExport && (
            <button
              id="ai-consultant-export-btn"
              onClick={onOpenExport}
              className="flex items-center gap-1.5 text-xs text-[#1a1a1c] hover:text-white bg-white hover:bg-[#1a1a1c] px-3.5 py-1.5 border border-[#1a1a1c] transition font-editorial-mono font-bold cursor-pointer"
              title="导出聊天记录.md、ai分析.md 及全量报告图片.jpg"
            >
              <Download className="w-3.5 h-3.5 text-[#5562ff]" />
              <span>导出记录/分析</span>
            </button>
          )}

          <button
            id="open-doctor-memo-btn"
            onClick={() => setIsMemoOpen(true)}
            className="flex items-center gap-1.5 text-xs text-[#5562ff] hover:text-white bg-white hover:bg-[#5562ff] px-3.5 py-1.5 border border-[#5562ff] transition font-editorial-mono font-bold cursor-pointer"
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>就诊备忘卡</span>
          </button>

          <button
            id="clear-chat-btn"
            onClick={handleClearChat}
            className="flex items-center gap-1.5 text-xs text-[#1a1a1c]/70 hover:text-[#1a1a1c] px-3.5 py-1.5 border border-[#1a1a1c]/30 hover:bg-[#1a1a1c]/5 transition font-editorial-mono cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>重置对话</span>
          </button>
        </div>
      </div>

      {/* Preset Quick Questions */}
      <div className="bg-white border border-[#1a1a1c] p-5 shadow-[4px_4px_0_rgba(26,26,28,0.06)]">
        <span className="font-editorial-mono text-[10px] uppercase text-[#1a1a1c]/50 font-bold tracking-widest block mb-2.5">
          根据当前时序与异常波动推荐的提问 [RECOMMENDED PROMPTS]：
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {presetQuestions.map((pq, idx) => (
            <button
              key={idx}
              id={`preset-question-btn-${idx}`}
              onClick={() => handleSend(pq.text)}
              className="text-left p-3 border border-[#1a1a1c]/20 hover:border-[#1a1a1c] hover:bg-[#f8f8f6] text-xs text-[#1a1a1c] transition flex items-start gap-2.5 group"
            >
              <div className="shrink-0 mt-0.5">{pq.icon}</div>
              <span className="group-hover:text-[#5562ff] transition leading-relaxed">{pq.text}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Feed */}
      <div className="bg-white border border-[#1a1a1c] p-6 shadow-[6px_6px_0_rgba(26,26,28,0.06)] min-h-[420px] max-h-[600px] flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div
                  className={`w-8 h-8 flex items-center justify-center shrink-0 border ${
                    isUser
                      ? 'bg-[#1a1a1c] text-white border-[#1a1a1c]'
                      : 'bg-white text-[#5562ff] border-[#1a1a1c]'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4 text-[#5562ff]" />}
                </div>

                <div
                  className={`max-w-[85%] p-4 text-xs leading-relaxed ${
                    isUser
                      ? 'bg-[#1a1a1c] text-[#fdfdfb] font-medium'
                      : 'bg-[#fdfdfb] text-[#1a1a1c] border border-[#1a1a1c] shadow-[3px_3px_0_rgba(26,26,28,0.04)]'
                  }`}
                >
                  <div className="whitespace-pre-line space-y-2 font-normal">
                    {msg.content}
                  </div>
                  <div
                    className={`mt-2 font-editorial-mono text-[10px] ${
                      isUser ? 'text-white/60 text-right' : 'text-[#1a1a1c]/40'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            );
          })}

          {isGenerating && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 border border-[#1a1a1c] bg-white text-[#5562ff] flex items-center justify-center">
                <Sparkles className="w-4 h-4 animate-spin text-[#5562ff]" />
              </div>
              <div className="bg-[#fdfdfb] border border-[#1a1a1c] p-4 text-xs text-[#1a1a1c]/70 flex items-center gap-2 font-editorial-mono">
                <span className="w-2 h-2 rounded-full bg-[#5562ff] animate-pulse" />
                <span>AI 正在综合全量时序病历与检验对比进行临床逻辑推演...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Bar */}
        <div className="mt-4 pt-3 border-t border-[#1a1a1c]/15">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              id="ai-chat-input"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="在此输入您关于病历、用药、健康管理或指标波动的任何疑问..."
              disabled={isGenerating}
              className="flex-1 bg-white border border-[#1a1a1c] px-4 py-2.5 text-xs text-[#1a1a1c] placeholder-[#1a1a1c]/40 focus:outline-none focus:ring-1 focus:ring-[#5562ff]"
            />
            <button
              type="submit"
              id="ai-send-btn"
              disabled={!inputQuery.trim() || isGenerating}
              className="px-5 py-2.5 rounded-full bg-[#1a1a1c] hover:bg-black disabled:opacity-40 disabled:pointer-events-none text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-xs"
            >
              <span>发送</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
          <div className="flex items-center justify-between text-[11px] text-[#1a1a1c]/50 mt-2 px-1 font-editorial-mono">
            <span>💡 提示：AI 可结合历史多张报告交叉分析，给出专业临床参考。</span>
            <span>生成内容需要人工核对</span>
          </div>
        </div>
      </div>

      {/* Doctor Visit Memo Modal */}
      <DoctorVisitMemoModal
        isOpen={isMemoOpen}
        onClose={() => setIsMemoOpen(false)}
        member={currentMember}
        reports={reports}
        alerts={alerts}
      />
    </div>
  );
};
