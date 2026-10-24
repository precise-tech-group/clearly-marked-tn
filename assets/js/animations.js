(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGSAP = typeof window.gsap !== "undefined";
  var hasScrollTrigger = hasGSAP && typeof window.ScrollTrigger !== "undefined";

  if (hasScrollTrigger) {
    window.gsap.registerPlugin(window.ScrollTrigger);
  }

  /* =======================================================
     SMOOTH SCROLL (Lenis) — skipped under reduced motion
  ======================================================= */
  var lenis = null;
  if (!prefersReducedMotion && typeof window.Lenis !== "undefined") {
    lenis = new window.Lenis({
      duration: 1.1,
      easing: function (t) { return 1 - Math.pow(1 - t, 3); },
      smoothWheel: true
    });

    lenis.on("scroll", function () {
      if (hasScrollTrigger) window.ScrollTrigger.update();
    });

    if (hasGSAP) {
      window.gsap.ticker.add(function (time) {
        lenis.raf(time * 1000);
      });
      window.gsap.ticker.lagSmoothing(0);
    } else {
      requestAnimationFrame(function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      });
    }
  }

  /* In-page nav links: let Lenis (or native) handle the scroll */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      var id = link.getAttribute("href");
      if (!id || id === "#") return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) {
        lenis.scrollTo(target, { offset: -70 });
      } else {
        target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
      }
    });
  });

  /* =======================================================
     HERO TITLE — entrance reveal (not scroll-triggered)
  ======================================================= */
  var titleLines = document.querySelectorAll("[data-hero-title] .line-inner");
  var heroEyebrows = document.querySelectorAll(".hero [data-reveal]");

  if (hasGSAP && titleLines.length) {
    window.gsap.set(titleLines, { yPercent: 110 });
    window.gsap.to(titleLines, {
      yPercent: 0,
      duration: 1.1,
      ease: "power4.out",
      stagger: 0.09,
      delay: 0.25
    });
  }

  if (hasGSAP) {
    window.gsap.set(heroEyebrows, { autoAlpha: 0, y: 22 });
    window.gsap.to(heroEyebrows, {
      autoAlpha: 1,
      y: 0,
      duration: 0.9,
      ease: "power2.out",
      stagger: 0.12,
      delay: 0.15
    });
  }

  /* =======================================================
     LINE-SPLIT REVEAL for [data-split-lines] paragraphs
     Wraps wrapped text lines in overflow-hidden masks so they
     rise into view, grouped by measured line position.
  ======================================================= */
  function splitIntoLines(el) {
    if (el.dataset.splitDone) return;
    var words = el.textContent.trim().split(/\s+/);
    el.textContent = "";
    var wordSpans = words.map(function (word, i) {
      var span = document.createElement("span");
      span.textContent = word + (i < words.length - 1 ? " " : "");
      span.style.display = "inline-block";
      el.appendChild(span);
      return span;
    });

    requestAnimationFrame(function () {
      var lines = [];
      var currentTop = null;
      var currentLine = [];

      wordSpans.forEach(function (span) {
        var top = span.offsetTop;
        if (currentTop === null || Math.abs(top - currentTop) < 2) {
          currentLine.push(span);
          currentTop = top;
        } else {
          lines.push(currentLine);
          currentLine = [span];
          currentTop = top;
        }
      });
      if (currentLine.length) lines.push(currentLine);

      el.textContent = "";
      lines.forEach(function (lineSpans) {
        var outer = document.createElement("span");
        outer.className = "split-line";
        var inner = document.createElement("span");
        inner.className = "split-line__inner";
        lineSpans.forEach(function (span) {
          inner.appendChild(span);
        });
        outer.appendChild(inner);
        el.appendChild(outer);
        el.appendChild(document.createTextNode(" "));
      });

      el.dataset.splitDone = "true";
      observeSplitLines(el);
    });
  }

  function observeSplitLines(el) {
    var lines = el.querySelectorAll(".split-line");
    if (!("IntersectionObserver" in window)) {
      lines.forEach(function (l) { l.classList.add("is-visible"); });
      return;
    }
    var obs = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          lines.forEach(function (l, i) {
            setTimeout(function () { l.classList.add("is-visible"); }, i * 90);
          });
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.4 });
    obs.observe(el);
  }

  document.querySelectorAll("[data-split-lines]").forEach(splitIntoLines);

  /* =======================================================
     GENERIC SCROLL REVEAL for [data-reveal]
  ======================================================= */
  var revealEls = Array.prototype.filter.call(
    document.querySelectorAll("[data-reveal]"),
    function (el) { return !el.closest(".hero"); }
  );
  if ("IntersectionObserver" in window) {
    var revealObs = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2, rootMargin: "0px 0px -8% 0px" });

    revealEls.forEach(function (el) { revealObs.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* =======================================================
     APPROACH — vertical rule draw-in
  ======================================================= */
  var rule = document.querySelector("[data-line-draw]");
  if (rule && "IntersectionObserver" in window) {
    var ruleObs = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-drawn");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    ruleObs.observe(rule);
  }

  /* =======================================================
     SERVICES INDEX — background crossfade on active row
  ======================================================= */
  var serviceRows = document.querySelectorAll("[data-service-row]");
  var visualWrap = document.querySelector("[data-services-visual]");
  var visualImg = document.querySelector("[data-services-visual-img]");

  function setActiveRow(row) {
    serviceRows.forEach(function (r) { r.classList.remove("is-active"); });
    row.classList.add("is-active");
    if (visualImg && row.dataset.bg) {
      if (visualImg.getAttribute("src") !== row.dataset.bg) {
        visualImg.style.opacity = "0";
        setTimeout(function () {
          visualImg.setAttribute("src", row.dataset.bg);
          visualImg.style.opacity = "1";
        }, 180);
      }
    }
    if (visualWrap) visualWrap.style.opacity = "1";
  }

  if (serviceRows.length) {
    serviceRows.forEach(function (row) {
      row.addEventListener("mouseenter", function () { setActiveRow(row); });
    });

    if ("IntersectionObserver" in window) {
      var rowObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) setActiveRow(entry.target);
        });
      }, { threshold: 0.6 });
      serviceRows.forEach(function (row) { rowObs.observe(row); });
    }
  }

  /* =======================================================
     PARALLAX / SCRUB — hero & depth imagery, why-us image
  ======================================================= */
  if (hasScrollTrigger && !prefersReducedMotion) {
    window.gsap.to(".hero__media img", {
      scale: 1.18,
      ease: "none",
      scrollTrigger: {
        trigger: ".hero",
        start: "top top",
        end: "bottom top",
        scrub: true
      }
    });

    var whyImg = document.querySelector("[data-parallax-img] img");
    if (whyImg) {
      window.gsap.fromTo(whyImg, { yPercent: -8 }, {
        yPercent: 8,
        ease: "none",
        scrollTrigger: {
          trigger: "[data-parallax-img]",
          start: "top bottom",
          end: "bottom top",
          scrub: true
        }
      });
    }
  }
})();
