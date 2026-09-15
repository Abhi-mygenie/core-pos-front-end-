// BUG-167: useSocketEvents was only called inside DashboardPage.
// Navigating to /menu, /expense-setup, etc. unmounted DashboardPage,
// tearing down the food_update_644 subscription and dropping all socket events.
// Fix: mount useSocketEvents() here — persists for the full session
// regardless of which route is active.
import { useSocketEvents } from '../api/socket';

const AppSocketManager = () => {
  useSocketEvents();
  return null;
};

export default AppSocketManager;
