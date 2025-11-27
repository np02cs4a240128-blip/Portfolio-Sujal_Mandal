/* script.js — Contact handling + EmailJS + animations + other features
   Replace your existing script.js with this file.
   Note: this file also contains other previous features (theme toggle, back-to-top, sliders, etc.)
   If you already have a large script for other features, copy only the contact-related parts instead.
*/

document.addEventListener('DOMContentLoaded', () => {

  /* ---------------- THEME TOGGLE — keep as before ---------------- */
  const THEME_KEY = 'theme';
  const themeBtn = document.getElementById('theme-toggle');
  function applyTheme(t) {
    if (t === 'dark') {
      document.documentElement.classList.add('dark-mode');
      if (themeBtn) themeBtn.textContent = '☀️';
    } else {
      document.documentElement.classList.remove('dark-mode');
      if (themeBtn) themeBtn.textContent = '🌙';
    }
    try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
  }
  (function initTheme(){
    let saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) { saved = null; }
    if (saved === 'dark' || saved === 'light') applyTheme(saved);
    else applyTheme(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  })();
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const isDark = document.documentElement.classList.toggle('dark-mode');
      const val = isDark ? 'dark' : 'light';
      try { localStorage.setItem(THEME_KEY, val); } catch (e) {}
      themeBtn.textContent = isDark ? '☀️' : '🌙';
    });
  }

  /* ---------------- BACK TO TOP (keep as before) ---------------- */
  const backBtn = document.getElementById('back-to-top');
  if (backBtn) {
    window.addEventListener('scroll', () => {
      backBtn.style.display = window.scrollY > 380 ? 'block' : 'none';
      backBtn.style.opacity = window.scrollY > 380 ? '1' : '0';
    });
    backBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  /* ---------------- CONTACT FORM HANDLING ---------------- */
  const form = document.getElementById('contactForm');
  const nameInput = document.getElementById('nameInput');
  const emailInput = document.getElementById('emailInput');
  const messageInput = document.getElementById('messageInput');
  const msgBox = document.getElementById('form-msg');
  const submitBtn = document.getElementById('submitBtn');
  const successOverlay = document.getElementById('submit-success');

  // EmailJS config placeholders — replace with your own
  const EMAILJS_SERVICE_ID = 'YOUR_EMAILJS_SERVICE_ID';
  const EMAILJS_TEMPLATE_ID = 'YOUR_EMAILJS_TEMPLATE_ID';
  const EMAILJS_PUBLIC_KEY = 'YOUR_EMAILJS_PUBLIC_KEY'; // also called userID in older docs

  // Load EmailJS SDK if user configured values (dynamically)
  function loadEmailJSSDK() {
    return new Promise((resolve, reject) => {
      if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
        resolve(false); // not configured
        return;
      }
      if (window.emailjs) { resolve(true); return; }
      const s = document.createElement('script');
      s.src = 'https://cdn.emailjs.com/dist/email.min.js';
      s.onload = () => {
        try {
          emailjs.init(EMAILJS_PUBLIC_KEY);
          resolve(true);
        } catch (e) { console.warn('EmailJS init failed', e); resolve(false); }
      };
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    });
  }

  // simple validators
  function validName(n) { return typeof n === 'string' && n.trim().length >= 2; }
  function validEmail(e) {
    return /^\S+@\S+\.\S+$/.test(e);
  }
  function validMessage(m) { return typeof m === 'string' && m.trim().length >= 6; }

  // show temporary error (shake)
  function showError(message, targetInputs = []) {
    msgBox.textContent = message;
    msgBox.classList.remove('success'); msgBox.classList.add('error');
    // shake form
    form.classList.remove('form-shake');
    void form.offsetWidth; // trigger reflow
    form.classList.add('form-shake');
    // highlight invalid inputs
    targetInputs.forEach(i => {
      i.classList.add('input-error');
      setTimeout(() => i.classList.remove('input-error'), 1200);
    });
  }

  // show success overlay + message
  function showSuccessAndRedirect(storagePayload) {
    msgBox.textContent = 'Message saved and sent (if configured). Redirecting...';
    msgBox.classList.remove('error'); msgBox.classList.add('success');

    // show overlay
    successOverlay.classList.add('show');
    // small delay so user sees animation
    setTimeout(() => {
      successOverlay.classList.remove('show');
      // redirect after 650ms
      window.location.href = "form_details.html";
    }, 900);
    

    // also save to localStorage
    try {
      localStorage.setItem('portfolio_contact', JSON.stringify(storagePayload));
    } catch (e) {
      console.warn('Could not save to localStorage', e);
    }
  }

  // handle form submit
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      // clear previous
      msgBox.textContent = ''; msgBox.classList.remove('error', 'success');

      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const message = messageInput.value.trim();

      // validation
      const badFields = [];
      if (!validName(name)) badFields.push(nameInput);
      if (!validEmail(email)) badFields.push(emailInput);
      if (!validMessage(message)) badFields.push(messageInput);

      if (badFields.length) {
        showError('Please fill valid Name, Email and Message (min lengths).', badFields);
        return;
      }

      // build payload
      const payload = { name, email, message, submittedAt: new Date().toISOString() };

      // show spinner + disable button
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;

      // always save to localStorage (for form-details page)
      try { localStorage.setItem('portfolio_contact', JSON.stringify(payload)); } catch (err){ console.warn(err); }

      // try to send via EmailJS if configured
      const sdkLoaded = await loadEmailJSSDK();
      if (sdkLoaded && window.emailjs) {
        // prepare template params (adjust keys to your EmailJS template variables)
        const templateParams = {
          from_name: name,
          from_email: email,
          message_html: message
        };
        try {
          await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
          // success
          submitBtn.classList.remove('loading');
          submitBtn.disabled = false;
          showSuccessAndRedirect(payload);
          return;
        } catch (err) {
          console.warn('EmailJS send error', err);
          // fallthrough to show local success and inform user
          msgBox.textContent = 'Saved locally but sending failed. You can still view data on next page.';
          msgBox.classList.add('error');
          submitBtn.classList.remove('loading');
          submitBtn.disabled = false;
          // redirect anyway after short delay
          setTimeout(() => { window.location.href = 'form_details.html'; }, 900);
          return;
        }
      } else {
        // EmailJS not configured — behave gracefully: show success, redirect
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        showSuccessAndRedirect(payload);
        return;
      }
    });
  }

  /* ---------------- SKILL BARS + REVEAL (reuse earlier logic) ---------------- */
  (function skillBarsAndReveal() {
    const bars = document.querySelectorAll('.skill-bar');
    if ('IntersectionObserver' in window && bars.length) {
      const obs = new IntersectionObserver((entries, o) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const bar = entry.target;
            const pct = bar.dataset.percent || '70';
            const fill = bar.querySelector('.skill-fill');
            if (fill) fill.style.width = pct + '%';
            o.unobserve(bar);
          }
        });
      }, { threshold: 0.35 });
      bars.forEach(b => obs.observe(b));
    } else {
      bars.forEach(b => { const f = b.querySelector('.skill-fill'); if (f) f.style.width = (b.dataset.percent || '70') + '%'; });
    }

    // reveal-on-scroll for sections / media / portfolio grid
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
        }
      });
    }, { threshold: 0.18 });

    document.querySelectorAll('.animate-on-scroll').forEach(el => io.observe(el));
    document.querySelectorAll('.media-block').forEach(el => io.observe(el));
    document.querySelectorAll('.portfolio-grid').forEach(el => io.observe(el));
  })();

  /* ---------------- CLICKABLE PORTFOLIO CARDS (if any data-url) ---------------- */
  document.querySelectorAll('.portfolio-card').forEach(card => {
    const url = card.dataset.url;
    card.setAttribute('tabindex', '0');
    card.addEventListener('click', () => { if (url) window.location.href = url; });
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') card.click(); });
  });

  /* ---------------- SLIDER & MEDIA small UX (kept simple) ---------------- */
  (function sliderInit(){
    const slides = Array.from(document.querySelectorAll('.slides img'));
    if (!slides.length) return;
    let idx = slides.findIndex(s => s.classList.contains('active'));
    if (idx < 0) idx = 0;
    const prev = document.querySelector('.prev'), next = document.querySelector('.next');
    function show(i){ slides.forEach(s=>s.classList.remove('active')); slides[((i%slides.length)+slides.length)%slides.length].classList.add('active'); }
    show(idx);
    if (prev) prev.addEventListener('click', ()=>{ idx = (idx-1+slides.length)%slides.length; show(idx); });
    if (next) next.addEventListener('click', ()=>{ idx = (idx+1)%slides.length; show(idx); });
  })();

  /* ---------------- CANVAS demo redraw on theme change ---------------- */
  (function canvasDemo() {
    const c = document.getElementById('demo-canvas'); if (!c) return;
    const ctx = c.getContext('2d');
    function draw() {
      const dark = document.documentElement.classList.contains('dark-mode');
      ctx.fillStyle = dark ? '#071022' : '#f5f8ff';
      ctx.fillRect(0,0,c.width,c.height);
      ctx.fillStyle = dark ? '#e6eef8' : '#1f2937';
      ctx.font = '16px Poppins, sans-serif';
      ctx.fillText('Canvas demo — quick sketch', 12, 28);
      ctx.beginPath(); ctx.arc(c.width-50,40,30,0,Math.PI*2); ctx.fillStyle = '#4b7bec'; ctx.fill();
    }
    draw();
    const mo = new MutationObserver(draw);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  })();

  /* ---------------- SMOOTH NAV LINK SCROLL ---------------- */
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (!href || href[0] !== '#') return;
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

});
