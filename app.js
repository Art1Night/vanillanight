/* ================================================================
   VanillaNight · поведение сайта
   Переключение разделов, копирование IP, статус сервера, звёзды.
   Без зависимостей.
   ================================================================ */

(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------ Разделы ------------------------------ */

  const panels = $$("[data-panel]");
  const tabs = $$("[data-tab]");
  const known = new Set(panels.map((p) => p.dataset.panel));

  function currentId() {
    const id = (location.hash || "#home").slice(1);
    return known.has(id) ? id : "home";
  }

  function show(id, opts = {}) {
    if (!known.has(id)) id = "home";

    panels.forEach((p) => {
      p.hidden = p.dataset.panel !== id;
    });

    tabs.forEach((t) => {
      const on = t.dataset.tab === id;
      t.classList.toggle("is-active", on);
      if (t.getAttribute("role") === "tab") t.setAttribute("aria-selected", String(on));
    });

    document.body.dataset.view = id;

    if (opts.scroll !== false) {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    }
    if (opts.focus) {
      const panel = panels.find((p) => p.dataset.panel === id);
      if (panel) {
        panel.setAttribute("tabindex", "-1");
        panel.focus({ preventScroll: true });
      }
    }
  }

  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-tab]");
    if (!trigger) return;
    e.preventDefault();
    const id = trigger.dataset.tab;
    if (location.hash !== "#" + id) {
      location.hash = id;
    } else {
      show(id);
    }
  });

  window.addEventListener("hashchange", () => show(currentId()));

  /* ---------------------------- Копирование ---------------------------- */

  const toast = $("#toast");
  let toastTimer = 0;

  function notify(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 1900);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.cssText = "position:fixed;top:-1000px;opacity:0";
      document.body.appendChild(area);
      area.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (e) {
        ok = false;
      }
      area.remove();
      return ok;
    }
  }

  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-copy]");
    if (!btn) return;
    const text = btn.dataset.copy || "";
    const ok = await copyText(text);
    notify(ok ? "Скопировано: " + text : "Не удалось скопировать — выделите вручную");
    if (ok) {
      btn.classList.add("is-copied");
      setTimeout(() => btn.classList.remove("is-copied"), 900);
    }
  });

  /* ------------------------------- Статус ------------------------------ */

  const ADDRESS = "135.125.188.210:40029";
  const API = "https://api.mcsrvstat.us/3/";
  const pill = $("#statusPill");
  const pillText = $("#statusText");
  const heroStatus = $("#heroStatus");
  const heroOnline = $("#heroOnline");

  function paint(state, text, title) {
    [pill, heroStatus].forEach((el) => {
      if (!el) return;
      el.classList.toggle("is-on", state === "on");
      el.classList.toggle("is-off", state === "off");
    });
    if (pillText) pillText.textContent = text;
    if (heroOnline) heroOnline.textContent = text;
    if (title) {
      if (pill) pill.title = title;
      if (heroStatus) heroStatus.title = title;
    }
  }

  async function refreshStatus() {
    try {
      const res = await fetch(API + ADDRESS, {
        signal: AbortSignal.timeout(6000),
        cache: "no-store",
      });
      const data = await res.json();
      if (data && data.online) {
        const online = data.players && data.players.online != null ? data.players.online : 0;
        const max = data.players && data.players.max != null ? data.players.max : 0;
        const version = data.version ? data.version : "";
        paint("on", online + " / " + max, "Онлайн: " + online + " из " + max + (version ? " · " + version : ""));
      } else {
        paint("off", "оффлайн", "Сервер сейчас недоступен");
      }
    } catch (err) {
      paint("unknown", "статус н/д", "Не удалось получить статус сервера");
    }
  }

  /* ------------------------------- Звёзды ------------------------------ */

  (function stars() {
    const canvas = $("#stars");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let points = [];
    const meteors = [];

    function spawnMeteor() {
      meteors.push({
        x: width * (0.15 + Math.random() * 0.75),
        y: height * (0.05 + Math.random() * 0.35),
        vx: -(2.2 + Math.random() * 2.2),
        vy: 1 + Math.random() * 1.4,
        life: 1,
      });
    }

    function build() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(200, Math.round((width * height) / 11000));
      points = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.05 + 0.25,
        phase: Math.random() * Math.PI * 2,
        speed: 0.35 + Math.random() * 0.9,
      }));
    }

    function draw(time) {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#cfd8ff";
      for (const p of points) {
        const twinkle = 0.5 + 0.5 * Math.sin(time / 2400 * p.speed + p.phase);
        ctx.globalAlpha = 0.18 + 0.55 * twinkle;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (!reduceMotion && Math.random() < 0.002) spawnMeteor();

      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.x += m.vx;
        m.y += m.vy;
        m.life -= 0.012;
        if (m.life <= 0 || m.x < -200 || m.y > height + 200) {
          meteors.splice(i, 1);
          continue;
        }
        const tailX = m.x - m.vx * 10;
        const tailY = m.y - m.vy * 10;
        const grad = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
        grad.addColorStop(0, "rgba(226, 234, 255, " + (0.7 * m.life).toFixed(3) + ")");
        grad.addColorStop(1, "rgba(226, 234, 255, 0)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();
      }
    }

    function loop(time) {
      draw(time);
      if (!reduceMotion) window.requestAnimationFrame(loop);
    }

    let resizeTimer = 0;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        build();
        draw(0);
      }, 160);
    });

    build();
    loop(0);
  })();

  /* --------------------------- Звёзды в hero --------------------------- */

  (function heroStars() {
    const canvas = $("#hero-stars");
    if (!canvas) return;
    const hero = canvas.closest(".hero");
    const ctx = canvas.getContext("2d");
    if (!ctx || !hero) return;

    let width = 0;
    let height = 0;
    let stars = [];
    let mx = 0;
    let my = 0;
    let tx = 0;
    let ty = 0;
    let last = 0;

    function build() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(90, Math.max(36, Math.round((width * height) / 11000)));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.05 + 0.3,
        z: 0.2 + Math.random() * 0.8,
        vx: (Math.random() - 0.5) * 0.14,
        vy: (Math.random() - 0.5) * 0.09,
        a: 0.2 + Math.random() * 0.5,
        p: Math.random() * Math.PI * 2,
      }));
    }

    function draw(time) {
      ctx.clearRect(0, 0, width, height);
      for (const s of stars) {
        if (!reduceMotion) {
          s.x += s.vx;
          s.y += s.vy;
          if (s.x < -4) s.x = width + 4;
          else if (s.x > width + 4) s.x = -4;
          if (s.y < -4) s.y = height + 4;
          else if (s.y > height + 4) s.y = -4;
        }
        const twinkle = reduceMotion ? 1 : 0.75 + 0.25 * Math.sin(time / 1600 + s.p);
        ctx.globalAlpha = Math.min(1, s.a * twinkle);
        ctx.fillStyle = "#cfd8ff";
        ctx.beginPath();
        ctx.arc(s.x + mx * s.z, s.y + my * s.z, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function frame(time) {
      window.requestAnimationFrame(frame);
      if (time - last < 33) return;
      last = time;
      mx += (tx - mx) * 0.05;
      my += (ty - my) * 0.05;
      draw(time);
    }

    hero.addEventListener("pointermove", (e) => {
      const rect = hero.getBoundingClientRect();
      tx = ((e.clientX - rect.left) / rect.width - 0.5) * 42;
      ty = ((e.clientY - rect.top) / rect.height - 0.5) * 28;
    });
    hero.addEventListener("pointerleave", () => {
      tx = 0;
      ty = 0;
    });

    build();
    if (reduceMotion) {
      draw(0);
    } else {
      window.requestAnimationFrame(frame);
    }

    let resizeTimer = 0;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        build();
        if (reduceMotion) draw(0);
      }, 160);
    });
  })();

  /* --------------------------- Появление блоков --------------------------- */

  if (!reduceMotion && "IntersectionObserver" in window) {
    const items = $$(".block, .cta-band, .price, .person, .mods, .media, .founder");
    items.forEach((el) => el.classList.add("reveal"));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -50px 0px" }
    );

    items.forEach((el) => observer.observe(el));
  }

  /* --------------------------- Печать правил --------------------------- */

  const reopened = [];
  window.addEventListener("beforeprint", () => {
    $$("details").forEach((d) => {
      if (!d.open) {
        d.open = true;
        reopened.push(d);
      }
    });
  });
  window.addEventListener("afterprint", () => {
    reopened.forEach((d) => (d.open = false));
    reopened.length = 0;
  });

  /* ------------------------------- Старт ------------------------------- */

  show(currentId(), { scroll: false });
  refreshStatus();
  setInterval(refreshStatus, 60000);
})();
