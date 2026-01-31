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
  const allRated = Object.values(ratings).every(v => v > 0);
  const canSubmit = allRated && !!restaurant && !submitting;

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
      const addedName = data?.restaurant?.name || name;
      // refresh list & select
      await refreshRestaurants(addedName);
      setNewRestaurant('');
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
    if (!canSubmit) return;
    setSubmitting(true);
    const payload = {
      restaurant,
      ratings,
      notes: '', // add notes field if desired
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
      // Note: In a production app, you would update state to show the new rating
      // or navigate to a success page instead of using alert()
    } catch (err) {
      console.error(err);
      alert('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Restaurant</label>
        <div className="flex gap-2 items-center">
          <select
            id="restaurant-select"
            value={restaurant}
            onChange={e => setRestaurant(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg"
          >
            <option value="">-- select a restaurant --</option>
            {restaurants.map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          <div className="flex items-center gap-2">
            <input
              aria-label="New restaurant"
              value={newRestaurant}
              onChange={e => setNewRestaurant(e.target.value)}
              placeholder="Add new"
              className="px-3 py-2 border rounded"
            />
            <button
              type="button"
              onClick={handleAddRestaurant}
              disabled={adding}
              className="px-3 py-2 bg-orange-600 text-white rounded"
            >
              {adding ? 'Adding…' : 'Add'}
            </button>
          </div>
        </div>
      </div>

      {/* Ratings UI — keep your existing stars markup or adapt */}
      <div className="space-y-5">
        {(['food','service','choice','value','spiceLevel'] as (keyof Ratings)[]).map(k => (
          <div key={k} className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              {k === 'food' && 'Food Quality'}
              {k === 'service' && 'Service'}
              {k === 'choice' && 'Choice'}
              {k === 'value' && 'Value for Money'}
              {k === 'spiceLevel' && 'Spice Level'}
            </label>

            <div className="flex gap-2 items-center">
              {[1,2,3,4,5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(k, n)}
                  className={`transition-transform hover:scale-110 ${ratings[k] >= n ? 'text-orange-500' : 'text-gray-300'}`}
                >
                  ★
                </button>
              ))}
              <span className="ml-2 text-gray-600 self-center">{ratings[k] > 0 ? `${ratings[k]}/5` : '-'}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <span className="text-lg font-semibold text-gray-700">Overall Rating</span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-orange-600">
              {allRated ? (Object.values(ratings).reduce((a,b)=>a+b,0)/5).toFixed(1) : '-'}
            </span>
          </div>
        </div>

        <button type="submit" disabled={!canSubmit} className={`w-full py-3 px-6 rounded-lg font-semibold text-white ${canSubmit ? 'bg-orange-600 hover:bg-orange-700' : 'bg-gray-300 cursor-not-allowed'}`}>
          Submit Rating
        </button>
      </div>
    </form>
  );
}
