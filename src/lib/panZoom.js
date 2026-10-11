import { useCallback, useEffect, useRef, useState } from 'react';

// Pan and zoom for the sky / map SVG, done by moving its viewBox.
// Mouse: drag to pan, wheel to zoom around the pointer. Touch: one finger pans, two fingers pinch.
// A drag never counts as a click, so planets and stars only open on a real tap or click.

const MIN_ZOOM = 0.4; // fully zoomed out shows 2.5 times the normal area
const MAX_ZOOM = 4;
const DRAG_START_PX = 5;

// The starting view. On a tall, narrow screen (a phone held upright) the whole drawing would shrink to
// fit the width, so start zoomed in on the middle, where every pin sits, to use the screen better.
const homeFor = (W, H, size) => {
  if (size.h > size.w * 1.1) {
    const w = W * 0.68;
    const h = (w * H) / W;
    return { x: (W - w) / 2, y: (H - h) / 2, w, h };
  }
  return { x: 0, y: 0, w: W, h: H };
};

export function usePanZoom(W, H, resetKey) {
  const [size, setSize] = useState({ w: W, h: H }); // the SVG's size on screen
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const home = useCallback(() => homeFor(W, H, sizeRef.current), [W, H]);
  const [vb, setVb] = useState(home);
  const touched = useRef(false); // has the person panned or zoomed since the last reset?
  const [panning, setPanning] = useState(false);
  const svgRef = useRef(null);
  const vbRef = useRef(vb);
  vbRef.current = vb;
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const suppressClick = useRef(false);

  useEffect(() => {
    touched.current = false;
    setVb(home());
  }, [resetKey, home]);
  // Until the person moves the view, keep it framed for the current screen shape (rotation, first layout).
  useEffect(() => {
    if (!touched.current) setVb(homeFor(W, H, size));
  }, [size, W, H]);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const r = entry.contentRect;
      if (r.width && r.height) setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Screen scale and letterbox offsets for a given viewBox ("meet" fitting, the SVG default).
  const fit = (v) => {
    const rect = svgRef.current.getBoundingClientRect();
    const s = Math.min(rect.width / v.w, rect.height / v.h);
    return { rect, s, ox: (rect.width - v.w * s) / 2, oy: (rect.height - v.h * s) / 2 };
  };
  const toSvg = (cx, cy, v) => {
    const { rect, s, ox, oy } = fit(v);
    return { x: v.x + (cx - rect.left - ox) / s, y: v.y + (cy - rect.top - oy) / s };
  };
  const clampW = (w) => Math.min(W / MIN_ZOOM, Math.max(W / MAX_ZOOM, w));
  // A viewBox of width w that puts drawing point p under the screen point (cx, cy), kept near the drawing.
  const place = (p, cx, cy, w) => {
    const h = (w * H) / W;
    const { rect, s, ox, oy } = fit({ x: 0, y: 0, w, h });
    let x = p.x - (cx - rect.left - ox) / s;
    let y = p.y - (cy - rect.top - oy) / s;
    const midX = Math.min(W * 1.25, Math.max(-W * 0.25, x + w / 2));
    const midY = Math.min(H * 1.25, Math.max(-H * 0.25, y + h / 2));
    x = midX - w / 2;
    y = midY - h / 2;
    return { x, y, w, h };
  };

  const zoomAt = (factor, cx, cy) => {
    if (!svgRef.current) return;
    const v = vbRef.current;
    if (cx === undefined) {
      const r = svgRef.current.getBoundingClientRect();
      cx = r.left + r.width / 2;
      cy = r.top + r.height / 2;
    }
    touched.current = true;
    setVb(place(toSvg(cx, cy, v), cx, cy, clampW(v.w / factor)));
  };

  // Wheel zoom needs a non-passive listener so the page itself doesn't scroll.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const restart = () => {
    gesture.current = {
      startVb: vbRef.current,
      start: [...pointers.current.values()].map((p) => ({ ...p })),
      moved: gesture.current?.moved || false,
    };
  };

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    restart();
  };

  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    const now = [...pointers.current.values()];
    if (now.length === 1 && g.start.length === 1) {
      const a = g.start[0];
      if (!g.moved && Math.hypot(now[0].x - a.x, now[0].y - a.y) < DRAG_START_PX) return;
      if (!g.moved) {
        g.moved = true;
        touched.current = true;
        setPanning(true);
        svgRef.current.setPointerCapture?.(e.pointerId);
      }
      setVb(place(toSvg(a.x, a.y, g.startVb), now[0].x, now[0].y, g.startVb.w));
    } else if (now.length >= 2 && g.start.length >= 2) {
      const [a0, b0] = g.start;
      const [a1, b1] = now;
      const d0 = Math.hypot(b0.x - a0.x, b0.y - a0.y) || 1;
      const d1 = Math.hypot(b1.x - a1.x, b1.y - a1.y);
      const m0 = { x: (a0.x + b0.x) / 2, y: (a0.y + b0.y) / 2 };
      const m1 = { x: (a1.x + b1.x) / 2, y: (a1.y + b1.y) / 2 };
      g.moved = true;
      touched.current = true;
      setPanning(true);
      setVb(place(toSvg(m0.x, m0.y, g.startVb), m1.x, m1.y, clampW(g.startVb.w / (d1 / d0))));
    }
  };

  const onPointerUp = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.delete(e.pointerId);
    if (gesture.current?.moved) {
      suppressClick.current = true;
      setTimeout(() => {
        suppressClick.current = false;
      }, 0);
    }
    if (pointers.current.size === 0) {
      gesture.current = null;
      setPanning(false);
    } else {
      restart();
    }
  };

  // Swallow the click that ends a drag, so dragging over a planet doesn't select it.
  const onClickCapture = (e) => {
    if (suppressClick.current) {
      e.stopPropagation();
      e.preventDefault();
      suppressClick.current = false;
    }
  };

  return {
    vb,
    svgRef,
    panning,
    zoom: W / vb.w,
    pxPerUnit: Math.min(size.w / vb.w, size.h / vb.h),
    canZoomIn: vb.w > W / MAX_ZOOM + 0.5,
    canZoomOut: vb.w < W / MIN_ZOOM - 0.5,
    zoomIn: () => zoomAt(1.4),
    zoomOut: () => zoomAt(1 / 1.4),
    reset: () => {
      touched.current = false;
      setVb(home());
    },
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onClickCapture },
  };
}
