/**
 * Route-change entrance: fast fade + 8px rise on every navigation.
 * Pure CSS (see globals.css `.page-enter`), ~200ms, transform/opacity only
 * (no layout shift), disabled under prefers-reduced-motion.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
