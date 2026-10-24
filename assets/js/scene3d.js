/*
  Hero WebGL scene — a continuous, living environment of glowing "paint
  stripe" segments that flow toward the camera in lanes (an infinite-road
  effect), a soft horizon glow sprite, and drifting dust particles, with
  gentle mouse parallax and a scroll-tied camera dolly.

  Deliberately unlit/basic-material and texture-light (one generated canvas
  gradient for the glow) so it stays cheap on the GPU — no post-processing.
  Fully optional: once initialized, the hero gets a `.scene-active` class
  that CSS uses to dim the underlying photo; if this script never runs
  (reduced motion, low power, no WebGL), the hero still reads correctly as
  a static, well-lit photograph.
*/
(function () {
  "use strict";

  var canvas = document.querySelector("[data-scene-canvas]");
  var heroEl = document.querySelector("[data-hero]");
  if (!canvas || !heroEl || !window.THREE) return;

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var lowPower = window.innerWidth < 640 ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) ||
    (navigator.deviceMemory && navigator.deviceMemory <= 2);

  if (prefersReducedMotion || lowPower) return;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
      powerPreference: "low-power"
    });
  } catch (e) {
    return;
  }

  var GOLD = 0xe3c35c;
  var WARM_WHITE = 0xf5ead0;
  var FOG_COLOR = 0x0c0e12;

  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(FOG_COLOR, 0.085);

  var camera = new THREE.PerspectiveCamera(46, 1, 0.1, 80);
  camera.position.set(0, 1.9, 7);
  camera.lookAt(0, -0.6, -10);

  /* ---------- Horizon glow (generated canvas gradient sprite) ---------- */
  function makeGlowTexture() {
    var size = 256;
    var c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    var ctx = c.getContext("2d");
    var gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(227, 195, 92, 0.85)");
    gradient.addColorStop(0.4, "rgba(227, 195, 92, 0.28)");
    gradient.addColorStop(1, "rgba(227, 195, 92, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
  }

  var glowTexture = makeGlowTexture();
  var glowMat = new THREE.SpriteMaterial({
    map: glowTexture,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false
  });
  var glowSprite = new THREE.Sprite(glowMat);
  glowSprite.scale.set(16, 10, 1);
  glowSprite.position.set(0, 1, -24);
  scene.add(glowSprite);

  /* ---------- Flowing stripe lanes (infinite "road" effect) ---------- */
  var LANES = 6;
  var SEGMENTS_PER_LANE = 3;
  var LANE_SPREAD = 10;
  var SEGMENT_LENGTH = 7;
  var SPAN_Z = SEGMENTS_PER_LANE * SEGMENT_LENGTH * 1.4; /* loop distance */
  var NEAR_Z = 9; /* recycle point, just past the camera */
  var FAR_Z = NEAR_Z - SPAN_Z;
  var FLOW_SPEED = 2.6; /* units per second */

  var stripes = [];

  for (var lane = 0; lane < LANES; lane++) {
    var t = lane / (LANES - 1); /* 0..1 */
    var x = (t - 0.5) * LANE_SPREAD;
    var tilt = -(t - 0.5) * 0.12;

    for (var s = 0; s < SEGMENTS_PER_LANE; s++) {
      var geo = new THREE.BoxGeometry(0.1, 0.02, SEGMENT_LENGTH);
      var warm = (lane + s) % 5 === 0;
      var mat = new THREE.MeshBasicMaterial({
        color: warm ? WARM_WHITE : GOLD,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      var mesh = new THREE.Mesh(geo, mat);
      var z = NEAR_Z - s * (SEGMENT_LENGTH * 1.4) - t * 1.2;
      mesh.position.set(x, -1.2, z);
      mesh.rotation.y = tilt;
      mesh.userData.baseOpacity = warm ? 0.4 : 0.6;
      scene.add(mesh);
      stripes.push(mesh);
    }
  }

  /* ---------- Dust particles ---------- */
  var PARTICLE_COUNT = 110;
  var positions = new Float32Array(PARTICLE_COUNT * 3);
  for (var p = 0; p < PARTICLE_COUNT; p++) {
    positions[p * 3] = (Math.random() - 0.5) * 12;
    positions[p * 3 + 1] = Math.random() * 4.5 - 1;
    positions[p * 3 + 2] = Math.random() * -22 + 2;
  }
  var particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  var particleMat = new THREE.PointsMaterial({
    color: 0xf5f3ec,
    size: 0.026,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  var particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  /* ---------- Entrance fade ---------- */
  var hasGSAP = typeof window.gsap !== "undefined";
  var introStart = performance.now();
  var INTRO_DURATION = 1800;

  /* ---------- Mouse parallax (damped) ---------- */
  var pointer = { x: 0, y: 0 };
  var pointerTarget = { x: 0, y: 0 };

  window.addEventListener("pointermove", function (e) {
    pointerTarget.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointerTarget.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  /* ---------- Scroll-tied dolly / fade ---------- */
  var scrollProgress = 0;

  function updateScrollProgress() {
    var rect = heroEl.getBoundingClientRect();
    var viewH = window.innerHeight;
    /* 0 when the hero sits fully in view at the top of the page,
       approaching 1 as it scrolls out of view (one viewport height). */
    var raw = -rect.top / viewH;
    scrollProgress = Math.min(Math.max(raw, 0), 1.4);
  }
  updateScrollProgress();
  window.addEventListener("scroll", updateScrollProgress, { passive: true });

  /* ---------- Resize ---------- */
  function resize() {
    var w = heroEl.clientWidth;
    var h = heroEl.clientHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  /* ---------- Visibility / intersection guards ---------- */
  var isIntersecting = true;
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      isIntersecting = entries[0].isIntersecting;
    }, { threshold: 0 });
    io.observe(heroEl);
  }

  var isPageVisible = !document.hidden;
  document.addEventListener("visibilitychange", function () {
    isPageVisible = !document.hidden;
  });

  /* ---------- Render loop ---------- */
  var lastTime = performance.now();

  function animate(now) {
    requestAnimationFrame(animate);

    var dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    if (!isIntersecting || !isPageVisible) return;

    pointer.x += (pointerTarget.x - pointer.x) * 0.04;
    pointer.y += (pointerTarget.y - pointer.y) * 0.04;

    camera.position.x = pointer.x * 0.6;
    camera.position.y = 1.9 - pointer.y * 0.25 - scrollProgress * 0.7;
    camera.position.z = 7 - scrollProgress * 2.6;
    camera.lookAt(pointer.x * 0.25, -0.6, -10);

    var introT = Math.min((now - introStart) / INTRO_DURATION, 1);
    var introEase = 1 - Math.pow(1 - introT, 3);

    for (var i = 0; i < stripes.length; i++) {
      var mesh = stripes[i];
      mesh.position.z += FLOW_SPEED * dt;
      if (mesh.position.z > NEAR_Z) {
        mesh.position.z -= SPAN_Z;
      }

      /* fade in from the fog, fade out just before reaching the camera */
      var depth = (mesh.position.z - FAR_Z) / (NEAR_Z - FAR_Z); /* 0 far -> 1 near */
      var fade = Math.sin(Math.min(Math.max(depth, 0), 1) * Math.PI);
      mesh.material.opacity = mesh.userData.baseOpacity * fade * introEase;
    }

    glowSprite.material.opacity = 0.5 + Math.sin(now * 0.0006) * 0.08;
    particles.rotation.y = now * 0.00005;

    canvas.style.opacity = String(Math.max(1 - scrollProgress * 0.9, 0) * introEase);

    renderer.render(scene, camera);
  }

  heroEl.classList.add("scene-active");
  requestAnimationFrame(animate);
})();
