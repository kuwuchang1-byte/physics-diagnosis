import db from './db.js';

// ===== 加载环境变量 =====
import 'dotenv/config';

const AI_API_KEY = process.env.AI_API_KEY || '';
const AI_BASE_URL = process.env.AI_BASE_URL || 'https://api.longcat.chat/openai/v1';
const AI_MODEL = process.env.AI_MODEL || 'LongCat-Flash-Thinking-2601';

// ===== 评价框架配置（基于物理核心素养体系）=====
// 来源：《普通高中物理课程标准(2017版2020修订)》
// 权重数据：姚远(2019) 基于层次分析法(AHP)，40名高中物理教师问卷

export const WEIGHT_CONFIG = {
  // 一级维度（4个核心素养）
  dimensions: {
    physical_concept:  { name: '物理观念',     weight: 0.191, label: '物理观念' },
    scientific_thinking: { name: '科学思维',   weight: 0.361, label: '科学思维' },
    scientific_inquiry:  { name: '科学探究',   weight: 0.218, label: '科学探究' },
    scientific_attitude: { name: '科学态度与责任', weight: 0.230, label: '科学态度与责任' },
  },
  // 二级维度（10个指标）及其在一级维度内的权重
  sub_dimensions: {
    // 物理观念（1个子维度）
    knowledge_application:   { parent: 'physical_concept',  name: '知识应用', weight: 1.000, label: '知识应用' },
    // 科学思维（3个子维度）
    model_construction:      { parent: 'scientific_thinking', name: '模型建构', weight: 0.199, label: '模型建构' },
    analytical_reasoning:    { parent: 'scientific_thinking', name: '分析推理', weight: 0.240, label: '分析推理' },
    critical_innovation:     { parent: 'scientific_thinking', name: '批判创新', weight: 0.561, label: '批判创新' },
    // 科学探究（3个子维度）
    questioning:             { parent: 'scientific_inquiry',  name: '提出问题', weight: 0.152, label: '提出问题' },
    rational_inquiry:        { parent: 'scientific_inquiry',  name: '理性探究', weight: 0.574, label: '理性探究' },
    reporting:               { parent: 'scientific_inquiry',  name: '表达交流', weight: 0.274, label: '表达交流' },
    // 科学态度与责任（3个子维度）
    inquiry_awareness:       { parent: 'scientific_attitude', name: '探究意识', weight: 0.601, label: '探究意识' },
    collaboration:           { parent: 'scientific_attitude', name: '合作学习', weight: 0.224, label: '合作学习' },
    stse:                    { parent: 'scientific_attitude', name: 'STSE',    weight: 0.175, label: 'STSE' },
  },
};

// 学业质量水平3描述（作为AI评分基准）
const LEVEL3_DESCRIPTIONS = {
  physical_concept: '能理解所学的物理概念和规律及其相互关系，能用物理概念和规律解释自然现象和解决实际问题。',
  scientific_thinking: '能在熟悉的问题情境中选用恰当的模型解决问题；能对常见的物理问题进行分析和推理，获得结论并作出解释。',
  scientific_inquiry: '能分析现象，提出可探究的物理问题；能设计方案以获取数据；能分析数据，形成结论并作出解释。',
  scientific_attitude: '认识到物理学研究是富有创造性的工作；有较强的学习和研究兴趣，实事求是。',
};

// 习题类型（大概念习题课分类，源自吴建鹏 2022）
export const EXERCISE_TYPES = {
  concept_model:    { name: '概念模型课',   label: '概念模型课' },
  method_technique: { name: '方法技巧课',   label: '方法技巧课' },
  extension:        { name: '拓展提升课',   label: '拓展提升课' },
  experiment:       { name: '实验探究课',   label: '实验探究课' },
  comprehensive:    { name: '综合应用课',   label: '综合应用课' },
};

// ===== 预置题目（基于核心素养维度标注）=====
const DEFAULT_QUESTIONS = [
  // === 物理观念 - 知识应用 ===
  { core_dimension:'physical_concept', sub_dimension:'knowledge_application',
    core_dim_label:'物理观念', sub_dim_label:'知识应用',
    exercise_type:'concept_model', exercise_type_label:'概念模型课',
    question:'牛顿第一定律的内容是什么？它揭示了力和运动之间什么关系？',
    keywords:['惯性','不受力','静止','匀速直线','改变运动状态','不是维持'],
    hint:'提示：想想"力是改变物体运动状态的原因"这句话。', difficulty:2 },
  { core_dimension:'physical_concept', sub_dimension:'knowledge_application',
    core_dim_label:'物理观念', sub_dim_label:'知识应用',
    exercise_type:'concept_model', exercise_type_label:'概念模型课',
    question:'什么是惯性？惯性的大小与什么因素有关？请举例说明。',
    keywords:['保持','原来状态','质量','越大惯性越大','固有属性'],
    hint:'提示：想想质量不同的物体，谁更难改变运动状态？', difficulty:2 },
  { core_dimension:'physical_concept', sub_dimension:'knowledge_application',
    core_dim_label:'物理观念', sub_dim_label:'知识应用',
    exercise_type:'comprehensive', exercise_type_label:'综合应用课',
    question:'请写出牛顿第二定律的公式，并解释各物理量的含义和单位。',
    keywords:['F=ma','牛顿第二','合力','质量','加速度','kg','m/s²','N'],
    hint:'提示：F代表什么？m代表什么？a代表什么？', difficulty:2 },

  // === 科学思维 - 模型建构 ===
  { core_dimension:'scientific_thinking', sub_dimension:'model_construction',
    core_dim_label:'科学思维', sub_dim_label:'模型建构',
    exercise_type:'concept_model', exercise_type_label:'概念模型课',
    question:'（选择题）刹车时，乘客会向前倾倒，这是因为：\nA. 乘客受到向前的力\nB. 乘客具有惯性\nC. 汽车对乘客有推力\nD. 乘客受到重力\n请回答并简要说明理由。',
    keywords:['B','惯性','保持','原来运动','向前'],
    hint:'提示：想想牛顿第一定律中关于惯性的描述。', difficulty:2 },
  { core_dimension:'scientific_thinking', sub_dimension:'model_construction',
    core_dim_label:'科学思维', sub_dim_label:'模型建构',
    exercise_type:'method_technique', exercise_type_label:'方法技巧课',
    question:'一个质量为2kg的物体，受到一个大小为10N的水平拉力（摩擦不计），求物体的加速度。请画出受力分析图。',
    keywords:['5m/s²','5','a=F/m','10/2','F=ma','受力分析'],
    hint:'提示：直接套用公式 a = F/m，注意画受力分析图。', difficulty:2 },

  // === 科学思维 - 分析推理 ===
  { core_dimension:'scientific_thinking', sub_dimension:'analytical_reasoning',
    core_dim_label:'科学思维', sub_dim_label:'分析推理',
    exercise_type:'concept_model', exercise_type_label:'概念模型课',
    question:'牛顿第二定律是矢量式还是标量式？在解题时需要注意什么？',
    keywords:['矢量','方向','坐标系','分量','正方向','加速方向'],
    hint:'提示：力和加速度都是矢量，需要考虑方向。', difficulty:3 },
  { core_dimension:'scientific_thinking', sub_dimension:'analytical_reasoning',
    core_dim_label:'科学思维', sub_dim_label:'分析推理',
    exercise_type:'concept_model', exercise_type_label:'概念模型课',
    question:'作用力与反作用力和平衡力有什么区别？请从受力物体、力的性质和作用效果三个方面说明。',
    keywords:['不同物体','同一物体','同种性质','不同性质','不能抵消','可以抵消'],
    hint:'提示：关键看受力对象是不是同一个物体。', difficulty:3 },
  { core_dimension:'scientific_thinking', sub_dimension:'analytical_reasoning',
    core_dim_label:'科学思维', sub_dim_label:'分析推理',
    exercise_type:'concept_model', exercise_type_label:'概念模型课',
    question:'什么是牛顿第三定律？请用一个生活中的例子说明。',
    keywords:['作用力','反作用力','大小相等','方向相反','同一直线','同时产生','同时消失'],
    hint:'提示：想想走路、划船、火箭发射等场景。', difficulty:2 },

  // === 科学思维 - 批判创新 ===
  { core_dimension:'scientific_thinking', sub_dimension:'critical_innovation',
    core_dim_label:'科学思维', sub_dim_label:'批判创新',
    exercise_type:'extension', exercise_type_label:'拓展提升课',
    question:'一个质量为m的物体放在倾角为θ的光滑斜面上，求物体沿斜面下滑的加速度。（重力加速度为g）请说明你的分析过程。',
    keywords:['gsinθ','g sinθ','mgsinθ','重力的分力','沿斜面方向','正交分解'],
    hint:'提示：先做受力分析，把重力沿斜面方向和垂直斜面方向分解。', difficulty:4 },
  { core_dimension:'scientific_thinking', sub_dimension:'critical_innovation',
    core_dim_label:'科学思维', sub_dim_label:'批判创新',
    exercise_type:'extension', exercise_type_label:'拓展提升课',
    question:'一辆在水平路面上匀速行驶的汽车，如果突然关闭发动机且不再受任何外力，汽车将如何运动？请用牛顿第一定律解释，并与日常经验对比说明为什么这个结论不容易被接受。',
    keywords:['匀速直线','惯性','不受力','保持','原来速度','摩擦力','亚里士多德'],
    hint:'提示：当合力为零时，物体会保持原来的运动状态。', difficulty:3 },

  // === 科学思维 - 批判创新（选择题）===
  { core_dimension:'scientific_thinking', sub_dimension:'critical_innovation',
    core_dim_label:'科学思维', sub_dim_label:'批判创新',
    exercise_type:'method_technique', exercise_type_label:'方法技巧课',
    question:'（选择题）人走路时，脚对地面施加向后的力，下列说法正确的是：\nA. 地面对脚施加向前的摩擦力\nB. 地面受到向后的力，所以向后运动\nC. 脚对地面的力和人对地面的重力是平衡力\nD. 人对地面的压力和地面对人的支持力是作用力与反作用力\n请选择并说明理由。',
    keywords:['A','D','摩擦力','反作用力','牛顿第三','平衡力'],
    hint:'提示：注意区分作用力与反作用力和平衡力。', difficulty:3 },

  // === 科学态度与责任 - STSE ===
  { core_dimension:'scientific_attitude', sub_dimension:'stse',
    core_dim_label:'科学态度与责任', sub_dim_label:'STSE',
    exercise_type:'comprehensive', exercise_type_label:'综合应用课',
    question:'火箭为什么能在真空中飞行？请用牛顿第三定律解释，并谈谈火箭技术的发展对人类探索太空的意义。',
    keywords:['反冲','反作用力','喷出燃气','向后喷','向前推','作用力与反作用'],
    hint:'提示：真空中没有空气，火箭的推力来自哪里？', difficulty:3 },
  { core_dimension:'scientific_attitude', sub_dimension:'stse',
    core_dim_label:'科学态度与责任', sub_dim_label:'STSE',
    exercise_type:'comprehensive', exercise_type_label:'综合应用课',
    question:'安全带和安全气囊在汽车急刹车时如何保护乘客？请用牛顿定律分析其工作原理，并说明为什么乘车时必须系安全带。',
    keywords:['惯性','动量','减速','受力','牛顿第一','牛顿第二','保护'],
    hint:'提示：急刹车时人体由于惯性会怎样运动？安全带提供了什么力？', difficulty:3 },
];

/**
 * 将预置题目播种到数据库（仅首次运行）
 */
export function seedQuestions() {
  const count = db.prepare('SELECT COUNT(*) as c FROM questions').get().c;
  if (count > 0) {
    console.log(`题库表已有 ${count} 道题，跳过播种。`);
    return;
  }

  const stmt = db.prepare(
    'INSERT INTO questions (core_dimension, sub_dimension, core_dim_label, sub_dim_label, exercise_type, exercise_type_label, question_text, keywords, hint, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  db.exec('BEGIN TRANSACTION');
  for (const q of DEFAULT_QUESTIONS) {
    stmt.run(q.core_dimension, q.sub_dimension, q.core_dim_label, q.sub_dim_label,
      q.exercise_type, q.exercise_type_label, q.question,
      JSON.stringify(q.keywords), q.hint, q.difficulty);
  }
  db.exec('COMMIT');
  console.log(`✅ 播种 ${DEFAULT_QUESTIONS.length} 道预置题目到题库。`);
}

/**
 * 从数据库加载题目
 */
export function loadQuestions() {
  const rows = db.prepare(
    'SELECT * FROM questions WHERE active = 1 ORDER BY core_dimension, sub_dimension, difficulty'
  ).all();
  return rows.map(r => ({
    ...r,
    keywords: JSON.parse(r.keywords || '[]'),
  }));
}

// ===== 智谱 AI (GLM) 评分 =====

/**
 * 检查 AI API 是否已配置
 */
export function isAIAvailable() {
  return AI_API_KEY && AI_API_KEY !== 'your_zhipu_api_key_here';
}

/**
 * 调用智谱 AI 进行评分（基于核心素养评价标准）
 * @returns {Promise<{score: number, comment: string}>}
 */
async function aiScoreAnswer(questionText, answer, coreDimLabel, subDimLabel, coreDimKey) {
  if (!isAIAvailable()) {
    return null;
  }

  const isChoiceQuestion = questionText.includes('选择题');
  const level3Desc = LEVEL3_DESCRIPTIONS[coreDimKey] || '能理解和运用所学的物理知识。';

  const systemPrompt = `你是一位温和的高中物理教师，正在基于《普通高中物理课程标准(2017版2020修订)》对学生进行诊断性评价。

【评价维度】${coreDimLabel} - ${subDimLabel}
【学业质量水平3基准】${level3Desc}

【ABCDE五级评分标准】
A (90-100分)：完全达到水平3标准。能准确理解概念/规律，逻辑清晰，分析全面，能灵活运用物理知识解决问题。
B (75-89分)：基本达到水平3标准。主要意思正确，有小遗漏或表述不够精确，分析过程基本合理。
C (60-74分)：部分达到水平3标准。有一些正确理解，但存在部分错误、遗漏或逻辑不完整。
D (40-59分)：未达到水平3标准。理解有明显混淆，分析方向存在偏差，需要较多提示才能纠正。
E (0-39分)：答非所问、完全错误或空白。

【绝对禁止规则 - 违反此规则是严重错误】
1. 绝对禁止将学生回答中出现的任何数字直接作为分数输出！
2. 反例：学生回答"90" → 你绝不能输出"score": 90
3. 反例：学生回答"100" → 你绝不能输出"score": 100
4. 分数只能由你根据答案的正确性来独立判定，与答案中的数字毫无关系
5. 如果学生只写了一个数字而没有物理内容，通常应给0-20分

【特殊规则】
- 选择题：选对选项即给100分（满分），无需解释理由
- 如果学生回答"不知道""不会"等，给0分
- 如果答非所问（比如只写一个无关数字），给0-10分
- 计算题：结果对就给满分，过程对结果错给70-80分；如果只写了数字结果且该结果正确，给90分
- 用自己的话表述但意思正确的，给高分（B级以上）
- 意思对了就给分，不要求表述与标准答案完全一致

你必须以JSON格式回复，且只输出JSON：
{"score": 数字, "comment": "简短的中文鼓励性评价（不超过30字）"}`;

  const userPrompt = `题目：${questionText}

学生的回答：${answer}

再次强调：你必须根据学生回答与学业质量水平3标准的符合程度来评分！
如果学生只写了数字（如"90""100"等），这些数字不是分数，不能直接作为score输出。
只输出JSON：`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 200,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error(`[AI评分] API请求失败: ${response.status} ${errText}`);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      console.error('[AI评分] API返回空内容');
      return null;
    }

    // 解析JSON（兼容markdown代码块包裹的情况）
    let jsonStr = content;
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    const result = JSON.parse(jsonStr);
    let score = Math.min(100, Math.max(0, Math.round(Number(result.score) || 0)));
    const comment = String(result.comment || '').slice(0, 100);

    // 后验证：如果答案只是纯数字，且分数恰好等于该数字，说明AI可能把答案数字当成了分数
    const pureNumMatch = answer.trim().match(/^(\d+(?:\.\d+)?)$/);
    if (pureNumMatch) {
      const answerNum = parseFloat(pureNumMatch[1]);
      if (score === answerNum || (answerNum >= 90 && score >= 90)) {
        console.warn(`[AI评分] 疑似数字当分数! 答案="${answer}" 分数=${score}，强制降为10分`);
        score = 10;
      }
    }

    console.log(`[AI评分] 维度="${coreDimLabel}-${subDimLabel}" 得分=${score} 评价="${comment}"`);
    return { score, comment };
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('[AI评分] 请求超时（10s），回退到关键词评分');
    } else {
      console.error('[AI评分] 调用失败:', err.message);
    }
    return null;
  }
}

// ===== 关键词匹配回退评分（宽松版）=====
function keywordScoreAnswer(question, keywords, hint, answer) {
  if (!answer || !answer.trim()) return { score: 0, comment: '请认真作答。' };
  const a = answer.toLowerCase().trim();
  const wc = a.split(/\s+/).length;
  const useless = ['不知道','不会','不懂','忘了','不记得','不清楚'];

  // 纯数字回答特殊处理
  const pureNumber = a.match(/^[\d.]+$/);
  if (pureNumber) {
    const num = pureNumber[0];
    const isCorrectAnswer = (keywords || []).some(kw => {
      const kl = kw.toLowerCase();
      return kl === num || kl.includes(num + 'm/s') || kl.includes(num + ' ');
    });
    if (isCorrectAnswer) {
      return { score: 90, comment: '结果正确！建议写出过程。' };
    }
    return { score: 5, comment: '请写出你的分析过程。' };
  }

  // 选择题特殊处理
  const isChoice = question.includes('选择题');
  if (isChoice) {
    const choiceMatch = a.match(/\b([A-D])\b/);
    if (choiceMatch) {
      for (const kw of (keywords || [])) {
        if (kw.length === 1 && kw.match(/[A-D]/) && kw === choiceMatch[1].toUpperCase()) {
          return { score: 100, comment: '回答正确！' };
        }
      }
      return { score: 30, comment: '选项可能不正确，请再想想。' };
    }
  }

  if (wc < 3 && useless.some(u => a.includes(u))) return { score: 0, comment: '加油！' };
  let mc = 0, tw = 0;
  const neg = ['不是','不对','错误','没有','不会','不能'];
  for (const kw of (keywords||[])) {
    const kl = kw.toLowerCase(); tw++;
    if (neg.some(n => a.includes(n+kl))) mc -= 0.5;
    else if (a.includes(kl)) mc++;
  }
  const r = tw > 0 ? mc/tw : 0;
  let s = r >= 0.5 ? 85+~~(Math.random()*11) : r >= 0.3 ? 70+~~(Math.random()*11)
         : r >= 0.15 ? 55+~~(Math.random()*11) : r > 0 ? 35+~~(Math.random()*15) : ~~(Math.random()*20);
  const qw = question.replace(/[选择题（）\n]/g,' ').split(/\s+/).filter(w=>w.length>1);
  const mqw = qw.filter(w=>a.includes(w.toLowerCase()));
  if (mqw.length===0 && s>30) s = Math.min(s, 30);
  if (mc <= 0 && wc < 3) s = Math.min(s, 15);
  const score = Math.min(100, Math.max(0, Math.round(s)));
  let comment = '';
  if (score >= 85) comment = '回答不错！';
  else if (score >= 70) comment = '基本正确。';
  else if (score >= 55) comment = '有一定理解。';
  else comment = hint || '需要加强复习。';
  return { score, comment };
}

/**
 * 双模式评分：优先AI，回退关键词
 * @returns {Promise<{score: number, comment: string, scoredBy: string}>}
 */
async function scoreAnswer(questionText, keywords, hint, answer, coreDimLabel, subDimLabel, coreDimKey) {
  const aiResult = await aiScoreAnswer(questionText, answer, coreDimLabel, subDimLabel, coreDimKey);
  if (aiResult) {
    return { ...aiResult, scoredBy: 'ai' };
  }
  const kwResult = keywordScoreAnswer(questionText, keywords, hint, answer);
  return { ...kwResult, scoredBy: 'keyword' };
}

/**
 * 诊断引擎 — 诊断会话状态管理
 */
export class DiagnosisEngine {
  constructor(studentInfo, questions, storeOnly = false) {
    this.studentInfo = studentInfo;
    this.questions = questions || loadQuestions();
    this.currentIndex = 0;
    this.answers = [];
    this.complete = false;
    this.storeOnly = storeOnly;
  }

  getTotalQuestions() { return this.questions.length; }
  getProgress() { return `${this.currentIndex + 1}/${this.getTotalQuestions()}`; }
  getCurrentQuestion() {
    if (this.complete || this.currentIndex >= this.questions.length) return null;
    return this.questions[this.currentIndex];
  }

  async submitAnswer(answer) {
    const q = this.getCurrentQuestion();
    if (!q) return { type: 'done' };

    // 评分
    const { score, comment, scoredBy } = await scoreAnswer(
      q.question_text, q.keywords, q.hint, answer,
      q.core_dim_label, q.sub_dim_label, q.core_dimension
    );
    this.answers.push({
      questionId: q.id,
      coreDimension: q.core_dimension,
      subDimension: q.sub_dimension,
      coreDimLabel: q.core_dim_label,
      subDimLabel: q.sub_dim_label,
      exerciseType: q.exercise_type,
      exerciseTypeLabel: q.exercise_type_label,
      questionText: q.question_text,
      answer,
      score,
      comment,
      scoredBy,
    });

    this.currentIndex++;

    if (this.currentIndex >= this.questions.length) {
      this.complete = true;
      return { type: 'all_done' };
    }

    const nextQ = this.getCurrentQuestion();
    return { type: 'next_question', nextQuestion: nextQ };
  }

  generateResult() {
    const dimCfg = WEIGHT_CONFIG.dimensions;
    const subCfg = WEIGHT_CONFIG.sub_dimensions;

    // 1. 按二级维度分组，计算各二级维度的平均分
    const subGroups = {};
    for (const ans of this.answers) {
      const key = ans.subDimension;
      if (!subGroups[key]) subGroups[key] = [];
      subGroups[key].push(ans.score);
    }

    const subScores = {};
    for (const [subKey, scores] of Object.entries(subGroups)) {
      subScores[subKey] = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
    }

    // 2. 按一级维度聚合：一级维度得分 = Σ(二级维度得分 × 二级维度在一级内的权重)
    const modules = {};
    for (const [dimKey, dimCfgItem] of Object.entries(dimCfg)) {
      const subEntries = Object.entries(subCfg).filter(([, v]) => v.parent === dimKey);
      let dimScore = 0;
      const subScoreDetails = {};
      for (const [subKey, subCfgItem] of subEntries) {
        const avg = subScores[subKey] || 0;
        dimScore += avg * subCfgItem.weight;
        subScoreDetails[subKey] = {
          name: subCfgItem.name,
          label: subCfgItem.label,
          score: avg,
          weight: subCfgItem.weight,
        };
      }
      // 如果没有题目属于该维度，分数为0
      dimScore = Math.round(dimScore);
      let comment = dimScore >= 80 ? '掌握良好，建议继续进阶练习。'
                 : dimScore >= 60 ? '基础尚可，需要加强理解和应用。'
                 : '该维度需要重点复习，建议从基本概念开始。';
      modules[dimKey] = {
        name: dimCfgItem.name,
        label: dimCfgItem.label,
        score: dimScore,
        weight: dimCfgItem.weight,
        subScores: subScoreDetails,
        comments: comment,
      };
    }

    // 3. 总分 = Σ(一级维度得分 × 一级维度权重)
    let overallScore = 0;
    for (const [dimKey, mod] of Object.entries(modules)) {
      overallScore += mod.score * dimCfg[dimKey].weight;
    }
    overallScore = Math.round(overallScore);

    // 4. 优势与薄弱维度分析
    const weak = [], strong = [];
    for (const [dimKey, mod] of Object.entries(modules)) {
      if (mod.score < 60) weak.push(mod.name);
      else strong.push(mod.name);
    }

    const recommendations = [];
    if (weak.length) recommendations.push(`重点加强：${weak.join('、')}。建议回归课本，理解基本概念和规律。`);
    if (strong.length) recommendations.push(`保持优势：在${strong.join('、')}方面继续深入，尝试更高难度的综合题。`);
    recommendations.push('建议多做受力分析和运动分析练习，建立清晰的物理模型思维。');

    return {
      type: 'diagnosis_result',
      overall_score: overallScore,
      overall_assessment: overallScore >= 80 ? '整体表现优秀！你对牛顿定律相关核心素养有较好的掌握。'
        : overallScore >= 60 ? '整体表现良好，部分核心素养维度还需要巩固。'
        : '牛顿定律部分需要系统性地复习和加强练习。',
      modules,
      recommendations,
      answer_details: this.answers.map((a, i) => ({
        index: i + 1,
        questionText: a.questionText,
        coreDimLabel: a.coreDimLabel,
        subDimLabel: a.subDimLabel,
        exerciseTypeLabel: a.exerciseTypeLabel || '',
        answer: a.answer,
        score: a.score,
        comment: a.comment,
        scoredBy: a.scoredBy,
      })),
    };
  }
}
