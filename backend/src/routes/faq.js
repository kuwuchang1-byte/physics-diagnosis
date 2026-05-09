import { Router } from 'express';
import db from '../db.js';

const router = Router();

// 搜索 FAQ (支持关键词搜索)
router.get('/', (req, res) => {
  const { q, category } = req.query;
  let sql = 'SELECT * FROM faq_entries WHERE 1=1';
  const params = [];

  if (q) {
    sql += ' AND (question LIKE ? OR answer LIKE ? OR tags LIKE ?)';
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }

  sql += ' ORDER BY created_at DESC LIMIT 50';
  const entries = db.prepare(sql).all(...params);
  res.json({ success: true, data: entries });
});

// 获取分类列表
router.get('/categories', (req, res) => {
  const categories = db.prepare(
    'SELECT category, COUNT(*) as count FROM faq_entries GROUP BY category ORDER BY category'
  ).all();
  res.json({ success: true, data: categories });
});

// 添加 FAQ
router.post('/', (req, res) => {
  const { question, answer, category, tags } = req.body;
  if (!question || !answer) {
    return res.status(400).json({ error: '问题和答案不能为空' });
  }
  const stmt = db.prepare(
    'INSERT INTO faq_entries (question, answer, category, tags) VALUES (?, ?, ?, ?)'
  );
  const result = stmt.run(question, answer, category || '', tags || '');
  const entry = db.prepare('SELECT * FROM faq_entries WHERE id = ?').get(result.lastInsertRowid);
  res.json({ success: true, data: entry });
});

// 删除 FAQ
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM faq_entries WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: '已删除' });
});

export default router;
