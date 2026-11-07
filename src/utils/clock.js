/**
 * Taskbar clock — ticks every 10s, returns cleanup function.
 * @module utils/clock
 */

/** @param {string} id @returns {() => void} */
export function startClock(id) {
  const tick = () => {
    const el = document.getElementById(id);
    if (el) el.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  tick();
  const t = setInterval(tick, 10000);
  return () => clearInterval(t);
}
