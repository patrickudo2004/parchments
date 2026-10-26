# Parchments Accessibility Statement

**Effective Date:** June 1, 2026  
**Conformance Goal:** WCAG 2.1 Level AA, Section 508, ADA Title III Compliant

At **Parchments**, we believe that the Holy Scriptures and deep theological study should be fully accessible to everyone, regardless of physical ability, visual acuity, motor precision, or neurodivergence. We are continuously designing, developing, and auditing our web and desktop applications to adhere to the **Web Content Accessibility Guidelines (WCAG) 2.1 Level AA** standards.

---

## 1. Measures to Support Accessibility
We incorporate the following accessibility practices into our design systems, component architecture, and release cycles:
* **High Contrast & Visual Readability**: High-contrast dark and light modes engineered to exceed the minimum contrast ratio of 4.5:1 for body copy and 3.0:1 for graphical user interface controls and icons.
* **Touch Target Ergonomics ($\ge 48\text{px}$)**: All interactive buttons, tabs, drawer toggles, and navigation elements meet or exceed the recommended $48 \times 48$ CSS pixel tap target standard, allowing effortless operation by users with tremors, motor impairments, or larger finger sizes on touchscreens.
* **Keyboard Navigability & Focus Rings**: Every core feature—from Bible chapter selection to the sermon rich-text editor and stage prompter—is fully operable using a keyboard alone. High-visibility `:focus-visible` outline rings guide navigation without relying on mouse pointers.
* **Skip to Main Content**: Keyboard users are provided with an instant "Skip to main content" link to bypass repetitive navigation landmarks.
* **Screen Reader Semantic Structure**: We utilize semantic HTML5 elements (`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`, `<aside>`) and explicit WAI-ARIA roles, state attributes (`aria-expanded`, `aria-selected`), and accessible name descriptions (`aria-label`) so assistive technologies (such as NVDA, JAWS, VoiceOver, and TalkBack) can accurately interpret the interface.
* **Descriptive Alternative Text (`alt`)**: All visual captures and screenshot showcases include descriptive alternative text explaining both the visual elements and the theological/workflow scenario being illustrated.
* **Reduced Motion Preferences**: The application honors the `prefers-reduced-motion: reduce` system setting, disabling or softening non-essential UI animations for individuals with vestibular sensitivity.
* **No Unsolicited Pinch-to-Zoom Disabling**: Marketing and reading pages preserve user control over page magnification, allowing text resizing up to 200% without loss of content.

---

## 2. Pulpit & Lectern Accessibility Features
For ministers and speakers facing visual or physical constraints on stage:
* **Adjustable Typography Scaling**: One-click font scaling up to $42\text{px}+$ for clear legibility from a lectern or music stand at a 3-foot distance.
* **Stage Countdown Prompter with Amber/Red Warning**: Visual pacing indicators that change color and pulse gently to alert the speaker without requiring auditory alarms.
* **Hands-Free Presentation Pedals & Remotes**: Full support for standard Bluetooth foot pedals and USB clickers (Page Up/Page Down, Arrow keys) for speakers who cannot manually swipe or tap screens during preaching.
* **Offline Voice Dictation**: Accessible on-device speech-to-text allowing hands-free note capture without requiring manual keyboard typing.

---

## 3. Known Limitations & Ongoing Enhancements
While we strive for comprehensive accessibility across all platforms:
* Certain third-party complex multi-column interlinear manuscripts (e.g., polyglot alignments with ancient Hebrew vowels and Greek accents) may require screen magnification adjustments for optimal legibility.
* We are continually refining screen reader announcements for rapid real-time peer-to-peer collaborative cursor movements.

---

## 4. Assessment Methodology
Parchments evaluates accessibility using:
* Automated audits via axe-core, Lighthouse, and Chrome Accessibility DevTools.
* Real-world scenario testing with keyboard-only navigation.
* Manual testing with screen readers (VoiceOver on macOS/iOS, NVDA on Windows).

---

## 5. Feedback & Accessibility Contact
We welcome your feedback on the accessibility of Parchments. If you encounter any accessibility barriers, have difficulty reading any text, or need an alternative format of our documentation, please contact us immediately:

**Patrick Udoh**  
Lead Developer & Accessibility Coordinator  
Email: `patrickudo2004@gmail.com`  
Subject: `[Accessibility Feedback] Parchments`

We commit to reviewing and responding to accessibility feedback within 48 business hours.
