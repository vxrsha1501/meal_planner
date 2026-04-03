import { useState, useEffect } from 'react';

/**
 * MealLogger — Lets the user select a food item and quantity to log.
 * Fetches available food items from the backend on mount.
 *
 * Props:
 *   foodItems      — array of { name, calories, cost, category }
 *   onLog(item, qty) — called when user submits a meal
 *   isLogging      — disables form during submission
 */
export default function MealLogger({ foodItems, onLog, isLogging }) {
  const [selectedFood, setSelectedFood] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [preview, setPreview] = useState(null);

  // Update preview when selection changes
  useEffect(() => {
    if (selectedFood && quantity > 0) {
      const item = foodItems.find((f) => f.name === selectedFood);
      if (item) {
        setPreview({
          calories: item.calories * quantity,
          cost: item.cost * quantity,
          category: item.category,
        });
      }
    } else {
      setPreview(null);
    }
  }, [selectedFood, quantity, foodItems]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedFood && quantity > 0) {
      onLog(selectedFood, quantity);
      setQuantity(1);
    }
  };

  // Category badge colors
  const categoryColors = {
    protein: 'bg-emerald-500/20 text-emerald-400',
    carbs: 'bg-amber-500/20 text-amber-400',
    fruit: 'bg-rose-500/20 text-rose-400',
    vegetable: 'bg-green-500/20 text-green-400',
    dairy: 'bg-cyan-500/20 text-cyan-400',
    fat: 'bg-orange-500/20 text-orange-400',
  };

  return (
    <div className="glass-card p-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center text-lg">
          🍽️
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Log a Meal</h2>
          <p className="text-xs text-slate-400">Track what you eat</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Food Selection */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
            Food Item
          </label>
          <select
            value={selectedFood}
            onChange={(e) => setSelectedFood(e.target.value)}
            className="input-field"
            id="select-food"
            required
          >
            <option value="">Select a food item...</option>
            {foodItems.map((item) => (
              <option key={item.name} value={item.name}>
                {item.name} — {item.calories} cal / ₹{item.cost}
              </option>
            ))}
          </select>
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
            Quantity
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="btn-secondary w-10 h-10 flex items-center justify-center text-lg"
              id="btn-qty-minus"
            >
              −
            </button>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="input-field text-center w-20"
              min="1"
              max="20"
              id="input-quantity"
            />
            <button
              type="button"
              onClick={() => setQuantity(Math.min(20, quantity + 1))}
              className="btn-secondary w-10 h-10 flex items-center justify-center text-lg"
              id="btn-qty-plus"
            >
              +
            </button>
          </div>
        </div>

        {/* Preview Card */}
        {preview && (
          <div className="rounded-xl bg-gradient-to-r from-dark-800/80 to-dark-700/60 border border-white/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300 font-medium">{selectedFood}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  categoryColors[preview.category] || 'bg-slate-500/20 text-slate-400'
                }`}
              >
                {preview.category}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-emerald-400 font-semibold">
                🔥 {preview.calories} cal
              </span>
              <span className="text-amber-400 font-semibold">
                💰 ₹{preview.cost}
              </span>
              <span className="text-slate-500">× {quantity}</span>
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!selectedFood || isLogging}
          className="btn-primary w-full text-center"
          id="btn-log-meal"
        >
          {isLogging ? 'Logging...' : 'Log Meal'}
        </button>
      </form>
    </div>
  );
}
