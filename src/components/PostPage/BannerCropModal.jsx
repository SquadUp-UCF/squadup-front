/**
 * Pan/zoom/crop editor shown after a host picks a banner image, before it's
 * uploaded. Two problems this solves:
 *
 * 1. Large photos (multi-MB, high-megapixel phone camera shots) were failing
 *    to upload against the API's 5MB cap. Rather than raise that limit
 *    (backend), this editor always re-renders the chosen crop onto a fixed
 *    ~1200px-wide canvas and exports it as a compressed JPEG — so whatever
 *    the source photo's size, what actually gets uploaded is small and
 *    predictable.
 * 2. Hosts had no way to control which part of a photo becomes the banner;
 *    `background-size: cover` just centered and cropped it sight-unseen. This
 *    lets them drag/zoom to choose, with a live preview of exactly what will
 *    be kept (the clear window) vs. cropped away (the dimmed area).
 *
 * The stage's on-screen size is controlled entirely by CSS (it shrinks to fit
 * narrow phone screens) and measured via ResizeObserver rather than assumed —
 * all the pan/zoom/crop math is done in real rendered pixels, so it stays
 * correct at any viewport width instead of only matching a fixed desktop size.
 */
import { useEffect, useRef, useState } from "react";
import "./BannerCropModal.css";

const CROP_ASPECT = 2.5;
// Crop window width as a fraction of the stage's rendered width, leaving a
// margin on every side so the dimmed "cropped away" context is visible.
const CROP_FRACTION = 0.9;
const OUTPUT_WIDTH = 1200;
const OUTPUT_HEIGHT = Math.round(OUTPUT_WIDTH / CROP_ASPECT);
const ZOOM_MIN = 1;
const ZOOM_MAX = 3;

export default function BannerCropModal({ file, onCancel, onConfirm }) {
  const [imgUrl, setImgUrl] = useState(null);
  const [natural, setNatural] = useState(null); // { w, h }
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });
  const stageRef = useRef(null);
  const imgRef = useRef(null);
  const dragRef = useRef(null); // { startX, startY, panX, panY } while dragging

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    setNatural(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setStageSize({ w: width, h: height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [file]);

  if (!file) return null;

  const cropW = stageSize.w * CROP_FRACTION;
  const cropH = cropW / CROP_ASPECT;
  const ready = Boolean(natural) && cropW > 0;

  // At zoom 1 the image exactly covers the crop window (like object-fit:
  // cover, but only guaranteed for the crop window — the rest of the stage
  // may show the modal background if the photo doesn't extend that far,
  // which is fine, it's just dimmed context).
  const baseScale = ready ? Math.max(cropW / natural.w, cropH / natural.h) : 1;
  const scale = baseScale * zoom;
  const iw = ready ? natural.w * scale : 0;
  const ih = ready ? natural.h * scale : 0;
  const maxPanX = Math.max(0, (iw - cropW) / 2);
  const maxPanY = Math.max(0, (ih - cropH) / 2);

  function clampPan(x, y) {
    return {
      x: Math.min(maxPanX, Math.max(-maxPanX, x)),
      y: Math.min(maxPanY, Math.max(-maxPanY, y)),
    };
  }

  function handleImgLoad(e) {
    setNatural({ w: e.target.naturalWidth, h: e.target.naturalHeight });
  }

  function handlePointerDown(e) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
  }

  function handlePointerMove(e) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPan(clampPan(dragRef.current.panX + dx, dragRef.current.panY + dy));
  }

  function handlePointerUp(e) {
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragRef.current = null;
  }

  function handleZoomChange(e) {
    const nextZoom = Number(e.target.value);
    setZoom(nextZoom);
    // Re-clamp against the new bounds so a zoom-out can't leave the pan
    // pointing further than the image now extends.
    const nextScale = baseScale * nextZoom;
    const niw = natural.w * nextScale;
    const nih = natural.h * nextScale;
    const nMaxX = Math.max(0, (niw - cropW) / 2);
    const nMaxY = Math.max(0, (nih - cropH) / 2);
    setPan((prev) => ({
      x: Math.min(nMaxX, Math.max(-nMaxX, prev.x)),
      y: Math.min(nMaxY, Math.max(-nMaxY, prev.y)),
    }));
  }

  function handleConfirm() {
    if (!ready || !imgRef.current) return;
    const natCropW = cropW / scale;
    const natCropH = cropH / scale;
    let sx = natural.w / 2 - pan.x / scale - natCropW / 2;
    let sy = natural.h / 2 - pan.y / scale - natCropH / 2;
    sx = Math.min(Math.max(sx, 0), Math.max(0, natural.w - natCropW));
    sy = Math.min(Math.max(sy, 0), Math.max(0, natural.h - natCropH));

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_WIDTH;
    canvas.height = OUTPUT_HEIGHT;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(imgRef.current, sx, sy, natCropW, natCropH, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const croppedFile = new File([blob], "banner.jpg", { type: "image/jpeg" });
        onConfirm(croppedFile);
      },
      "image/jpeg",
      0.85
    );
  }

  return (
    <div
      className="bcm-overlay"
      onClick={(e) => {
        // Nested inside PostGameModal's own overlay — without this, clicking
        // the backdrop to cancel the crop would bubble up and close the
        // whole "post a game" form too.
        e.stopPropagation();
        onCancel();
      }}
    >
      <div className="bcm-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="bcm-title">Adjust banner</h3>
        <p className="bcm-hint">Drag to reposition, use the slider to zoom.</p>

        <div
          ref={stageRef}
          className="bcm-stage"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {imgUrl && (
            <img
              ref={imgRef}
              src={imgUrl}
              alt=""
              onLoad={handleImgLoad}
              draggable={false}
              className="bcm-image"
              style={{
                width: iw || undefined,
                height: ih || undefined,
                transform: `translate(${pan.x - iw / 2}px, ${pan.y - ih / 2}px)`,
                visibility: ready ? "visible" : "hidden",
              }}
            />
          )}

          {/* The "keep" window: box-shadow spills a dark tint over everything
              in the stage outside this rect, so the rest reads as cropped-away
              context rather than part of the final banner. */}
          {cropW > 0 && (
            <div className="bcm-crop-window" style={{ width: cropW, height: cropH }} />
          )}
        </div>

        <input
          type="range"
          className="bcm-zoom"
          min={ZOOM_MIN}
          max={ZOOM_MAX}
          step={0.01}
          value={zoom}
          onChange={handleZoomChange}
          disabled={!ready}
        />

        <div className="bcm-actions">
          <button type="button" className="bcm-btn bcm-btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="bcm-btn bcm-btn-confirm"
            onClick={handleConfirm}
            disabled={!ready}
          >
            Use photo
          </button>
        </div>
      </div>
    </div>
  );
}
