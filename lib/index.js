/**
 * 插件市场Plus · dsh-market-plus（Host 插件，零依赖·完整版）
 *
 * 七页签全功能：推荐/搜索/整合包/收藏/已装/已发布/设置
 * 核心差异化：详情页免安装 —— 点开即渲染 GitHub README 全文 + 应用市场式统计条
 * 数据：读官方市场缓存 plugins-cache.json / packs-cache.json，零迁移共存
 * 隐私：零遥测；token 存本机 settings 文件
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

export const name = 'market-plus'
export const inject = ['webServer']

const HOME = homedir()
const MKT_DIR = join(HOME, '.dsh', 'plugins', 'dsh-market')
const SELF_DIR = join(HOME, '.dsh', 'plugins', 'dsh-market-plus')
const CACHE = join(MKT_DIR, 'plugins-cache.json')
const PACKS = join(MKT_DIR, 'packs-cache.json')
const SETTINGS = join(SELF_DIR, 'settings.json')
const FAVS = join(SELF_DIR, 'favorites.json')
const LOG = join(SELF_DIR, 'ops.json')

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const log = (msg) => { try {
  const arr = existsSync(LOG) ? JSON.parse(readFileSync(LOG, 'utf8')) : []
  arr.push({ t: new Date().toISOString(), msg: String(msg).slice(0, 200) })
  writeFileSync(LOG, JSON.stringify(arr.slice(-200)))
} catch {} }

function loadJSON(p) { try { return JSON.parse(readFileSync(p, 'utf8')) } catch { return null } }
function loadCache() {
  for (const p of [CACHE, join(HOME, '.dsh', 'profile', 'node_modules', '.dsh-market-cache.json')])
    if (existsSync(p)) { const d = loadJSON(p); if (d?.plugins) return d.plugins }
  return []
}
function loadPacks() {
  const d = loadJSON(PACKS)
  return d?.packs ?? []
}
const plugins = () => {
  const all = loadCache()
  return all.map(p => ({ ...p, fullName: p.fullName || p.id, stars: p.stars || 0 }))
}

// ── 极简 Markdown 渲染（标题/代码/列表/粗斜体/链接/引用/表格基础）──
function renderMd(md) {
  const lines = md.replace(/\r/g, '').split('\n')
  let out = '', inCode = false, inList = false
  const inline = s => esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
  for (const ln of lines) {
    if (/^```/.test(ln)) { out += inCode ? '</code></pre>' : '<pre><code>'; inCode = !inCode; continue }
    if (inCode) { out += esc(ln) + '\n'; continue }
    if (/^#{1,4}\s/.test(ln)) { if (inList) { out += '</ul>'; inList = false }
      const lv = Math.min(ln.match(/^#+/)[0].length, 4); out += `<h${lv}>${inline(ln.replace(/^#+\s/, ''))}</h${lv}>`; continue }
    if (/^\s*[-*+]\s/.test(ln)) { if (!inList) { out += '<ul>'; inList = true } out += `<li>${inline(ln.replace(/^\s*[-*+]\s/, ''))}</li>`; continue }
    if (inList) { out += '</ul>'; inList = false }
    if (/^>\s?/.test(ln)) { out += `<blockquote>${inline(ln.replace(/^>\s?/, ''))}</blockquote>`; continue }
    if (/^\|.*\|/.test(ln)) { out += `<div class="trow">${inline(ln)}</div>`; continue }
    if (!ln.trim()) { out += ''; continue }
    out += `<p>${inline(ln)}</p>`
  }
  if (inCode) out += '</code></pre>'
  if (inList) out += '</ul>'
  return out
}

function page() {
  return `<!doctype html><html lang="zh"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>插件市场 Plus</title><style>
*{box-sizing:border-box;margin:0}body{font:15px/1.55 -apple-system,'PingFang SC','Microsoft YaHei',sans-serif;background:#0f1117;color:#e8eaf0;padding-bottom:70px}
.tabs{position:fixed;top:0;left:0;right:0;display:flex;background:#161a23;border-bottom:1px solid #2a2f3c;z-index:9;overflow-x:auto}
.tabs button{flex:1;min-width:64px;padding:11px 4px;background:none;border:none;color:#9aa3b5;font-size:13px;border-bottom:2px solid transparent;cursor:pointer}
.tabs button.on{color:#fff;border-color:#4f8cff}
.wrap{padding:56px 12px 12px;max-width:860px;margin:0 auto}
.bar{display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap}
.bar input{flex:1;min-width:140px;padding:9px 12px;border-radius:9px;border:1px solid #2a2f3c;background:#1a1f2b;color:#e8eaf0;font-size:14px}
.bar select,.bar button{padding:8px 10px;border-radius:9px;border:1px solid #2a2f3c;background:#1a1f2b;color:#cfd6e4;cursor:pointer}
.chip{display:inline-block;padding:5px 11px;margin:3px 4px 3px 0;border-radius:14px;background:#1a1f2b;color:#9fb4e8;font-size:12.5px;cursor:pointer;border:1px solid #26304a}
.chip.on{background:#2b4a9e;color:#fff}
.card{background:#171c26;border:1px solid #262c3a;border-radius:12px;padding:12px 14px;margin:9px 0;cursor:pointer}
.card:hover{border-color:#3d5aa8}
.card h3{font-size:15px;color:#fff;display:flex;justify-content:space-between;gap:8px}
.card h3 .st{color:#fbbf24;font-weight:600;flex-shrink:0}
.card p{font-size:13px;color:#a8b0c2;margin-top:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.card .meta{font-size:11.5px;color:#6b7488;margin-top:5px;display:flex;gap:10px;flex-wrap:wrap}
.detail{position:fixed;inset:0;background:#0f1117;z-index:20;overflow-y:auto;padding:14px;display:none}
.detail .hd{display:flex;align-items:center;gap:8px;margin-bottom:10px}
.detail .hd button{background:#1a1f2b;color:#e8eaf0;border:1px solid #2a2f3c;border-radius:8px;padding:8px 12px;cursor:pointer;font-size:13px}
.stats{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}
.stats div{background:#1a1f2b;border-radius:9px;padding:8px 12px;font-size:12.5px;color:#cfd6e4}
.stats b{color:#fbbf24}
.md h1,.md h2,.md h3,.md h4{color:#fff;margin:14px 0 8px}
.md p,.md li{color:#c4cadd;margin:6px 0;word-break:break-all}
.md pre{background:#0b0d13;border:1px solid #232937;border-radius:8px;padding:10px;overflow-x:auto;font-size:12.5px;color:#9fe0af;margin:8px 0}
.md code{background:#0b0d13;padding:1px 5px;border-radius:5px;color:#f0b86e;font-size:12.5px}
.md a{color:#6fa8ff}.md blockquote{border-left:3px solid #3d5aa8;padding-left:10px;color:#9aa3b5;margin:8px 0}
.md ul{padding-left:20px}
.trow{font-family:monospace;font-size:12px;color:#9aa3b5;overflow-x:auto;white-space:nowrap}
.empty{text-align:center;color:#6b7488;padding:50px 0}
h2.sec{font-size:16px;color:#fff;margin:14px 0 8px}
</style></head><body>
<div class="tabs" id="tabs"></div>
<div class="wrap" id="main"></div>
<div class="detail" id="dt"><div class="hd"><button onclick="closeDt()">← 返回</button><span id="dtTitle" style="color:#fff;font-weight:600"></span></div>
<div class="stats" id="dtStats"></div>
<div class="bar" id="dtActs"></div>
<div class="md" id="dtMd"></div></div>
<script>
const T=['推荐','搜索','整合包','收藏','已装','已发布','设置'];let tab=0,q='',cat='',sort='default';
const favs=new Set(JSON.parse(localStorage.getItem('mp_favs')||'[]'));
const saveFav=()=>localStorage.setItem('mp_favs',JSON.stringify([...favs]));
async function api(p){const r=await fetch('/market-plus/api'+p);return r.json()}
function card(p){return '<div class="card" onclick="dt(\\''+esc(p.fullName)+'\\')"><h3>'+esc(p.name)+' <span class="st">★'+(p.stars||0)+'</span></h3><p>'+esc(p.descriptionZh||p.description||'')+'</p><div class="meta"><span>'+esc(p.type||'')+'</span><span>'+(p.pushedAt?('更新 '+p.pushedAt.slice(0,10)):'')+'</span>'+(favs.has(p.fullName)?'<span style="color:#fbbf24">★已收藏</span>':'')+'</div></div>'}
async function load(){
  const M=document.getElementById('main');
  document.querySelectorAll('#tabs button').forEach((b,i)=>b.classList.toggle('on',i===tab));
  if(tab===0){const d=await api('?act=list&tab=reco');M.innerHTML='<h2 class="sec">⭐ 精选</h2>'+(d.plugins.map(card).join('')||'<div class="empty">暂无精选</div>')}
  else if(tab===1){M.innerHTML='<div class="bar"><input id="q" placeholder="搜索插件…" value="'+esc(q)+'" onkeydown="if(event.key==\\'Enter\\')doSearch()"><select id="srt" onchange="doSearch()"><option value="default">默认</option><option value="stars">星数</option><option value="updated">更新</option><option value="name">名称</option></select></div><div id="chips"></div><div id="res"></div>';
    const d=await api('?act=list&tab=cats');M.querySelector('#chips').innerHTML=(d.cats||[]).map(c=>'<span class="chip'+(cat===c.t?' on':'')+'" onclick="cat=\\''+esc(c.t)+'\\';doSearch()">'+esc(c.t)+' '+c.n+'</span>').join('');
    doSearch()}
  else if(tab===2){const d=await api('?act=packs');M.innerHTML='<h2 class="sec">📦 整合包</h2>'+(d.packs.map(pk=>'<div class="card" onclick="dt(\\''+esc(pk.id)+'\\')"><h3>'+esc(pk.name||pk.id)+'</h3><p>'+esc((pk.description||'').slice(0,90))+'</p></div>').join('')||'<div class="empty">暂无整合包</div>')}
  else if(tab===3){const l=[...favs];M.innerHTML='<h2 class="sec">★ 我的收藏</h2><div class="bar" style="color:#6b7488;font-size:12px">收藏存于本机浏览器·共'+l.length+'件</div>'+(l.map(fn=>'<div class="card" onclick="dt(\\''+esc(fn)+'\\')"><h3>'+esc(fn.split('/').pop())+'</h3><p>'+esc(fn)+'</p></div>').join('')||'<div class="empty">还没有收藏·在插件详情里点 ★ 收藏</div>')}
  else if(tab===4){const d=await api('?act=installed');M.innerHTML='<h2 class="sec">✅ 已安装 '+d.installed.length+'件</h2>'+(d.installed.map(i=>'<div class="card"><h3>'+esc(i.name)+'</h3><div class="meta"><span>'+esc(i.where)+'</span><span>'+(i.ver?('v'+esc(i.ver)):'')+'</span></div></div>').join('')||'<div class="empty">未发现已安装插件</div>')}
  else if(tab===5){const s=await api('?act=settings');if(!s.token){M.innerHTML='<div class="empty">先在「设置」绑定 GitHub Token 才能列出你发布的仓</div>'}else{const d=await api('?act=mine');M.innerHTML='<h2 class="sec">🚀 我发布的 '+d.mine.length+'件</h2>'+(d.mine.map(p=>card(p)).join('')||'<div class="empty">Token下未发现 dsh- 开头公开仓</div>')}}
  else if(tab===6){const s=await api('?act=settings');M.innerHTML='<h2 class="sec">⚙ 设置</h2><div class="card"><h3>GitHub Token</h3><p style="margin-top:6px">用于「已发布」页列出你的仓库（存本机settings文件·不上传）</p><div class="bar" style="margin-top:8px"><input id="tok" placeholder="'+(s.token?'已绑定('+s.token.slice(0,4)+'…)': '粘贴 GitHub Token')+'"><button onclick="saveTok()">保存</button></div></div><div class="card"><h3>备份与恢复</h3><div class="bar" style="margin-top:8px"><button onclick="exportAll()">导出备份JSON(收藏+设置)</button><button onclick="document.getElementById(\'imp\').click()">导入恢复</button><input type="file" id="imp" style="display:none" onchange="importAll(this)"></div></div><div class="card"><h3>操作日志</h3><div id="oplog" style="font-size:12px;color:#6b7488;max-height:180px;overflow-y:auto">加载中…</div></div>';
    api('?act=log').then(d=>{M.querySelector('#oplog').innerHTML=(d.log||[]).map(l=>'· '+esc(l.t.slice(0,16))+' '+esc(l.msg)).join('<br>')||'暂无'})}
}
async function doSearch(){q=document.getElementById('q')?.value||q;sort=document.getElementById('srt')?.value||sort;
  const d=await api('?act=list&tab=search&q='+encodeURIComponent(q)+'&cat='+encodeURIComponent(cat)+'&sort='+sort);
  document.getElementById('res').innerHTML=(d.plugins||[]).map(card).join('')||'<div class="empty">无结果</div>'}
async function saveTok(){const v=document.getElementById('tok').value.trim();await api('?act=saveToken&token='+encodeURIComponent(v));toast(v?'已绑定':'已清除');load()}
async function exportAll(){const s=await api('?act=settings');const b={favs:[...favs],token:s.token,at:Date.now()};
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(b)],{type:'application/json'}));a.download='market-plus-backup.json';a.click()}
async function importAll(inp){const f=inp.files[0];if(!f)return;const b=JSON.parse(await f.text());
  if(b.favs){b.favs.forEach(x=>favs.add(x));saveFav()}
  if(b.token)await api('?act=saveToken&token='+encodeURIComponent(b.token));toast('恢复完成');load()}
function toast(m){const d=document.createElement('div');d.textContent=m;d.style.cssText='position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#2b4a9e;color:#fff;padding:8px 18px;border-radius:18px;z-index:99';document.body.appendChild(d);setTimeout(()=>d.remove(),1600)}
let curRepo='';
async function dt(repo){curRepo=repo;const D=document.getElementById('dt');D.style.display='block';D.scrollTop=0;
  document.getElementById('dtTitle').textContent=repo.split('/').pop();
  document.getElementById('dtMd').innerHTML='<div class="empty">加载中…</div>';
  document.getElementById('dtActs').innerHTML='<button onclick="favToggle()">★ 收藏/取消</button><button onclick="location.href=\\'https://github.com/'+esc(repo)+'\\'">仓库</button><button onclick="copyInstall()">复制安装命令</button>';
  const d=await api('?act=readme&repo='+encodeURIComponent(repo));
  document.getElementById('dtStats').innerHTML=['★ '+(d.stats.stars??'-'),'⑂ '+(d.stats.forks??'-'),'更新 '+(d.stats.updated??'-'),'协议 '+(d.stats.license??'-'),'大小 '+(d.stats.size?Math.round(d.stats.size/1024*10)/10+'MB':'-')].map(x=>'<div>'+x+'</div>').join('');
  document.getElementById('dtMd').innerHTML=d.html||'<div class="empty">无 README</div>'}
function favToggle(){favs.has(curRepo)?favs.delete(curRepo):favs.add(curRepo);saveFav();toast(favs.has(curRepo)?'已收藏':'已取消')}
function copyInstall(){const c='dsh install '+curRepo;(navigator.clipboard?navigator.clipboard.writeText(c):Promise.reject()).then(()=>toast('已复制:'+c)).catch(()=>toast(c))}
function closeDt(){document.getElementById('dt').style.display='none'}
document.getElementById('tabs').innerHTML=T.map((t,i)=>'<button onclick="tab='+i+';load()">'+t+'</button>').join('');
load();
</script></body></html>`
}

export function apply(ctx, config) {
  const web = ctx?.webServer
  if (!web?.registerHttpHandler) return
  web.registerHttpHandler('/market-plus', async (req) => {
    const url = new URL(req.url, 'http://x')
    const path = url.pathname.replace(/\/+$/, '') || '/market-plus'
    const act = url.searchParams.get('act')
    if (path === '/market-plus' && !act) return { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' }, body: page() }
    if (path !== '/market-plus/api') return undefined
    try {
      if (act === 'list') {
        const tab = url.searchParams.get('tab') || 'reco'
        const all = plugins()
        if (tab === 'reco') return { plugins: all.filter(p => p.curated).slice(0, 40).length ? all.filter(p => p.curated).slice(0, 40) : all.sort((a, b) => b.stars - a.stars).slice(0, 40) }
        if (tab === 'cats') {
          const m = {}
          for (const p of all) for (const t of (p.tags || [])) m[t] = (m[t] || 0) + 1
          return { cats: Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 18).map(([t, n]) => ({ t, n })) }
        }
        if (tab === 'search') {
          const q = (url.searchParams.get('q') || '').toLowerCase()
          const cat = url.searchParams.get('cat') || ''
          const sort = url.searchParams.get('sort') || 'default'
          let list = all
          if (cat) list = list.filter(p => (p.tags || []).includes(cat))
          if (q) list = list.filter(p => (p.name + ' ' + (p.description || '') + ' ' + (p.descriptionZh || '') + ' ' + (p.tags || []).join(' ')).toLowerCase().includes(q))
          if (sort === 'stars') list = [...list].sort((a, b) => b.stars - a.stars)
          else if (sort === 'updated') list = [...list].sort((a, b) => (b.pushedAt || '').localeCompare(a.pushedAt || ''))
          else if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name))
          return { plugins: list.slice(0, 80), total: list.length }
        }
      }
      if (act === 'packs') return { packs: loadPacks().map(pk => ({ id: pk.id, name: pk.name, description: pk.description })) }
      if (act === 'installed') {
        const out = []
        const pd = join(HOME, '.dsh', 'plugins')
        if (existsSync(pd)) for (const d of readdirSync(pd)) {
          const pkg = join(pd, d, 'package.json')
          if (existsSync(pkg)) { const j = loadJSON(pkg); out.push({ name: j?.name || d, ver: j?.version, where: 'plugins' }) }
          else out.push({ name: d, ver: '', where: 'plugins' })
        }
        const nm = join(HOME, '.dsh', 'profile', 'node_modules', '@local')
        if (existsSync(nm)) for (const d of readdirSync(nm)) {
          const pkg = join(nm, d, 'package.json')
          if (existsSync(pkg)) { const j = loadJSON(pkg); out.push({ name: j?.name || d, ver: j?.version, where: 'profile' }) }
        }
        return { installed: out }
      }
      if (act === 'settings') { const s = loadJSON(SETTINGS) || {}; return { token: s.token ? s.token.slice(0, 4) + '…' : '', has: !!s.token } }
      if (act === 'saveToken') {
        const token = url.searchParams.get('token') || ''
        writeFileSync(SETTINGS, JSON.stringify({ token, at: Date.now() }))
        log(token ? '绑定GitHub Token' : '清除Token')
        return { ok: true }
      }
      if (act === 'mine') {
        const s = loadJSON(SETTINGS) || {}
        if (!s.token) return { mine: [], error: 'no-token' }
        const r = await fetch('https://api.github.com/user/repos?per_page=100&sort=pushed', { headers: { Authorization: 'token ' + s.token, 'User-Agent': 'dsh-market-plus' } })
        const repos = await r.json()
        return { mine: repos.filter(x => !x.private && x.name.startsWith('dsh-')).map(x => ({ name: x.name, fullName: x.full_name, stars: x.stargazers_count, description: x.description, pushedAt: x.pushed_at, type: 'repo' })) }
      }
      if (act === 'log') return { log: loadJSON(LOG) || [] }
      if (act === 'install') {
      const repo = url.searchParams.get('repo') || ''
      if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) return { error: 'repo格式非法' }
      let known = false
      try { const dd = JSON.parse(readFileSync(CACHE, 'utf8')); known = dd.plugins.some(p => p.fullName === repo || p.id === repo) } catch {}
      if (!known) return { error: '不在市场缓存内·拒绝安装(安全闸①)' }
      const profile = JSON.parse(existsSync(join(MKT_DIR, 'settings.json')) ? readFileSync(join(MKT_DIR, 'settings.json'), 'utf8') : '{}').profile || 'web'
      const { execFile: ef } = await import('node:child_process')
      const pr = (a, b) => new Promise(res => ef(a, b, { timeout: 120000, cwd: join(HOME, 'dsh') }, (e, so, se) => res({ out: ((so || '') + (se || '')).slice(-800), code: e?.code ?? 0 })))
      const r1 = await pr(process.execPath, ['apps/cli/lib/bin.js', 'plugin', '--profile', profile, 'add', 'github:' + repo])
      return { ok: !r1.code || /Done in/.test(r1.out), profile, output: r1.out, note: '装完调act=restart生效' }
    }
    if (act === 'restart') {
      const { exec } = await import('node:child_process')
      exec("pkill -f 'bin[.]js --profile web'; sleep 2; setsid nohup bash " + join(HOME, 'dsh_start.sh') + ' > /tmp/dsh_restart.log 2>&1 < /dev/null &')
      return { ok: true, note: '重启已发起·约25秒后恢复' }
    }
    if (act === 'readme') {
        const repo = (url.searchParams.get('repo') || '').replace(/[^a-zA-Z0-9_.\-\/]/g, '')
        const stats = {}
        try {
          const r = await fetch('https://api.github.com/repos/' + repo, { headers: { 'User-Agent': 'dsh-market-plus' } })
          const j = await r.json()
          Object.assign(stats, { stars: j.stargazers_count, forks: j.forks_count, updated: (j.pushed_at || '').slice(0, 10), license: j.license?.spdx_id || '无', size: j.size })
        } catch (e) { stats.error = String(e.message || e).slice(0, 80) }
        let md = ''
        for (const br of ['main', 'master']) {
          try {
            const rr = await fetch('https://raw.githubusercontent.com/' + repo + '/' + br + '/README.md', { headers: { 'User-Agent': 'dsh-market-plus' } })
            if (rr.ok) { md = await rr.text(); break }
          } catch {}
        }
        return { html: md ? renderMd(md) : '<div class="empty">仓库无 README 或拉取失败</div>', stats }
      }
      return { error: 'unknown act' }
    } catch (err) { return { error: String(err?.message || err).slice(0, 160) } }
  })
}
