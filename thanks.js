// صفحة معلومات فقط: لا تفعّل شيئاً. التفعيل يتم حصراً عبر Webhook موقَّع.
(() => {
  const failed = new URLSearchParams(location.search).get("status") === "failed";
  document.getElementById("ic").textContent = failed ? "!" : "✓";
  document.getElementById("t").textContent = failed ? "لم تكتمل عملية الدفع" : "شكراً لك";
  document.getElementById("d").textContent = failed
    ? "لم يتم خصم أي مبلغ، أو أُلغيت العملية. يمكنك المحاولة من جديد."
    : "إن اكتمل الدفع فسيُفعَّل اشتراكك خلال دقائق. يمكنك العودة إلى الموقع وتحديث الصفحة.";
})();
