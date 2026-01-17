/**
 * script.js
 * Рефакторинг логики:
 * - меню: открытие/закрытие, ESC
 * - back-to-top
 * - квиз:
 *   * шаг 1 теперь multi-select (как шаг 2)
 *   * переход на следующий шаг только по кнопке "Далее"
 *   * после submit: редирект на thankyou.html
 *   * WhatsApp-отправку убрали (по ТЗ)
 */

(function () {
  "use strict";

  // ===== Helpers
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));

  // ===== Smooth scroll to #top on logo click (extra safety for href="#top")
  // (в большинстве браузеров и так работает, но добавим мягкий UX)
  const brandLink = $(".brand");
  brandLink?.addEventListener("click", (e) => {
    const href = brandLink.getAttribute("href");
    if (href === "#top" || href === "#") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      // закрыть мобильное меню, если было открыто
      setNavOpen(false);
    }
  });

  // ===== Header / Mobile nav
  const burger = $("#burger");
  const drawer = $("#mobileDrawer");

  function setNavOpen(open) {
    document.body.classList.toggle("nav-open", open);
    drawer?.classList.toggle("open", open);
    burger?.setAttribute("aria-expanded", String(open));
  }

  burger?.addEventListener("click", () => {
    const isOpen = document.body.classList.contains("nav-open");
    setNavOpen(!isOpen);
  });

  // Close drawer when clicking a link

  $$(".drawer-link").forEach((a) => {
    a.addEventListener("click", () => setNavOpen(false));
  });

  // Close drawer on hash navigation
  window.addEventListener("hashchange", () => setNavOpen(false), { passive: true });

  // ===== Back to top
  const toTop = $("#toTop");
  const showAt = 600;

  function onScroll() {
    if (!toTop) return;
    const y = window.scrollY || document.documentElement.scrollTop;
    toTop.classList.toggle("show", y > showAt);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  toTop?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  // ===== Quiz modal
  const modal = $("#quizModal");
  const startQuizBtn = $("#startQuiz");
  const closeBtn = $("#closeQuiz");
  const nextBtn = $("#nextBtn");
  const backBtn = $("#backBtn");
  const progressBar = $("#quizProgress");
  const toast = $("#toast");

  const steps = [$("#step1"), $("#step2"), $("#step3")].filter(Boolean);
  let stepIndex = 0;

  const state = {
    projectTypes: new Set(), // шаг 1: multi
    features: new Set(),     // шаг 2: multi
    phone: ""
  };

  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => toast.classList.remove("show"), 2400);
  }

  function renderProgress() {
    const pct = ((stepIndex + 1) / steps.length) * 100;
    if (progressBar) progressBar.style.width = pct + "%";
  }

  function renderStep() {
    steps.forEach((el, i) => el.classList.toggle("active", i === stepIndex));
    renderProgress();

    if (backBtn) backBtn.disabled = stepIndex === 0;
    if (nextBtn) nextBtn.style.display = stepIndex === steps.length - 1 ? "none" : "inline-flex";
  }

  function openQuiz() {
    if (!modal) return;

    // Сброс состояния для "чистого" запуска
    state.projectTypes.clear();
    state.features.clear();
    state.phone = "";

    // Сброс визуального состояния кнопок

    $$(".option-btn").forEach((btn) => btn.setAttribute("aria-pressed", "false"));
    const phone = $("#phone");
    if (phone) phone.value = "";

    stepIndex = 0;

    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");

    // блокируем скролл фона
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    renderStep();
  }

  function closeQuiz() {
    if (!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  }

  startQuizBtn?.addEventListener("click", openQuiz);
  closeBtn?.addEventListener("click", closeQuiz);

  // Close on backdrop click
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) closeQuiz();
  });

  // ESC closes both
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      setNavOpen(false);
      closeQuiz();
    }
  });

  function canGoNext() {
    if (stepIndex === 0 && state.projectTypes.size === 0) return false;
    if (stepIndex === 1 && state.features.size === 0) return false;
    return true;
  }

  function nextStep() {
    if (!canGoNext()) {
      showToast(stepIndex === 0 ? "Выберите хотя бы один тип проекта." : "Выберите хотя бы одну функцию.");
      return;
    }
    stepIndex = Math.min(stepIndex + 1, steps.length - 1);
    renderStep();
    if (stepIndex === 2) $("#phone")?.focus();
  }

  function prevStep() {
    stepIndex = Math.max(stepIndex - 1, 0);
    renderStep();
  }

  nextBtn?.addEventListener("click", nextStep);
  backBtn?.addEventListener("click", prevStep);

  // Option buttons logic (multi-select для групп с data-multi="true")

  $$(".option-btn").forEach((btn) => {
    btn.setAttribute("aria-pressed", "false");

    btn.addEventListener("click", () => {
      const group = btn.getAttribute("data-group");
      const value = btn.getAttribute("data-value") || "";
      const isMulti = btn.getAttribute("data-multi") === "true";

      if (!group) return;

      if (isMulti) {
        const pressed = btn.getAttribute("aria-pressed") === "true";
        btn.setAttribute("aria-pressed", String(!pressed));

        if (group === "projectTypes") {
          if (!pressed) state.projectTypes.add(value);
          else state.projectTypes.delete(value);
        }

        if (group === "features") {
          if (!pressed) state.features.add(value);
          else state.features.delete(value);
        }

        return;
      }

      // single-select (оставили на всякий случай, если появится)

      $$('.option-btn[data-group="' + group + '"]').forEach((b) => b.setAttribute("aria-pressed", "false"));
      btn.setAttribute("aria-pressed", "true");
    });
  });

  // Phone mask (простая, лёгкая)
  const phoneInput = $("#phone");
  function normalizeDigits(s) { return (s || "").replace(/\D/g, ""); }

  phoneInput?.addEventListener("input", () => {
    const digits = normalizeDigits(phoneInput.value);

    let d = digits;
    if (d.startsWith("8")) d = "7" + d.slice(1);
    if (d.startsWith("7")) d = d.slice(1); // оставляем национальную часть

    const p1 = d.slice(0, 3);
    const p2 = d.slice(3, 6);
    const p3 = d.slice(6, 8);
    const p4 = d.slice(8, 10);

    let out = "+7";
    if (p1) out += " (" + p1;
    if (p1.length === 3) out += ")";
    if (p2) out += " " + p2;
    if (p3) out += "-" + p3;
    if (p4) out += "-" + p4;

    phoneInput.value = out;
  });

  // Submit -> redirect to thankyou.html
  const form = $("#quizForm");
  form?.addEventListener("submit", (e) => {
    e.preventDefault();

    const phone = phoneInput ? phoneInput.value.trim() : "";
    const digits = normalizeDigits(phone);

    if (digits.length < 11) {
      showToast("Введите корректный номер телефона.");
      phoneInput?.focus();
      return;
    }

    state.phone = phone;

    // ВАЖНО: пока без отправки данных (будет доработано позже).
    // Редирект на отдельную страницу "Спасибо!"
    window.location.href = "thankyou.html";
  });

})();