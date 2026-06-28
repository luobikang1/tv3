/**
 * 白狐影视 - CF Pages Functions
 * 文件路径: functions/api/[[route]].js
 * 统一处理 /api/* 所有路由，避免 CF Pages 静态路由冲突
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Token',
};

// 允许代理的域名（STRICT_PROXY=true 时生效）
const WHITELIST = [
  'xinlangapi.com','nkmdapi.com','moduapi.cc','ffzy5.tv','apibdzy.com',
  'wolongzyw.com','heimuer.xyz','cctvjyw.com','dbgo.fun','ck180.top',
  'lziapi.com','bfzy.tv','sdzyapi.com','ttzy.tv','ttnb.me',
  'wodzyapi.com','kjzy.tv','cjhwapi.com','tlzyw.com','okzy.tv',
  '1080b.com','zhenbukaapi.com','sonimov.com','wdzy.me','apizy.cc',
  'raw.githubusercontent.com','gist.githubusercontent.com',
];

function jsonResp(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json;charset=utf-8', ...CORS, ...extra },
  });
}

function verifyToken(request, env) {
  // 密码验证：对比 env.SITE_PASSWORD（在CF Dashboard配置）
  const token = request.headers.get('X-Token') || new URL(request.url).searchParams.get('token');
  const pwd = env?.SITE_PASSWORD || 'baihu2025';
  return token === pwd;
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const route = (params.route || []).join('/');   // e.g. "proxy" | "d1/apis" | "auth"

  // ── OPTIONS 预检 ──────────────────────────────────────
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  // ── /api/auth  密码验证 ───────────────────────────────
  if (route === 'auth') {
    if (request.method !== 'POST') return jsonResp({ error: 'Method not allowed' }, 405);
    const body = await request.json().catch(() => ({}));
    const pwd = env?.SITE_PASSWORD || 'baihu2025';
    if (body.password === pwd) {
      return jsonResp({ ok: true, token: pwd });
    }
    return jsonResp({ ok: false, error: '密码错误' }, 401);
  }

  // ── /api/proxy  CORS代理 ─────────────────────────────
  if (route === 'proxy') {
    const targetRaw = url.searchParams.get('url');
    if (!targetRaw) return jsonResp({ error: 'Missing url' }, 400);

    let target;
    try { target = new URL(decodeURIComponent(targetRaw)); }
    catch { return jsonResp({ error: 'Invalid URL' }, 400); }

    // 白名单（默认不严格，可设 STRICT_PROXY=true）
    if (env?.STRICT_PROXY === 'true') {
      const ok = WHITELIST.some(h => target.hostname === h || target.hostname.endsWith('.' + h));
      if (!ok) return jsonResp({ error: 'Domain blocked', host: target.hostname }, 403);
    }

    try {
      const resp = await fetch(target.href, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'zh-CN,zh;q=0.9',
          'Referer': target.origin + '/',
        },
      });
      const body = await resp.arrayBuffer();
      return new Response(body, {
        status: resp.status,
        headers: {
          'Content-Type': resp.headers.get('Content-Type') || 'application/json;charset=utf-8',
          'Cache-Control': 'public, max-age=60',
          ...CORS,
        },
      });
    } catch (e) {
      return jsonResp({ error: 'Upstream failed', detail: e.message }, 502);
    }
  }

  // ── /api/d1/*  D1数据库同步（需要绑定D1） ────────────
  if (route.startsWith('d1')) {
    // D1 路由均需验证 token
    if (!verifyToken(request, env)) {
      return jsonResp({ error: 'Unauthorized' }, 401);
    }

    const db = env?.DB; // D1 binding name: DB
    if (!db) return jsonResp({ error: 'D1 not configured. Please bind a D1 database named "DB" in CF Dashboard.' }, 503);

    // 建表（首次调用时）
    await db.exec(`
      CREATE TABLE IF NOT EXISTS apis (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        note TEXT DEFAULT '',
        enabled INTEGER DEFAULT 1,
        status TEXT DEFAULT 'unknown',
        latency INTEGER,
        custom INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        updated_at INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS user_cfg (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS watch_history (
        vod_id TEXT PRIMARY KEY,
        vod_name TEXT,
        vod_pic TEXT,
        type_name TEXT,
        ep INTEGER DEFAULT 0,
        progress REAL DEFAULT 0,
        ts INTEGER DEFAULT 0
      );
    `).catch(() => {}); // 已存在时忽略

    const sub = route.replace(/^d1\/?/, ''); // 子路由

    // GET /api/d1/apis — 拉取API列表
    if (sub === 'apis' && request.method === 'GET') {
      const rows = await db.prepare('SELECT * FROM apis ORDER BY sort_order ASC, updated_at DESC').all();
      return jsonResp({ ok: true, data: rows.results || [] });
    }

    // POST /api/d1/apis — 推送API列表（全量同步）
    if (sub === 'apis' && request.method === 'POST') {
      const { apis } = await request.json().catch(() => ({ apis: [] }));
      if (!Array.isArray(apis)) return jsonResp({ error: 'Invalid data' }, 400);
      const now = Date.now();
      const stmt = db.prepare(
        'INSERT OR REPLACE INTO apis (id,name,url,note,enabled,status,latency,custom,sort_order,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)'
      );
      await db.batch(apis.map((a, i) => stmt.bind(
        a.id, a.name, a.url, a.note||'',
        a.enabled===false?0:1, a.status||'unknown',
        a.latency||null, a.custom?1:0, i, now
      )));
      return jsonResp({ ok: true, synced: apis.length });
    }

    // DELETE /api/d1/apis/:id — 删除单条
    if (sub.startsWith('apis/') && request.method === 'DELETE') {
      const id = sub.replace('apis/', '');
      await db.prepare('DELETE FROM apis WHERE id=?').bind(id).run();
      return jsonResp({ ok: true });
    }

    // GET /api/d1/history — 拉取历史
    if (sub === 'history' && request.method === 'GET') {
      const rows = await db.prepare('SELECT * FROM watch_history ORDER BY ts DESC LIMIT 100').all();
      return jsonResp({ ok: true, data: rows.results || [] });
    }

    // POST /api/d1/history — 同步历史
    if (sub === 'history' && request.method === 'POST') {
      const { history } = await request.json().catch(() => ({ history: [] }));
      if (!Array.isArray(history)) return jsonResp({ error: 'Invalid data' }, 400);
      const stmt = db.prepare(
        'INSERT OR REPLACE INTO watch_history (vod_id,vod_name,vod_pic,type_name,ep,progress,ts) VALUES (?,?,?,?,?,?,?)'
      );
      await db.batch(history.map(h => stmt.bind(
        h.vod_id, h.vod_name||'', h.vod_pic||'', h.type_name||'',
        h.ep||0, h.progress||0, h.ts||Date.now()
      )));
      return jsonResp({ ok: true, synced: history.length });
    }

    // GET /api/d1/cfg — 拉取配置
    if (sub === 'cfg' && request.method === 'GET') {
      const rows = await db.prepare('SELECT * FROM user_cfg').all();
      const cfg = {};
      (rows.results || []).forEach(r => { cfg[r.key] = r.value; });
      return jsonResp({ ok: true, data: cfg });
    }

    // POST /api/d1/cfg — 推送配置
    if (sub === 'cfg' && request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const now = Date.now();
      const stmt = db.prepare('INSERT OR REPLACE INTO user_cfg (key,value,updated_at) VALUES (?,?,?)');
      await db.batch(Object.entries(body).map(([k, v]) => stmt.bind(k, String(v), now)));
      return jsonResp({ ok: true });
    }

    return jsonResp({ error: 'Unknown D1 route: ' + sub }, 404);
  }

  return jsonResp({ error: 'Not found', route }, 404);
}
