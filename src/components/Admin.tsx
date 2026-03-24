import { useState, useEffect, useCallback } from 'react';

interface Restaurant {
  id: number;
  name: string;
  created_at: string;
  rating_count: number;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface Rating {
  id: number;
  restaurant: string;
  food: number;
  service: number;
  choice: number;
  value: number;
  spiceLevel: number;
  overall: number;
  notes: string | null;
  date_visited: string | null;
  photo_path: string | null;
  created_at: string;
  ip_address: string | null;
}

const ADMIN_TOKEN_KEY = 'admin_session_token';

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
    <path d="M10 11v6"></path>
    <path d="M14 11v6"></path>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
  </svg>
);

const PhotoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <circle cx="8.5" cy="8.5" r="1.5"></circle>
    <polyline points="21 15 16 10 5 21"></polyline>
  </svg>
);

export function Admin() {
  const [password, setPassword] = useState('');
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(ADMIN_TOKEN_KEY));
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<'restaurants' | 'reviews'>('restaurants');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [addressInput, setAddressInput] = useState('');

  // Setup state
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [statusError, setStatusError] = useState(false);
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirm, setSetupConfirm] = useState('');
  const [setupError, setSetupError] = useState('');

  useEffect(() => {
    fetch('/api/admin/status')
      .then(r => r.json())
      .then(data => setIsConfigured(data.configured))
      .catch(() => setStatusError(true));
  }, []);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [restRes, ratingsRes] = await Promise.all([
        fetch('/api/admin/restaurants', { headers }),
        fetch('/api/admin/ratings', { headers }),
      ]);
      if (restRes.status === 401 || ratingsRes.status === 401) {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        setToken(null);
        return;
      }
      const restData = await restRes.json();
      const ratingsData = await ratingsRes.json();
      setRestaurants(restData.restaurants || []);
      setRatings(ratingsData.ratings || []);
    } catch {
      setError('Failed to load data. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError('');
    if (setupPassword.length < 8) {
      setSetupError('Password must be at least 8 characters.');
      return;
    }
    if (setupPassword !== setupConfirm) {
      setSetupError('Passwords do not match.');
      return;
    }
    try {
      const res = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: setupPassword }),
      });
      if (res.ok) {
        setIsConfigured(true);
        setSetupPassword('');
        setSetupConfirm('');
      } else {
        const data = await res.json().catch(() => ({}));
        setSetupError(data.message || 'Failed to create account. Please try again.');
      }
    } catch {
      setSetupError('Connection error. Please try again.');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
        setToken(data.token);
      } else {
        setLoginError('Invalid password');
      }
    } catch {
      setLoginError('Connection error. Please try again.');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setToken(null);
    setRestaurants([]);
    setRatings([]);
  };

  const deleteRestaurant = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}" and ALL its reviews? This cannot be undone.`)) return;
    setActionError('');
    const res = await fetch(`/api/admin/restaurants/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      fetchData();
    } else {
      setActionError('Failed to delete restaurant. Please try again.');
    }
  };

  const deleteRating = async (id: number) => {
    if (!confirm('Delete this review? This cannot be undone.')) return;
    setActionError('');
    const res = await fetch(`/api/admin/ratings/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      fetchData();
    } else {
      setActionError('Failed to delete review. Please try again.');
    }
  };

  const deletePhoto = async (id: number) => {
    if (!confirm('Delete the photo from this review? This cannot be undone.')) return;
    setActionError('');
    const res = await fetch(`/api/admin/ratings/${id}/photo`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      fetchData();
    } else {
      setActionError('Failed to delete photo. Please try again.');
    }
  };

  const saveAddress = async (id: number) => {
    setActionError('');
    const res = await fetch(`/api/admin/restaurants/${id}/address`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: addressInput }),
    });
    if (res.ok) {
      setEditingAddressId(null);
      setAddressInput('');
      fetchData();
    } else {
      setActionError('Failed to save address. Please try again.');
    }
  };

  // First-run setup screen
  if (statusError) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Admin Portal</h2>
        <p className="text-red-600 text-center">Could not connect to server. Please refresh and try again.</p>
      </div>
    );
  }

  if (isConfigured === null) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Admin Portal</h2>
        <p className="text-gray-500 text-center">Loading...</p>
      </div>
    );
  }

  // First-run setup screen
  if (isConfigured === false) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Admin Portal</h2>
        <p className="text-sm text-gray-500 text-center mb-6">Create your admin account to get started.</p>
        <form onSubmit={handleSetup} className="space-y-4 max-w-sm mx-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={setupPassword}
              onChange={(e) => setSetupPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="Choose a password (min. 8 characters)"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              type="password"
              value={setupConfirm}
              onChange={(e) => setSetupConfirm(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="Confirm your password"
            />
          </div>
          {setupError && <p className="text-red-600 text-sm">{setupError}</p>}
          <button
            type="submit"
            className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 transition-colors font-medium"
          >
            Create Account
          </button>
        </form>
      </div>
    );
  }

  if (!token) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Admin Portal</h2>
        <form onSubmit={handleLogin} className="space-y-4 max-w-sm mx-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="Enter admin password"
              autoFocus
            />
          </div>
          {loginError && <p className="text-red-600 text-sm">{loginError}</p>}
          <button
            type="submit"
            className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 transition-colors font-medium"
          >
            Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Admin Portal</h2>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Logout
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('restaurants')}
          className={`px-4 py-2 font-medium text-sm border-b-2 -mb-px transition-colors ${
            activeTab === 'restaurants'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          Restaurants ({restaurants.length})
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`px-4 py-2 font-medium text-sm border-b-2 -mb-px transition-colors ${
            activeTab === 'reviews'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          Reviews ({ratings.length})
        </button>
      </div>

      {loading && <p className="text-gray-500 text-center py-8">Loading...</p>}
      {error && <p className="text-red-600 text-center py-4">{error}</p>}
      {actionError && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
          {actionError}
        </p>
      )}

      {!loading && activeTab === 'restaurants' && (
        <div className="space-y-3">
          {restaurants.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No restaurants found.</p>
          ) : (
            restaurants.map((r) => (
              <div
                key={r.id}
                className="p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">{r.name}</p>
                    <p className="text-sm text-gray-500">
                      {r.rating_count} review{r.rating_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteRestaurant(r.id, r.name)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <TrashIcon />
                    Delete
                  </button>
                </div>

                {/* Address section */}
                {editingAddressId === r.id ? (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={addressInput}
                      onChange={(e) => setAddressInput(e.target.value)}
                      placeholder="Enter full address (e.g. 1 High St, Bristol BS1 1AA)"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveAddress(r.id);
                        if (e.key === 'Escape') { setEditingAddressId(null); setAddressInput(''); }
                      }}
                      autoFocus
                    />
                    <button
                      onClick={() => saveAddress(r.id)}
                      className="px-3 py-1.5 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setEditingAddressId(null); setAddressInput(''); }}
                      className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="mt-1.5 flex items-center gap-2">
                    <p className="text-xs text-gray-400 flex-1">
                      {r.address ? (
                        <>
                          <span className="text-gray-600">{r.address}</span>
                          {r.latitude && r.longitude && (
                            <span className="ml-1 text-green-600">✓ mapped</span>
                          )}
                          {r.address && !r.latitude && (
                            <span className="ml-1 text-amber-600">⚠ not geocoded</span>
                          )}
                        </>
                      ) : (
                        <span>No address set</span>
                      )}
                    </p>
                    <button
                      onClick={() => { setEditingAddressId(r.id); setAddressInput(r.address || ''); }}
                      className="text-xs text-orange-500 hover:text-orange-700 underline shrink-0"
                    >
                      {r.address ? 'Edit address' : 'Add address'}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {!loading && activeTab === 'reviews' && (
        <div className="space-y-4">
          {ratings.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No reviews found.</p>
          ) : (
            ratings.map((r) => (
              <div key={r.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800">{r.restaurant}</p>
                    <p className="text-sm text-gray-500">
                      Overall: {r.overall} &middot;{' '}
                      {r.date_visited || r.created_at.slice(0, 10)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Food {r.food} · Service {r.service} · Choice {r.choice} · Value {r.value} · Spice {r.spiceLevel}
                    </p>
                    {r.notes && (
                      <p className="text-sm text-gray-600 mt-1 break-words whitespace-pre-wrap">{r.notes}</p>
                    )}
                    {r.ip_address && (
                      <p className="text-xs text-gray-400 mt-1">IP: {r.ip_address}</p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteRating(r.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors shrink-0"
                  >
                    <TrashIcon />
                    Delete
                  </button>
                </div>
                {r.photo_path && (
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-200">
                    <img
                      src={r.photo_path}
                      alt="Review photo"
                      className="h-16 w-16 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      onClick={() => deletePhoto(r.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      <PhotoIcon />
                      Delete Photo
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
