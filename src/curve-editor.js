// Audio Curve Lab normalized node interpolation; reusable across tools.
export function valueAt(curve, x) {
  if (!curve || curve.length === 0) return 0;
  if (x <= curve[0].x) return curve[0].y;
  for (let i = 1; i < curve.length; i += 1) {
    const a = curve[i - 1];
    const b = curve[i];
    if (x <= b.x) {
      const t = (x - a.x) / Math.max(1e-6, b.x - a.x);
      const eased = t * t * (3 - (2 * t));
      return a.y + ((b.y - a.y) * eased);
    }
  }
  return curve[curve.length - 1].y;
}

export const tools = Object.freeze(['select', 'pen', 'eraser']);
const gap = 1e-6;
const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
export function addNode(curve, point) {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return -1;
  const x = clamp(point.x, gap, 1 - gap), y = clamp(point.y, 0, 1);
  const existing = curve.findIndex(p => Math.abs(p.x - x) < gap);
  if (existing >= 0) { curve[existing].y = y; return existing; }
  const node = {x, y}; curve.push(node); curve.sort((a,b) => a.x-b.x); return curve.indexOf(node);
}
export function moveNode(curve, index, point) {
  if (!curve[index] || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
  curve[index].x = index === 0 ? 0 : index === curve.length - 1 ? 1 : clamp(point.x, curve[index-1].x + gap/10, curve[index+1].x - gap/10);
  curve[index].y = clamp(point.y, 0, 1);
}
export function eraseNode(curve, index) {
  if (index <= 0 || index >= curve.length - 1) return false;
  curve.splice(index, 1); return true;
}
