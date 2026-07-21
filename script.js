// Lenis Smooth Scroll
if (typeof Lenis !== "undefined" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const lenis = new Lenis({
        duration: 1.2,
        easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
    });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    window._lenis = lenis;
}


// Scroll Reveal
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.08 });

document.querySelectorAll(".reveal").forEach(el => revealObserver.observe(el));


// Dot Grid Mouse Glow
document.addEventListener("mousemove", (e) => {
    document.documentElement.style.setProperty("--mouse-x", e.clientX + "px");
    document.documentElement.style.setProperty("--mouse-y", e.clientY + "px");
});


// Dynamic Navbar Offset
const navbar = document.querySelector(".navbar");
const sections = document.querySelector(".sections");

function syncOffsets() {
    if (navbar && sections) {
        sections.style.paddingTop = navbar.offsetHeight + "px";
        document.documentElement.style.setProperty("--navbar-height", navbar.offsetHeight + "px");
    }
}

syncOffsets();
document.fonts.ready.then(syncOffsets);

let _resizeTimer;
window.addEventListener("resize", () => {
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(syncOffsets, 100);
}, { passive: true });


// Navbar Menu
(function () {
    const toggle = document.getElementById("navMenuToggle");
    const dropdown = document.getElementById("navMenuDropdown");
    if (!toggle || !dropdown) return;

    function open() {
        toggle.classList.add("is-open");
        dropdown.classList.add("is-open");
        toggle.setAttribute("aria-expanded", "true");
        dropdown.setAttribute("aria-hidden", "false");
    }

    function close() {
        toggle.classList.remove("is-open");
        dropdown.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        dropdown.setAttribute("aria-hidden", "true");
    }

    toggle.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdown.classList.contains("is-open") ? close() : open();
    });

    document.addEventListener("click", (e) => {
        if (!dropdown.contains(e.target)) close();
    });

    dropdown.querySelectorAll(".nav-menu-item").forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            close();
            const target = document.querySelector(link.getAttribute("href"));
            if (!target) return;
            if (window._lenis) {
                const offset = -(navbar ? navbar.offsetHeight : 71);
                window._lenis.scrollTo(target, { offset, duration: 2.8 });
            } else {
                target.scrollIntoView({ behavior: "smooth" });
            }
        });
    });
})();


// Theme Toggle
const themeToggle = document.getElementById("themeToggle");

function applyTheme(next, originEl) {
    const root = document.documentElement;
    const themeMetas = document.querySelectorAll('meta[name="theme-color"]');
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function commit() {
        root.setAttribute("data-theme", next);
        themeMetas.forEach((m) => m.setAttribute("content", next === "light" ? "#F2ECE4" : "#141414"));
        try { localStorage.setItem("theme", next); } catch (e) { }
    }

    if (reduceMotion) {
        root.classList.add("theme-transition");
        commit();
        window.setTimeout(() => root.classList.remove("theme-transition"), 400);
        return;
    }

    const rect = originEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const dx = Math.max(cx, window.innerWidth - cx);
    const dy = Math.max(cy, window.innerHeight - cy);
    const radius = Math.ceil(Math.sqrt(dx * dx + dy * dy));

    if (document.startViewTransition) {
        const duration = 500;
        const allToggles = document.querySelectorAll(".theme-toggle");

        allToggles.forEach(el => el.classList.add("theme-toggle--icon-hidden"));

        const transition = document.startViewTransition(() => { commit(); });

        transition.ready.then(() => {
            document.documentElement.animate(
                { clipPath: [`circle(0px at ${cx}px ${cy}px)`, `circle(${radius}px at ${cx}px ${cy}px)`] },
                { duration, easing: "ease-in-out", pseudoElement: "::view-transition-new(root)" }
            );

            allToggles.forEach(el => {
                const r = el.getBoundingClientRect();
                const bx = r.left + r.width / 2;
                const by = r.top + r.height / 2;
                const dist = Math.sqrt((bx - cx) ** 2 + (by - cy) ** 2);
                const delay = Math.max(0, (dist / radius) * duration - 30);
                setTimeout(() => {
                    el.classList.remove("theme-toggle--icon-hidden");
                }, delay);
            });
        });

        return;
    }

    const overlay = document.createElement("div");
    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 9999;
        pointer-events: none;
        background: ${next === "dark" ? "#141414" : "#F2ECE4"};
        clip-path: circle(0px at ${cx}px ${cy}px);
    `;
    document.body.appendChild(overlay);

    const anim = overlay.animate(
        { clipPath: [`circle(0px at ${cx}px ${cy}px)`, `circle(${radius}px at ${cx}px ${cy}px)`] },
        { duration: 500, easing: "ease-in-out", fill: "forwards" }
    );

    anim.onfinish = () => { commit(); overlay.remove(); };
}

if (themeToggle) {
    themeToggle.addEventListener("click", () => {
        const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
        applyTheme(next, themeToggle);
    });
}


// Circular Color Reveal on Profile Image
(function () {
    const svg = document.querySelector(".hero-pfp-svg");
    const circle = document.getElementById("color-circle");
    if (!svg || !circle) return;

    const MAX_R = Math.sqrt(75 * 75 + 160 * 160) + 10;
    const DURATION = 650;
    const easeOut = t => 1 - Math.pow(1 - t, 3);

    let raf = null, startTime = null, fromR = 0, toR = 0;

    function animate(ts) {
        if (startTime === null) startTime = ts;
        const p = Math.min((ts - startTime) / DURATION, 1);
        circle.setAttribute("r", fromR + (toR - fromR) * easeOut(p));
        if (p < 1) {
            raf = requestAnimationFrame(animate);
        } else {
            fromR = toR;
        }
    }

    function start(target) {
        if (raf) cancelAnimationFrame(raf);
        fromR = parseFloat(circle.getAttribute("r")) || 0;
        toR = target;
        startTime = null;
        raf = requestAnimationFrame(animate);
    }

    svg.addEventListener("mouseenter", () => start(MAX_R));
    svg.addEventListener("mouseleave", () => start(0));
})();


// Smooth Scroll for "Get in Touch" Button
const heroContactBtn = document.querySelector(".hero-contact-btn");
if (heroContactBtn) {
    heroContactBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const target = document.getElementById("contact");
        if (!target) return;
        if (window._lenis) {
            const offset = -(navbar ? navbar.offsetHeight : 71);
            window._lenis.scrollTo(target, { offset, duration: 2.8 });
        } else {
            target.scrollIntoView({ behavior: "smooth" });
        }
    });
}


// Project Toggle
document.querySelectorAll(".project-toggle").forEach(toggle => {
    const body = toggle.closest(".project-item").querySelector(".project-body");
    if (!body) return;
    toggle.addEventListener("click", () => {
        const isOpen = toggle.classList.toggle("is-open");
        body.classList.toggle("is-open", isOpen);
        toggle.setAttribute("aria-expanded", isOpen);
    });
});


// Infinite Horizontal Scroll Animation
window.addEventListener("load", () => {
    const wrapper = document.querySelector(".scroll-wrapper");
    const inner = document.getElementById("scrollInner");
    const track = document.getElementById("track");

    const gap = 20;
    const pxPerSec = 50;

    function buildMarquee() {
        while (inner.children.length > 1) {
            inner.removeChild(inner.lastChild);
        }

        const loopWidth = track.getBoundingClientRect().width + gap;

        while (inner.getBoundingClientRect().width < wrapper.offsetWidth + loopWidth) {
            const clone = track.cloneNode(true);
            clone.removeAttribute("id");
            inner.appendChild(clone);
        }

        inner.style.setProperty("--loop-width", loopWidth + "px");
        inner.style.setProperty("--duration", loopWidth / pxPerSec + "s");
    }

    buildMarquee();

    let resizeTimer;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(buildMarquee, 200);
    });
});


// Scroll to Top
const scrollTopBtn = document.getElementById("scrollTop");
if (scrollTopBtn) {
    scrollTopBtn.addEventListener("click", () => {
        if (window._lenis) window._lenis.scrollTo(0, { duration: 2.8 });
        else window.scrollTo({ top: 0, behavior: "smooth" });
    });
}