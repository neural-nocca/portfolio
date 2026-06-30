/* ============================================================
   Повільні частинки на нерухомому фоні за вмістом.
   Щоб налаштувати — міняй лише значення в CONFIG нижче.
   ============================================================ */
(function () {
  const CONFIG = {
    color:   "114, 53, 94", // колір частинок у форматі R, G, B (#72355e)
    count:   70,            // скільки частинок на екрані
    minSize: 0.5,           // найменший радіус, px
    maxSize: 4,             // найбільший радіус, px
    speed:   0.22,          // швидкість руху вгору (більше = швидше)
    opacity: 0.7,           // максимальна помітність (0–1)
  };

  const canvas = document.getElementById("bg-particles");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let w, h, particles;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }

  function makeParticle() {
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * (CONFIG.maxSize - CONFIG.minSize) + CONFIG.minSize,
      vx: (Math.random() - 0.5) * 0.12,             // легкий бічний дрейф
      vy: -(Math.random() * CONFIG.speed + 0.04),   // повільно вгору
      a: Math.random() * (CONFIG.opacity - 0.15) + 0.15, // прозорість
    };
  }

  function init() {
    resize();
    particles = Array.from({ length: CONFIG.count }, makeParticle);
  }

  function tick() {
    ctx.clearRect(0, 0, w, h);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;

      // Обгортання по краях, щоб потік не вичерпувався
      if (p.y < -p.r) { p.y = h + p.r; p.x = Math.random() * w; }
      if (p.x < -p.r) p.x = w + p.r;
      if (p.x > w + p.r) p.x = -p.r;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${CONFIG.color}, ${p.a})`;
      ctx.fill();
    }
    requestAnimationFrame(tick);
  }

  window.addEventListener("resize", resize);
  init();
  tick();
})();
