const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ===== SPLIT HERO NAME INTO LETTERS ===== */
document.querySelectorAll('.split').forEach((el, lineIndex) => {
    const text = el.textContent;
    el.textContent = '';
    [...text].forEach((ch, i) => {
        const span = document.createElement('span');
        span.className = 'char';
        span.textContent = ch;
        span.style.transitionDelay = `${lineIndex * 250 + i * 45}ms`;
        el.appendChild(span);
    });
});

/* ===== PRELOADER ===== */
const loader = document.getElementById('loader');
const loaderBar = loader.querySelector('.loader-bar span');
let progress = 0;

const loaderTimer = setInterval(() => {
    progress = Math.min(progress + Math.random() * 18, 92);
    loaderBar.style.width = progress + '%';
}, 120);

function finishLoading() {
    clearInterval(loaderTimer);
    loaderBar.style.width = '100%';
    setTimeout(() => {
        loader.classList.add('done');
        document.body.classList.remove('is-loading');
        document.body.classList.add('loaded');
        startTyping();
    }, 350);
}

let loadingFinished = false;
function finishOnce() {
    if (loadingFinished) return;
    loadingFinished = true;
    finishLoading();
}

window.addEventListener('load', () => setTimeout(finishOnce, reduceMotion ? 0 : 900));
setTimeout(finishOnce, 3000); // never keep the visitor waiting too long

/* ===== TYPEWRITER ===== */
const roles = [
    'Computer Technology Student',
    'Trainee Developer',
    'Backend Enthusiast',
    'Hackathon Runner-Up',
];
const typedEl = document.querySelector('.typed');

function startTyping() {
    if (reduceMotion) {
        typedEl.textContent = roles[0];
        return;
    }
    let roleIndex = 0;
    let charIndex = 0;
    let deleting = false;

    (function tick() {
        const role = roles[roleIndex];
        charIndex += deleting ? -1 : 1;
        typedEl.textContent = role.slice(0, charIndex);

        let delay = deleting ? 40 : 85;
        if (!deleting && charIndex === role.length) {
            deleting = true;
            delay = 1800;
        } else if (deleting && charIndex === 0) {
            deleting = false;
            roleIndex = (roleIndex + 1) % roles.length;
            delay = 400;
        }
        setTimeout(tick, delay);
    })();
}

/* ===== TEXT SCRAMBLE (hacker effect) ===== */
const glyphs = '!<>-_\\/[]{}=+*^?#01';

function scramble(el) {
    if (reduceMotion || el.dataset.scrambled) return;
    el.dataset.scrambled = 'true';
    const finalText = el.textContent;
    const duration = Math.min(40 + finalText.length * 1.5, 70); // frames
    let frame = 0;

    (function update() {
        const revealed = Math.floor((frame / duration) * finalText.length);
        el.textContent = [...finalText].map((ch, i) => {
            if (i < revealed || ch === ' ') return ch;
            return glyphs[Math.floor(Math.random() * glyphs.length)];
        }).join('');
        if (frame++ < duration) requestAnimationFrame(update);
        else el.textContent = finalText;
    })();
}

/* ===== COUNTERS ===== */
function countUp(el) {
    const target = Number(el.dataset.count);
    const decimals = Number(el.dataset.decimals || 0);
    if (reduceMotion) {
        el.textContent = target.toFixed(decimals);
        return;
    }
    const start = performance.now();
    const duration = 1400;
    (function step(now) {
        const t = Math.min((now - start) / duration, 1);
        el.textContent = (target * (1 - Math.pow(1 - t, 3))).toFixed(decimals);
        if (t < 1) requestAnimationFrame(step);
    })(start);
}

/* ===== SCROLL REVEAL ===== */
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const delay = Number(el.dataset.delay || 0);

        setTimeout(() => {
            el.classList.add('visible');
            el.querySelectorAll('.scramble').forEach(scramble);
            el.querySelectorAll('[data-count]').forEach(countUp);
        }, delay);

        revealObserver.unobserve(el);
    });
}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

// hero items wait for the preloader before revealing
function observeReveals() {
    document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));
}
if (document.body.classList.contains('loaded')) observeReveals();
else new MutationObserver((_, obs) => {
    if (document.body.classList.contains('loaded')) {
        obs.disconnect();
        observeReveals();
    }
}).observe(document.body, { attributes: true, attributeFilter: ['class'] });

/* ===== 3D TILT + SPOTLIGHT ===== */
if (finePointer && !reduceMotion) {
    document.querySelectorAll('.tilt').forEach((el) => {
        el.addEventListener('mousemove', (e) => {
            if (el.classList.contains('reveal') && !el.classList.contains('visible')) return;
            const rect = el.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            el.style.transform =
                `perspective(900px) rotateX(${(0.5 - y) * 14}deg) rotateY(${(x - 0.5) * 14}deg) scale(1.02)`;
            el.style.setProperty('--mx', `${x * 100}%`);
            el.style.setProperty('--my', `${y * 100}%`);
        });
        el.addEventListener('mouseleave', () => {
            el.style.transform = '';
        });
    });
}

/* ===== MAGNETIC BUTTONS ===== */
if (finePointer && !reduceMotion) {
    document.querySelectorAll('.magnetic').forEach((btn) => {
        const label = btn.querySelector('span');
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            btn.style.transform = `translate(${x * 0.3}px, ${y * 0.4}px)`;
            if (label) label.style.transform = `translate(${x * 0.15}px, ${y * 0.2}px)`;
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = '';
            if (label) label.style.transform = '';
        });
    });
}

/* ===== CUSTOM CURSOR ===== */
if (finePointer && !reduceMotion) {
    const dot = document.querySelector('.cursor-dot');
    const ring = document.querySelector('.cursor-ring');
    let mouseX = innerWidth / 2, mouseY = innerHeight / 2;
    let ringX = mouseX, ringY = mouseY;

    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
    });

    (function followRing() {
        ringX += (mouseX - ringX) * 0.15;
        ringY += (mouseY - ringY) * 0.15;
        ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
        requestAnimationFrame(followRing);
    })();

    document.querySelectorAll('a, button, .tilt, .chip, input, textarea').forEach((el) => {
        el.addEventListener('mouseenter', () => ring.classList.add('hover'));
        el.addEventListener('mouseleave', () => ring.classList.remove('hover'));
    });
} else {
    document.querySelector('.cursor-dot').remove();
    document.querySelector('.cursor-ring').remove();
}

/* ===== PARTICLE NETWORK BACKGROUND ===== */
(function particles() {
    const canvas = document.getElementById('bg-canvas');
    const ctx = canvas.getContext('2d');
    const mouse = { x: -9999, y: -9999 };
    let points = [];
    let width, height;

    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = innerWidth;
        height = innerHeight;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const count = Math.min(Math.floor((width * height) / 16000), 90);
        points = Array.from({ length: count }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
        }));
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);

        for (const p of points) {
            if (!reduceMotion) {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0 || p.x > width) p.vx *= -1;
                if (p.y < 0 || p.y > height) p.vy *= -1;

                // gently push particles away from the cursor
                const dx = p.x - mouse.x, dy = p.y - mouse.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 120) {
                    p.x += (dx / dist) * 1.5;
                    p.y += (dy / dist) * 1.5;
                }
            }
            ctx.fillStyle = 'rgba(139, 92, 246, 0.7)';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
            ctx.fill();
        }

        for (let i = 0; i < points.length; i++) {
            for (let j = i + 1; j < points.length; j++) {
                const a = points[i], b = points[j];
                const dist = Math.hypot(a.x - b.x, a.y - b.y);
                if (dist < 130) {
                    ctx.strokeStyle = `rgba(34, 211, 238, ${0.18 * (1 - dist / 130)})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                }
            }
        }

        if (!reduceMotion) requestAnimationFrame(draw);
    }

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
    resize();
    draw();
})();

/* ===== SCROLL: PROGRESS BAR, NAV HIDE, PARALLAX BLOBS ===== */
const progressBar = document.querySelector('.scroll-progress');
const navbar = document.querySelector('.navbar');
const blobs = document.querySelectorAll('.blob');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const y = scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    progressBar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

    const menuOpen = document.querySelector('.nav-links').classList.contains('open');
    navbar.classList.toggle('hidden', y > lastScroll && y > 300 && !menuOpen);
    lastScroll = y;

    if (!reduceMotion) {
        blobs.forEach((blob, i) => {
            blob.style.translate = `0 ${y * (0.1 + i * 0.08)}px`;
        });
    }
}, { passive: true });

/* ===== ACTIVE NAV LINK ===== */
const navLinks = document.querySelectorAll('.nav-links a');
const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => {
            link.classList.toggle('active', link.getAttribute('href') === '#' + entry.target.id);
        });
    });
}, { rootMargin: '-45% 0px -50% 0px' });

document.querySelectorAll('main section[id]').forEach((s) => sectionObserver.observe(s));

/* ===== MOBILE MENU ===== */
const menuToggle = document.querySelector('.menu-toggle');
const navList = document.querySelector('.nav-links');

menuToggle.addEventListener('click', () => {
    menuToggle.classList.toggle('open');
    navList.classList.toggle('open');
});

navLinks.forEach((link) => link.addEventListener('click', () => {
    menuToggle.classList.remove('open');
    navList.classList.remove('open');
}));

/* ===== CONTACT FORM (opens the visitor's email app) ===== */
document.querySelector('.contact-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const message = document.getElementById('message').value.trim();
    const to = document.querySelector('.email-link').getAttribute('href').replace('mailto:', '');

    const subject = encodeURIComponent(`Portfolio message from ${name}`);
    const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;

    const label = e.target.querySelector('button span');
    label.textContent = 'Opening mail app ✓';
    setTimeout(() => { label.textContent = 'Send Message ➜'; }, 3000);
});
