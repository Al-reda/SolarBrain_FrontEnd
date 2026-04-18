/**
 * LandingHero.tsx — cinematic full-screen hero at the top of the Design page.
 *
 * Earth-toned, premium, scroll-continues-into-form.
 *
 * Layers (back to front):
 *   1. Deep navy background with a subtle radial gold glow and geometric grid
 *   2. Animated sun SVG (rotating rays, slow pulse)
 *   3. Massive headline in desert-sand type
 *   4. One-line description + two CTAs
 *   5. Stat strip at the bottom with 3 counting-up numbers
 *   6. Gentle scroll indicator
 */

import { motion } from 'framer-motion';
import { useApp } from '../store/useApp';

export function LandingHero() {
  const { state } = useApp();
  // Hide the hero once a design has been generated so returning users
  // don't see marketing every time
  if (state.systemDesign) return null;

  function scrollToForm() {
    document.getElementById('design-form-anchor')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  return (
    <section className="hero">
      <HeroBackground />

      <motion.div
        className="hero__inner"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="hero__eyebrow">
          <span className="hero__dot" />
          Built for Vision 2030
        </div>

        <h1 className="hero__title">
          Power the Kingdom<br />
          <span className="hero__title--accent">with the sun.</span>
        </h1>

        <p className="hero__sub">
          Size, simulate, and deploy hybrid solar systems tuned for Saudi Arabia —
          from a Riyadh rooftop to a Jubail factory. All in one cockpit.
        </p>

        <div className="hero__cta-row">
          <button className="btn-cta btn-cta--gold" onClick={scrollToForm}>
            Start designing
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button className="btn-cta btn-cta--ghost" onClick={scrollToForm}>
            See how it works
          </button>
        </div>

        <StatStrip />
      </motion.div>

      <motion.button
        className="hero__scroll-cue"
        onClick={scrollToForm}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        aria-label="Scroll to form"
      >
        <span>Begin</span>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M7 2v10M3 8l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.button>
    </section>
  );
}

/**
 * HeroBackground — deep-navy layered background with:
 *   - Radial gold glow behind the headline
 *   - Subtle geometric 8-pointed-star grid (Saudi-motif without being literal)
 *   - An animated sun SVG with slowly rotating rays
 */
function HeroBackground() {
  return (
    <div className="hero__bg" aria-hidden="true">
      <div className="hero__bg-grid" />
      <div className="hero__bg-glow" />
      <motion.div
        className="hero__bg-sun"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.6, ease: 'easeOut' }}
      >
        <SunSvg />
      </motion.div>
    </div>
  );
}

/**
 * Decorative sun — rays rotate slowly, core pulses faintly.
 * All colors inlined so the SVG stays self-contained.
 */
function SunSvg() {
  return (
    <svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="sunCore" cx="50%" cy="50%" r="50%">
          <stop offset="0%"  stopColor="#F6D28E" />
          <stop offset="60%" stopColor="#C8932E" />
          <stop offset="100%" stopColor="#7A5518" />
        </radialGradient>
        <radialGradient id="sunHalo" cx="50%" cy="50%" r="50%">
          <stop offset="0%"  stopColor="#C8932E" stopOpacity="0.45" />
          <stop offset="70%" stopColor="#C8932E" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#C8932E" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Outer halo */}
      <circle cx="120" cy="120" r="118" fill="url(#sunHalo)">
        <animate attributeName="r" values="115;120;115" dur="6s" repeatCount="indefinite" />
      </circle>

      {/* Rotating rays — 16 pointed, stylized */}
      <motion.g
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 80, ease: 'linear' }}
        style={{ transformOrigin: '120px 120px' }}
      >
        {Array.from({ length: 16 }).map((_, i) => {
          const angle = (i / 16) * 360;
          const long = i % 2 === 0;
          const r1 = long ? 66 : 64;
          const r2 = long ? 96 : 82;
          return (
            <line
              key={i}
              x1="120"
              y1={120 - r1}
              x2="120"
              y2={120 - r2}
              stroke="#C8932E"
              strokeWidth={long ? 2.2 : 1.2}
              strokeLinecap="round"
              opacity={long ? 0.9 : 0.55}
              transform={`rotate(${angle} 120 120)`}
            />
          );
        })}
      </motion.g>

      {/* Core */}
      <circle cx="120" cy="120" r="54" fill="url(#sunCore)" />
      <circle cx="120" cy="120" r="54" fill="none" stroke="#E2B88F" strokeWidth="0.6" opacity="0.5" />
    </svg>
  );
}

/**
 * StatStrip — three big metrics that fade up and count from 0.
 * Makes the hero earn its screen real estate with substance, not just style.
 */
function StatStrip() {
  const stats = [
    { value: '6.2',  unit: 'kWh / m² / day', label: 'Saudi sun intensity' },
    { value: '2.4',  unit: '% of grid today', label: 'Renewable share' },
    { value: '50',   unit: '% target by 2030', label: 'Vision 2030 goal' },
  ];

  return (
    <motion.div
      className="hero__stats"
      initial="hidden"
      animate="shown"
      variants={{
        hidden: { opacity: 0 },
        shown:  { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.6 } },
      }}
    >
      {stats.map((s, i) => (
        <motion.div
          key={i}
          className="hero__stat"
          variants={{
            hidden: { opacity: 0, y: 14 },
            shown:  { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
          }}
        >
          <div className="hero__stat-value">{s.value}</div>
          <div className="hero__stat-unit">{s.unit}</div>
          <div className="hero__stat-label">{s.label}</div>
        </motion.div>
      ))}
    </motion.div>
  );
}
