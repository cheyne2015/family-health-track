import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  writeBatch,
  query,
  where
} from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// Cloud synchronization is opt-in and needs access control before deployment.
app.use('/api/db', (_req, res, next) => {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || firebaseConfig.projectId === 'demo-local') return res.status(503).json({error:'云端未配置，使用本地模式'});
  next();
});

// Initialize server-side Firestore instance for seamless cross-border access (e.g. Mainland China GFW bypass)
let serverDb: any = null;
function getServerDb() {
  if (!serverDb) {
    const fbApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    serverDb = firebaseConfig.firestoreDatabaseId 
      ? getFirestore(fbApp, firebaseConfig.firestoreDatabaseId)
      : getFirestore(fbApp);
  }
  return serverDb;
}

// Helper to safely get Gemini client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==========================================
// Cloud Firestore Server-Side Proxy Routes
// (Enables seamless access from Mainland China where Google APIs are blocked)
// ==========================================

// Check server firestore connectivity
app.get('/api/db/health', async (req, res) => {
  try {
    const db = getServerDb();
    const snap = await getDocs(collection(db, 'members'));
    res.json({
      status: 'ok',
      connected: true,
      proxyMode: 'server_cloud_tunnel',
      memberCount: snap.size,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Server Firestore health error:', error);
    res.status(500).json({ status: 'error', message: error?.message });
  }
});

// Fetch all database documents (members, reports, alerts) in one trip
app.get('/api/db/all', async (req, res) => {
  try {
    const db = getServerDb();
    const [membersSnap, reportsSnap, alertsSnap] = await Promise.all([
      getDocs(collection(db, 'members')),
      getDocs(collection(db, 'reports')),
      getDocs(collection(db, 'alerts'))
    ]);

    const members: any[] = [];
    membersSnap.forEach((d) => members.push(d.data()));

    const reports: any[] = [];
    reportsSnap.forEach((d) => reports.push(d.data()));

    const alerts: any[] = [];
    alertsSnap.forEach((d) => alerts.push(d.data()));

    res.json({
      success: true,
      members,
      reports,
      alerts,
      source: 'firestore_cloud_tunnel',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('API /api/db/all error:', error);
    res.status(500).json({ error: 'Failed to fetch all data from Firestore', details: error?.message });
  }
});

// Seed demo data to Firestore if empty
app.post('/api/db/seed', async (req, res) => {
  try {
    const db = getServerDb();
    const { members = [], reports = [], alerts = [] } = req.body;
    const memberSnap = await getDocs(collection(db, 'members'));

    if (memberSnap.empty && members.length > 0) {
      console.log('Seeding initial members & data to Firestore via Server Bridge...');
      const batch = writeBatch(db);
      for (const m of members) {
        batch.set(doc(db, 'members', m.id), m);
      }
      for (const r of reports) {
        batch.set(doc(db, 'reports', r.id), r);
      }
      for (const a of alerts) {
        batch.set(doc(db, 'alerts', a.id), a);
      }
      await batch.commit();
      return res.json({ success: true, seeded: true });
    }
    return res.json({ success: true, seeded: false, message: 'Collection already populated' });
  } catch (error: any) {
    console.error('API /api/db/seed error:', error);
    res.status(500).json({ error: 'Failed to seed Firestore', details: error?.message });
  }
});

// Save/update a single member in Firestore
app.post('/api/db/member', async (req, res) => {
  try {
    const db = getServerDb();
    const member = req.body;
    if (!member || !member.id) {
      return res.status(400).json({ error: 'Valid member with id is required' });
    }
    await setDoc(doc(db, 'members', member.id), {
      ...member,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    res.json({ success: true, id: member.id });
  } catch (error: any) {
    console.error('API /api/db/member error:', error);
    res.status(500).json({ error: 'Failed to save member', details: error?.message });
  }
});

// Save/update a medical report in Firestore
app.post('/api/db/report', async (req, res) => {
  try {
    const db = getServerDb();
    const report = req.body;
    if (!report || !report.id) {
      return res.status(400).json({ error: 'Valid report with id is required' });
    }
    await setDoc(doc(db, 'reports', report.id), {
      ...report,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    res.json({ success: true, id: report.id });
  } catch (error: any) {
    console.error('API /api/db/report error:', error);
    res.status(500).json({ error: 'Failed to save report', details: error?.message });
  }
});

// Delete a medical report from Firestore
app.delete('/api/db/report/:id', async (req, res) => {
  try {
    const db = getServerDb();
    const { id } = req.params;
    await deleteDoc(doc(db, 'reports', id));
    res.json({ success: true, id });
  } catch (error: any) {
    console.error('API /api/db/report/:id delete error:', error);
    res.status(500).json({ error: 'Failed to delete report', details: error?.message });
  }
});

// Save/update chat message in Firestore
app.post('/api/db/chat', async (req, res) => {
  try {
    const db = getServerDb();
    const { message, memberId } = req.body;
    if (!message || !message.id || !memberId) {
      return res.status(400).json({ error: 'Message with id and memberId are required' });
    }
    await setDoc(doc(db, 'chat_messages', message.id), {
      id: message.id,
      memberId,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
      relatedMemberName: message.relatedMemberName || '',
      relatedIndicator: message.relatedIndicator || '',
      createdAt: message.createdAt || new Date().toISOString()
    }, { merge: true });
    res.json({ success: true, id: message.id });
  } catch (error: any) {
    console.error('API /api/db/chat error:', error);
    res.status(500).json({ error: 'Failed to save chat message', details: error?.message });
  }
});

// Get chat messages from Firestore
app.get('/api/db/chat', async (req, res) => {
  try {
    const db = getServerDb();
    const { memberId } = req.query;
    let snap;
    if (memberId && typeof memberId === 'string') {
      const q = query(collection(db, 'chat_messages'), where('memberId', '==', memberId));
      snap = await getDocs(q);
    } else {
      snap = await getDocs(collection(db, 'chat_messages'));
    }
    const messages: any[] = [];
    snap.forEach((d) => messages.push(d.data()));
    messages.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeA - timeB;
    });
    res.json({ success: true, messages });
  } catch (error: any) {
    console.error('API /api/db/chat get error:', error);
    res.status(500).json({ error: 'Failed to fetch chat messages', details: error?.message });
  }
});

// Clear chat messages for a member
app.delete('/api/db/chat/:memberId', async (req, res) => {
  try {
    const db = getServerDb();
    const { memberId } = req.params;
    const q = query(collection(db, 'chat_messages'), where('memberId', '==', memberId));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    res.json({ success: true, memberId });
  } catch (error: any) {
    console.error('API /api/db/chat/:memberId delete error:', error);
    res.status(500).json({ error: 'Failed to clear chat messages', details: error?.message });
  }
});

// Full restore / sync
app.post('/api/db/restore', async (req, res) => {
  try {
    const db = getServerDb();
    const { members = [], reports = [], alerts = [], mode = 'merge' } = req.body;
    const batch = writeBatch(db);

    if (mode === 'replace') {
      const [mSnap, rSnap, aSnap] = await Promise.all([
        getDocs(collection(db, 'members')),
        getDocs(collection(db, 'reports')),
        getDocs(collection(db, 'alerts'))
      ]);
      mSnap.forEach((d) => batch.delete(d.ref));
      rSnap.forEach((d) => batch.delete(d.ref));
      aSnap.forEach((d) => batch.delete(d.ref));
    }

    for (const m of members) {
      batch.set(doc(db, 'members', m.id), m, { merge: true });
    }
    for (const r of reports) {
      batch.set(doc(db, 'reports', r.id), r, { merge: true });
    }
    for (const a of alerts) {
      batch.set(doc(db, 'alerts', a.id), a, { merge: true });
    }

    await batch.commit();
    res.json({ success: true, count: { members: members.length, reports: reports.length, alerts: alerts.length } });
  } catch (error: any) {
    console.error('API /api/db/restore error:', error);
    res.status(500).json({ error: 'Failed to restore database', details: error?.message });
  }
});

// 2. AI Service Status API
app.get('/api/ai/status', (_req, res) => {
  res.json({ hasApiKey: !!getGeminiClient(), model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' });
});

app.post('/api/ai/ocr-report', async (req, res) => {
  const { imageBase64, mimeType = 'image/jpeg' } = req.body;
  if (typeof imageBase64 !== 'string' || !imageBase64) return res.status(400).json({ error: '请提供报告图片' });
  const ai = getGeminiClient();
  if (!ai) return res.status(503).json({ error: '未配置 AI 服务，请手工录入报告；未生成检查结果。' });
  try {
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      contents: [{ inlineData: { data: imageBase64.split('base64,').pop(), mimeType: /^data:([^;]+);base64,/.exec(imageBase64)?.[1] || mimeType } },
        '仅提取图片中明确可见的报告信息，不补造数据。返回 JSON：hospital,date,title,category,summary,doctorAdvice,indicators。indicators 每项包含 name,standardKey,value,unit,referenceRange,status。相同检查项目使用统一 standardKey。缺失文字留空。category 使用常规体检、血生化与激素、超声影像或其他化验。status 无法判断时为 info。不提取姓名、证件号、联系电话或地址。'],
      config: { responseMimeType: 'application/json' }
    });
    return res.json({ success: true, source: 'gemini', data: JSON.parse(response.text || '{}') });
  } catch { return res.status(502).json({ error: '识别未完成，请核对图片或手工录入。' }); }
});

app.post('/api/ai/structure-consultation', async (req, res) => {
  const { rawText } = req.body;
  if (typeof rawText !== 'string' || !rawText.trim()) return res.status(400).json({ error: '请提供就医记录' });
  const ai = getGeminiClient();
  if (!ai) return res.status(503).json({ error: '未配置 AI 服务，原始文字保留在输入框中。' });
  try {
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      contents: '仅整理以下用户记录，缺失信息留空，不补造诊断、药物、剂量、引语或日期。返回 JSON：chiefComplaint,diagnosisSummary,medicationChanges（drugName,action,dosage,timing,reasonOrCaution）,followUpPlan（recommendedDateText,targetItems,actionableReminderDate,instructions）,lifestyleAdvices,doctorKeyQuotes。列表缺失用 []。\n用户记录：' + rawText,
      config: { responseMimeType: 'application/json' }
    });
    return res.json({ success: true, source: 'gemini', data: JSON.parse(response.text || '{}') });
  } catch { return res.status(502).json({ error: '纪要整理未完成，请保留原文并稍后重试。' }); }
});

app.post('/api/ai/consult', async (req, res) => {
  const { member, reports = [], question, alerts = [] } = req.body;
  if (typeof question !== 'string' || !question.trim()) return res.status(400).json({ error: '请提供问题' });
  const ai = getGeminiClient();
  if (!ai) return res.status(503).json({ error: '未配置 AI 服务，无法生成回答。' });
  try {
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      contents: JSON.stringify({ question, member, reports, alerts }),
      config: { systemInstruction: '你是健康资料整理助手。仅依据用户提供的记录说明指标变化与需要核对的问题。明确区分记录事实与推测，资料不足时说明不足，不假定病史，不生成个体化处方，不替代医生诊断。跨机构比较先核对单位、参考范围与检测方法。' }
    });
    return res.json({ answer: response.text, source: 'gemini', timestamp: new Date().toISOString() });
  } catch { return res.status(502).json({ error: 'AI 服务暂不可用，请稍后重试。' }); }
});

// Vite middleware & Static server
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, process.env.HOST || '127.0.0.1', () => {
    console.log(`Server running on http://${process.env.HOST || '127.0.0.1'}:${PORT}`);
  });
}

startServer();
