import { Router } from 'express';
import db from '../db.js';

const router = Router();

// 发起新的诊断会话
router.post('/start', (req, res) => {
  const { student_id, knowledge_area } = req.body;
  if (!student_id) {
    return res.status(400).json({ error: 'student_id 为必填' });
  }
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(student_id);
  if (!student) return res.status(404).json({ error: '学生不存在' });

  const area = knowledge_area || '牛顿定律';
  const result = db.prepare(
    'INSERT INTO conversations (student_id, knowledge_area) VALUES (?, ?)'
  ).run(student_id, area);

  const conversation = db.prepare('SELECT * FROM conversations WHERE id = ?').get(result.lastInsertRowid);

  // 添加系统消息到 messages
  const msgContent = JSON.stringify({
    type: 'system',
    text: `开始 ${area} 学情诊断会话 - ${student.name}同学`,
  });
  db.prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)').run(
    conversation.id, 'system', msgContent
  );

  res.json({
    success: true,
    data: {
      ...conversation,
      student_name: student.name,
      student_grade: student.grade,
    },
  });
});

// 保存学生回复到对话
router.post('/:id/message', (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: '消息内容不能为空' });

  const msgContent = JSON.stringify({ type: 'text', text: content });
  const result = db.prepare(
    'INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)'
  ).run(req.params.id, 'user', msgContent);

  res.json({
    success: true,
    data: { id: result.lastInsertRowid, role: 'user', content: msgContent },
  });
});

// 保存 AI 回复
router.post('/:id/ai-message', (req, res) => {
  const { content } = req.body;
  const msgContent = JSON.stringify({ type: 'text', text: content });
  const result = db.prepare(
    'INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)'
  ).run(req.params.id, 'assistant', msgContent);

  res.json({
    success: true,
    data: { id: result.lastInsertRowid, role: 'assistant', content: msgContent },
  });
});

// 获取对话历史
router.get('/:id/messages', (req, res) => {
  const messages = db.prepare(
    'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC'
  ).all(req.params.id);

  const parsed = messages.map((m) => ({
    ...m,
    parsed_content: JSON.parse(m.content),
  }));

  res.json({ success: true, data: parsed });
});

// 保存诊断结果
router.post('/result', (req, res) => {
  const { student_id, conversation_id, knowledge_area, overall_score, module_scores, summary } = req.body;
  if (!student_id || !knowledge_area) {
    return res.status(400).json({ error: 'student_id 和 knowledge_area 为必填' });
  }

  const result = db.prepare(
    `INSERT INTO diagnosis_results (student_id, conversation_id, knowledge_area, overall_score, module_scores, summary)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    student_id,
    conversation_id || null,
    knowledge_area,
    overall_score || 0,
    JSON.stringify(module_scores || {}),
    summary || ''
  );

  // 更新对话状态
  if (conversation_id) {
    db.prepare('UPDATE conversations SET status = ?, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?')
      .run('completed', conversation_id);
  }

  const dr = db.prepare('SELECT * FROM diagnosis_results WHERE id = ?').get(result.lastInsertRowid);
  res.json({ success: true, data: dr });
});

// 获取诊断结果详情
router.get('/result/:id', (req, res) => {
  const dr = db.prepare('SELECT * FROM diagnosis_results WHERE id = ?').get(req.params.id);
  if (!dr) return res.status(404).json({ error: '诊断结果不存在' });
  dr.module_scores = JSON.parse(dr.module_scores || '{}');
  res.json({ success: true, data: dr });
});

// 获取学生历次诊断对比
router.get('/student/:studentId/compare', (req, res) => {
  const results = db.prepare(
    'SELECT * FROM diagnosis_results WHERE student_id = ? ORDER BY created_at ASC'
  ).all(req.params.id);

  const parsed = results.map((r) => ({
    ...r,
    module_scores: JSON.parse(r.module_scores || '{}'),
  }));

  res.json({ success: true, data: parsed });
});

export default router;
