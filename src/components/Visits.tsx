import { useEffect, useState } from 'react';

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
  date_visited: string | null;
  created_at: string;
};

function formatRating(value: number): string {
  return value.toFixed(1);
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function Visits() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [allRatings, setAllRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRatings() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/ratings?t=${Date.now()}`);
        if (!response.ok) throw new Error('Failed to fetch ratings');
        const data = await response.json();
        setAllRatings(data.ratings || []);
      } catch (err) {
        console.error('Error fetching ratings:', err);
        setError('Failed to load visits. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    fetchRatings();
  }, []);

  // Build a map of effective date -> ratings[]
  // Use date_visited if set; fall back to created_at date for older reviews without one
  const dateMap: Record<string, Rating[]> = {};
  for (const rating of allRatings) {
    const effectiveDate = rating.date_visited ?? rating.created_at?.substring(0, 10);
    if (!effectiveDate) continue;
    if (!dateMap[effectiveDate]) dateMap[effectiveDate] = [];
    dateMap[effectiveDate].push(rating);
  }

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedDate(null);
  };

  const todayStr = today.toISOString().split('T')[0];
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Build calendar cells (null = empty leading cells)
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectedReviews = selectedDate ? (dateMap[selectedDate] || []) : [];

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Visits</h2>
        <p className="text-gray-600">Browse curry visits by date</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">Loading visits...</div>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center py-12">
          <div className="text-red-600">{error}</div>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Calendar */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            {/* Month navigation header */}
            <div className="flex items-center justify-between px-6 py-4 bg-orange-600 text-white">
              <button
                onClick={prevMonth}
                className="p-1 hover:bg-orange-700 rounded-lg transition-colors"
                aria-label="Previous month"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <span className="text-xl font-bold">{MONTHS[month]} {year}</span>
              <button
                onClick={nextMonth}
                className="p-1 hover:bg-orange-700 rounded-lg transition-colors"
                aria-label="Next month"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
              {DAYS.map(d => (
                <div key={d} className="text-center text-xs font-semibold text-gray-500 py-2">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7">
              {cells.map((day, i) => {
                if (day === null) {
                  return <div key={`empty-${i}`} className="aspect-square" />;
                }
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const hasReviews = !!dateMap[dateStr];
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;

                return (
                  <button
                    key={dateStr}
                    onClick={() => {
                      if (hasReviews) setSelectedDate(isSelected ? null : dateStr);
                    }}
                    disabled={!hasReviews}
                    aria-label={`${dateStr}${hasReviews ? `, ${dateMap[dateStr].length} review${dateMap[dateStr].length !== 1 ? 's' : ''}` : ''}`}
                    className={[
                      'aspect-square flex flex-col items-center justify-center relative text-sm font-medium transition-all',
                      hasReviews ? 'cursor-pointer hover:bg-orange-50' : 'cursor-default',
                      isSelected ? 'bg-orange-100 rounded-lg' : '',
                    ].join(' ')}
                  >
                    <span className={isSelected ? 'text-orange-700 font-bold' : isToday ? 'text-orange-600 font-bold' : 'text-gray-700'}>
                      {day}
                    </span>
                    {hasReviews && (
                      <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-orange-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 mt-3 text-sm text-gray-500 justify-end">
            <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
            <span>Visit recorded</span>
          </div>

          {/* Selected date reviews */}
          {selectedDate && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Reviews for {(() => {
                  const [y, m, d] = selectedDate.split('-').map(Number);
                  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
                })()}
              </h3>
              <div className="space-y-4">
                {selectedReviews.map(rating => (
                  <div key={rating.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    {/* Restaurant name + overall */}
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-lg font-semibold text-gray-800">{rating.restaurant}</h4>
                      <div className="flex items-center gap-1">
                        <svg
                          width="20"
                          height="20"
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
                        <span className="text-xl font-bold text-orange-600">{formatRating(rating.overall)}</span>
                      </div>
                    </div>

                    {/* Individual category scores */}
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

                    {/* Notes */}
                    {rating.notes && (
                      <div className="pt-3 border-t border-gray-200">
                        <div className="text-xs text-gray-600 mb-1 font-semibold">Notes</div>
                        <div className="text-sm text-gray-700 whitespace-pre-wrap">{rating.notes}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
