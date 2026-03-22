import { useEffect, useState, useRef } from 'react';

type Rating = {
  id: number;
  restaurant: string;
  food: number;
  service: number;
  choice: number;
  value: number;
  spiceLevel: number;
  overall: number;
  notes: string | null;
  photo_path: string | null;
  created_at: string;
};

type RatingsModalProps = {
  restaurantName: string;
  onClose: () => void;
};

// Helper function to format rating to 1 decimal place
function formatRating(value: number): string {
  return value.toFixed(1);
}

// Helper function to format date
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function RatingsModal({ restaurantName, onClose }: RatingsModalProps) {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const onCloseRef = useRef(onClose);

  // Update ref when onClose changes
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    async function fetchRatings() {
      try {
        setLoading(true);
        setError(null);
        const encodedName = encodeURIComponent(restaurantName);
        const response = await fetch(`/api/ratings/restaurant/${encodedName}`);
        if (!response.ok) {
          throw new Error('Failed to fetch ratings');
        }
        const data = await response.json();
        setRatings(data.ratings || []);
      } catch (err) {
        console.error('Error fetching ratings:', err);
        setError('Failed to load ratings');
      } finally {
        setLoading(false);
      }
    }
    
    fetchRatings();
  }, [restaurantName]);

  // Handle clicking the backdrop
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-orange-600 text-white p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Individual Ratings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-orange-700 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Subheader with restaurant name */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800">{restaurantName}</h3>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-600">Loading ratings...</div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center py-12">
              <div className="text-red-600">{error}</div>
            </div>
          )}

          {!loading && !error && ratings.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-600">No ratings found</div>
            </div>
          )}

          {!loading && !error && ratings.length > 0 && (
            <div className="space-y-4">
              {ratings.map((rating) => (
                <div
                  key={rating.id}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                >
                  {/* Rating header with overall score and date */}
                  <div className="flex items-center justify-between mb-3">
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
                        {formatRating(rating.overall)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(rating.created_at)}
                    </div>
                  </div>

                  {/* Individual category ratings */}
                  <div className="grid grid-cols-5 gap-3 mb-3">
                    <div className="text-center">
                      <div className="text-xs text-gray-600 mb-1">Food</div>
                      <div className="text-lg font-semibold text-gray-800">{rating.food}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-600 mb-1">Service</div>
                      <div className="text-lg font-semibold text-gray-800">{rating.service}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-600 mb-1">Choice</div>
                      <div className="text-lg font-semibold text-gray-800">{rating.choice}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-600 mb-1">Value</div>
                      <div className="text-lg font-semibold text-gray-800">{rating.value}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-600 mb-1">Spice</div>
                      <div className="text-lg font-semibold text-gray-800">{rating.spiceLevel}</div>
                    </div>
                  </div>

                  {/* Notes section */}
                  {rating.notes && (
                    <div className="pt-3 border-t border-gray-200">
                      <div className="text-xs text-gray-600 mb-1 font-semibold">Notes</div>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap">{rating.notes}</div>
                    </div>
                  )}

                  {/* Photo section */}
                  {rating.photo_path && rating.photo_path.startsWith('/uploads/') && (
                    <div className="pt-3 border-t border-gray-200">
                      <div className="text-xs text-gray-600 mb-2 font-semibold">Photo</div>
                      <img
                        src={rating.photo_path}
                        alt="Rating photo"
                        className="max-h-64 rounded-lg border border-gray-200 object-contain"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
