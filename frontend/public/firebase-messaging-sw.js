// Firebase Messaging Service Worker
// Handles background push notifications when the app is not in focus

/* eslint-disable no-restricted-globals */
/* eslint-disable no-undef */

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

// Firebase config is injected at registration time via query params
// Fallback: read from self.__FIREBASE_CONFIG if set
const urlParams = new URLSearchParams(self.location.search);

const firebaseConfig = {
  apiKey: urlParams.get('apiKey') || '',
  authDomain: urlParams.get('authDomain') || '',
  projectId: urlParams.get('projectId') || '',
  storageBucket: urlParams.get('storageBucket') || '',
  messagingSenderId: urlParams.get('messagingSenderId') || '',
  appId: urlParams.get('appId') || '',
};

// Only initialize if we have a project ID
if (firebaseConfig.projectId) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  // Handle background messages
  messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Background message:', payload);

    const data = payload.data || {};
    const title = data.title || payload.notification?.title || 'MyGenie POS';
    const body = data.body || payload.notification?.body || 'New notification';
    const sound = data.sound || '';

    // Show native notification
    const options = {
      body: body,
      icon: '/logo192.png',
      badge: '/logo192.png',
      tag: data.type || 'notification',
      data: data,
      requireInteraction: sound !== 'silent',
    };

    self.registration.showNotification(title, options);

    // Forward to all clients for sound playback
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'BACKGROUND_NOTIFICATION',
          payload: data,
        });
      });
    });
  });
}

// Handle notification click - focus or open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing tab if available
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new tab
      return self.clients.openWindow('/dashboard');
    })
  );
});
