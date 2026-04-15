import { Database } from 'bun:sqlite';

const DB_PATH = '/home/z/my-project/db/custom.db';
const PORT = 3010;

const db = new Database(DB_PATH);

const server = Bun.serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    try {
      if (path === '/api/action-plans') {
        if (method === 'GET') return handleListPlans(url);
        if (method === 'POST') return handleCreatePlan(req);
        if (method === 'PUT') return handleUpdatePlan(req);
        if (method === 'DELETE') return handleDeletePlan(url);
      }

      if (path === '/api/comments') {
        if (method === 'GET') return handleListComments(url);
        if (method === 'POST') return handleCreateComment(req);
        if (method === 'DELETE') return handleDeleteComment(url);
      }

      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: jsonHeaders() });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[data-api] Error:`, msg);
      return new Response(JSON.stringify({ error: msg }), { status: 500, headers: jsonHeaders() });
    }
  },
});

console.log(`[data-api] Running on port ${PORT}`);

// ═══ ACTION PLANS ═══

function handleListPlans(url: ReturnType<typeof URL.parse>) {
  const id = url.searchParams.get('id');
  const status = url.searchParams.get('status');
  const priority = url.searchParams.get('priority');
  const assigneeId = url.searchParams.get('assigneeId');

  const baseSQL = `
    SELECT ap.id, ap.title, ap.description, ap.priority, ap.status, ap.assigneeId, ap.dueDate,
           ap.sourceType, ap.sourceId, ap.score, ap.auditResponseId, ap.createdAt, ap.updatedAt,
           u.name as assignee_name, u.email as assignee_email, u.department as assignee_department,
           ar.score as response_score, ar.status as response_status,
           at.title as template_title, at.category as template_category,
           au.name as auditor_name
    FROM action_plans ap
    LEFT JOIN User u ON ap.assigneeId = u.id
    LEFT JOIN AuditResponse ar ON ap.auditResponseId = ar.id
    LEFT JOIN AuditAssignment aa ON ar.assignmentId = aa.id
    LEFT JOIN AuditTemplate at ON aa.templateId = at.id
    LEFT JOIN User au ON aa.auditorId = au.id
  `;

  if (id) {
    const plan = db.query(baseSQL + ' WHERE ap.id = ?').get(id) as Record<string, unknown> | null;
    return json(plan ? formatPlan(plan) : null);
  }

  const conds: string[] = ['1=1'];
  const params: unknown[] = [];
  if (status) { conds.push('ap.status = ?'); params.push(status); }
  if (priority) { conds.push('ap.priority = ?'); params.push(priority); }
  if (assigneeId) { conds.push('ap.assigneeId = ?'); params.push(assigneeId); }

  const plans = db.query(baseSQL + ` WHERE ${conds.join(' AND ')} ORDER BY ap.status ASC, ap.priority ASC, ap.dueDate ASC`).all(...params) as Record<string, unknown>[];
  return json(plans.map(formatPlan));
}

async function handleCreatePlan(req: Request) {
  const body = await req.json();
  const { title, description, priority = 'MEDIUM', assigneeId = null, dueDate = null,
          sourceType = 'MANUAL', sourceId = null, score = null, auditResponseId = null } = body;
  if (!title?.trim()) return json({ error: 'title is required' }, 400);

  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 25);
  db.query(`
    INSERT INTO action_plans (id, title, description, priority, assigneeId, dueDate, sourceType, sourceId, score, auditResponseId, status, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NEW', datetime('now'), datetime('now'))
  `).run(id, title.trim(), description?.trim() || null, priority, assigneeId,
    dueDate ? new Date(dueDate).toISOString() : null, sourceType, sourceId, score, auditResponseId);

  return json({ id, title, priority, status: 'NEW' }, 201);
}

async function handleUpdatePlan(req: Request) {
  const { id, status, title, description, priority, assigneeId, dueDate } = await req.json();
  if (!id) return json({ error: 'id is required' }, 400);

  const sets: string[] = ["updatedAt = datetime('now')"];
  const params: unknown[] = [];
  if (status !== undefined) { sets.push('status = ?'); params.push(status); }
  if (title !== undefined) { sets.push('title = ?'); params.push(title.trim()); }
  if (description !== undefined) { sets.push('description = ?'); params.push(description?.trim() || null); }
  if (priority !== undefined) { sets.push('priority = ?'); params.push(priority); }
  if (assigneeId !== undefined) { sets.push('assigneeId = ?'); params.push(assigneeId); }
  if (dueDate !== undefined) { sets.push('dueDate = ?'); params.push(dueDate ? new Date(dueDate).toISOString() : null); }
  params.push(id);

  db.query(`UPDATE action_plans SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  return json({ id, updated: true });
}

function handleDeletePlan(url: ReturnType<typeof URL.parse>) {
  const id = url.searchParams.get('id');
  if (!id) return json({ error: 'id is required' }, 400);
  db.query('DELETE FROM action_plans WHERE id = ?').run(id);
  return json({ deleted: 1 });
}

// ═══ COMMENTS ═══

function handleListComments(url: ReturnType<typeof URL.parse>) {
  const responseId = url.searchParams.get('responseId');
  if (!responseId) return json({ error: 'responseId required' }, 400);

  const comments = db.query(`
    SELECT c.id, c.responseId, c.userId, c.content, c.createdAt, c.updatedAt,
           u.name as author_name, u.email as author_email, u.department as author_department, u.role as author_role
    FROM audit_comments c
    LEFT JOIN User u ON c.userId = u.id
    WHERE c.responseId = ?
    ORDER BY c.createdAt ASC
    LIMIT 100
  `).all(responseId) as Record<string, unknown>[];

  return json(comments.map(c => ({
    id: c.id, responseId: c.responseId, userId: c.userId,
    content: c.content, createdAt: c.createdAt, updatedAt: c.updatedAt,
    author: { id: c.userId, name: c.author_name, email: c.author_email, department: c.author_department, role: c.author_role },
  })));
}

async function handleCreateComment(req: Request) {
  const { responseId, content, userId } = await req.json();
  if (!responseId || !content?.trim() || !userId) return json({ error: 'responseId, content, and userId are required' }, 400);

  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 25);
  db.query(`
    INSERT INTO audit_comments (id, responseId, userId, content, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(id, responseId, userId, content.trim());

  return json({ id, responseId, userId, content: content.trim(), author: { id: userId, name: null } }, 201);
}

function handleDeleteComment(url: ReturnType<typeof URL.parse>) {
  const id = url.searchParams.get('id');
  if (!id) return json({ error: 'id required' }, 400);
  db.query('DELETE FROM audit_comments WHERE id = ?').run(id);
  return json({ deleted: 1 });
}

// ═══ HELPERS ═══

function formatPlan(p: Record<string, unknown>): Record<string, unknown> {
  return {
    id: p.id, title: p.title, description: p.description, priority: p.priority, status: p.status,
    assigneeId: p.assigneeId, dueDate: p.dueDate, sourceType: p.sourceType, sourceId: p.sourceId,
    score: p.score, auditResponseId: p.auditResponseId, createdAt: p.createdAt, updatedAt: p.updatedAt,
    assignee: p.assignee_name ? { name: p.assignee_name, email: p.assignee_email, department: p.assignee_department } : null,
    auditResponse: p.auditResponseId ? {
      score: p.response_score, status: p.response_status,
      assignment: p.template_title ? { template: { title: p.template_title, category: p.template_category }, auditor: p.auditor_name ? { name: p.auditor_name } : null } : null,
    } : null,
  };
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: jsonHeaders() });
}
function jsonHeaders() { return { 'Content-Type': 'application/json', ...corsHeaders() }; }
function corsHeaders() {
  return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
}
