/* SQL 实验室前端交互：门店只负责展示与确认，真正干活全交给后端。 */
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const state = {
  space: localStorage.getItem('sqllab.space') || 'demo',
  tables: [], quizzes: [], lastResult: null, lastError: '', lastSql: '',
  currentQuiz: null, genPlan: null, activeTable: null,
  passed: new Set(),
};

async function api(path, options = {}) {
  const opts = {method: options.method || 'GET', headers: {'Content-Type': 'application/json'}};
  if (options.body) opts.body = JSON.stringify(options.body);
  const resp = await fetch(path, opts);
  return await resp.json();
}
function url(path, params) {
  const q = new URLSearchParams(params || {});
  return path + (q.toString() ? '?' + q.toString() : '');
}
function toast(msg) {
  const el = $('toast'); el.textContent = msg; el.classList.remove('hidden');
  clearTimeout(el._timer); el._timer = setTimeout(() => el.classList.add('hidden'), 2400);
}
function showModal(title, bodyHtml, buttons) {
  $('modalTitle').textContent = title;
  $('modalBody').innerHTML = bodyHtml;
  const foot = $('modalFoot'); foot.innerHTML = '';
  (buttons || [{label: '知道了', cls: 'primary'}]).forEach((b) => {
    const btn = document.createElement('button');
    btn.className = 'btn ' + (b.cls || 'ghost'); btn.textContent = b.label;
    btn.onclick = () => { if (b.onClick) b.onClick(); else closeModal(); };
    foot.appendChild(btn);
  });
  $('modal').classList.remove('hidden');
}
function closeModal() { $('modal').classList.add('hidden'); }
function confirmAction(title, message, onOk, okLabel) {
  showModal(title, '<div class="message warn">' + esc(message) + '</div>', [
    {label: '取消', cls: 'ghost', onClick: closeModal},
    {label: okLabel || '确认执行', cls: 'danger', onClick: () => { closeModal(); onOk(); }},
  ]);
}
function renderGrid(el, columns, rows, emptyText) {
  if (!columns || !columns.length) {
    el.innerHTML = '<div class="empty">' + esc(emptyText || '暂无数据') + '</div>';
    return;
  }
  let html = '<thead><tr><th class="rown">#</th>' + columns.map((c) => '<th>' + esc(c) + '</th>').join('') + '</tr></thead><tbody>';
  rows.forEach((row, i) => {
    html += '<tr><td class="rown">' + (i + 1) + '</td>' + row.map((v) =>
      '<td' + (typeof v === 'number' ? ' class="num"' : '') + '>' + esc(v) + '</td>').join('') + '</tr>';
  });
  el.innerHTML = html + '</tbody>';
}
async function copyText(text, label) {
  try { await navigator.clipboard.writeText(text); toast((label || '内容') + '已复制'); }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy'); ta.remove(); toast((label || '内容') + '已复制');
  }
}
function message(el, text, kind) {
  el.className = 'message ' + (kind || 'info'); el.textContent = text; el.classList.remove('hidden');
}

/* ---------- 初始化 / 空间 ---------- */
async function init() {
  try {
    const h = await api('/api/health');
    $('statusDot').className = 'dot ok'; $('statusText').textContent = '服务正常';
    $('statAi').textContent = h.aiMode === 'model' ? '已接模型' : '免费离线';
    $('footScale').textContent = h.scale + ' 数据';
    await loadSpaces();
    await loadTables();
    await loadQuizzes();
    // 首屏自动跑一条示例查询，打开就能看到结果表格，不用先猜该点哪里
    await runSql(false);
  } catch (e) {
    $('statusDot').className = 'dot bad'; $('statusText').textContent = '服务未连接';
    toast('后端没连上，请确认服务已启动');
  } finally {
    bindEvents();
  }
}
async function loadSpaces() {
  const r = await api('/api/spaces');
  if (!r.ok) return;
  if (!r.spaces.includes(state.space)) state.space = 'demo';
  $('spaceSelect').innerHTML = r.spaces.map((s) => '<option value="' + esc(s) + '"' + (s === state.space ? ' selected' : '') + '>' + esc(s) + '</option>').join('');
  $('footSpace').textContent = state.space;
  const key = 'sqllab.passed.' + state.space;
  try { state.passed = new Set(JSON.parse(localStorage.getItem(key) || '[]')); } catch (e) { state.passed = new Set(); }
}
async function loadTables() {
  const r = await api(url('/api/tables', {space: state.space}));
  if (!r.ok) return;
  state.tables = r.tables;
  $('tableCount').textContent = r.tables.length + ' 张';
  $('statTables').textContent = r.tables.length;
  const total = r.tables.reduce((s, t) => s + (t.rowCount || 0), 0);
  $('statRows').textContent = total.toLocaleString();
  renderTables($('tableSearch').value.trim());
  if (state.activeTable && r.tables.some((t) => t.name === state.activeTable)) selectTable(state.activeTable, false);
}
function renderTables(filter) {
  const list = state.tables.filter((t) => !filter || (t.name + t.label).toLowerCase().includes(filter.toLowerCase()));
  $('tableList').innerHTML = list.length ? list.map((t) => {
    const active = t.name === state.activeTable;
    const cols = active ? '<div class="cols">' + t.columns.map((c) =>
      '<span>' + esc(c.name) + ' <em>' + esc(c.comment || c.type) + '</em></span>').join('') + '</div>' : '';
    return '<div class="table-item' + (active ? ' active' : '') + '"><div class="row" data-table="' + esc(t.name) + '">' +
      '<span class="arrow">' + (active ? '▾' : '▸') + '</span><span class="tname">' + esc(t.name) + '</span>' +
      '<span class="tlabel">' + esc(t.label) + ' · ' + t.rowCount + '</span></div>' + cols + '</div>';
  }).join('') : '<div class="empty-hint">没找到匹配的表</div>';
  $('tableList').querySelectorAll('[data-table]').forEach((el) => el.onclick = () => selectTable(el.dataset.table, true));
}
function selectTable(name, toggle) {
  state.activeTable = toggle && state.activeTable === name ? null : name;
  renderTables($('tableSearch').value.trim());
  const t = state.tables.find((x) => x.name === state.activeTable);
  if (!t) { $('tableDetail').innerHTML = '<div class="empty-hint">点左侧任意一张表，查看字段名、中文说明和样例数据。</div>'; return; }
  $('tableDetail').innerHTML = '<h4>' + esc(t.name) + ' · ' + esc(t.label) + '</h4>' +
    '<div class="desc">' + esc(t.desc) + '，共 ' + t.rowCount + ' 行</div>' +
    '<div class="cols">' + t.columns.map((c) => '<span title="' + esc(c.type) + '">' + esc(c.name) + ' <em>' + esc(c.comment || '') + '</em></span>').join('') + '</div>' +
    '<div style="margin-top:9px"><button class="btn" id="sampleBtn">查看样例数据</button></div>' +
    '<div id="sampleBox" style="margin-top:9px"></div>';
  $('sampleBtn').onclick = async () => {
    const r = await api(url('/api/tables/sample', {space: state.space, table: t.name}));
    if (!r.ok) return toast(r.message || '读取样例失败');
    let html = '<table class="mini"><thead><tr>' + r.columns.map((c) => '<th>' + esc(c) + '</th>').join('') + '</tr></thead><tbody>';
    r.rows.slice(0, 5).forEach((row) => { html += '<tr>' + row.map((v) => '<td>' + esc(v) + '</td>').join('') + '</tr>'; });
    $('sampleBox').innerHTML = html + '</tbody></table>';
  };
}
async function switchSpace(name) {
  state.space = name; localStorage.setItem('sqllab.space', name);
  state.activeTable = null; state.genPlan = null; $('genPreviewCard').classList.add('hidden');
  await loadSpaces(); await loadTables(); await loadQuizzes();
  $('resultTable').innerHTML = '<tbody></tbody>'; $('resultMeta').textContent = '切换空间后请重新执行 SQL';
  $('sqlMessage').classList.add('hidden');
  toast('已切到空间「' + name + '」，看不到别人的数据');
}
function newSpace() {
  showModal('新建一个独立空间',
    '<p>每人一个独立空间 = 一套独立数据。别人切换不到你造的表，你也看不到别人的。</p>' +
    '<input id="newSpaceName" placeholder="例如：小李的练习空间" maxlength="32"><p style="font-size:11px;color:#64748b">支持中英文、数字、下划线和短横线，最长 32 个字符。</p>',
    [{label: '取消', cls: 'ghost', onClick: closeModal},
     {label: '创建并切换', cls: 'primary', onClick: async () => {
        const name = ($('newSpaceName').value || '').trim();
        if (!name) return toast('先给空间起个名字');
        const r = await api('/api/spaces', {method: 'POST', body: {name}});
        if (!r.ok) return toast(r.message || '创建失败');
        closeModal(); await switchSpace(name);
     }}]);
  setTimeout(() => $('newSpaceName') && $('newSpaceName').focus(), 50);
}

/* ---------- P0 / P1：SQL 工作台 ---------- */
async function runSql(confirm = false) {
  const sql = $('sqlEditor').value.trim();
  const mode = $('sqlMode').value;
  state.lastSql = sql;
  const btn = $('runBtn'); btn.disabled = true; btn.innerHTML = '运行中…';
  try {
    const r = await api('/api/sql', {method: 'POST', body: {space: state.space, sql, mode, confirm}});
    if (r.needConfirm) {
      confirmAction('需要二次确认', r.message, () => runSql(true), '确认执行');
      return;
    }
    renderResult(r);
  } catch (e) { message($('sqlMessage'), '请求失败：' + e.message, 'error'); }
  finally { btn.disabled = false; btn.innerHTML = '▶ 运行 <kbd>⌘↵</kbd>'; }
}
function renderResult(r) {
  state.lastResult = r;
  const meta = $('resultMeta');
  if (r.ok) {
    meta.textContent = r.rowCount + ' 行 · ' + r.elapsedMs + ' ms' + (r.truncated ? '（最多显示 500 行）' : '');
    $('sqlMessage').classList.add('hidden');
    state.lastError = '';
  } else {
    meta.textContent = '执行未完成';
    message($('sqlMessage'), r.message, r.blocked ? 'warn' : 'error');
    state.lastError = r.rawError || r.message;
    if (!r.ok) { $('fixSql').value = state.lastSql; $('fixError').value = state.lastError; }
  }
  renderGrid($('resultTable'), r.columns, r.rows, r.ok ? '这条 SQL 没有返回数据行' : '没有结果，先看上面的中文提示');
}
function switchTab(name) {
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('hidden', p.id !== 'panel-' + name));
  if (name === 'history') loadHistory();
  if (name === 'quiz') renderQuizzes();
  closeDrawer();
}

/* ---------- P2：AI 助手（流式） ---------- */
async function aiGenerate() {
  const question = $('aiQuestion').value.trim();
  if (!question) return toast('先用中文说一句你想查什么');
  const btn = $('aiGenerateBtn'); btn.disabled = true; btn.textContent = '生成中…';
  $('aiSql').textContent = ''; $('aiExplain').textContent = '正在结合真实表结构生成…';
  $('aiSource').textContent = '生成中'; $('aiSource').className = 'badge soft';
  let generated = '';
  try {
    const resp = await fetch('/api/ai/generate', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({space: state.space, question}),
    });
    const reader = resp.body.getReader(), dec = new TextDecoder();
    let buf = '';
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      buf += dec.decode(value, {stream: true});
      const parts = buf.split('\n\n'); buf = parts.pop();
      for (const part of parts) {
        const line = part.split('\n').find((l) => l.startsWith('data: '));
        if (!line) continue;
        let ev; try { ev = JSON.parse(line.slice(6)); } catch (e) { continue; }
        if (ev.type === 'meta') {
          $('aiSource').textContent = ev.source === 'model' ? '模型生成' : (ev.source === 'rules-fallback' ? '模型降级·本地规则' : '免费离线规则');
          $('aiExplain').textContent = ev.explanation;
        } else if (ev.type === 'delta') {
          generated += ev.text; $('aiSql').textContent = generated;
        } else if (ev.type === 'done') {
          generated = ev.sql;
          $('aiSql').textContent = generated;
          $('aiExplain').textContent = ev.explanation + (ev.verified ? ' ✅ 已自检：这条 SQL 能跑通。' : ' ⚠️ 自检未通过，可点『一键修复』。');
        }
      }
    }
    if (!generated) $('aiSql').textContent = '没有生成内容，换个说法试试';
  } catch (e) {
    $('aiSql').textContent = '生成失败：' + e.message;
    $('aiExplain').textContent = '请检查后端服务是否正常。';
    toast('生成失败，请确认服务已启动');
  } finally { btn.disabled = false; btn.textContent = '✨ 生成 SQL'; }
}
async function aiFix() {
  const sql = $('fixSql').value.trim();
  if (!sql) return toast('先贴上跑不通的 SQL');
  const r = await api('/api/ai/fix', {method: 'POST', body: {
    space: state.space, sql, error: $('fixError').value.trim() || state.lastError}});
  $('fixOut').textContent = r.sql || '';
  $('fixOut').classList.remove('hidden');
  message($('fixMessage'), r.explanation + ' ' + (r.message || ''), r.verified ? 'ok' : 'warn');
  $('aiSql').textContent = r.sql;
  $('aiExplain').textContent = r.explanation;
  toast('修复完成，可点「填入编辑器并运行」');
}

/* ---------- P3：一键造数 ---------- */
async function genPreview() {
  const prompt = $('genPrompt').value.trim();
  if (!prompt) return toast('先说一句要造什么数据');
  const r = await api('/api/generate-data/preview', {method: 'POST', body: {space: state.space, prompt}});
  if (!r.ok) return toast(r.message || '预览失败');
  state.genPlan = r.plan;
  $('genPlanMeta').textContent = r.plan.table + ' · ' + r.plan.rows + ' 行 · ' + r.plan.columns.length + ' 个字段';
  message($('genPlanMessage'), r.plan.message, 'info');
  $('genDdl').textContent = r.plan.ddl + ';';
  renderGrid($('genRules'), ['字段', '类型', '生成规则'], r.plan.columns.map((c) => [c.name, c.type, c.rule]));
  renderGrid($('genRows'), r.plan.preview.columns, r.plan.preview.rows);
  $('genPreviewCard').classList.remove('hidden');
  $('genResult').classList.add('hidden');
  $('genPreviewCard').scrollIntoView({behavior: 'smooth', block: 'nearest'});
}
async function genExecute() {
  if (!state.genPlan) return toast('先生成预览');
  const r = await api('/api/generate-data/execute', {method: 'POST', body: {
    space: state.space, plan: state.genPlan, confirm: true}});
  message($('genResult'), r.message || '执行完成', r.ok ? 'ok' : 'error');
  $('genResult').classList.remove('hidden');
  if (r.ok) { await loadTables(); toast('造数完成，左侧表列表已刷新'); }
}

/* ---------- P4：闯关练习 ---------- */
async function loadQuizzes() {
  const r = await api('/api/quiz');
  if (r.ok) { state.quizzes = r.quizzes; renderQuizzes(); }
}
function renderQuizzes() {
  const total = state.quizzes.length || 15;
  $('quizProgress').textContent = '已通过 ' + state.passed.size + ' / ' + total;
  $('quizProgressBar').style.width = (state.passed.size / total * 100) + '%';
  $('quizList').innerHTML = state.quizzes.map((q) =>
    '<button class="quiz-card' + (state.passed.has(q.id) ? ' done' : '') + '" data-quiz="' + q.id + '">' +
    '<span class="qtop"><span class="qid">第 ' + String(q.id).padStart(2, '0') + ' 题 · ' + q.points + ' 分</span>' +
    '<span class="lv ' + q.level + '">' + q.level + '</span></span>' +
    '<b>' + esc(q.title) + (state.passed.has(q.id) ? ' ✅' : '') + '</b>' +
    '<span class="qdesc">' + esc(q.question) + '</span></button>').join('');
  $('quizList').querySelectorAll('[data-quiz]').forEach((el) => el.onclick = () => openQuiz(Number(el.dataset.quiz)));
}
function openQuiz(id) {
  const q = state.quizzes.find((x) => x.id === id);
  if (!q) return;
  state.currentQuiz = q;
  $('quizTitle').textContent = '第 ' + q.id + ' 题 · ' + q.title;
  $('quizMeta').textContent = q.level + ' · ' + q.points + ' 分';
  $('quizQuestion').textContent = q.question;
  $('quizHint').textContent = q.hint;
  $('quizAnswer').textContent = q.answer;
  $('quizFeedback').classList.add('hidden');
  $('quizList').closest('.card').classList.add('hidden');
  $('quizDetail').classList.remove('hidden');
  $('quizDetail').scrollIntoView({behavior: 'smooth', block: 'nearest'});
}
async function submitQuiz() {
  if (!state.currentQuiz) return;
  const sql = $('quizSql').value.trim();
  if (!sql) return toast('先写一句 SQL 再提交');
  const r = await api('/api/quiz/submit', {method: 'POST', body: {space: state.space, id: state.currentQuiz.id, sql}});
  message($('quizFeedback'), r.message, r.passed ? 'ok' : 'warn');
  if (r.passed) {
    state.passed.add(state.currentQuiz.id);
    localStorage.setItem('sqllab.passed.' + state.space, JSON.stringify([...state.passed]));
  }
  renderQuizzes();
}

/* ---------- 执行记录 ---------- */
async function loadHistory() {
  const r = await api(url('/api/history', {space: state.space}));
  if (!r.ok) return;
  const items = r.history || [];
  $('historyList').innerHTML = items.length ? items.map((h, i) =>
    '<div class="hist-item"><div class="hist-top">' +
    '<span>#' + (items.length - i) + '</span><span>' + esc(h.time || '') + '</span>' +
    '<span class="tag' + (h.ok ? '' : ' bad') + '">' + (h.ok ? '成功' : (h.blocked ? '被拦下' : '失败')) + '</span>' +
    '<span>' + (h.rowCount || 0) + ' 行 · ' + (h.elapsedMs || 0) + ' ms · ' + esc(h.mode || 'query') + '</span></div>' +
    '<div class="hist-sql">' + esc(h.sql || '') + '</div>' +
    (h.message ? '<div style="font-size:11.5px;color:#64748b;margin-bottom:7px">' + esc(h.message) + '</div>' : '') +
    '<div class="hist-actions"><button class="btn ghost" data-copy-sql="' + i + '">复制 SQL</button>' +
    '<button class="btn ghost" data-copy-result="' + i + '">复制结果</button>' +
    '<button class="btn ghost" data-use-sql="' + i + '">放回编辑器</button></div></div>').join('')
    : '<div class="empty-hint">这个空间还没有执行记录。去 SQL 工作台跑一条语句吧。</div>';
  $('historyList').querySelectorAll('[data-copy-sql]').forEach((b) => b.onclick = () => copyText(items[Number(b.dataset.copySql)].sql || '', 'SQL'));
  $('historyList').querySelectorAll('[data-copy-result]').forEach((b) => b.onclick = () => {
    const h = items[Number(b.dataset.copyResult)];
    copyText([(h.columns || []).join('\t'), ...(h.rows || []).map((r) => r.join('\t'))].join('\n'), '结果');
  });
  $('historyList').querySelectorAll('[data-use-sql]').forEach((b) => b.onclick = () => {
    $('sqlEditor').value = items[Number(b.dataset.useSql)].sql || ''; switchTab('sql'); toast('已放回编辑器');
  });
}

/* ---------- 事件绑定 ---------- */
function closeDrawer() { $('sidebar').classList.remove('open'); $('drawerMask').classList.add('hidden'); }
function bindEvents() {
  $('tabs').addEventListener('click', (e) => { const t = e.target.closest('.tab'); if (t) switchTab(t.dataset.tab); });
  document.querySelectorAll('[data-tab-jump]').forEach((b) => b.onclick = () => switchTab(b.dataset.tabJump));
  document.querySelectorAll('[data-demo]').forEach((b) => b.onclick = () => {
    $('sqlEditor').value = b.dataset.demo; switchTab('sql'); toast('已填入编辑器，点「运行」试试');
  });
  document.querySelectorAll('[data-ai]').forEach((b) => b.onclick = () => { $('aiQuestion').value = b.dataset.ai; toast('已填入，点「生成 SQL」'); });
  document.querySelectorAll('[data-gen]').forEach((b) => b.onclick = () => { $('genPrompt').value = b.dataset.gen; });
  $('tableSearch').addEventListener('input', () => renderTables($('tableSearch').value.trim()));
  $('runBtn').onclick = () => runSql(false);
  $('copySqlBtn').onclick = () => copyText(state.lastSql || $('sqlEditor').value, 'SQL');
  $('copyResultBtn').onclick = () => {
    const r = state.lastResult;
    if (!r || !r.columns || !r.columns.length) return toast('还没有可复制的结果');
    copyText([r.columns.join('\t'), ...r.rows.map((row) => row.join('\t'))].join('\n'), '结果');
  };
  $('aiGenerateBtn').onclick = aiGenerate;
  $('aiFixBtn').onclick = aiFix;
  $('aiCopyBtn').onclick = () => copyText($('aiSql').textContent, 'SQL');
  $('aiFillRunBtn').onclick = () => {
    const sql = $('aiSql').textContent.trim();
    if (!sql || sql.startsWith('点上面')) return toast('先生成一条 SQL');
    $('sqlEditor').value = sql; switchTab('sql'); runSql(false);
  };
  $('genPreviewBtn').onclick = genPreview;
  $('genConfirmBtn').onclick = () => {
    if (!state.genPlan) return;
    confirmAction('确认造数', '将在空间「' + state.space + '」里建表 ' + state.genPlan.table + '，写入 ' + state.genPlan.rows + ' 行。同名表会被重建，确认继续？', genExecute);
  };
  $('quizSubmitBtn').onclick = submitQuiz;
  $('quizBackBtn').onclick = () => { $('quizDetail').classList.add('hidden'); $('quizList').closest('.card').classList.remove('hidden'); };
  $('historyClearBtn').onclick = () => confirmAction('清空执行记录', '只清空当前空间「' + state.space + '」的记录，不影响数据和其他空间。', async () => {
    await api('/api/history/clear', {method: 'POST', body: {space: state.space}}); loadHistory(); toast('已清空');
  }, '确认清空');
  $('spaceSelect').onchange = (e) => switchSpace(e.target.value);
  $('newSpaceBtn').onclick = newSpace;
  $('helpBtn').onclick = () => showModal('使用帮助 · 非技术版',
    '<ul><li><b>看表</b>：左边点表名展开字段，点「查看样例数据」看前几行。</li>' +
    '<li><b>查数</b>：在 SQL 工作台写一句查询，点「运行」（或按 ⌘/Ctrl + 回车），下面出表格、行数和耗时。</li>' +
    '<li><b>写错</b>：会给中文提示。删数据、清空表的语句会被拦住，这是保护，不是坏了。</li>' +
    '<li><b>不会写</b>：AI 助手里说中文，例如「统计每个城市的订单数」，生成后点「填入编辑器并运行」。</li>' +
    '<li><b>一键修复</b>：贴一条跑不通的 SQL，点修复，会按真实表结构改好。</li>' +
    '<li><b>造数</b>：一键造数里说「建一张 XX 表，造 5000 行」，先看预览再确认执行。</li>' +
    '<li><b>练习</b>：闯关练习 15 道，提交自动判分，写法不要求一样。</li>' +
    '<li><b>多人用</b>：顶部切「空间」，每人一套独立数据，互相看不见。</li></ul>' +
    '<p style="color:#64748b;font-size:12px">遇到英文报错不用管，页面上显示的是中文人话。服务打不开时，让搭系统的人按交接本里的固定端口 8765 重启。</p>');
  $('modalClose').onclick = closeModal;
  $('modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
  $('drawerBtn').onclick = () => { $('sidebar').classList.toggle('open'); $('drawerMask').classList.toggle('hidden'); };
  $('drawerMask').onclick = closeDrawer;
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); switchTab('sql'); runSql(false); }
    if (e.key === 'Escape') { closeModal(); closeDrawer(); }
  });
}
init();
