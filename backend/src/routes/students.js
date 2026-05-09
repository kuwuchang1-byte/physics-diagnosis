import { Router } from 'express';
import db from '../db.js';

const router = Router();

// 创建学生
router.post('/', (req, res) => {
  const { name, grade, class_name, progress_note } = req.body;
  if (!name || !grade) {
    return res.status(400).json({ error: '姓名和年级为必填项' });
  }
  const stmt = db.prepare(
    'INSERT INTO students (name, grade, class_name, progress_note) VALUES (?, ?, ?, ?)'
  );
  const result = stmt.run(name, grade, class_name || '', progress_note || '');
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(result.lastInsertRowid);
  res.json({ success: true, data: student });
});

// 获取所有学生
router.get('/', (req, res) => {
  const students = db.prepare(
    'SELECT s.*, COUNT(d.id) as diagnosis_count FROM students s LEFT JOIN diagnosis_results d ON s.id = d.student_id GROUP BY s.id ORDER BY s.created_at DESC'
  ).all();
  res.json({ success: true, data: students });
});

// 获取单个学生
router.get('/:id', (req, res) => {
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
  if (!student) return res.status(404).json({ error: '学生不存在' });
  res.json({ success: true, data: student });
});

// 获取学生的诊断历史
router.get('/:id/history', (req, res) => {
  const results = db.prepare(
    'SELECT * FROM diagnosis_results WHERE student_id = ? ORDER BY created_at DESC'
  ).all(req.params.id);
  res.json({ success: true, data: results });
});

// 更新学生信息
router.put('/:id', (req, res) => {
  const { name, grade, class_name, progress_note } = req.body;
  db.prepare(
    'UPDATE students SET name=?, grade=?, class_name=?, progress_note=?, updated_at=datetime(\'now\',\'localtime\') WHERE id=?'
  ).run(name, grade, class_name || '', progress_note || '', req.params.id);
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
  res.json({ success: true, data: student });
});

// 删除学生
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: '已删除' });
});

export default router;
