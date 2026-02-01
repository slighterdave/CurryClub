import React, { useEffect, useState } from 'react';

type Ratings = {
  food: number;
  service: number;
  choice: number;
  value: number;
  spiceLevel: number;
};

export function RatingForm() {
  const [restaurant, setRestaurant] = useState('');
  const [restaurants, setRestaurants] = useState<string[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRestaurant, setNewRestaurant] = useState('');
  const [adding, setAdding] = useState(false);

  const [ratings, setRatings] = useState<Ratings>({
    food: 0,
    service: 0,
    choice: 0,
    value: 0,
    spiceLevel: 0,
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/restaurants')
      .then(r => r.json())
      .then(data => {
        const list = (data?.restaurants || []).map((r: any) => r.name);
        setRestaurants(list);
      })
      .catch(err => console.error('fetch restaurants', err));
  }, []);

  async function handleAddRestaurant() {
    const name = newRestaurant.trim();
    if (!name) return alert('Enter a name');
    setAdding(true);
    try {
      const res = await fetch('/api/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      
      if (res.status === 409) {
        // Restaurant already exists
        alert(`Restaurant "${data.restaurant?.name || name}" already exists!`);
        // Refresh list and select the existing restaurant
        await refreshRestaurants(data.restaurant?.name);
        setNewRestaurant('');
        setShowAddForm(false);
        return;
      }
      
      if (!res.ok) {
        alert(`Failed to add restaurant: ${data.error || 'Unknown error'}`);
        return;
      }
      
      const addedName = data?.restaurant?.name || name;
      // refresh list & select
      await refreshRestaurants(addedName);
      setNewRestaurant('');
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
      alert('Failed to add restaurant');
    } finally {
      setAdding(false);
    }
  }

  async function refreshRestaurants(selectName?: string) {
    try {
      const res = await fetch('/api/restaurants');
      const data = await res.json();
      const list = (data?.restaurants || []).map((r: any) => r.name);
      setRestaurants(list);
      if (selectName && list.includes(selectName)) setRestaurant(selectName);
    } catch (err) {
      console.error('refresh restaurants', err);
    }
  }

  function setRating(key: keyof Ratings, value: number) {
    setRatings(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      restaurant,
      ratings,
      notes: '',
    };
    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'unknown' }));
        alert('Submit failed: ' + (err.error || res.status));
        return;
      }
      // success — reset form
      setRatings({ food:0, service:0, choice:0, value:0, spiceLevel:0 });
      setRestaurant('');
      alert('Rating submitted successfully!');
    } catch (err) {
      console.error(err);
      alert('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  const ratingCategories = [
    { key: 'food' as const, label: 'Food Quality' },
    { key: 'service' as const, label: 'Service' },
    { key: 'choice' as const, label: 'Choice' },
    { key: 'value' as const, label: 'Value for Money' },
    { key: 'spiceLevel' as const, label: 'Spice Level' }
  ];

  const overallRating = (Object.values(ratings).reduce((a, b) => a + b, 0) / 5).toFixed(1);
  const isValid = restaurant && Object.values(ratings).every(v => v > 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="restaurant-select" className="block text-sm font-medium text-gray-700 mb-2">
          Restaurant Name
        </label>
        <div className="space-y-2">
          <select
            id="restaurant-select"
            value={restaurant}
            onChange={e => setRestaurant(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
            required
          >
            <option value="">Select a restaurant...</option>
            {restaurants.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          
          {!showAddForm ? (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="text-sm text-orange-600 hover:text-orange-700 font-medium"
            >
              + Add new restaurant
            </button>
          ) : (
            <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
              <input
                type="text"
                value={newRestaurant}
                onChange={e => setNewRestaurant(e.target.value)}
                placeholder="Restaurant name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
              />
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={handleAddRestaurant}
                  disabled={adding}
                  aria-label="Add restaurant"
                  className="p-2 rounded-full bg-orange-600 text-white hover:bg-orange-700 disabled:bg-gray-400 transition-all active:scale-95"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="stroke-current"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewRestaurant('');
                  }}
                  aria-label="Cancel"
                  className="p-2 rounded-full bg-orange-600 text-white hover:bg-orange-700 transition-all active:scale-95"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="stroke-current"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-5">
        {ratingCategories.map(category => (
          <div key={category.key} className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              {category.label}
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(value => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(category.key, value)}
                  className="transition-transform hover:scale-110 focus:outline-none focus:scale-110"
                >
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={`${ratings[category.key] >= value ? 'fill-orange-500 text-orange-500' : 'text-gray-300'} transition-colors`}
                  >
                    <path
                      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
              ))}
              <span className="ml-2 text-gray-600 self-center">
                {ratings[category.key] > 0 ? `${ratings[category.key]}/5` : '-'}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <span className="text-lg font-semibold text-gray-700">Overall Rating</span>
          <div className="flex items-center gap-2">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="fill-orange-500 text-orange-500"
            >
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                fill="currentColor"
              />
            </svg>
            <span className="text-2xl font-bold text-orange-600">
              {Object.values(ratings).every(v => v > 0) ? overallRating : '-'}
            </span>
          </div>
        </div>
        <button
          type="submit"
          disabled={!isValid}
          className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all ${
            isValid
              ? 'bg-orange-600 hover:bg-orange-700 active:scale-95'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          {submitting ? 'Submitting...' : 'Submit Rating'}
        </button>
      </div>
    </form>
  );
}
