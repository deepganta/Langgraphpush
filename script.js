const revealNodes = [...document.querySelectorAll('.reveal')];
const nav = document.querySelector('#primary-nav');
const navToggle = document.querySelector('.nav-toggle');
const navLinks = [...document.querySelectorAll('#primary-nav a[href^="#"]')];
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);
const counters = [...document.querySelectorAll('.count[data-target]')];
const scrollBar = document.querySelector('#scroll-bar');
const filterButtons = [...document.querySelectorAll('.filter-btn[data-filter]')];
const projectCards = [...document.querySelectorAll('.project-card[data-tag]')];

const interactiveSelectors = [
  '.panel',
  '.hero-card',
  '.quick-facts li',
  '.meta-list li',
  '.timeline article',
  '.cards article'
];
document.querySelectorAll(interactiveSelectors.join(',')).forEach((node) => {
  node.classList.add('interactive-block', 'reactive-card');
});
const reactiveCards = [...document.querySelectorAll('.reactive-card')];
const skillLogos = [...document.querySelectorAll('.skill-icons img')];

if (navToggle && nav) {
  navToggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });

  document.addEventListener('click', (event) => {
    if (!nav.classList.contains('open')) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest('.nav-wrap')) return;
    nav.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
}

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    });
  },
  { threshold: 0.12 }
);

revealNodes.forEach((node, i) => {
  node.style.transitionDelay = `${Math.min(i * 55, 320)}ms`;
  revealObserver.observe(node);
});

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const id = `#${entry.target.id}`;
      navLinks.forEach((link) => {
        link.classList.toggle('active', link.getAttribute('href') === id);
      });
    });
  },
  { rootMargin: '-38% 0px -50% 0px', threshold: 0.05 }
);

sections.forEach((section) => sectionObserver.observe(section));

const animateCounter = (node) => {
  const target = Number(node.dataset.target || '0');
  if (!target) return;
  const duration = 1250;
  const start = performance.now();
  const format = new Intl.NumberFormat();

  const frame = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const value = Math.floor(progress * target);
    node.textContent = format.format(value);
    if (progress < 1) requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);
};

const counterObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      animateCounter(entry.target);
      counterObserver.unobserve(entry.target);
    });
  },
  { threshold: 0.65 }
);

counters.forEach((counter) => counterObserver.observe(counter));

const updateScrollBar = () => {
  if (!scrollBar) return;
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const pct = max <= 0 ? 0 : (scrollTop / max) * 100;
  scrollBar.style.width = `${Math.min(100, Math.max(0, pct))}%`;
};

window.addEventListener('scroll', updateScrollBar, { passive: true });
window.addEventListener('resize', updateScrollBar);
updateScrollBar();

if (filterButtons.length && projectCards.length) {
  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter || 'all';
      filterButtons.forEach((btn) => btn.classList.toggle('is-active', btn === button));
      projectCards.forEach((card) => {
        const tag = card.dataset.tag || '';
        const visible = filter === 'all' || tag === filter;
        card.classList.toggle('is-hidden', !visible);
      });
    });
  });
}

if (skillLogos.length) {
  const fallbackLogo = 'https://cdn.simpleicons.org/openai/FFFFFF';
  skillLogos.forEach((logo) => {
    logo.addEventListener('error', () => {
      if (logo.src !== fallbackLogo) {
        logo.src = fallbackLogo;
      } else {
        logo.style.display = 'none';
      }
    });
  });
}

const hasFinePointer = window.matchMedia('(pointer:fine)').matches;
if (hasFinePointer && reactiveCards.length) {
  reactiveCards.forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const nx = x / rect.width;
      const ny = y / rect.height;
      const rx = ((0.5 - ny) * 9.5).toFixed(2);
      const ry = ((nx - 0.5) * 11.5).toFixed(2);
      card.style.setProperty('--rx', `${rx}deg`);
      card.style.setProperty('--ry', `${ry}deg`);
      card.style.setProperty('--tx', '-6px');
      card.style.setProperty('--mx', `${(nx * 100).toFixed(2)}%`);
      card.style.setProperty('--my', `${(ny * 100).toFixed(2)}%`);
    });

    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
      card.style.setProperty('--tx', '0px');
      card.style.setProperty('--mx', '50%');
      card.style.setProperty('--my', '50%');
    });
  });
}

const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();
