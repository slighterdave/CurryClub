import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RatingsModal } from './RatingsModal';

type AggregateRating = {
  rank: number;
  restaurant: string;
  count: number;
  avgOverall: number;
  avgFood: number;
  avgService: number;
  avgChoice: number;
  avgValue: number;
  avgSpiceLevel: number;
};

// Helper function to format rating to 1 decimal place
function formatRating(value: number): string {
  return value.toFixed(1);
}

export function Ratings() {
  const [aggregates, setAggregates] = useState<AggregateRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(null);

  useEffect(() => {
    console.log('Ratings component mounted');
    fetchAggregates();

    // Refresh data when page becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Page became visible, refreshing ratings');
        // Don't set loading state for background refreshes to avoid UI flicker
        fetchAggregates();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  async function fetchAggregates() {
    try {
      setLoading(true);
      setError(null);
      // Add cache-busting parameter to ensure fresh data
      const response = await fetch(`/api/ratings/aggregate?t=${Date.now()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch ratings');
      }
      const data = await response.json();
      setAggregates(data.aggregates || []);
    } catch (err) {
      console.error('Error fetching aggregates:', err);
      setError('Failed to load ratings. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchAggregates();
    setRefreshing(false);
  }

  const displayedAggregates = showAll ? aggregates : aggregates.slice(0, 10);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-indian-rust text-lg font-body">Loading ratings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-indian-maroon text-lg font-body">{error}</div>
      </div>
    );
  }

  if (aggregates.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-indian-rust text-lg font-body">
          No ratings yet.{' '}
          <Link to="/" className="text-indian-saffron hover:text-indian-curry underline">
            Be the first to rate a restaurant!
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-indian-spice mb-2 font-heading">Restaurant Ratings</h2>
        <p className="text-indian-rust font-body">Aggregate scores from all submissions</p>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-indian-gold rounded-lg hover:bg-indian-cream transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          aria-label="Refresh ratings"
        >
          <svg
            className={`w-5 h-5 text-indian-saffron ${refreshing ? 'animate-spin' : ''}`}
            fill="none"
            strokeWidth="2"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span className="font-heading text-indian-spice">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      <div className="space-y-4">
        {displayedAggregates.map((aggregate) => (
          <div
            key={aggregate.restaurant}
            className="bg-white bg-opacity-80 backdrop-blur-sm rounded-lg shadow-md border-2 border-indian-gold p-6 hover:shadow-xl transition-all cursor-pointer hover:border-indian-saffron hover:scale-[1.02]"
            onClick={() => setSelectedRestaurant(aggregate.restaurant)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSelectedRestaurant(aggregate.restaurant);
              }
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-indian-saffron to-indian-curry text-white font-bold text-lg shadow-md">
                  #{aggregate.rank}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-indian-spice font-heading">{aggregate.restaurant}</h3>
                  <p className="text-sm text-indian-rust font-body">{aggregate.count} rating{aggregate.count !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="fill-indian-saffron text-indian-saffron drop-shadow"
                >
                  <path
                    d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                    fill="currentColor"
                  />
                </svg>
                <span className="text-3xl font-bold text-indian-saffron font-heading">{formatRating(aggregate.avgOverall)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t-2 border-indian-gold">
              <div className="text-center">
                <div className="text-sm text-indian-rust mb-1 font-heading">Food</div>
                <div className="text-lg font-semibold text-indian-spice font-body">{formatRating(aggregate.avgFood)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-indian-rust mb-1 font-heading">Service</div>
                <div className="text-lg font-semibold text-indian-spice font-body">{formatRating(aggregate.avgService)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-indian-rust mb-1 font-heading">Choice</div>
                <div className="text-lg font-semibold text-indian-spice font-body">{formatRating(aggregate.avgChoice)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-indian-rust mb-1 font-heading">Value</div>
                <div className="text-lg font-semibold text-indian-spice font-body">{formatRating(aggregate.avgValue)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-indian-rust mb-1 font-heading">Spice</div>
                <div className="text-lg font-semibold text-indian-spice font-body">{formatRating(aggregate.avgSpiceLevel)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {aggregates.length > 10 && (
        <div className="text-center pt-4">
          <button
            onClick={() => setShowAll(!showAll)}
            className="px-6 py-3 bg-gradient-to-r from-indian-saffron to-indian-curry text-white rounded-lg hover:shadow-xl transition-all font-semibold font-heading hover:scale-105 active:scale-95"
          >
            {showAll ? 'Show Top 10' : `Show All (${aggregates.length})`}
          </button>
        </div>
      )}

      {/* Modal for displaying individual ratings */}
      {selectedRestaurant && (
        <RatingsModal
          restaurantName={selectedRestaurant}
          onClose={() => setSelectedRestaurant(null)}
        />
      )}
    </div>
  );
}
