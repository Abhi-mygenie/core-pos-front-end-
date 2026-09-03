// CR-166: Restaurant Picker Page — shown after CS/franchise admin common login
// Guard: requires COMMON_TOKEN; does NOT use ProtectedRoute (AUTH_TOKEN not yet set at this stage)
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCommonToken } from '../api/services/authService';
import { getAssignedRestaurants, loginAsRestaurant, commonLogout } from '../api/services/commonAuthService';
import { COLORS, GENIE_LOGO_URL } from '../constants';
import { useToast } from '../hooks/use-toast';
import { Search, LogOut, ArrowRight, Loader2, Building2 } from 'lucide-react';

const RestaurantPickerPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [restaurants, setRestaurants] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selecting, setSelecting] = useState(null); // restaurantId currently being selected

  // Guard: COMMON_TOKEN required — redirect to login if absent
  useEffect(() => {
    if (!getCommonToken()) {
      navigate('/', { replace: true });
      return;
    }
    fetchRestaurants();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAssignedRestaurants();
      setRestaurants(data);
    } catch (err) {
      setError('Failed to load restaurants. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (restaurantId) => {
    if (selecting) return;
    setSelecting(restaurantId);
    try {
      await loginAsRestaurant(restaurantId);
      navigate('/loading', { replace: true });
    } catch (err) {
      toast({
        title: 'Failed to switch restaurant',
        description: err.readableMessage || 'Please try again.',
        variant: 'destructive',
      });
      setSelecting(null);
    }
  };

  const handleLogout = async () => {
    try {
      await commonLogout();
    } catch (_) { /* best-effort */ }
    // CR-166 BUG3: clear BOTH tokens — auth_token may still be set from a previous
    // restaurant selection. Without this, LoginPage sees isAuthenticated=true and
    // redirects back to /loading → outlet instead of fully logging out.
    localStorage.removeItem('common_auth_token');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('crm_token');
    navigate('/', { replace: true });
  };

  // D3 open: logo CDN base URL TBD — using initials fallback until owner confirms
  const getInitials = (name) =>
    (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const filtered = restaurants.filter(r =>
    !search ||
    r.restaurant_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.restaurant_address?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      data-testid="restaurant-picker-page"
      className="min-h-screen"
      style={{ backgroundColor: COLORS.sectionBg }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 shadow-sm"
        style={{ backgroundColor: COLORS.lightBg, borderBottom: `1px solid ${COLORS.borderGray}` }}
      >
        <div className="flex items-center gap-3">
          <img src={GENIE_LOGO_URL} alt="MyGenie" className="h-10 w-auto" />
          <div>
            <h1 className="text-lg font-semibold" style={{ color: COLORS.darkText }}>
              Select Restaurant
            </h1>
            <p className="text-xs" style={{ color: COLORS.grayText }}>
              Choose a restaurant to continue
            </p>
          </div>
        </div>
        <button
          data-testid="restaurant-picker-logout"
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
          style={{ color: '#EF4444' }}
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>

      {/* Search */}
      <div className="max-w-5xl mx-auto px-6 pt-6 pb-4">
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-white"
          style={{ borderColor: COLORS.borderGray }}
        >
          <Search className="w-5 h-5 flex-shrink-0" style={{ color: COLORS.grayText }} />
          <input
            data-testid="restaurant-picker-search"
            type="text"
            placeholder="Search by name or address..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 outline-none text-sm bg-transparent"
            style={{ color: COLORS.darkText }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 pb-10">
        {loading && (
          <div className="flex justify-center py-20" data-testid="picker-loading">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: COLORS.primaryGreen }} />
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-20">
            <p className="text-sm mb-4" style={{ color: '#EF4444' }}>{error}</p>
            <button
              data-testid="picker-retry"
              onClick={fetchRestaurants}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: COLORS.primaryGreen }}
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-20">
            <Building2 className="w-10 h-10 mx-auto mb-3" style={{ color: COLORS.borderGray }} />
            <p className="text-sm" style={{ color: COLORS.grayText }}>
              {search ? 'No restaurants match your search.' : 'No restaurants assigned to your account.'}
            </p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(r => {
              const isSelecting = selecting === r.restaurant_id;
              const isDisabled = !!selecting && !isSelecting;
              return (
                <button
                  key={r.restaurant_id}
                  data-testid={`restaurant-card-${r.restaurant_id}`}
                  onClick={() => handleSelect(r.restaurant_id)}
                  disabled={isDisabled || isSelecting}
                  className="text-left rounded-2xl border p-5 transition-all hover:shadow-md hover:border-green-300 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                  style={{ borderColor: isSelecting ? COLORS.primaryGreen : COLORS.borderGray }}
                >
                  <div className="flex items-start gap-4">
                    {/* Initials avatar — D3: CDN URL open, using initials fallback */}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-sm font-bold"
                      style={{ backgroundColor: COLORS.primaryGreen }}
                    >
                      {getInitials(r.restaurant_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: COLORS.darkText }}>
                        {r.restaurant_name}
                      </p>
                      <p className="text-xs mt-0.5 line-clamp-2" style={{ color: COLORS.grayText }}>
                        {r.restaurant_address || 'No address'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end mt-4">
                    {isSelecting ? (
                      <Loader2 className="w-4 h-4 animate-spin" style={{ color: COLORS.primaryGreen }} />
                    ) : (
                      <div
                        className="flex items-center gap-1 text-xs font-medium"
                        style={{ color: COLORS.primaryGreen }}
                      >
                        Enter POS <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantPickerPage;
