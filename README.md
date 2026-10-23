# Clearly Marked — Website

A premium, cinematic marketing site for **Clearly Marked**, a pavement
striping and parking lot marking contractor serving Brentwood, Nolensville,
Smyrna, Franklin, and Middle Tennessee.

This is a full creative redesign of the business's previous Canva-built
website. The brand identity (name, logo mark, service area, service list,
and contact details) carries over from that site; everything else — visual
design, layout, photography, motion, and the 3D hero scene — was built from
scratch around a single idea: **the clarity of a freshly painted line.**

## Tech stack

Static HTML / CSS / vanilla JS — no build step, no framework, no bundler.

- **GSAP 3 + ScrollTrigger** — scroll-driven reveals, parallax, pinned/scrubbed transforms
- **Lenis** — smooth scroll, wired into GSAP's ticker so ScrollTrigger stays in sync
- **Three.js (r128)** — a lightweight WebGL scene layered over the hero photo
- Everything else is hand-written CSS (custom properties, no preprocessor) and small, focused vanilla JS modules

Libraries load from CDN (cdnjs / jsDelivr), pinned to exact versions, matching the convention used across this organization's other marketing sites.

## Local development

No install or build required.

```bash
# from the project root, serve the folder with any static server, e.g.:
npx serve .
# or
python -m http.server 5500
```

Then open the printed local URL. Editing any `.html`, `.css`, or `.js` file
and refreshing is the entire dev loop.

## Production

There is no build step. Deploy the repository contents as-is to any static
host (Netlify, Vercel static, GitHub Pages, Cloudflare Pages, S3 + CDN, etc.)
with `index.html` as the entry point.

## Project structure

```
index.html                   Single-page site (the business has one page of content)
robots.txt / sitemap.xml     Basic SEO plumbing
assets/
  css/
    variables.css            Design tokens: color, type scale, spacing, motion
    base.css                 Reset + global element styles + accessibility helpers
    components.css           All component styles (nav, hero, services index, forms, footer...)
    animations.css           Keyframes + the [data-reveal]/.split-line reveal states
    responsive.css           Breakpoints (1440 / 1024 / 760 / 480) + touch-device overrides
  js/
    navigation.js             Sticky nav background state + mobile menu open/close
    forms.js                  Contact form validation, success state, mailto handoff
    scene3d.js                 The hero WebGL scene (see below)
    animations.js              GSAP/ScrollTrigger/Lenis setup, scroll reveals, parallax
    main.js                   Small bits of page bootstrapping (year stamp, no-js class removal)
  images/                     Real, licensed photography (see Image sourcing below)
  icons/favicon.svg
```

## Animation & 3D architecture

The site is built as one continuous scroll journey rather than independent
fading sections:

- **Hero** — a real aerial photo of a freshly striped lot, with a transparent
  WebGL canvas layered on top (`scene3d.js`). The canvas renders a handful of
  glowing "paint stripe" meshes that draw themselves in on load, drift gently
  with the cursor, and dolly back as you scroll past the hero. It is
  deliberately unlit/basic-material and texture-free — a dozen boxes and a
  sprinkle of particles — so it stays cheap on the GPU. If WebGL is
  unavailable, reduced motion is requested, the device looks low-powered, or
  the viewport is a small phone, the script bails out early and the hero
  still reads correctly as a static photograph.
- **Approach, Why Us, Contact** — large editorial typography with
  `IntersectionObserver`-driven reveals (`[data-reveal]`) and a hand-rolled
  line-mask split (`[data-split-lines]`) that measures wrapped text lines at
  runtime and reveals them with a staggered mask wipe — no paid SplitText
  plugin required.
- **Services** — presented as a numbered index rather than a card grid.
  Hovering a row (or scrolling it into view on touch devices) crossfades a
  full-bleed background photo behind the whole section, tying each service
  to a real image of that specific kind of work.
- **Depth transition** — a full-bleed parking-structure photo with a
  scroll-scrubbed Ken Burns zoom, acting as a visual "camera move" between
  the services index and the proof section.
- Every scroll-linked animation is wrapped so `prefers-reduced-motion: reduce`
  degrades gracefully to a static, fully legible page — nothing is ever
  hidden permanently by JavaScript.

## Image sourcing

All photography is real and licensed for commercial use, sourced from
**Pexels** (free license — no attribution required, commercial use
permitted). Images were downloaded, resized, and re-encoded to WebP locally
for performance; none are hotlinked. No AI-generated or placeholder imagery
is used anywhere on the site.

## Contact form

The quote-request form does full client-side validation (required fields,
email format, at least one service selected) and a success/loading state.
**No backend is connected** — on submit it builds a pre-filled
`mailto:michael@clearlymarkedtn.com` link from the form data so a request
still reaches the business, and shows a confirmation panel with a "send by
email" fallback link. To wire up real delivery in production, replace the
`submit` handler in `assets/js/forms.js` with a call to a form backend
(e.g. Formspree, a serverless function, Resend, etc.) and keep the existing
validation and success-state UI.

## Deployment notes

- No environment variables are required for the current build.
- If a real form backend is added, document its endpoint/API key as an
  environment variable for whatever hosting platform is used (this repo
  intentionally ships without one).
- `robots.txt` and `sitemap.xml` reference `https://clearlymarkedtn.com/` —
  update them if the production domain changes.
