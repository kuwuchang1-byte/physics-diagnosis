import { Router } from 'express';
import db from '../db.js';

const router = Router();

// 一级维度映射
const CORE_DIM_LABELS = {
  physical_concept: '物理观念',
  scientific_thinking: '科学思维',
  scientific_inquiry: '科学探究',
  scientific_attitude: '科学态度与责任',
};

// 二级维度映射
const SUB_DIM_LABELS = {
  knowledge_application: '知识应用',
  model_construction: '模型建构',
  analytical_reasoning: '分析推理',
  critical_innovation: '批判创新',
  questioning: '提出问题',
  rational_inquiry: '理性探究',
  reporting: '表达交流',
  inquiry_awareness: '探究意识',
  collaboration: '合作学习',
  stse: 'STSE',
};

// 习题类型映射
const EXERCISE_TYPE_LABELS = {
  concept_model: '概念模型课',
  method_technique: '方法技巧课',
  extension: '拓展提升课',
  experiment: '实验探究课',
  comprehensive: '综合应用课',
};

// 列出题目（支持筛选）
router.get('/', (req, res) => {
  const { core_dimension, sub_dimension, exercise_type, active } = req.query;
  let sql = 'SELECT * FROM questions WHERE 1=1';
  const params = [];

  if (core_dimension) { sql += ' AND core_dimension = ?'; params.push(core_dimension); }
  if (sub_dimension) { sql += ' AND sub_dimension = ?'; params.push(sub_dimension); }
  if (exercise_type) { sql += ' AND exercise_type = ?'; params.push(exercise_type); }
  if (active !== undefined) { sql += ' AND active = ?'; params.push(Number(active)); }

  sql += ' ORDER BY core_dimension, sub_dimension, difficulty';
  const questions = db.prepare(sql).all(...params);
  res.json({ success: true, data: questions.map(q => ({ ...q, keywords: JSON.parse(q.keywords || '[]') })) });
});

// 获取单个题目
router.get('/:id', (req, res) => {
  const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id);
  if (!q) return res.status(404).json({ error: '题目不存在' });
  q.keywords = JSON.parse(q.keywords || '[]');
  res.json({ success: true, data: q });
});

// 新增题目
router.post('/', (req, res) => {
  const { core_dimension, sub_dimension, question_text, keywords, hint, difficulty, exercise_type } = req.body;
  if (!core_dimension || !sub_dimension || !question_text) {
    return res.status(400).json({ error: '核心素养维度和题目内容为必填' });
  }

  const r = db.prepare(
    'INSERT INTO questions (core_dimension, sub_dimension, core_dim_label, sub_dim_label, exercise_type, exercise_type_label, question_text, keywords, hint, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    core_dimension, sub_dimension,
    CORE_DIM_LABELS[core_dimension] || core_dimension,
    SUB_DIM_LABELS[sub_dimension] || sub_dimension,
    exercise_type || '',
    EXERCISE_TYPE_LABELS[exercise_type] || exercise_type || '',
    question_text,
    JSON.stringify(keywords || []),
    hint || '', difficulty || 2
  );
  const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(r.lastInsertRowid);
  q.keywords = JSON.parse(q.keywords || '[]');
  res.json({ success: true, data: q });
});

// 更新题目
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: '题目不存在' });

  const { core_dimension, sub_dimension, question_text, keywords, hint, difficulty, active, exercise_type } = req.body;

  db.prepare(`UPDATE questions SET
    core_dimension=?, sub_dimension=?, core_dim_label=?, sub_dim_label=?,
    exercise_type=?, exercise_type_label=?,
    question_text=?, keywords=?, hint=?, difficulty=?, active=?,
    updated_at=datetime('now','localtime')
    WHERE id=?`).run(
    core_dimension || existing.core_dimension,
    sub_dimension || existing.sub_dimension,
    CORE_DIM_LABELS[core_dimension || existing.core_dimension] || existing.core_dim_label,
    SUB_DIM_LABELS[sub_dimension || existing.sub_dimension] || existing.sub_dim_label,
    exercise_type !== undefined ? exercise_type : existing.exercise_type,
    exercise_type !== undefined ? (EXERCISE_TYPE_LABELS[exercise_type] || exercise_type || existing.exercise_type_label) : existing.exercise_type_label,
    question_text || existing.question_text,
    JSON.stringify(keywords || JSON.parse(existing.keywords || '[]')),
    hint !== undefined ? hint : existing.hint,
    difficulty || existing.difficulty,
    active !== undefined ? Number(active) : existing.active,
    req.params.id
  );
  const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id);
  q.keywords = JSON.parse(q.keywords || '[]');
  res.json({ success: true, data: q });
});

// 删除题目
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM questions WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: '已删除' });
});

// 批量重置为默认题库
router.post('/reset-defaults', (req, res) => {
  db.exec('DELETE FROM questions');
  import('../agent.js').then(mod => {
    mod.seedQuestions();
    const count = db.prepare('SELECT COUNT(*) as c FROM questions').get().c;
    res.json({ success: true, message: `已重置为默认题库，共 ${count} 题` });
  });
});

export default router;
