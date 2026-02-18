// main.js
(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Footer year
    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    // Mobile nav toggle
    const navToggle = document.querySelector(".nav-toggle");
    const navMenu = document.getElementById("nav-menu");

    function setNavOpen(isOpen) {
        if (!navToggle || !navMenu) return;
        navToggle.setAttribute("aria-expanded", String(isOpen));
        if (isOpen) {
            navMenu.removeAttribute("hidden");
            // Focus first link for accessibility
            const firstFocusable = navMenu.querySelector("a, button");
            firstFocusable?.focus();
        } else {
            navMenu.setAttribute("hidden", "");
        }
    }

    if (navMenu) {
        // Start collapsed on mobile
        const desktop = window.matchMedia("(min-width: 860px)");
        const syncMenu = () => {
            if (desktop.matches) {
                navMenu.removeAttribute("hidden");
                navToggle?.setAttribute("aria-expanded", "true");
            } else {
                navMenu.setAttribute("hidden", "");
                navToggle?.setAttribute("aria-expanded", "false");
            }
        };
        syncMenu();
        desktop.addEventListener?.("change", syncMenu);
    }

    navToggle?.addEventListener("click", () => {
        const isOpen = navToggle.getAttribute("aria-expanded") === "true";
        setNavOpen(!isOpen);
    });

    // Close nav when clicking a link (mobile)
    navMenu?.addEventListener("click", (e) => {
        const target = e.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.matches("a.nav-link")) {
            // on mobile collapse
            const isDesktop = window.matchMedia("(min-width: 860px)").matches;
            if (!isDesktop) setNavOpen(false);
        }
    });

    // Smooth scroll for anchor links in header/footer + offset for sticky header
    const header = document.querySelector(".site-header");
    const headerOffset = () => (header ? header.getBoundingClientRect().height : 0);

    function smoothScrollTo(hash) {
        const id = hash.replace("#", "");
        const el = document.getElementById(id);
        if (!el) return;

        const y = el.getBoundingClientRect().top + window.scrollY - headerOffset() - 12;

        if (prefersReducedMotion) {
            window.scrollTo(0, y);
            return;
        }
        window.scrollTo({ top: y, behavior: "smooth" });
    }

    document.addEventListener("click", (e) => {
        const target = e.target;
        if (!(target instanceof HTMLElement)) return;

        const link = target.closest('a[href^="#"]');
        if (!link) return;

        const href = link.getAttribute("href");
        if (!href || href === "#") return;

        // If it's a modal-close link to section, handle and close modal
        e.preventDefault();
        smoothScrollTo(href);
        history.replaceState(null, "", href);
    });

    // Modal logic (Agendar)
    const modal = document.getElementById("agenda-modal");
    let lastActiveEl = null;

    function openModal() {
        if (!modal) return;
        lastActiveEl = document.activeElement;
        modal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";

        // Focus first action
        const first = modal.querySelector(".modal-actions a, .modal-actions button, [data-close-modal]");
        first?.focus();
        trapFocus(modal);
    }

    function closeModal() {
        if (!modal) return;
        modal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
        releaseFocusTrap();
        if (lastActiveEl instanceof HTMLElement) lastActiveEl.focus();
    }

    document.addEventListener("click", (e) => {
        const target = e.target;
        if (!(target instanceof HTMLElement)) return;

        if (target.matches('[data-open-modal="agenda"]')) {
            openModal();
        }

        if (target.matches("[data-close-modal]") || target.closest("[data-close-modal]")) {
            closeModal();
        }
    });

    document.addEventListener("keydown", (e) => {
        if (!modal) return;
        const isOpen = modal.getAttribute("aria-hidden") === "false";
        if (!isOpen) return;

        if (e.key === "Escape") closeModal();
    });

    // Focus trap (simple, no dependencies)
    let focusTrapHandler = null;

    function trapFocus(container) {
        const focusableSelector =
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

        const focusable = Array.from(container.querySelectorAll(focusableSelector))
            .filter((el) => el instanceof HTMLElement && !el.hasAttribute("disabled"));

        if (!focusable.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        focusTrapHandler = (e) => {
            if (e.key !== "Tab") return;

            const active = document.activeElement;
            if (!(active instanceof HTMLElement)) return;

            if (e.shiftKey && active === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && active === last) {
                e.preventDefault();
                first.focus();
            }
        };

        container.addEventListener("keydown", focusTrapHandler);
    }

    function releaseFocusTrap() {
        if (!modal || !focusTrapHandler) return;
        modal.removeEventListener("keydown", focusTrapHandler);
        focusTrapHandler = null;
    }

    // Reveal on scroll (IntersectionObserver)
    const revealEls = document.querySelectorAll(".reveal");
    if ("IntersectionObserver" in window && revealEls.length) {
        const io = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("is-visible");
                        io.unobserve(entry.target);
                    }
                }
            },
            { threshold: 0.12 }
        );

        revealEls.forEach((el) => io.observe(el));
    } else {
        // Fallback
        revealEls.forEach((el) => el.classList.add("is-visible"));
    }

    // Form validation + toast
    const form = document.getElementById("contact-form");
    const toast = document.getElementById("toast");
    const toastTitle = document.getElementById("toast-title");
    const toastMsg = document.getElementById("toast-msg");

    function setFieldError(fieldName, message) {
        const input = document.querySelector(`[name="${fieldName}"]`);
        const errorEl = document.querySelector(`[data-error-for="${fieldName}"]`);
        if (input instanceof HTMLElement) input.classList.toggle("input-invalid", Boolean(message));
        if (errorEl) errorEl.textContent = message || "";
    }

    function normalizePhone(value) {
        return value.replace(/[^\d+]/g, "").replace(/^00/, "+");
    }

    function isValidPhone(value) {
        // Acepta +50688888888 o 8888-8888 o +506 8888-8888 (básico)
        const v = value.trim();
        if (!v) return false;
        const digits = v.replace(/[^\d]/g, "");
        // Costa Rica: 8 dígitos; con +506 serían 11-12 contando el prefijo sin +
        // Validación flexible: mínimo 8, máximo 13
        return digits.length >= 8 && digits.length <= 13;
    }

    function showToast({ title, message }) {
        if (!toast || !toastTitle || !toastMsg) return;

        toastTitle.textContent = title;
        toastMsg.textContent = message;

        toast.hidden = false;
        toast.setAttribute("data-open", "true");

        // Auto close
        window.clearTimeout(showToast._t);
        showToast._t = window.setTimeout(() => hideToast(), 4200);
    }

    function hideToast() {
        if (!toast) return;
        toast.hidden = true;
        toast.removeAttribute("data-open");
    }

    document.addEventListener("click", (e) => {
        const target = e.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.matches("[data-toast-close]") || target.closest("[data-toast-close]")) {
            hideToast();
        }
    });

    form?.addEventListener("submit", (e) => {
        e.preventDefault();

        // Read values
        const fd = new FormData(form);
        const name = String(fd.get("name") || "").trim();
        const phoneRaw = String(fd.get("phone") || "").trim();
        const service = String(fd.get("service") || "").trim();
        const message = String(fd.get("message") || "").trim();

        // Reset errors
        setFieldError("name", "");
        setFieldError("phone", "");
        setFieldError("service", "");
        setFieldError("message", "");

        let ok = true;

        if (name.length < 2) {
            setFieldError("name", "Por favor escribe tu nombre.");
            ok = false;
        }

        if (!isValidPhone(phoneRaw)) {
            setFieldError("phone", "Ingresa un teléfono válido (ej: +506 8888-8888).");
            ok = false;
        }

        if (!service) {
            setFieldError("service", "Selecciona un servicio.");
            ok = false;
        }

        if (message.length < 8) {
            setFieldError("message", "Cuéntanos un poco más (mínimo 8 caracteres).");
            ok = false;
        }

        if (!ok) {
            // focus first invalid
            const firstInvalid = form.querySelector(".input-invalid");
            firstInvalid?.focus();
            return;
        }

        // Simulación de envío
        const phone = normalizePhone(phoneRaw);
        const prettyService = service;

        // Disable button briefly
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn instanceof HTMLButtonElement) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Enviando…";
        }

        window.setTimeout(() => {
            if (submitBtn instanceof HTMLButtonElement) {
                submitBtn.disabled = false;
                submitBtn.textContent = "Enviar mensaje";
            }

            form.reset();

            showToast({
                title: "Mensaje enviado",
                message: `Gracias, ${name}. Te contactaremos pronto por ${phone ? "teléfono" : "nuestros canales"} para ${prettyService}.`
            });
        }, 700);
    });

    // Close modal if user clicks "Formulario" inside modal and then scroll to contacto (handled by anchor handler)
    // Additionally close modal if hash navigation used from modal
    modal?.addEventListener("click", (e) => {
        const target = e.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.matches('a[href^="#"]')) closeModal();
    });

    // Click outside nav to close (mobile)
    document.addEventListener("click", (e) => {
        if (!navToggle || !navMenu) return;
        const isDesktop = window.matchMedia("(min-width: 860px)").matches;
        if (isDesktop) return;

        const isOpen = navToggle.getAttribute("aria-expanded") === "true";
        if (!isOpen) return;

        const target = e.target;
        if (!(target instanceof Node)) return;

        if (!navMenu.contains(target) && !navToggle.contains(target)) {
            setNavOpen(false);
        }
    });
})();