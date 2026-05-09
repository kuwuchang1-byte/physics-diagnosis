import { Router } from 'express';
import db from '../db.js';
import { isAIAvailable } from '../agent.js';

const router = Router();

// 获取所有对话记录（含学生名）
router.get('/conversations', (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  const conversations = db.prepare(`
    SELECT c.*, s.name as student_name, s.grade as student_grade,
      (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as msg_count,
      (SELECT overall_score FROM diagnosis_results WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as score
    FROM conversations c
    JOIN students s ON c.student_id = s.id
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `).all(Number(limit), Number(offset));

  const total = db.prepare('SELECT COUNT(*) as count FROM conversations').get().count;

  res.json({
    success: true,
    data: { conversations, total, page: Number(page), limit: Number(limit) },
  });
});

// 获取详细对话记录
router.get('/conversations/:id', (req, res) => {
  const conversation = db.prepare(`
    SELECT c.*, s.name as student_name, s.grade as student_grade
    FROM conversations c
    JOIN students s ON c.student_id = s.id
    WHERE c.id = ?
  `).get(req.params.id);

  if (!conversation) return res.status(404).json({ error: '对话不存在' });

  const messages = db.prepare(
    'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC'
  ).all(req.params.id);

  const dr = db.prepare(
    'SELECT * FROM diagnosis_results WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1'
  ).get(req.params.id);

  res.json({
    success: true,
    data: {
      conversation,
      messages: messages.map((m) => ({ ...m, parsed_content: JSON.parse(m.content) })),
      diagnosis_result: dr ? { ...dr, module_scores: JSON.parse(dr.module_scores || '{}') } : null,
    },
  });
});

// 获取统计数据
router.get('/stats', (req, res) => {
  const stats = {
    total_students: db.prepare('SELECT COUNT(*) as count FROM students').get().count,
    total_conversations: db.prepare('SELECT COUNT(*) as count FROM conversations').get().count,
    pending_conversations: db.prepare("SELECT COUNT(*) as count FROM conversations WHERE status = 'in_progress'").get().count,
    total_diagnoses: db.prepare('SELECT COUNT(*) as count FROM diagnosis_results').get().count,
    total_faq: db.prepare('SELECT COUNT(*) as count FROM faq_entries').get().count,
    total_questions: db.prepare('SELECT COUNT(*) as count FROM questions').get().count,
    avg_score: db.prepare('SELECT ROUND(AVG(overall_score), 1) as avg FROM diagnosis_results').get().avg || 0,
    recent_diagnoses: db.prepare(`
      SELECT d.*, s.name as student_name FROM diagnosis_results d
      JOIN students s ON d.student_id = s.id
      ORDER BY d.created_at DESC LIMIT 5
    `).all(),
    conversations_today: db.prepare(
      "SELECT COUNT(*) as count FROM conversations WHERE date(created_at) = date('now')"
    ).get().count,
  };

  res.json({ success: true, data: stats });
});

// AI 评分状态 — 检查 DeepSeek API 配置
router.get('/ai-status', (req, res) => {
  const available = isAIAvailable();
  res.json({ success: true, data: { available } });
});

// 手动清理超时对话（超过30分钟标记为完成）
router.post('/cleanup-conversations', (req, res) => {
  const r = db.prepare(
    "UPDATE conversations SET status = 'completed', updated_at = datetime('now','localtime') WHERE status = 'in_progress' AND datetime(created_at) < datetime('now','localtime','-30 minutes')"
  ).run();
  res.json({ success: true, message: `已清理 ${r.changes} 个超时对话（超过30分钟未完成）` });
});

// 获取学生列表（管理员用）
router.get('/students', (req, res) => {
  const students = db.prepare(`
    SELECT s.*,
      (SELECT COUNT(*) FROM diagnosis_results WHERE student_id = s.id) as diagnosis_count,
      (SELECT MAX(created_at) FROM diagnosis_results WHERE student_id = s.id) as last_diagnosis
    FROM students s
    ORDER BY s.created_at DESC
  `).all();
  res.json({ success: true, data: students });
});

// 删除对话
router.delete('/conversations/:id', (req, res) => {
  db.prepare('DELETE FROM conversations WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: '已删除' });
});

export default router;
