const { randomUUID } = require("crypto");
const os = require("os");
const path = require("path");
const fs = require("fs/promises");
const { PrismaClient } = require("@prisma/client");

const auditPrisma = new PrismaClient();

const FLUSH_INTERVAL_MS = Number(process.env.AUDIT_LOG_FLUSH_INTERVAL_MS || 5000);
const BATCH_SIZE = Number(process.env.AUDIT_LOG_BATCH_SIZE || 100);
const MAX_BUFFER_SIZE = Number(process.env.AUDIT_LOG_MAX_BUFFER_SIZE || 5000);
const RETRY_MAX_ATTEMPTS = Number(process.env.AUDIT_LOG_RETRY_MAX_ATTEMPTS || 3);
const RETRY_BASE_DELAY_MS = Number(process.env.AUDIT_LOG_RETRY_BASE_DELAY_MS || 100);
const SNAPSHOT_FILE_PATH = process.env.AUDIT_LOG_SNAPSHOT_FILE || path.join(os.tmpdir(), "audit-buffer.json");

const buffer = [];
let isFlushing = false;
let isReplayingSnapshot = false;

const IGNORED_DIFF_FIELDS = new Set(["id", "campusId", "createdAt", "updatedAt", "password"]);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isAuditType = (value) => ["USER_ACTION", "SECURITY", "SYSTEM", "ERROR"].includes(value);

const toDisplayName = (entity = {}) => {
  if (!entity || typeof entity !== "object") return "";

  const candidates = [entity.name, entity.title, entity.email, entity.username, entity.id];
  const match = candidates.find((item) => item !== undefined && item !== null && String(item).trim());
  return match ? String(match).trim() : "";
};

const formatValue = (value) => {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return `'${value}'`;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return `[${value.map((item) => formatValue(item)).join(", ")}]`;
  return JSON.stringify(value);
};

const getChangedFieldsSummary = (before, after) => {
  if (!before || !after || typeof before !== "object" || typeof after !== "object") return "";

  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changes = [];

  for (const key of keys) {
    if (IGNORED_DIFF_FIELDS.has(key)) continue;

    const previous = before[key];
    const next = after[key];

    if (JSON.stringify(previous) === JSON.stringify(next)) continue;
    changes.push(`${key}: ${formatValue(previous)} -> ${formatValue(next)}`);
  }

  return changes.join(", ");
};

const capitalize = (value = "") => {
  const normalized = String(value || "").toLowerCase();
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : "";
};

const generateAuditDescription = ({ model, action, metadata = {} }) => {
  const safeModel = capitalize(model || "record");
  const safeAction = String(action || "performed").toLowerCase();
  const before = metadata?.before;
  const after = metadata?.after;

  if (safeModel === "User" && safeAction === "login") {
    const userLabel = toDisplayName(after) || toDisplayName(before) || "User";
    return `User '${userLabel}' logged in`;
  }

  if (safeAction.includes("create")) {
    const label = toDisplayName(after);
    if (label) return `Created new ${safeModel} '${label}'`;
    return `Created new ${safeModel}`;
  }

  if (safeAction.includes("update")) {
    const label = toDisplayName(after) || toDisplayName(before);
    const changes = getChangedFieldsSummary(before, after);

    if (label && changes) return `Updated ${safeModel} '${label}' (${changes})`;
    if (label) return `Updated ${safeModel} '${label}'`;
    if (changes) return `Updated ${safeModel} (${changes})`;
    return `Updated ${safeModel}`;
  }

  if (safeAction.includes("delete")) {
    const label = toDisplayName(before);
    if (label) return `Deleted ${safeModel} '${label}'`;
    return `Deleted ${safeModel}`;
  }

  return `Performed ${safeAction || "action"} on ${safeModel}`;
};

const toAuditRecord = ({ type = "USER_ACTION", model, action, campusId, userId, metadata }) => {
  const timestamp = new Date().toISOString();
  const description = generateAuditDescription({ model, action, metadata });
  return {
    id: randomUUID(),
    userId: userId || null,
    campusId: campusId || null,
    type: isAuditType(type) ? type : "USER_ACTION",
    model: String(model || "UNKNOWN"),
    action: String(action || "UNKNOWN"),
    description: description || `Performed ${String(action || "action")} on ${String(model || "record")}`,
    payload: {
      before: metadata?.before || null,
      after: metadata?.after || null,
      requestId: metadata?.requestId || null,
      timestamp,
      ...(metadata?.extra && typeof metadata.extra === "object" ? { extra: metadata.extra } : {}),
    },
    createdAt: new Date(timestamp),
  };
};

const writeSnapshotFile = async (records) => {
  try {
    await fs.writeFile(SNAPSHOT_FILE_PATH, JSON.stringify(records), "utf8");
  } catch (error) {
    console.error(JSON.stringify({
      type: "AUDIT_LOG_SNAPSHOT_WRITE_FAILED",
      error: error?.message || String(error),
      path: SNAPSHOT_FILE_PATH,
      timestamp: new Date().toISOString(),
    }));
  }
};

const clearSnapshotFile = async () => {
  try {
    await fs.rm(SNAPSHOT_FILE_PATH, { force: true });
  } catch (error) {
    console.error(JSON.stringify({
      type: "AUDIT_LOG_SNAPSHOT_CLEAR_FAILED",
      error: error?.message || String(error),
      path: SNAPSHOT_FILE_PATH,
      timestamp: new Date().toISOString(),
    }));
  }
};

const writeWithRetry = async (records) => {
  const delegate = auditPrisma.auditLog;
  if (!delegate || typeof delegate.createMany !== "function") {
    throw new Error("AuditLog delegate unavailable. Run Prisma migration and generate client.");
  }

  let lastError = null;

  for (let attempt = 1; attempt <= RETRY_MAX_ATTEMPTS; attempt++) {
    try {
      await delegate.createMany({ data: records });
      return;
    } catch (error) {
      lastError = error;
      if (attempt < RETRY_MAX_ATTEMPTS) {
        const backoffMs = RETRY_BASE_DELAY_MS * (2 ** (attempt - 1));
        await delay(backoffMs);
      }
    }
  }

  throw lastError || new Error("Audit write failed");
};

const trimBufferIfNeeded = () => {
  if (buffer.length <= MAX_BUFFER_SIZE) return;

  const overflow = buffer.length - MAX_BUFFER_SIZE;
  buffer.splice(0, overflow);

  console.warn(JSON.stringify({
    type: "AUDIT_LOG_BUFFER_TRIMMED",
    droppedCount: overflow,
    maxBufferSize: MAX_BUFFER_SIZE,
    timestamp: new Date().toISOString(),
  }));
};

const fallbackConsole = (records, error) => {
  for (const record of records) {
    console.error(JSON.stringify({
      type: "AUDIT_LOG_DB_FALLBACK",
      error: error?.message || String(error || "Unknown error"),
      record,
    }));
  }
};

const replaySnapshotIfPresent = async () => {
  if (isReplayingSnapshot) return;

  isReplayingSnapshot = true;
  try {
    const raw = await fs.readFile(SNAPSHOT_FILE_PATH, "utf8");
    if (!raw) return;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return;

    buffer.unshift(...parsed);
    trimBufferIfNeeded();

    setImmediate(() => {
      void flush();
    });
  } catch (error) {
    if (error?.code !== "ENOENT") {
      console.error(JSON.stringify({
        type: "AUDIT_LOG_SNAPSHOT_REPLAY_FAILED",
        error: error?.message || String(error),
        path: SNAPSHOT_FILE_PATH,
        timestamp: new Date().toISOString(),
      }));
    }
  } finally {
    isReplayingSnapshot = false;
  }
};

const flush = async () => {
  if (isFlushing || buffer.length === 0) return;

  isFlushing = true;
  const recordsToFlush = buffer.splice(0, BATCH_SIZE);

  try {
    await writeSnapshotFile(recordsToFlush);
    await writeWithRetry(recordsToFlush);
    await clearSnapshotFile();
  } catch (error) {
    fallbackConsole(recordsToFlush, error);
  } finally {
    isFlushing = false;
    if (buffer.length > 0) {
      setImmediate(() => {
        void flush();
      });
    }
  }
};

const intervalHandle = setInterval(() => {
  void flush();
}, FLUSH_INTERVAL_MS);

if (typeof intervalHandle.unref === "function") {
  intervalHandle.unref();
}

const writeImmediate = async (record) => {
  try {
    await writeWithRetry([record]);
  } catch (error) {
    fallbackConsole([record], error);
  }
};

const logEvent = ({ type = "USER_ACTION", model, action, campusId, userId, metadata = {} }) => {
  try {
    const record = toAuditRecord({ type, model, action, campusId, userId, metadata });

    if (record.type === "SECURITY") {
      setImmediate(() => {
        void writeImmediate(record);
      });
      return;
    }

    buffer.push(record);

    if (buffer.length >= MAX_BUFFER_SIZE) {
      setImmediate(() => {
        void flush();
      });
      trimBufferIfNeeded();
      return;
    }

    if (buffer.length >= BATCH_SIZE) {
      setImmediate(() => {
        void flush();
      });
    }
  } catch (error) {
    fallbackConsole([
      {
        model,
        action,
        campusId,
        userId,
        metadata,
      },
    ], error);
  }
};

module.exports = {
  logEvent,
  flush,
  generateAuditDescription,
};

void replaySnapshotIfPresent();
