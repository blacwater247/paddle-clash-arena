Add a "↑ Back to top" button at the bottom of the "Built for clutch moments" (Features) section on the landing page, so users can return to the hero without scrolling manually.

## What changes
- File: `src/components/LandingPage.tsx`
- Inside the `#features` section (around line 166, after the features grid), append a centered link/button:
  - Label: `↑ BACK TO TOP`
  - Behavior: anchor to `#top` (add `id="top"` to the hero section) with smooth scroll
  - Styling: matches existing landing-page aesthetic — uppercase, tracked, cyan hover, ghost border

No other pages or logic touched.