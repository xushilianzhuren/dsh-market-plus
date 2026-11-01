window.__ModuleLoader__.load({
        id: "dsh-market-plus",
        factory: (require) => {
                var module = { exports: {} };
                var exports = module.exports;
                Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
                let react = require("react");
                const El = react.createElement;
                const PANEL_ID = "market-plus";

                function toast(msg) {
                        const t = document.createElement("div");
                        t.style.cssText = "position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#222;color:#fff;padding:8px 14px;border-radius:8px;z-index:2147480003;font-size:13px";
                        t.textContent = msg; document.body.appendChild(t);
                        setTimeout(() => t.remove(), 2200);
                }
                function esc(s) { return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
                function md2h(md) {
                        let h = esc(md);
                        h = h.replace(/```([\s\S]*?)```/g, (m, c) => "<pre style='background:#111;padding:8px;border-radius:6px;overflow:auto;font-size:11px'>" + c + "</pre>");
                        h = h.replace(/^### (.*)$/gm, "<h3 style='color:#7cb8ff;margin:8px 0 4px'>$1</h3>");
                        h = h.replace(/^## (.*)$/gm, "<h2 style='color:#9fc5ff;margin:10px 0 6px'>$1</h2>");
                        h = h.replace(/^# (.*)$/gm, "<h1 style='color:#fbbf24;margin:10px 0 8px'>$1</h1>");
                        h = h.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
                        h = h.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<a href='$2' target='_blank' style='color:#7cb8ff'>$1</a>");
                        h = h.replace(/^- (.*)$/gm, "• $1<br>");
                        return h.replace(/\n/g, "<br>");
                }

                function Panel() {
                        const st = { q: "", items: [], mode: "reco" };
                        const root = El("div", { style: { padding: "14px", paddingBottom: "90px", maxWidth: "760px", margin: "0 auto" } });
                        function render() {
                                root.innerHTML = "";
                                const head = El("div", { style: { display: "flex", gap: "8px", alignItems: "center", marginBottom: "10px" } });
                                const inp = El("input", { placeholder: "搜插件（回车搜GitHub）", style: { flex: "1", background: "#1a1f29", border: "1px solid #3a4150", color: "#eee", borderRadius: "8px", padding: "9px 12px", fontSize: "14px" } });
                                inp.value = st.q;
                                inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { st.q = inp.value; st.mode = "search"; load(); } });
                                head.appendChild(inp);
                                root.appendChild(head);
                                root.appendChild(El("div", { style: { color: "#6b7280", fontSize: "12px", marginBottom: "8px" } }, st.mode === "reco" ? "🔥 dsh插件实时榜（GitHub直读·免安装看README）" : "搜索结果"));
                                const list = El("div", {});
                                root.appendChild(list);
                                st.items.forEach(p => {
                                        const c = El("div", { style: { background: "#1a1f29", margin: "0 0 10px", borderRadius: "12px", padding: "13px", border: "1px solid #262c38", cursor: "pointer" } });
                                        c.appendChild(El("div", { style: { color: "#7cb8ff", fontSize: "15px", fontWeight: "600" } }, "📦 " + p.name));
                                        c.appendChild(El("div", { style: { color: "#b9b6b1", fontSize: "13px", lineHeight: "1.5", marginTop: "4px" } }, esc(p.description || "").slice(0, 160)));
                                        c.appendChild(El("div", { style: { color: "#6b7280", fontSize: "11px", marginTop: "6px" } }, "★" + (p.stars || 0) + " · " + (p.updated || "").slice(0, 10) + " · " + p.repo));
                                        c.addEventListener("click", () => detail(p));
                                        list.appendChild(c);
                                });
                                if (!st.items.length) list.appendChild(El("div", { style: { color: "#6b7280", padding: "20px", textAlign: "center" } }, "加载中…"));
                        }
                        async function load() {
                                st.items = []; render();
                                try {
                                        const q = st.mode === "search" && st.q ? st.q + "+topic:dsh-plugin" : "topic:dsh-plugin";
                                        const d = await (await fetch("https://api.github.com/search/repositories?q=" + encodeURIComponent(q) + "&sort=stars&per_page=30")).json();
                                        st.items = (d.items || []).map(x => ({ name: x.name, repo: x.full_name, description: x.description, stars: x.stargazers_count, updated: x.pushed_at }));
                                } catch (e) { toast("GitHub拉取失败·重试"); }
                                render();
                        }
                        async function detail(p) {
                                const ov = document.createElement("div");
                                ov.style.cssText = "position:fixed;inset:0;z-index:2147480003;background:#0f1115;overflow:auto;padding:16px";
                                ov.innerHTML = "<div style='display:flex;gap:8px;align-items:center'><button id='mp-back' style='background:#2563eb;color:#fff;border:none;border-radius:8px;padding:8px 14px'>← 返回</button><b style='color:#fbbf24'>" + esc(p.name) + "</b></div><div id='mp-body' style='color:#b9b6b1;font-size:13px;line-height:1.6;margin-top:10px'>加载中…</div>";
                                document.body.appendChild(ov);
                                ov.querySelector("#mp-back").onclick = () => ov.remove();
                                const body = ov.querySelector("#mp-body");
                                let stats = "", md = "";
                                try {
                                        const j = await (await fetch("https://api.github.com/repos/" + p.repo)).json();
                                        stats = "★" + j.stargazers_count + " · ⑂" + j.forks_count + " · 更新 " + (j.pushed_at || "").slice(0, 10) + " · " + (j.license?.spdx_id || "无协议") + " · " + Math.round((j.size || 0) / 1024) + "KB";
                                } catch {}
                                for (const br of ["main", "master"]) {
                                        try {
                                                const r = await fetch("https://raw.githubusercontent.com/" + p.repo + "/" + br + "/README.md");
                                                if (r.ok) { md = await r.text(); break; }
                                        } catch {}
                                }
                                body.innerHTML = "<div style='background:#1a1f29;border-radius:10px;padding:10px;margin-bottom:10px;color:#fbbf24'>" + esc(stats || "统计拉取失败") + "</div>"
                                        + "<div style='margin-bottom:10px'><b style='color:#9fc5ff'>README（免安装·全景）</b></div>"
                                        + (md ? "<div style='background:#151920;border-radius:10px;padding:12px'>" + md2h(md) + "</div>" : "<div class='card'>无README</div>")
                                        + "<div style='margin:12px 0;background:#1a1f29;border-radius:10px;padding:10px'><b style='color:#9fc5ff'>安装任务（复制给主会话AI执行）</b><br><code style='display:block;background:#111;margin-top:6px;padding:8px;border-radius:6px;font-size:11px;word-break:break-all'>cd ~/.dsh/profiles/web && pnpm add github:" + p.repo + " && 把包名加入 dsh.profile.bundles 并重启DSH</code></div>";
                        }
                        load();
                        return root;
                }

                function apply(ctx) {
                        const layout = ctx.layout;
                        if (layout && layout.selectPanel) {
                                ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
                                        name: "sidebar.panellist", id: PANEL_ID, order: 7, label: "插件市场Plus"
                                }, (props) => El(function Icon(p) {
                                        return El("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", padding: "6px 2px", color: p && p.active ? "#fbbf24" : "#9aa3b2", fontSize: "11px" } },
                                                El("div", { style: { fontSize: "18px" } }, "🛒"),
                                                El("div", {}, "市场Plus"));
                                }, props)));
                                ctx.slots.inject("main", () => ctx.slots.register({
                                        name: "main", key: PANEL_ID
                                }, () => El(Panel, {})));
                        }
                }
                exports.apply = apply;
                exports.inject = ["slots", "layout"];
                return module.exports;
        }
});
