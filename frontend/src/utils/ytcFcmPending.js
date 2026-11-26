// Module-level queue of YTC/confirm FCM order IDs.
// Survives /loading: NotificationContext can enqueue before Dashboard mounts;
// YtcFcmHydrator processes without clearing until each id hydrates successfully
// (so LoadingPage setOrders cannot lose in-flight optimistics).

const pending = new Set();

const toId = (orderId) => {
  const n = Number(orderId);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** @param {string|number} orderId */
export const enqueueYtcFcm = (orderId) => {
  const id = toId(orderId);
  if (id == null) return null;
  pending.add(id);
  return id;
};

/** @param {string|number} orderId */
export const removeYtcFcm = (orderId) => {
  const id = toId(orderId);
  if (id == null) return;
  pending.delete(id);
};

/** Non-destructive snapshot. */
export const peekYtcFcmPending = () => [...pending];
