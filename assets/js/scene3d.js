/*
  Hero WebGL scene — a handful of glowing "paint stripe" meshes fanning
  into the distance over the hero photograph, with gentle mouse parallax
  and a scroll-tied camera dolly. Deliberately lightweight (no post-
  processing, no textures) and fully optional: the hero reads correctly
  as a static photograph if this never runs.
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
  var FOG_COLOR = 0x10131a;

  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(FOG_COLOR, 0.11);

  var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60);
  camera.position.set(0, 1.6, 6.2);
  camera.lookAt(0, -0.4, -6);

  var stripesGroup = new THREE.Group();
  scene.add(stripesGroup);

  var STRIPE_COUNT = 7;
  var stripeMeshes = [];

  for (var i = 0; i < STRIPE_COUNT; i++) {
    var t = i / (STRIPE_COUNT - 1); /* 0..1 */
    var xSpread = (t - 0.5) * 9;
    var length = 16;

    var geo = new THREE.BoxGeometry(0.09, 0.015, length);
    var mat = new THREE.MeshBasicMaterial({
      color: GOLD,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    var mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(xSpread * 1.6, -1.1, -length / 2 + 2);
    mesh.rotation.y = -xSpread * 0.045;
    mesh.scale.z = 0.001;
    mesh.userData.targetScaleZ = 1;
    mesh.userData.delay = i * 0.07;
    stripesGroup.add(mesh);
    stripeMeshes.push(mesh);
  }

  /* ---------- Dust particles ---------- */
  var PARTICLE_COUNT = 90;
  var positions = new Float32Array(PARTICLE_COUNT * 3);
  for (var p = 0; p < PARTICLE_COUNT; p++) {
    positions[p * 3] = (Math.random() - 0.5) * 10;
    positions[p * 3 + 1] = Math.random() * 4 - 1;
    positions[p * 3 + 2] = Math.random() * -18 + 2;
  }
  var particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  var particleMat = new THREE.PointsMaterial({
    color: 0xf5f3ec,
    size: 0.025,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  var particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  /* ---------- Entrance animation ---------- */
  var startTime = performance.now();
  var hasGSAP = typeof window.gsap !== "undefined";

  if (hasGSAP) {
    stripeMeshes.forEach(function (mesh) {
      window.gsap.to(mesh.scale, {
        z: mesh.userData.targetScaleZ,
        duration: 1.4,
        delay: 0.3 + mesh.userData.delay,
        ease: "power3.out"
      });
      window.gsap.to(mesh.material, {
        opacity: 0.55,
        duration: 1.4,
        delay: 0.3 + mesh.userData.delay,
        ease: "power2.out"
      });
    });
  } else {
    stripeMeshes.forEach(function (mesh) {
      mesh.scale.z = 1;
    });
  }

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
    var raw = 1 - (rect.bottom - viewH) / rect.height;
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
  function animate() {
    requestAnimationFrame(animate);

    if (!isIntersecting || !isPageVisible) return;

    pointer.x += (pointerTarget.x - pointer.x) * 0.04;
    pointer.y += (pointerTarget.y - pointer.y) * 0.04;

    camera.position.x = pointer.x * 0.5;
    camera.position.y = 1.6 - pointer.y * 0.25 - scrollProgress * 0.6;
    camera.position.z = 6.2 - scrollProgress * 2.4;
    camera.lookAt(pointer.x * 0.2, -0.4, -6);

    var t = performance.now() * 0.00005;
    particles.rotation.y = t;

    canvas.style.opacity = String(Math.max(1 - scrollProgress * 0.9, 0));

    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);
})();
