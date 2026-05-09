import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer } from 'ws';
import db from './db.js';
import { seedFAQ } from './seed-faq.js';
import { DiagnosisEngine, seedQuestions, loadQuestions, isAIAvailable, WEIGHT_CONFIG } from './agent.js';
import studentsRouter from './routes/students.js';
import diagnosisRouter from './routes/diagnosis.js';
import faqRouter from './routes/faq.js';
import adminRouter from './routes/admin.js';
import questionsRouter from './routes/questions.js';

// ===== 全局错误兜底 =====
process.on('uncaughtException', (err) => {
  console.error('⚠️ 未捕获异常（已兜底，进程继续运行）:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ 未处理的 Promise 拒绝（已兜底）:', reason?.message || reason);
});

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Middleware
app.use(cors());
app.use(express.json());

// API routes
app.use('/api/students', studentsRouter);
app.use('/api/diagnosis', diagnosisRouter);
app.use('/api/faq', faqRouter);
app.use('/api/admin', adminRouter);
app.use('/api/questions', questionsRouter);

// ===== WebSocket 诊断会话处理 =====
const activeSessions = new Map();

wss.on('connection', (ws) => {
  const sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  console.log(`[WS] 新连接: ${sessionId}`);

  const session = {
    conversationId: null,
    studentId: null,
    studentInfo: null,
    engine: null,
  };
  activeSessions.set(sessionId, session);

  ws.on('message', async (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      const { type } = data;

      switch (type) {
        case 'init': {
          const { student_id, student_name, grade, progress_note, knowledge_area } = data;
          session.studentId = student_id;
          session.studentInfo = { name: student_name, grade, progress_note, knowledge_area };

          session.engine = new DiagnosisEngine(session.studentInfo, loadQuestions());

          const convResult = db.prepare(
            'INSERT INTO conversations (student_id, knowledge_area) VALUES (?, ?)'
          ).run(student_id, knowledge_area || '牛顿定律');
          session.conversationId = convResult.lastInsertRowid;

          const sysMsg = JSON.stringify({
            type: 'system',
            text: `开始 ${knowledge_area || '牛顿定律'} 学情诊断会话`,
          });
          db.prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)').run(
            session.conversationId, 'system', sysMsg
          );

          ws.send(JSON.stringify({
            type: 'init_ack',
            conversation_id: session.conversationId,
            total_questions: session.engine.getTotalQuestions(),
          }));

          // 发送第一个问题
          sendQuestion(ws, session);
          break;
        }

        case 'message': {
          const { content } = data;
          if (!session.conversationId || !session.engine) {
            ws.send(JSON.stringify({ type: 'error', message: '会话未初始化' }));
            return;
          }

          // 保存学生消息
          const userMsg = JSON.stringify({ type: 'text', text: content });
          db.prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)').run(
            session.conversationId, 'user', userMsg
          );
          ws.send(JSON.stringify({ type: 'ack' }));

          // 评估答案（评分但不告诉学生）
          const result = await session.engine.submitAnswer(content);

          if (result.type === 'all_done') {
            // 所有题目答完 — 发送完成提示
            const finishMsg = `✅ 所有题目已答完！正在生成诊断报告...`;
            saveAiMessage(session, finishMsg);
            streamText(ws, finishMsg);
            ws.send(JSON.stringify({ type: 'answering_done' }));

            // 短暂延迟后生成并发送诊断结果
            setTimeout(() => {
              const diagnosisResult = session.engine.generateResult();
              saveDiagnosisResult(session, diagnosisResult);

              // 发送答题回看详情
              ws.send(JSON.stringify({
                type: 'diagnosis_result',
                result_id: diagnosisResult._dbId,
                data: diagnosisResult,
              }));
              ws.send(JSON.stringify({ type: 'done' }));
            }, 500);

          } else if (result.type === 'next_question') {
            // 保存AI消息（只记确认，不记评价）
            const ackText = '✅ 已收到你的回答';
            saveAiMessage(session, ackText);
            streamText(ws, ackText);

            // 直接发下一题（ack和题目属于同一回合，只在题目后发done）
            setTimeout(() => {
              sendQuestion(ws, session);
            }, 300);
          }
          break;
        }

        default:
          ws.send(JSON.stringify({ type: 'error', message: `未知消息类型: ${type}` }));
      }
    } catch (err) {
      console.error('[WS] 消息处理错误:', err.message, err.stack);
      ws.send(JSON.stringify({ type: 'error', message: '服务器处理出错: ' + err.message }));
    }
  });

  ws.on('close', () => {
    console.log(`[WS] 断开连接: ${sessionId}`);
    activeSessions.delete(sessionId);
  });
});

// ===== 辅助函数 =====

function sendQuestion(ws, session) {
  const q = session.engine.getCurrentQuestion();
  if (!q) {
    ws.send(JSON.stringify({ type: 'done' }));
    return;
  }

  const student = session.studentInfo;
  // 编号：当前是第几题 = currentIndex + 1（currentIndex从0开始）
  const questionNum = session.engine.currentIndex + 1;
  const total = session.engine.getTotalQuestions();

  let fullText = '';

  // 只有第一题才发问候语
  if (session.engine.currentIndex === 0) {
    fullText += `👋 ${student.name}同学你好！我是你的AI物理诊断教师。\n\n你选择了「${student.knowledge_area || '牛顿定律'}」模块的学情诊断，共${total}道题目，让我们开始吧！\n\n`;
  }

  fullText += `【第${questionNum}/${total}题 · ${q.core_dim_label} · ${q.sub_dim_label}】\n\n${q.question_text}`;

  // 发送题目编号信息（前端用于进度条）
  ws.send(JSON.stringify({
    type: 'question',
    index: questionNum,
    total: total,
    core_dim_label: q.core_dim_label,
    sub_dim_label: q.sub_dim_label,
  }));

  saveAiMessage(session, fullText);
  streamText(ws, fullText);
  ws.send(JSON.stringify({ type: 'done' }));
}

function streamText(ws, text) {
  const CHUNK_SIZE = 20;
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    const chunk = text.slice(i, i + CHUNK_SIZE);
    ws.send(JSON.stringify({ type: 'chunk', content: chunk }));
  }
}

function saveAiMessage(session, text) {
  const msg = JSON.stringify({ type: 'text', text });
  db.prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)').run(
    session.conversationId, 'assistant', msg
  );
}

function saveDiagnosisResult(session, result) {
  const dr = db.prepare(
    `INSERT INTO diagnosis_results (student_id, conversation_id, knowledge_area, overall_score, module_scores, summary, grading_status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    session.studentId,
    session.conversationId,
    session.studentInfo?.knowledge_area || '牛顿定律',
    result.overall_score,
    JSON.stringify(result.modules),
    result.overall_assessment + (result.recommendations ? '\n\n建议：' + result.recommendations.join('；') : ''),
    'completed'
  );

  db.prepare('UPDATE conversations SET status = ?, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?')
    .run('completed', session.conversationId);

  result._dbId = dr.lastInsertRowid;
}

// 启动时播种
seedFAQ();
seedQuestions();

// 自动清理超时未完成的对话（超过30分钟标记为已过期）
function cleanupStaleConversations() {
  const expired = db.prepare(
    "UPDATE conversations SET status = 'completed', updated_at = datetime('now','localtime') WHERE status = 'in_progress' AND datetime(created_at) < datetime('now','localtime','-30 minutes')"
  ).run();
  if (expired.changes > 0) {
    console.log(`[清理] 自动关闭 ${expired.changes} 个超时对话（超过30分钟）`);
  }
}
cleanupStaleConversations();
setInterval(cleanupStaleConversations, 30 * 60 * 1000);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  const aiStatus = isAIAvailable();
  console.log(`🚀 高中物理学情诊断助手后端启动成功！`);
  console.log(`   API:     http://localhost:${PORT}/api`);
  console.log(`   WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`   AI评分:   ${aiStatus ? '✅ 智谱 AI 已配置' : '⚠️ 未配置 API Key，将使用关键词评分回退'}`);
  if (!aiStatus) {
    console.log(`   配置方法: 编辑 backend/.env 文件，填入 AI_API_KEY`);
    console.log(`   注册地址: https://open.bigmodel.cn/`);
  }
});

export default app;
