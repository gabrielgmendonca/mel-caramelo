/**
 * iOS Safari ignores `user-scalable=no` / `maximum-scale=1` since iOS 10, so
 * two-thumb play (joystick + camera) registers as a pinch and zooms the page,
 * and rapid jump-button taps trigger double-tap zoom. These gestures must be
 * cancelled in JS.
 */
export function preventMobileZoom(): void {
  // pinch zoom (Safari fires proprietary gesture events for it)
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(type, (e) => e.preventDefault(), { passive: false });
  }

  // any multi-touch that isn't ours: don't let the browser interpret it
  document.addEventListener(
    'touchmove',
    (e) => {
      if (e.touches.length > 1) e.preventDefault();
    },
    { passive: false },
  );

  // double-tap zoom: swallow the second tap of a fast double tap. Buttons
  // are unaffected — they act on pointerdown / the first tap's click.
  let lastTouchEnd = 0;
  document.addEventListener(
    'touchend',
    (e) => {
      const now = Date.now();
      if (now - lastTouchEnd < 350) e.preventDefault();
      lastTouchEnd = now;
    },
    { passive: false },
  );
}
