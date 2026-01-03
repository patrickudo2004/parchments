# UI/UX Design Considerations: Parchments

This document captures our discussion on the design philosophy, icon choices, and user experience strategy for the Parchments application.

## 1. Iconography: Material Design 2 (MUI) vs. Lucide

### The Material Design 2 (M2) Approach
*   **Familiarity & Trust:** Universally understood icons (e.g., `MenuBook`, `Settings`) reduce the learning curve for users migrating from Google Docs, Logos, or standard office suites.
*   **Visual Weight:** Filled icons provide an "authoritative" feel. For a theological tool, a "Bible" icon feels more substantial when it has weight, rather than being a thin outline.
*   **Consistency:** Fits the "Professional Tool" aesthetic where clarity and instant recognition are prioritized over "trendiness."

### The Lucide (Outlined) Approach
*   **Aesthetic:** Provides a "SaaS-native" or "Minimalist" look. Extremely common in high-end modern tools (Notion, Linear, Raycast).
*   **Customization:** Allows for variable stroke widths, enabling a super-thin, premium "architectural" feel.
*   **Risk:** Can feel too "techy" or sterile for some users in a ministerial context.

### Final Verdict: "The Professional Bridge"
Parchments currently uses **M2 icons** within **Modern Layouts**. This creates a bridge between a "Serious Theological Research Tool" and a "Modern Focus App."

## 2. Navigation: IDE-like Nested Sidebar
*   **The Strategy:** Transitioning from a flat list to a nested tree allows for the inherent complexity of biblical study (Foundational > OT > Genesis > Sermon Notes).
*   **Density Management:** Inclusion of "Compact" vs "Comfortable" settings addresses the power user (researcher) vs the casual user (reader).

## 3. The "Soul" of Parchments: "The Sacred Desk"
*   **Brand Identity:** While currently using professional blues (`#1a73e8`), the next evolution of the UI could lean into organice secondary accents—deep burgundy, charcoal, or cream parchment tones.
*   **Focused Writing:** When study tools (Bible/Strong's) are closed, the editor window should transition into a "distraction-free" desk.

## 4. Current Standing & Evolution
*   **Current State:** High-efficiency, productivity-focused. Built for getting work done across sermon prep and deep research.
*   **Next Steps:** Enhancing the transition between "Study Mode" (many panels) and "Writing Mode" (minimalist editor).

---
*Date: 2026-01-03*
*Status: Architecture Phase 1 Integration*
