// utils/restaurantRef.js
// POS2-007 Phase 1 — module-level bridge from RestaurantContext into
// NotificationContext.
//
// Why this exists:
//   AppProviders.jsx mounts NotificationProvider OUTSIDE RestaurantProvider
//   (Auth → Socket → Notification → Restaurant — see
//   contexts/AppProviders.jsx:13-35). NotificationContext therefore cannot
//   call useRestaurant() — the hook would resolve to null at render time.
//
//   POS2-007 Phase 1 needs NotificationContext to read
//   `restaurant.settings.confirmOrderTone` at FCM-arrival time (which is
//   AFTER the restaurant profile has been loaded). A module-level ref
//   updated by RestaurantProvider in a useEffect, and read by
//   NotificationContext lazily inside processNotification, sidesteps the
//   provider-order issue without requiring a provider re-order refactor.
//
// Phase 2 (POS2-008): backend takes over tone selection; this bridge plus
//   the toneMapper utility plus the override block in NotificationContext
//   are deleted together. The 5 transform fields stay in profileTransform
//   for any future settings-page UI use.

let _restaurant = null;

/**
 * RestaurantProvider calls this whenever its restaurant state changes.
 */
export const setRestaurantRef = (restaurant) => {
  _restaurant = restaurant;
};

/**
 * NotificationContext (or any other consumer that cannot use
 * useRestaurant() due to provider-order constraints) calls this at
 * runtime to read the latest restaurant snapshot.
 *
 * @returns {Object|null}
 */
export const getRestaurantRef = () => _restaurant;
