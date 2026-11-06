# Tasky v2 design handoff — final reference

The final reference is https://hamol.studio/, inspected in Chrome on 5 November 2026. This supersedes Upwork and the abandoned Carnilove direction.

## Reference inspection

Inspected the full homepage: pinned space hero; scroll-controlled orbital objects with changing copy, scale, position and scene index; Earth transition; connection story; hairline project index; contrasting light studio and team section; process illustrations; oversized closing CTA.

## Google Stitch

Project: projects/1819106165016390287. New screen: 05585118051444579d404120dccb8cde (Tasky — Hamol Spatial Homepage). Design system: assets/328c0966fb7d402e9c23e82d9f0e562b. Raw generated source: stitch-hamol-homepage.html.

Stitch is a visual reference, not shipped application code. Its invented escrow, guaranteed payout, task counts, contract custody and network-status claims were explicitly excluded. Payments remain disabled. No reference-site logos, portraits, models or proprietary assets were copied.

## Implemented

- Manrope, charcoal #0c0e10, offwhite #e9e9e3, mint accents, subtle blue metallic artwork; capsule navigation and CTAs, generous spacing, fine borders.
- Original lazy-loaded Three.js scene: faceted metallic orbital bodies, star field, moons, drag rotation, four scroll-driven scenes, changing marketplace copy and keyboard-operable chapter controls.
- Native scrolling with a sticky scene rather than wheel interception. CSS horizon and fallback sphere. Scene pauses offscreen; animation pause control, reduced-motion adaptation, renderer cleanup and context-loss fallback.
- Connection story, six category rows connected to real task search, client/freelancer artwork and CTAs, process cards, closing CTA. No fake team members, reviews or statistics.
- Shared account/task/messaging typography and surface styling, saved light/dark toggle with system default applied before rendering. Homepage intentionally uses the reference’s dark/light section contrast in both modes.

## Verification

Production build and API syntax checks passed. Integration suite passed (two tests). Chrome verified the desktop 3D scene, scroll/chapter copy changes, skill anchor navigation, 390×844 mobile layout without horizontal overflow, both account themes, and preference persistence after reload. Local browser preview has no API server; hosted API acceptance is checked separately.

The artwork is a procedural interpretation of the reference, not its exact WebGL implementation or Earth imagery.

## 6 November refinement

Final chapter now uses an original stylized globe with dotted continental silhouettes and connection arcs. Process cards use thin-line SVG diagrams. Chrome chapter-focus rendering was fixed with non-scrolling clipping and explicit canvas/content layers. Fresh hosted login, dashboard and message persistence checks passed; desktop and 390×844 scene rendering were checked.

## Interactive refinement verified — 6 November

A deeper Chrome inspection covered reference planet opening, separated shell pieces, the right-side project panel, next-project transition, rotation while open, cursor feedback during pointer interactions, scene tint and scroll transitions. Tasky implements an original interpretation: eased procedural shell opening, selected planet repositioning, changing background tint, pointer-driven parallax, Explore/Drag cursor, skill details, next/close controls and real task-search destinations. Reference assets were not copied.

A native dialog provides focus containment, Escape closing and focus restoration. Drag distance suppresses accidental click opening; arrow keys rotate the scene. Reduced motion retains normal cursor behavior. Mobile details sit beneath the artwork; the hosted 390×844 check measured page and dialog at 390 px without horizontal overflow. Desktop opening, mobile Next navigation, keyboard activation, Escape and dragging without opening passed on the published preview.

The final application build and four integration tests pass. See progress.md for hosted workflow and Google/WebSocket verification. Hover was inspected through available pointer interactions; no pixel-identical reproduction or exhaustive cross-device animation claim is made.

## Inline planet revision — 6 November

The follow-up request removes the full-screen dialog experience. Planet shells now expand inside the existing sticky homepage scene. Header navigation, chapter controls, and normal page scrolling remain available; no route, new page, backdrop, or body-scroll lock is opened. The details are an inline section with Close/Next controls. Escape returns focus to the original trigger. Choosing a scene chapter closes the details.

Horizontal trackpad gestures over the globe/orbit rotate it around the vertical axis. Shift plus the mouse wheel also rotates it; vertical gestures retain normal page scrolling and browser zoom gestures are preserved. Both the closed and expanded planet surfaces accept horizontal input. Pointer drag remains supported and crossing the drag threshold suppresses accidental opening even when returning to the starting point.

This supersedes the native modal/focus-containment description above. Application source: 6dcc3e3 on codex/tasky-version-2. Production frontend build passes.

## Planet navigation correction — 6 November

Application commit 8bacafd fixes divergent expanded and orbit selections. The active expanded planet now supplies the chapter highlight and scene counter; selecting Next skill also aligns the underlying orbit position. Back to orbit, Close and Escape return to that same planet. The four name buttons preserve the current mode: expanded selections stay expanded, orbit selections remain in orbit. Next wraps from the fourth planet to the first. This supersedes the earlier statement that selecting a chapter always closes details.

Production build passed. Hosted Chrome verified Next through Development & IT and Writing & research with matching highlighted names and counters, return to Writing in orbit, every name in expanded mode, and fourth-to-first wraparound. No route navigation or production deployment is involved.
