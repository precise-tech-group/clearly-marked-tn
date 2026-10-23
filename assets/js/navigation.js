(function () {
  "use strict";

  var nav = document.querySelector("[data-nav]");
  var toggle = document.querySelector("[data-nav-toggle]");
  var menu = document.querySelector("[data-mobile-menu]");
  var mobileLinks = document.querySelectorAll("[data-mobile-link]");

  /* ---------- Nav background on scroll ---------- */
  if (nav) {
    var updateNavState = function () {
      if (window.scrollY > 24) {
        nav.classList.add("is-scrolled");
      } else {
        nav.classList.remove("is-scrolled");
      }
    };
    updateNavState();
    window.addEventListener("scroll", updateNavState, { passive: true });
  }

  /* ---------- Mobile menu ---------- */
  if (toggle && menu) {
    var closeMenu = function () {
      menu.classList.remove("is-open");
      menu.setAttribute("aria-hidden", "true");
      toggle.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    };

    var openMenu = function () {
      menu.classList.add("is-open");
      menu.setAttribute("aria-hidden", "false");
      toggle.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
    };

    toggle.addEventListener("click", function () {
      var isOpen = menu.classList.contains("is-open");
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    mobileLinks.forEach(function (link) {
      link.addEventListener("click", closeMenu);
    });

    window.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });

    var mql = window.matchMedia("(min-width: 761px)");
    var handleBreakpoint = function (e) {
      if (e.matches) closeMenu();
    };
    if (mql.addEventListener) {
      mql.addEventListener("change", handleBreakpoint);
    } else if (mql.addListener) {
      mql.addListener(handleBreakpoint);
    }
  }

  /* ---------- Smooth in-page anchor scrolling handled by Lenis (animations.js) ---------- */
})();
