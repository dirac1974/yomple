/**
 * @bloom-n/camera-rig-3d — Roblox-Style Follow, Orbit & Pinch/Wheel Zoom Camera Controller
 *
 * Provides:
 * 1. Slightly more zoomed-out default third-person view (`DEFAULT_CAMERA_DISTANCE = 18.5m`).
 * 2. Smooth zoom in/out (`8.5m` close hero view to `32.0m` wide overview) via scroll wheel,
 *    2-finger mobile pinch, keyboard (`I` / `O`, `+` / `-`), or HUD `+` / `−` buttons.
 * 3. Roblox-style 360° yaw + vertical pitch camera aim via 1-finger touch drag on the 3D canvas
 *    or mouse drag (right-drag or left-drag on canvas), with smooth auto-follow alignment when
 *    steering and terrain floor anti-clip clamping so the view NEVER gets stuck!
 * 4. Pure, deterministic core math (zero DOM dependency in `RobloxFollowCameraRig`) for headless
 *    Node verification and 1:1 Roblox Studio `Workspace.CurrentCamera` parity.
 */

export const DEFAULT_CAMERA_DISTANCE = 18.5;
export const MIN_CAMERA_DISTANCE = 8.5;
export const MAX_CAMERA_DISTANCE = 32.0;

export const DEFAULT_CAMERA_PITCH = 0.43; // ~24.6 deg elevated overview
export const MIN_CAMERA_PITCH = 0.14; // ~8 deg low horizon aim
export const MAX_CAMERA_PITCH = 1.12; // ~64 deg high tactical bird's-eye view

const FOLLOW_HOLD_AFTER_ORBIT_SEC = 1.85;

function finiteNum(v, fallback = 0) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clampNum(v, lo, hi, fallback = lo) {
  const n = finiteNum(v, fallback);
  return n < lo ? lo : n > hi ? hi : n;
}

export function wrapRadians(angle) {
  const a = finiteNum(angle, 0);
  return Math.atan2(Math.sin(a), Math.cos(a));
}

export class RobloxFollowCameraRig {
  constructor({
    defaultDistance = DEFAULT_CAMERA_DISTANCE,
    minDistance = MIN_CAMERA_DISTANCE,
    maxDistance = MAX_CAMERA_DISTANCE,
    defaultPitch = DEFAULT_CAMERA_PITCH,
    minPitch = MIN_CAMERA_PITCH,
    maxPitch = MAX_CAMERA_PITCH,
    pivotHeight = 1.95,
    lookAheadBase = 4.8,
  } = {}) {
    this.minDistance = clampNum(minDistance, 4.0, 60.0, MIN_CAMERA_DISTANCE);
    this.maxDistance = Math.max(this.minDistance + 2.0, clampNum(maxDistance, 10.0, 80.0, MAX_CAMERA_DISTANCE));
    this.defaultDistance = clampNum(defaultDistance, this.minDistance, this.maxDistance, DEFAULT_CAMERA_DISTANCE);

    this.minPitch = clampNum(minPitch, 0.05, 1.35, MIN_CAMERA_PITCH);
    this.maxPitch = Math.max(this.minPitch + 0.1, clampNum(maxPitch, 0.25, 1.42, MAX_CAMERA_PITCH));
    this.defaultPitch = clampNum(defaultPitch, this.minPitch, this.maxPitch, DEFAULT_CAMERA_PITCH);

    this.pivotHeight = finiteNum(pivotHeight, 1.95);
    this.lookAheadBase = finiteNum(lookAheadBase, 4.8);

    this.distance = this.defaultDistance;
    this.targetDistance = this.defaultDistance;

    this.yawOffset = 0;
    this.targetYawOffset = 0;

    this.pitch = this.defaultPitch;
    this.targetPitch = this.defaultPitch;

    this.isDragging = false;
    this.orbitHoldTimer = 0;
    this._initialized = false;
  }

  /**
   * Orbits camera aim by `deltaYaw` (radians) and `deltaPitch` (radians).
   * Positive `deltaYaw` rotates view left, negative rotates view right (matching Roblox drag).
   */
  orbitBy(deltaYaw = 0, deltaPitch = 0) {
    const dy = finiteNum(deltaYaw, 0);
    const dp = finiteNum(deltaPitch, 0);
    this.targetYawOffset = wrapRadians(this.targetYawOffset + dy);
    this.targetPitch = clampNum(this.targetPitch + dp, this.minPitch, this.maxPitch, this.defaultPitch);
    this.orbitHoldTimer = FOLLOW_HOLD_AFTER_ORBIT_SEC;
    return this.getState();
  }

  /**
   * Adjusts target zoom distance by `deltaDistance` (+ zooms out, - zooms in).
   */
  zoomBy(deltaDistance = 0) {
    const dd = finiteNum(deltaDistance, 0);
    this.targetDistance = clampNum(
      this.targetDistance + dd,
      this.minDistance,
      this.maxDistance,
      this.defaultDistance
    );
    return this.targetDistance;
  }

  /**
   * Multiplicative zoom scale (>1 zooms out, <1 zooms in) for smooth 2-finger pinch gestures.
   */
  zoomScale(scaleFactor = 1) {
    const s = clampNum(scaleFactor, 0.25, 4.0, 1.0);
    this.targetDistance = clampNum(
      this.targetDistance * s,
      this.minDistance,
      this.maxDistance,
      this.defaultDistance
    );
    return this.targetDistance;
  }

  setZoomDistance(distance) {
    this.targetDistance = clampNum(distance, this.minDistance, this.maxDistance, this.defaultDistance);
    return this.targetDistance;
  }

  /**
   * Smoothly resets camera behind the player's rig at the comfortable zoomed-out default.
   */
  resetBehindRig({ immediate = false } = {}) {
    this.targetYawOffset = 0;
    this.targetPitch = this.defaultPitch;
    this.targetDistance = this.defaultDistance;
    this.orbitHoldTimer = 0;
    this.isDragging = false;
    if (immediate) {
      this.yawOffset = 0;
      this.pitch = this.defaultPitch;
      this.distance = this.defaultDistance;
    }
    return this.getState();
  }

  setDragging(active) {
    this.isDragging = Boolean(active);
    if (this.isDragging) {
      this.orbitHoldTimer = FOLLOW_HOLD_AFTER_ORBIT_SEC;
    }
  }

  getState() {
    return {
      distance: this.distance,
      targetDistance: this.targetDistance,
      yawOffset: this.yawOffset,
      targetYawOffset: this.targetYawOffset,
      pitch: this.pitch,
      targetPitch: this.targetPitch,
      isDragging: this.isDragging,
    };
  }

  /**
   * Steps smooth Roblox-style chase/orbit camera and computes `{ posX, posY, posZ, lookX, lookY, lookZ }`.
   * If `camera` (a Three.js Camera) is passed, applies smoothed position & lookAt directly.
   *
   * Key guarantee: Gate framing ONLY activates when BOTH `activeGateSlot` AND `encounterDockOpen`
   * are truthy, and NEVER zooms closer than `15.8m`, while still honoring user zoom & orbit!
   */
  step({
    dt = 1 / 60,
    rigState = {},
    activeGateSlot = null,
    encounterDockOpen = false,
    groundHeightAt = null,
    camera = null,
  } = {}) {
    const safeDt = clampNum(dt, 0, 0.1, 1 / 60);
    const rx = clampNum(rigState.x, -500, 500, 0);
    const ry = clampNum(rigState.y, -40, 120, 0);
    const rz = clampNum(rigState.z, -500, 500, 0);
    const heading = wrapRadians(rigState.heading);
    const speed = finiteNum(rigState.speed, 0);
    const steer = finiteNum(rigState.steerInput ?? rigState.steer, 0);

    // Roblox Follow gentle auto-alignment when actively steering & not touching camera
    if (this.isDragging) {
      this.orbitHoldTimer = FOLLOW_HOLD_AFTER_ORBIT_SEC;
    } else if (this.orbitHoldTimer > 0) {
      this.orbitHoldTimer = Math.max(0, this.orbitHoldTimer - safeDt);
    } else if (!encounterDockOpen && Math.abs(speed) > 1.2 && Math.abs(steer) > 0.08) {
      const recenterRate = 1.45 * Math.min(1, Math.abs(steer));
      this.targetYawOffset = wrapRadians(this.targetYawOffset) * Math.exp(-recenterRate * safeDt);
      if (Math.abs(this.targetYawOffset) < 0.004) this.targetYawOffset = 0;
    }

    // Smoothly interpolate zoom, pitch, and yaw offset
    const smoothFast = 1 - Math.exp(-14.0 * safeDt);
    this.distance += (this.targetDistance - this.distance) * smoothFast;
    this.pitch += (this.targetPitch - this.pitch) * smoothFast;
    const yawDiff = wrapRadians(this.targetYawOffset - this.yawOffset);
    this.yawOffset = wrapRadians(this.yawOffset + yawDiff * smoothFast);

    const framingGate = Boolean(activeGateSlot && encounterDockOpen);

    let desiredCamX = 0;
    let desiredCamY = 0;
    let desiredCamZ = 0;
    let lookX = 0;
    let lookY = 0;
    let lookZ = 0;

    if (framingGate) {
      const gx = clampNum(activeGateSlot.x, -500, 500, rx);
      const gy = clampNum(activeGateSlot.y, -40, 120, ry);
      const gz = clampNum(activeGateSlot.z, -500, 500, rz);

      // Base azimuth points from rig toward gate, plus player's live orbit offset!
      const toGateDx = gx - rx;
      const toGateDz = gz - rz;
      const toGateLen = Math.hypot(toGateDx, toGateDz);
      const baseGateYaw =
        toGateLen > 0.4 ? Math.atan2(-toGateDx, -toGateDz) : heading;
      const camYaw = wrapRadians(baseGateYaw + this.yawOffset);
      const dirX = -Math.sin(camYaw);
      const dirZ = -Math.cos(camYaw);
      const rightX = Math.cos(camYaw);
      const rightZ = -Math.sin(camYaw);

      // Never zoom tighter than 16.0m so player never feels cramped or stuck zoomed-in!
      const gateDist = Math.max(16.0, this.distance * 0.95);
      const horizDist = gateDist * Math.cos(this.pitch);
      const vertDist = gateDist * Math.sin(this.pitch);

      const anchorX = rx * 0.55 + gx * 0.45;
      const anchorZ = rz * 0.55 + gz * 0.45;
      const anchorY = Math.max(ry, gy);

      // Slight lateral offset keeps the 3D gate framed cleanly beside the right-hand Encounter Dock
      desiredCamX = anchorX - dirX * horizDist + rightX * 2.2;
      desiredCamZ = anchorZ - dirZ * horizDist + rightZ * 2.2;
      desiredCamY = anchorY + this.pivotHeight + vertDist;

      lookX = rx * 0.32 + gx * 0.68 + rightX * 1.4;
      lookZ = rz * 0.32 + gz * 0.68 + rightZ * 1.4;
      lookY = gy + 2.6;
    } else {
      const camYaw = wrapRadians(heading + this.yawOffset);
      const dirX = -Math.sin(camYaw);
      const dirZ = -Math.cos(camYaw);

      const horizDist = this.distance * Math.cos(this.pitch);
      const vertDist = this.distance * Math.sin(this.pitch);
      // Look slightly less far ahead as camera tilts overhead so rig stays well-framed
      const lookAhead = this.lookAheadBase * Math.cos(this.pitch * 0.72);

      desiredCamX = rx - dirX * horizDist;
      desiredCamZ = rz - dirZ * horizDist;
      desiredCamY = ry + this.pivotHeight + vertDist;

      lookX = rx + dirX * lookAhead;
      lookZ = rz + dirZ * lookAhead;
      lookY = ry + this.pivotHeight;
    }

    // Terrain anti-clip floor: camera never dips beneath snowdrifts, sanctuary hills, or ramparts
    if (typeof groundHeightAt === "function") {
      const groundY = finiteNum(groundHeightAt(desiredCamX, desiredCamZ), ry);
      const minSafeY = groundY + 1.65;
      if (desiredCamY < minSafeY) {
        desiredCamY = minSafeY;
      }
    }

    if (camera && camera.position) {
      if (!this._initialized) {
        camera.position.set(desiredCamX, desiredCamY, desiredCamZ);
        this._initialized = true;
      } else {
        const posLerp = this.isDragging
          ? 1 - Math.exp(-18.0 * safeDt)
          : 1 - Math.exp(-7.2 * safeDt);
        camera.position.x += (desiredCamX - camera.position.x) * posLerp;
        camera.position.y += (desiredCamY - camera.position.y) * posLerp;
        camera.position.z += (desiredCamZ - camera.position.z) * posLerp;
      }
      camera.lookAt(lookX, lookY, lookZ);
      if (typeof camera.updateMatrixWorld === "function") {
        camera.updateMatrixWorld();
      }
    }

    return {
      posX: desiredCamX,
      posY: desiredCamY,
      posZ: desiredCamZ,
      lookX,
      lookY,
      lookZ,
      distance: this.distance,
      yawOffset: this.yawOffset,
      pitch: this.pitch,
      framingGate,
    };
  }
}

/**
 * Binds Roblox-style pointer/touch/wheel camera controls onto a 3D `<canvas>` element:
 * - 1-finger touch drag OR mouse drag (right-click drag or left-click drag on canvas):
 *   smooth 360° yaw + vertical pitch camera aim.
 * - 2-finger touch pinch: smooth camera zoom in/out (with zero jump when lifting 1 finger).
 * - Mouse wheel / trackpad two-finger scroll: smooth camera zoom in/out.
 * - Double-click / double-tap on open canvas: optional crisp reset if tapped without dragging.
 */
export function bindCanvasCameraGestures(canvas, getCameraRig) {
  if (!canvas || typeof canvas.addEventListener !== "function") {
    return () => {};
  }

  const activePointers = new Map();
  let prevPinchDist = 0;
  let prevPinchMidX = 0;
  let prevPinchMidY = 0;

  const YAW_SENSITIVITY = 0.0058;
  const PITCH_SENSITIVITY = 0.0046;

  const syncDragFlag = () => {
    const rig = getCameraRig?.();
    rig?.setDragging(activePointers.size > 0);
  };

  const onContextMenu = (e) => {
    e.preventDefault();
  };

  const onPointerDown = (e) => {
    // Allow left mouse (0), right mouse (2), middle (1), and touch/pen pointers
    if (e.pointerType === "mouse" && e.button !== 0 && e.button !== 2 && e.button !== 1) {
      return;
    }
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try {
      canvas.setPointerCapture?.(e.pointerId);
    } catch {}

    if (activePointers.size === 2) {
      const pts = [...activePointers.values()];
      prevPinchDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      prevPinchMidX = (pts[0].x + pts[1].x) * 0.5;
      prevPinchMidY = (pts[0].y + pts[1].y) * 0.5;
    }
    syncDragFlag();
  };

  const onPointerMove = (e) => {
    const rec = activePointers.get(e.pointerId);
    if (!rec) return;
    const rig = getCameraRig?.();
    if (!rig) {
      rec.x = e.clientX;
      rec.y = e.clientY;
      return;
    }

    if (activePointers.size === 1) {
      const dx = e.clientX - rec.x;
      const dy = e.clientY - rec.y;
      rec.x = e.clientX;
      rec.y = e.clientY;
      if (Math.abs(dx) > 0.2 || Math.abs(dy) > 0.2) {
        // Dragging right (dx > 0) turns view right (-yawOffset); dragging down (dy > 0) raises pitch overhead
        rig.orbitBy(-dx * YAW_SENSITIVITY, dy * PITCH_SENSITIVITY);
      }
    } else if (activePointers.size >= 2) {
      rec.x = e.clientX;
      rec.y = e.clientY;
      const pts = [...activePointers.values()];
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const midX = (pts[0].x + pts[1].x) * 0.5;
      const midY = (pts[0].y + pts[1].y) * 0.5;

      if (prevPinchDist > 12 && dist > 12) {
        const scale = prevPinchDist / dist; // spreading fingers (dist > prev) -> scale < 1 -> zooms in
        rig.zoomScale(scale);
      }
      const mdx = midX - prevPinchMidX;
      const mdy = midY - prevPinchMidY;
      if (Math.abs(mdx) > 0.3 || Math.abs(mdy) > 0.3) {
        rig.orbitBy(-mdx * YAW_SENSITIVITY * 0.75, mdy * PITCH_SENSITIVITY * 0.75);
      }
      prevPinchDist = dist;
      prevPinchMidX = midX;
      prevPinchMidY = midY;
    }
  };

  const removePointer = (e) => {
    if (!activePointers.has(e.pointerId)) return;
    activePointers.delete(e.pointerId);
    try {
      canvas.releasePointerCapture?.(e.pointerId);
    } catch {}

    // Reset remaining pointer anchor so 2-finger -> 1-finger transition never jumps!
    if (activePointers.size === 1) {
      prevPinchDist = 0;
    } else if (activePointers.size >= 2) {
      const pts = [...activePointers.values()];
      prevPinchDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      prevPinchMidX = (pts[0].x + pts[1].x) * 0.5;
      prevPinchMidY = (pts[0].y + pts[1].y) * 0.5;
    } else {
      prevPinchDist = 0;
    }
    syncDragFlag();
  };

  const onWheel = (e) => {
    e.preventDefault();
    const rig = getCameraRig?.();
    if (!rig) return;
    const rawDelta = e.deltaMode === 1 ? e.deltaY * 28 : e.deltaY;
    const zoomStep = clampNum(rawDelta * 0.016, -3.6, 3.6, 0);
    rig.zoomBy(zoomStep);
  };

  canvas.addEventListener("contextmenu", onContextMenu);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", removePointer);
  canvas.addEventListener("pointercancel", removePointer);
  canvas.addEventListener("lostpointercapture", removePointer);
  canvas.addEventListener("wheel", onWheel, { passive: false });

  return () => {
    activePointers.clear();
    canvas.removeEventListener("contextmenu", onContextMenu);
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerup", removePointer);
    canvas.removeEventListener("pointercancel", removePointer);
    canvas.removeEventListener("lostpointercapture", removePointer);
    canvas.removeEventListener("wheel", onWheel);
  };
}
