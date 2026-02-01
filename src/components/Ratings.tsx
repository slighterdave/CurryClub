import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

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
        <div className="text-gray-600 text-lg">Loading ratings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-600 text-lg">{error}</div>
      </div>
    );
  }

  if (aggregates.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-600 text-lg">
          No ratings yet.{' '}
          <Link to="/" className="text-orange-600 hover:text-orange-700 underline">
            Be the first to rate a restaurant!
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Restaurant Ratings</h2>
        <p className="text-gray-600">Aggregate scores from all submissions</p>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Refresh ratings"
        >
          <svg
            className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`}
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
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      <div className="space-y-4">
        {displayedAggregates.map((aggregate) => (
          <div
            key={aggregate.restaurant}
            className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-100 text-orange-600 font-bold text-lg">
                  #{aggregate.rank}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">{aggregate.restaurant}</h3>
                  <p className="text-sm text-gray-500">{aggregate.count} rating{aggregate.count !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <svg
                  width="32"
                  height="32"
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
                <span className="text-3xl font-bold text-orange-600">{formatRating(aggregate.avgOverall)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-gray-200">
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">Food</div>
                <div className="text-lg font-semibold text-gray-800">{formatRating(aggregate.avgFood)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">Service</div>
                <div className="text-lg font-semibold text-gray-800">{formatRating(aggregate.avgService)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">Choice</div>
                <div className="text-lg font-semibold text-gray-800">{formatRating(aggregate.avgChoice)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">Value</div>
                <div className="text-lg font-semibold text-gray-800">{formatRating(aggregate.avgValue)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">Spice</div>
                <div className="text-lg font-semibold text-gray-800">{formatRating(aggregate.avgSpiceLevel)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {aggregates.length > 10 && (
        <div className="text-center pt-4">
          <button
            onClick={() => setShowAll(!showAll)}
            className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold"
          >
            {showAll ? 'Show Top 10' : `Show All (${aggregates.length})`}
          </button>
        </div>
      )}
    </div>
  );
}
