// سكربت التضمين: <script src="https://.../embed.js" data-site="UUID" data-target="plans-box"></script>
// ينشئ iframe لصفحة الباقات ويضبط ارتفاعه تلقائياً. زر "اشترك" يطلق الحدث plans:subscribe على window.
(() => {
  "use strict";
  const me = document.currentScript;
  if (!me) return;
  const site = me.getAttribute("data-site") || "";
  if (!/^[0-9a-f-]{36}$/i.test(site)) return console.error("embed.js: data-site غير صالح");
  const base = new URL("plans.html", me.src);
  base.search = "?site=" + encodeURIComponent(site) + "&embed=1";
  const box = document.getElementById(me.getAttribute("data-target") || "") || me.parentNode;
  const f = document.createElement("iframe");
  f.src = base.href; f.title = "الباقات"; f.loading = "lazy";
  f.setAttribute("referrerpolicy", "no-referrer");
  f.style.cssText = "width:100%;border:0;display:block;min-height:320px;color-scheme:normal";
  box.insertBefore(f, me.getAttribute("data-target") ? null : me);
  addEventListener("message", (e) => {
    if (e.source !== f.contentWindow || e.origin !== base.origin || !e.data) return;
    if (e.data.type === "plans:height" && Number.isFinite(e.data.height)) f.style.height = Math.min(Math.max(e.data.height, 200), 5000) + "px";
    if (e.data.type === "plans:subscribe") dispatchEvent(new CustomEvent("plans:subscribe", { detail: { site: String(e.data.site), plan: String(e.data.plan) } }));
  });
})();
