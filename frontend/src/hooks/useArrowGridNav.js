// CR-482: spatial arrow navigation over grid elements
// Layout-agnostic: works with flex-wrap pill grids, channel columns, card grids.
// Uses getBoundingClientRect to find the nearest element in the pressed direction.

/**
 * Given a container, the currently focused element, and a direction,
 * returns the nearest sibling element in that direction.
 *
 * @param {HTMLElement} containerEl - parent container holding the navigable items
 * @param {HTMLElement|null} currentEl - currently focused/highlighted element (null = pick first)
 * @param {'ArrowUp'|'ArrowDown'|'ArrowLeft'|'ArrowRight'} direction - key pressed
 * @param {string} selector - CSS selector for navigable items (default: '[data-kbd-item]')
 * @returns {HTMLElement|null} the next element to focus, or null if none found
 */
export function moveFocus(containerEl, currentEl, direction, selector = '[data-kbd-item]') {
  if (!containerEl) return null;

  const items = Array.from(containerEl.querySelectorAll(selector));
  if (items.length === 0) return null;

  // If no current element, return the first item
  if (!currentEl || !items.includes(currentEl)) {
    return items[0];
  }

  const currentRect = currentEl.getBoundingClientRect();
  const cx = currentRect.left + currentRect.width / 2;
  const cy = currentRect.top + currentRect.height / 2;

  let bestEl = null;
  let bestDist = Infinity;

  for (const item of items) {
    if (item === currentEl) continue;

    const rect = item.getBoundingClientRect();
    const ix = rect.left + rect.width / 2;
    const iy = rect.top + rect.height / 2;

    // Check direction constraint
    let inDirection = false;
    switch (direction) {
      case 'ArrowUp':    inDirection = iy < cy - 2; break; // CR-482
      case 'ArrowDown':  inDirection = iy > cy + 2; break; // CR-482
      case 'ArrowLeft':  inDirection = ix < cx - 2; break; // CR-482
      case 'ArrowRight': inDirection = ix > cx + 2; break; // CR-482
      default: break;
    }

    if (!inDirection) continue;

    // Euclidean distance, but weight the primary axis more heavily
    // so items directly above/below are preferred over diagonal ones.
    const dx = ix - cx;
    const dy = iy - cy;
    let dist;
    if (direction === 'ArrowUp' || direction === 'ArrowDown') {
      dist = Math.abs(dy) + Math.abs(dx) * 2; // prefer vertical alignment // CR-482
    } else {
      dist = Math.abs(dx) + Math.abs(dy) * 2; // prefer horizontal alignment // CR-482
    }

    if (dist < bestDist) {
      bestDist = dist;
      bestEl = item;
    }
  }

  return bestEl;
}
