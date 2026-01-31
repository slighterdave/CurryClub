import { RatingForm } from './components/RatingForm';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-orange-600 mb-2">🍛 Curry Club</h1>
          <p className="text-gray-600 text-lg">Rate your favorite curry houses</p>
        </header>

        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Submit a Rating</h2>
          <RatingForm />
        </div>
      </div>
    </div>
  );
}

export default App;
