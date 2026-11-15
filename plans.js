// صفحة الباقات العامة. تقرأ بالمفتاح العام (anon) فقط، ولا تحفظ أي جلسة.
// كل النصوص تُدرج بـ textContent، والألوان والروابط تُتحقق بصرامة قبل استعمالها.
(() => {
  "use strict";
  const Q = new URLSearchParams(location.search);
  const EMBED = Q.get("embed") === "1";
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const HEX = /^#[0-9a-f]{6}$/i, HTTPS = /^https:\/\/[^\s"'<>()\\]+$/i;
  const UNIT = { day: "يوم", month: "شهر", year: "سنة" };
  const UNIT_LBL = { document: "مستند", party: "جهة", employee: "موظف", account: "حساب", file: "ملف" };
  const RESET = { day: "يومياً", month: "شهرياً", never: "دائم", subscription: "" };
  const NS = "http://www.w3.org/2000/svg";
  const app = document.getElementById("app");
  if (EMBED) document.body.classList.add("embed");

  const h = (tag, cls, ...kids) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    kids.flat().forEach((k) => { if (k != null && k !== false) el.append(k instanceof Node ? k : String(k)); });
    return el;
  };
  const ic = (n) => {
    const s = document.createElementNS(NS, "svg"), u = document.createElementNS(NS, "use");
    s.setAttribute("class", "ic"); s.setAttribute("aria-hidden", "true"); u.setAttribute("href", "#i-" + n); s.append(u); return s;
  };
  const num = (n) => Number(n).toLocaleString("en-US");
  const msg = (text, bad) => app.replaceChildren(h("div", "msg" + (bad ? " bad" : ""), text));
  const toast = (t) => { const x = h("div", "toast", t); x.setAttribute("role", "status"); document.body.append(x); setTimeout(() => x.remove(), 4000); };

  function sendHeight() {
    if (!EMBED || parent === window) return;
    parent.postMessage({ type: "plans:height", height: Math.ceil(document.documentElement.getBoundingClientRect().height) }, "*");
  }


  // ---- نموذج الاشتراك: يطلب رابط الدفع من الخادم ثم ينتقل إليه (لا تفعيل من هنا) ----
  function checkout(plan, siteId, title, top, grid, finalPrice) {
    const f = (id, label, type, extra = {}) => { const i = h("input"); i.id = id; i.type = type; Object.assign(i, extra); return [h("label", "", label), i]; };
    const [ln, name] = f("fn", "الاسم الكامل", "text", { maxLength: 160, autocomplete: "name" });
    const [le, email] = f("fe", "البريد الإلكتروني", "email", { autocomplete: "email" }); email.dir = "ltr";
    const [lp, phone] = f("fp", "الهاتف (اختياري)", "tel", { autocomplete: "tel" }); phone.dir = "ltr";
    const err = h("p", "err"); err.setAttribute("role", "alert");
    const go = h("button"); go.type = "button"; go.textContent = "المتابعة إلى الدفع";
    const back = h("button", "ghost"); back.type = "button"; back.textContent = "رجوع";
    back.addEventListener("click", () => { app.replaceChildren(top, grid); sendHeight(); });
    const hint = h("p", "d", "استعمل نفس بريد Google الذي تدخل به إلى الموقع، ليرتبط اشتراكك بحسابك.");
    const box = h("div", "plan form", h("h2", "", "الاشتراك في «" + plan.name + "»"),
      h("p", "d", num(finalPrice) + " " + plan.currency), ln, name, le, email, lp, phone, hint, err, go, back);
    app.replaceChildren(top, box); sendHeight();
    const EM = /^[^@\s]+@[^@\s]+\.[^@\s]+$/, PH = /^[0-9+\s-]{6,20}$/;
    const MSG = { rate_limited: "محاولات كثيرة. حاول بعد قليل.", gateway_error: "تعذّر إنشاء عملية الدفع. حاول لاحقاً.",
      gateway_unreachable: "بوابة الدفع غير متاحة الآن. حاول لاحقاً.", price_not_payable: "هذه الباقة غير قابلة للدفع الإلكتروني حالياً.",
      currency_not_supported: "عملة الباقة غير مدعومة في الدفع الإلكتروني.", plan_unavailable: "هذه الباقة لم تعد متاحة.", site_unavailable: "هذا الموقع غير متاح." };
    go.addEventListener("click", async () => {
      err.textContent = "";
      if (name.value.trim().length < 2) return (err.textContent = "اكتب اسمك الكامل.");
      if (!EM.test(email.value.trim())) return (err.textContent = "البريد الإلكتروني غير صالح.");
      if (phone.value.trim() && !PH.test(phone.value.trim())) return (err.textContent = "رقم الهاتف غير صالح.");
      go.disabled = true; go.textContent = "جارٍ التجهيز…";
      try {
        const r = await fetch(CONFIG.SUPABASE_URL + "/functions/v1/create-checkout", {
          method: "POST", headers: { "Content-Type": "application/json", apikey: CONFIG.SUPABASE_KEY },
          body: JSON.stringify({ site_id: siteId, plan_id: plan.id, full_name: name.value.trim(), email: email.value.trim(), phone: phone.value.trim() }) });
        const d = await r.json().catch(() => ({}));
        if (!r.ok || !d.checkout_url || !/^https:\/\//.test(d.checkout_url)) throw new Error(MSG[d.error] || "تعذّر بدء الدفع. حاول لاحقاً.");
        if (EMBED && parent !== window) {
          const a = h("a", "btn-link", "الذهاب إلى صفحة الدفع"); a.href = d.checkout_url; a.target = "_top"; a.rel = "noopener";
          go.replaceWith(a); back.remove(); sendHeight();
        } else location.href = d.checkout_url;
      } catch (e) { err.textContent = e.message; go.disabled = false; go.textContent = "المتابعة إلى الدفع"; }
    });
  }

  async function main() {
    const siteId = Q.get("site") || "";
    if (!UUID.test(siteId)) return msg("رابط غير صالح: معرّف الموقع مفقود.", true);
    if (!window.CONFIG || !window.supabase) return msg("تعذّر تحميل الصفحة.", true);
    const sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });

    const [s, p, f, pf] = await Promise.all([
      sb.from("sites").select("id,name,branding").eq("id", siteId).maybeSingle(),
      sb.from("plans").select("id,name,description,price,currency,duration_value,duration_unit,discount_type,final_price").eq("site_id", siteId).eq("is_active", true).order("sort_order"),
      sb.from("features").select("id,label,kind,unit,sort_order").eq("site_id", siteId).eq("is_active", true).order("sort_order"),
      sb.from("plan_features").select("plan_id,feature_id,limit_value,reset_period").eq("site_id", siteId)]);
    if (s.error || p.error || f.error || pf.error) return msg("تعذّر تحميل الباقات. حاول لاحقاً.", true);
    if (!s.data) return msg("هذا الموقع غير متاح حالياً.", true);

    const b = (s.data.branding && typeof s.data.branding === "object") ? s.data.branding : {};
    if (typeof b.primary_color === "string" && HEX.test(b.primary_color)) {
      document.documentElement.style.setProperty("--pr", b.primary_color);
      document.documentElement.style.setProperty("--pr2", "color-mix(in srgb," + b.primary_color + " 70%, #7c5cff)");
    }
    const title = typeof b.display_name === "string" && b.display_name.trim() ? b.display_name.trim().slice(0, 80) : s.data.name;
    document.title = "باقات " + title;

    const top = h("div", "top");
    if (typeof b.logo_url === "string" && HTTPS.test(b.logo_url)) {
      const img = h("img"); img.alt = ""; img.referrerPolicy = "no-referrer"; img.src = b.logo_url; img.addEventListener("error", () => img.remove()); top.append(img);
    }
    top.append(h("div", "", h("h1", "", title), h("p", "", "اختر الباقة المناسبة لك")));

    if (!p.data.length) { app.replaceChildren(top, h("div", "msg", "لا توجد باقات متاحة حالياً.")); return sendHeight(); }

    const pfMap = new Map(pf.data.map((r) => [r.plan_id + ":" + r.feature_id, r]));
    const grid = h("div", "grid");
    for (const plan of p.data) {
      const disc = plan.discount_type !== "none" && Number(plan.final_price) < Number(plan.price);
      const price = h("div", "price", (() => { const b2 = h("b", "", num(disc ? plan.final_price : plan.price) + " " + plan.currency); b2.dir = "ltr"; return b2; })(),
        disc && h("s", "", num(plan.price)), h("span", "", "/ " + (plan.duration_value > 1 ? plan.duration_value + " " : "") + UNIT[plan.duration_unit]));
      const list = h("ul");
      for (const ft of f.data) {
        const r = pfMap.get(plan.id + ":" + ft.id);
        let extra = "";
        if (r && ft.kind === "limit") {
          const u = UNIT_LBL[ft.unit] || ft.unit || "", rs = RESET[r.reset_period] || "";
          extra = r.limit_value === null ? "غير محدود" : num(r.limit_value) + " " + u + (rs ? " " + rs : "");
        }
        list.append(h("li", r ? "" : "no", ic(r ? "check" : "x"), h("span", "", ft.label, extra && " ", extra && h("small", "", "(" + extra + ")"))));
      }
      const buy = h("button"); buy.type = "button"; buy.textContent = "اشترك";
      buy.addEventListener("click", () => checkout(plan, siteId, title, top, grid, disc ? plan.final_price : plan.price));
      grid.append(h("article", "plan", h("h2", "", plan.name), plan.description && h("p", "d", plan.description),
        price, disc && h("span", "off", "تخفيض"), list, buy));
    }
    app.replaceChildren(top, grid);
    sendHeight();
  }

  main().catch(() => msg("تعذّر تحميل الباقات.", true));
  if (EMBED && "ResizeObserver" in window) new ResizeObserver(sendHeight).observe(document.body);
})();
