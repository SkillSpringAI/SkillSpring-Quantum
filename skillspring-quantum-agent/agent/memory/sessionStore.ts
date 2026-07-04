/**
 * Session Store
 * Manages conversation sessions with SQLite persistence
 */

import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { ConversationSession, ConversationMessage, SessionMetadata, MemorySummary } from "../types/index.js";

export interface SessionStoreConfig {
  dbPath: string;
}

export class SessionStore {
  private db: DatabaseSync;

  constructor(config: SessionStoreConfig) {
    const dir = dirname(config.dbPath);
    try {
      mkdirSync(dir, { recursive: true });
    } catch {
      // may already exist
    }

    this.db = new DatabaseSync(config.dbPath);
    this.initialize();
  }

  private initialize(): void {
    this.db.exec("PRAGMA journal_mode = WAL;");

    // Sessions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        metadata TEXT
      );
    `);

    // Messages table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        tool_calls TEXT,
        tool_results TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );
    `);

    // Memory summaries table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memory_summaries (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        summary_text TEXT NOT NULL,
        key_facts TEXT NOT NULL,
        topics_covered TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );
    `);

    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_messages_time ON messages(timestamp);`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_summaries_session ON memory_summaries(session_id);`);
  }

  createSession(title?: string): ConversationSession {
    const now = new Date().toISOString();
    const id = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const session: ConversationSession = {
      id,
      title: title ?? `Conversation ${new Date().toLocaleString()}`,
      messages: [],
      created_at: now,
      updated_at: now,
      metadata: {
        tools_used: [],
        total_tokens_used: 0,
        message_count: 0,
      },
    };

    const stmt = this.db.prepare(`INSERT INTO sessions (id, title, created_at, updated_at, metadata) VALUES (?, ?, ?, ?, ?)`);
    stmt.run(id, session.title, now, now, JSON.stringify(session.metadata));

    return session;
  }

  getSession(id: string): ConversationSession | null {
    const stmt = this.db.prepare(`SELECT id, title, created_at, updated_at, metadata FROM sessions WHERE id = ?`);
    const row = stmt.get(id) as { id: string; title: string; created_at: string; updated_at: string; metadata: string } | undefined;

    if (!row) return null;

    const messages = this.getMessages(id);

    return {
      id: row.id,
      title: row.title,
      messages,
      created_at: row.created_at,
      updated_at: row.updated_at,
      metadata: JSON.parse(row.metadata) as SessionMetadata,
    };
  }

  addMessage(sessionId: string, message: Omit<ConversationMessage, "id" | "timestamp">): ConversationMessage {
    const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const timestamp = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO messages (id, session_id, role, content, timestamp, tool_calls, tool_results)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      sessionId,
      message.role,
      message.content,
      timestamp,
      message.tool_calls ? JSON.stringify(message.tool_calls) : null,
      message.tool_results ? JSON.stringify(message.tool_results) : null
    );

    // Update session updated_at and message count
    const session = this.getSession(sessionId);
    if (session) {
      const newCount = session.messages.length + 1;
      const updateStmt = this.db.prepare(`UPDATE sessions SET updated_at = ?, metadata = ? WHERE id = ?`);
      updateStmt.run(timestamp, JSON.stringify({ ...session.metadata, message_count: newCount }), sessionId);
    }

    return { ...message, id, timestamp };
  }

  getMessages(sessionId: string, limit?: number): ConversationMessage[] {
    let sql = `SELECT id, role, content, timestamp, tool_calls, tool_results FROM messages WHERE session_id = ? ORDER BY timestamp`;
    if (limit) sql += ` LIMIT ${limit}`;

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(sessionId) as Array<{
      id: string; role: string; content: string; timestamp: string;
      tool_calls: string | null; tool_results: string | null;
    }>;

    return rows.map((r) => ({
      id: r.id,
      role: r.role as "user" | "assistant" | "system",
      content: r.content,
      timestamp: r.timestamp,
      tool_calls: r.tool_calls ? JSON.parse(r.tool_calls) : undefined,
      tool_results: r.tool_results ? JSON.parse(r.tool_results) : undefined,
    }));
  }

  listSessions(limit: number = 50): Array<{ id: string; title: string; updated_at: string; message_count: number }> {
    const stmt = this.db.prepare(`SELECT id, title, updated_at, metadata FROM sessions ORDER BY updated_at DESC LIMIT ?`);
    const rows = stmt.all(limit) as Array<{ id: string; title: string; updated_at: string; metadata: string }>;

    return rows.map((r) => {
      const meta = JSON.parse(r.metadata) as SessionMetadata;
      return { id: r.id, title: r.title, updated_at: r.updated_at, message_count: meta.message_count };
    });
  }

  deleteSession(id: string): void {
    const stmt = this.db.prepare(`DELETE FROM sessions WHERE id = ?`);
    stmt.run(id);
  }

  saveSummary(summary: MemorySummary): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO memory_summaries (id, session_id, summary_text, key_facts, topics_covered, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      summary.id,
      summary.session_id,
      summary.summary_text,
      JSON.stringify(summary.key_facts),
      JSON.stringify(summary.topics_covered),
      summary.created_at
    );
  }

  getSummaries(sessionId: string): MemorySummary[] {
    const stmt = this.db.prepare(`SELECT * FROM memory_summaries WHERE session_id = ? ORDER BY created_at`);
    const rows = stmt.all(sessionId) as Array<{
      id: string; session_id: string; summary_text: string; key_facts: string;
      topics_covered: string; created_at: string;
    }>;

    return rows.map((r) => ({
      id: r.id,
      session_id: r.session_id,
      summary_text: r.summary_text,
      key_facts: JSON.parse(r.key_facts) as string[],
      topics_covered: JSON.parse(r.topics_covered) as string[],
      created_at: r.created_at,
    }));
  }

  async close(): Promise<void> {
    this.db.close();
  }
}
