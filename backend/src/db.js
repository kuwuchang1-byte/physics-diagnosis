/**
 * 数据库模块 — 支持 SQLite（本地开发）和 PostgreSQL（生产环境）
 * 生产环境通过环境变量 DATABASE_URL 切换到 PostgreSQL
 */
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ===== 判断环境 =====
const isProduction = process.env.NODE_ENV === 'production' || !!process.env.DATABASE_URL;
const dbUrl = process.env.DATABASE_URL || '';

// ===== 生产：PostgreSQL =====
let pgPool = null;

if (isProduction && dbUrl) {
  const pg = await import('pg');
  pgPool = new pg.default.Pool({ connectionString: dbUrl });
  
  // 测试连接并初始化表结构
  const initPg = async () => {
    const client = await pgPool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS students (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          grade TEXT NOT NULL,
          class_name TEXT DEFAULT '',
          progress_note TEXT DEFAULT '',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS conversations (
          id SERIAL PRIMARY KEY,
          student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
          knowledge_area TEXT NOT NULL,
          status TEXT DEFAULT 'in_progress' CHECK(status IN ('in_progress', 'completed')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id SERIAL PRIMARY KEY,
          conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          role TEXT NOT NULL CHECK(role IN ('system', 'assistant', 'user')),
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS diagnosis_results (
          id SERIAL PRIMARY KEY,
          student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
          conversation_id INTEGER REFERENCES conversations(id) ON DELETE SET NULL,
          knowledge_area TEXT NOT NULL,
          overall_score REAL DEFAULT 0,
          module_scores TEXT DEFAULT '{}',
          summary TEXT DEFAULT '',
          grading_status TEXT DEFAULT 'completed' CHECK(grading_status IN ('pending', 'completed')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS faq_entries (
          id SERIAL PRIMARY KEY,
          question TEXT NOT NULL,
          answer TEXT NOT NULL,
          category TEXT DEFAULT '',
          tags TEXT DEFAULT '',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS questions (
          id SERIAL PRIMARY KEY,
          core_dimension TEXT NOT NULL,
          sub_dimension TEXT NOT NULL,
          core_dim_label TEXT DEFAULT '',
          sub_dim_label TEXT DEFAULT '',
          exercise_type TEXT DEFAULT '',
          exercise_type_label TEXT DEFAULT '',
          question_text TEXT NOT NULL,
          keywords TEXT NOT NULL DEFAULT '[]',
          hint TEXT DEFAULT '',
          difficulty INTEGER DEFAULT 2,
          active INTEGER DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ PostgreSQL 数据库初始化完成');
    } finally {
      client.release();
    }
  };
  
  await initPg().catch(err => {
    console.error('❌ PostgreSQL 初始化失败:', err.message);
    process.exit(1);
  });

  console.log('📦 数据库: PostgreSQL (生产环境)');
}

// ===== 本地开发：SQLite =====
let db = null;
let isSQLite = false;

if (!isProduction) {
  const DATA_DIR = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const DB_PATH = path.join(DATA_DIR, 'physics_diagnosis.db');
  db = new DatabaseSync(DB_PATH);

  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA busy_timeout = 5000');
  db.exec('PRAGMA foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      grade TEXT NOT NULL,
      class_name TEXT DEFAULT '',
      progress_note TEXT DEFAULT '',
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
      updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      knowledge_area TEXT NOT NULL,
      status TEXT DEFAULT 'in_progress' CHECK(status IN ('in_progress', 'completed')),
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
      updated_at DATETIME DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('system', 'assistant', 'user')),
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS diagnosis_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      conversation_id INTEGER,
      knowledge_area TEXT NOT NULL,
      overall_score REAL DEFAULT 0,
      module_scores TEXT DEFAULT '{}',
      summary TEXT DEFAULT '',
      grading_status TEXT DEFAULT 'completed' CHECK(grading_status IN ('pending', 'completed')),
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS faq_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      category TEXT DEFAULT '',
      tags TEXT DEFAULT '',
      created_at DATETIME DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      core_dimension TEXT NOT NULL,
      sub_dimension TEXT NOT NULL,
      core_dim_label TEXT DEFAULT '',
      sub_dim_label TEXT DEFAULT '',
      exercise_type TEXT DEFAULT '',
      exercise_type_label TEXT DEFAULT '',
      question_text TEXT NOT NULL,
      keywords TEXT NOT NULL DEFAULT '[]',
      hint TEXT DEFAULT '',
      difficulty INTEGER DEFAULT 2,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
      updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
    );
  `);

  try {
    db.exec("ALTER TABLE diagnosis_results ADD COLUMN grading_status TEXT DEFAULT 'completed'");
  } catch { /* 列已存在 */ }

  isSQLite = true;
  console.log('📦 数据库: SQLite (本地开发)');
}

// ===== 统一数据库接口 =====

/**
 * 执行查询并返回所有行
 */
export function queryAll(sql, params = []) {
  if (isSQLite) {
    return db.prepare(sql).all(...params);
  }
  // PostgreSQL — 使用同步风格的包装
  // 注意：实际运行时各route需要改为async/await
  throw new Error('PostgreSQL 模式请使用 asyncQuery');
}

/**
 * 执行查询并返回单行
 */
export function queryOne(sql, params = []) {
  if (isSQLite) {
    return db.prepare(sql).get(...params);
  }
  throw new Error('PostgreSQL 模式请使用 asyncQuery');
}

/**
 * 执行写入操作并返回结果
 */
export function queryRun(sql, params = []) {
  if (isSQLite) {
    return db.prepare(sql).run(...params);
  }
  throw new Error('PostgreSQL 模式请使用 asyncQuery');
}

/**
 * 异步查询（PostgreSQL模式用）
 */
export async function asyncQuery(sql, params = []) {
  if (!pgPool) throw new Error('未配置数据库连接');
  const client = await pgPool.connect();
  try {
    // 将 ? 占位符替换为 $1, $2 格式
    let pgSql = sql;
    let paramIndex = 0;
    // 处理 datetime('now','localtime') 替换
    pgSql = pgSql.replace(/datetime\('now',\s*'localtime'\)/g, "CURRENT_TIMESTAMP");
    pgSql = pgSql.replace(/datetime\('now','localtime'\)/g, "CURRENT_TIMESTAMP");
    pgSql = pgSql.replace(/\?/g, () => `$${++paramIndex}`);
    
    // 处理 lastInsertRowid
    const result = await client.query(pgSql, params);
    return {
      rows: result.rows,
      rowCount: result.rowCount,
      lastInsertRowid: result.rows[0]?.id || null,
    };
  } finally {
    client.release();
  }
}

/**
 * 异步执行单条语句
 */
export async function asyncRun(sql, params = []) {
  return asyncQuery(sql, params);
}

/**
 * 获取数据库连接池（用于事务等高级操作）
 */
export function getPool() {
  return pgPool;
}

/**
 * 判断当前是否使用 PostgreSQL
 */
export function isPostgres() {
  return !!pgPool;
}

export default db;
