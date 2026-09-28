  /* ─── CANVAS BACKGROUND ANIMATION ─── */
  (function () {
    const canvas = document.getElementById('bg-canvas');
    const ctx    = canvas.getContext('2d');

    const COLORS = [
      'rgb(8,10,26)',
      'rgb(14,8,32)',
      'rgb(5,7,18)',
    ];

    /* Orbs / blobs that drift diagonally */
    const orbs = [];
    const NUM_ORBS = 9;

    function rand(min, max) { return Math.random() * (max - min) + min; }

    function createOrb(w, h) {
      return {
        x:       rand(0, w),
        y:       rand(0, h),
        r:       rand(180, 420),
        dx:      rand(0.18, 0.45) * (Math.random() < 0.5 ? 1 : -1),
        dy:      rand(0.12, 0.32) * (Math.random() < 0.5 ? 1 : -1),
        /* neon palette */
        hue:     Math.random() < 0.55 ? 220 : 270,
        alpha:   rand(0.018, 0.055),
      };
    }

    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function init() {
      resize();
      orbs.length = 0;
      for (let i = 0; i < NUM_ORBS; i++) {
        orbs.push(createOrb(canvas.width, canvas.height));
      }
    }

    function draw() {
      const w = canvas.width, h = canvas.height;

      /* base gradient */
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0,    COLORS[0]);
      grad.addColorStop(0.45, COLORS[1]);
      grad.addColorStop(1,    COLORS[2]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      /* neon orbs */
      orbs.forEach(o => {
        const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
        g.addColorStop(0,   `hsla(${o.hue},85%,65%,${o.alpha})`);
        g.addColorStop(0.5, `hsla(${o.hue},75%,50%,${o.alpha * 0.4})`);
        g.addColorStop(1,   `hsla(${o.hue},70%,40%,0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
        ctx.fill();

        /* diagonal movement */
        o.x += o.dx;
        o.y += o.dy;

        /* wrap around */
        if (o.x < -o.r)  o.x = w + o.r;
        if (o.x > w + o.r) o.x = -o.r;
        if (o.y < -o.r)  o.y = h + o.r;
        if (o.y > h + o.r) o.y = -o.r;
      });

      /* subtle diagonal scan-line shimmer */
      const shimmer = ctx.createLinearGradient(0, 0, w, h);
      shimmer.addColorStop(0,   'rgba(255,255,255,0)');
      shimmer.addColorStop(0.48,'rgba(255,255,255,0.012)');
      shimmer.addColorStop(0.5, 'rgba(255,255,255,0.022)');
      shimmer.addColorStop(0.52,'rgba(255,255,255,0.012)');
      shimmer.addColorStop(1,   'rgba(255,255,255,0)');
      ctx.fillStyle = shimmer;
      ctx.fillRect(0, 0, w, h);

      requestAnimationFrame(draw);
    }

    window.addEventListener('resize', () => {
      resize();
      /* reposition out-of-bounds orbs */
      orbs.forEach(o => {
        if (o.x > canvas.width)  o.x = canvas.width * Math.random();
        if (o.y > canvas.height) o.y = canvas.height * Math.random();
      });
    });

    init();
    draw();
  })();


  /* ─── ACCORDION (bug-free, isolated event delegation) ─── */
  (function () {
    const accordionWrap = document.getElementById('accordion');

    accordionWrap.addEventListener('click', function (e) {
      /* Walk up from click target to find .accordion-trigger */
      const trigger = e.target.closest('.accordion-trigger');
      if (!trigger) return;

      /* Prevent event from being fired twice if nested elements used */
      e.stopPropagation();

      const targetId = trigger.getAttribute('data-target');
      const item     = document.getElementById(targetId);
      if (!item) return;

      const isOpen = item.classList.contains('open');

      /* Toggle current item only — others remain as-is */
      if (isOpen) {
        item.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
      } else {
        item.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });
  })();
document.addEventListener('click', function (e) {
  const downloadBtn = e.target.closest('a[download]');
  if (!downloadBtn) return;

  e.preventDefault();
  const fileUrl = downloadBtn.getAttribute('href');
  const fileName = downloadBtn.getAttribute('download') || 'archivo';

  fetch(fileUrl)
    .then(response => response.blob())
    .then(blob => {
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      a.remove();
    })
    .catch(() => {
      window.location.href = fileUrl;
    });
});