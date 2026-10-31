# UI design handoff

Reference: https://www.upwork.com/ (inspected in browser on 31 October 2026).

Google Stitch project: `projects/1819106165016390287` (Tasky Version 2, private).
Homepage screen: `024942b8f30c4664a101a37f083195f6`.
Design system: `assets/d547d29141dd460993c082cf18916354` (Heritage Editorial Marketplace).
Raw generated reference: `stitch-homepage.html`. This is a design reference, not application code; generated marketing claims and financial illustrations are not implemented features.

## Implemented direction

- Warm white canvas, deep forest green, lime accents, Playfair Display headings and Plus Jakarta Sans interface text with local font fallbacks.
- Two-column editorial hero, CSS creative-work illustration, real task search, keyword chips, six category discovery links, and Discover / Connect / Deliver section.
- Responsive layout, keyboard focus treatment, input labels, skip link, reduced-motion support, and task loading/error/empty states with retry.
- Categories adapted to Tasky's current data model. Category cards launch keyword searches; they do not introduce unsupported category values.
- Removed generated claims about verified talent, active contracts and protected escrow. No invented reviews, user counts, or client logos.

## Validation

Production build and API syntax checks pass. Browser verified search submission and retained keyword, unavailable database messaging, retry, home navigation, and desktop/mobile rendering. Mobile viewport had no page overflow. Live task results and pagination still require a configured development database; no production database was accessed.

Stitch suggested next screens: Explore tasks marketplace, mobile homepage, and milestone contract detail. These are suggestions for future design work; the contract feature still requires product and backend validation.
