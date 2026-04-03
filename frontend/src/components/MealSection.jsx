import { useState } from 'react';

/**
 * MealSection — Reusable component for Breakfast/Lunch/Dinner.
 * Shows recommended items with checkboxes, quantity inputs,
 * custom food entry, totals, and save button.
 */
export default function MealSection({
  mealType,
  foodItems,
  loggedMeals,
  onSaveMeal,
  isLogging,
  recommendations,
}) {
  const [selectedItems, setSelectedItems] = useState({});
  const [showCustom, setShowCustom] = useState(false);
  const [customFood, setCustomFood] = useState({
    name: '', calories: '', cost: '', protein: '', quantity: '1',
  });

  const mealLabels = {
    breakfast: { icon: '🌅', label: 'Breakfast' },
    lunch: { icon: '☀️', label: 'Lunch' },
    dinner: { icon: '🌙', label: 'Dinner' },
  };

  const meta = mealLabels[mealType] || { icon: '🍽️', label: mealType };

  // Category badge colors
  const categoryColors = {
    protein: 'bg-emerald-500/20 text-emerald-400',
    carbs: 'bg-amber-500/20 text-amber-400',
    fruit: 'bg-rose-500/20 text-rose-400',
    vegetable: 'bg-green-500/20 text-green-400',
    dairy: 'bg-cyan-500/20 text-cyan-400',
    fat: 'bg-orange-500/20 text-orange-400',
    custom: 'bg-violet-500/20 text-violet-400',
  };

  // Toggle food item selection
  const toggleItem = (name) => {
    setSelectedItems((prev) => {
      const copy = { ...prev };
      if (copy[name]) {
        delete copy[name];
      } else {
        copy[name] = { quantity: 1 };
      }
      return copy;
    });
  };

  const setItemQuantity = (name, qty) => {
    setSelectedItems((prev) => ({
      ...prev,
      [name]: { quantity: Math.max(1, Math.min(20, qty)) },
    }));
  };

  // Calculate totals for selected items
  const selectedList = Object.entries(selectedItems).map(([name, val]) => {
    const food = foodItems.find((f) => f.name === name);
    if (!food) return null;
    return {
      food_item: name,
      quantity: val.quantity,
      calories: food.calories * val.quantity,
      cost: food.cost * val.quantity,
      protein: (food.protein || 0) * val.quantity,
    };
  }).filter(Boolean);

  let totalCal = selectedList.reduce((s, i) => s + i.calories, 0);
  let totalCost = selectedList.reduce((s, i) => s + i.cost, 0);
  let totalProtein = selectedList.reduce((s, i) => s + i.protein, 0);

  // Add custom food to totals if filled
  const customQty = parseInt(customFood.quantity) || 1;
  const hasCustom = showCustom && customFood.name && customFood.calories;
  if (hasCustom) {
    totalCal += parseInt(customFood.calories) * customQty;
    totalCost += parseFloat(customFood.cost || 0) * customQty;
    totalProtein += parseFloat(customFood.protein || 0) * customQty;
  }

  const handleSave = () => {
    const items = selectedList.map((i) => ({
      food_item: i.food_item,
      quantity: i.quantity,
    }));

    if (hasCustom) {
      items.push({
        food_item: customFood.name,
        quantity: customQty,
        calories: parseInt(customFood.calories),
        cost: parseFloat(customFood.cost || 0),
        protein: parseFloat(customFood.protein || 0),
      });
    }

    if (items.length === 0) return;
    onSaveMeal(mealType, items);
    setSelectedItems({});
    setShowCustom(false);
    setCustomFood({ name: '', calories: '', cost: '', protein: '', quantity: '1' });
  };

  // Get logged totals for this meal type
  const loggedCal = loggedMeals.reduce((s, m) => s + m.total_calories, 0);
  const loggedCost = loggedMeals.reduce((s, m) => s + m.total_cost, 0);
  const loggedProtein = loggedMeals.reduce((s, m) => s + m.total_protein, 0);

  // Recommended items (top suggestions from the engine)
  const recNames = new Set(
    (recommendations?.meal_suggestions || []).map((s) => s.name)
  );

  return (
    <div className="glass-card p-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">{meta.icon}</span>
          <h3 className="text-base font-semibold text-white">{meta.label}</h3>
        </div>
        {loggedMeals.length > 0 && (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-emerald-400">{loggedCal} cal</span>
            <span className="text-amber-400">₹{loggedCost}</span>
            <span className="text-cyan-400">{loggedProtein}g protein</span>
          </div>
        )}
      </div>

      {/* Logged meals summary */}
      {loggedMeals.length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-white/[0.03] border border-white/5">
          <p className="text-xs text-slate-500 mb-2">Logged items:</p>
          <div className="space-y-1">
            {loggedMeals.map((m, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="text-slate-300">
                  {m.food_item} {m.quantity > 1 && `×${m.quantity}`}
                </span>
                <span className="text-slate-500">{m.total_calories} cal · ₹{m.total_cost}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Food items list with checkboxes */}
      <div className="space-y-1.5 max-h-52 overflow-y-auto mb-4 pr-1">
        {foodItems.map((food) => {
          const isSelected = !!selectedItems[food.name];
          const isRecommended = recNames.has(food.name);

          return (
            <div
              key={food.name}
              className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all cursor-pointer ${
                isSelected
                  ? 'bg-emerald-500/10 border border-emerald-500/20'
                  : 'bg-white/[0.02] border border-transparent hover:bg-white/[0.05]'
              }`}
              onClick={() => toggleItem(food.name)}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleItem(food.name)}
                className="custom-checkbox"
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-200 truncate">{food.name}</span>
                  {isRecommended && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">
                      Recommended
                    </span>
                  )}
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                    categoryColors[food.category] || 'bg-slate-500/20 text-slate-400'
                  }`}>
                    {food.category}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                  <span>{food.calories} cal</span>
                  <span>₹{food.cost}</span>
                  <span>{food.protein || 0}g protein</span>
                </div>
              </div>
              {isSelected && (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => setItemQuantity(food.name, selectedItems[food.name].quantity - 1)}
                    className="w-6 h-6 rounded bg-white/10 text-xs text-slate-300 hover:bg-white/20 flex items-center justify-center"
                  >−</button>
                  <span className="text-xs text-white w-5 text-center">
                    {selectedItems[food.name].quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setItemQuantity(food.name, selectedItems[food.name].quantity + 1)}
                    className="w-6 h-6 rounded bg-white/10 text-xs text-slate-300 hover:bg-white/20 flex items-center justify-center"
                  >+</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Custom food entry */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => setShowCustom(!showCustom)}
          className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
        >
          {showCustom ? '✕ Hide custom food' : '+ Add custom food'}
        </button>

        {showCustom && (
          <div className="mt-3 p-3 rounded-lg bg-white/[0.03] border border-white/5 space-y-2 animate-fade-in-up">
            <input
              type="text"
              value={customFood.name}
              onChange={(e) => setCustomFood({ ...customFood, name: e.target.value })}
              placeholder="Food name"
              className="input-field text-xs py-2"
            />
            <div className="grid grid-cols-4 gap-2">
              <input
                type="number"
                value={customFood.calories}
                onChange={(e) => setCustomFood({ ...customFood, calories: e.target.value })}
                placeholder="Cal"
                className="input-field text-xs py-2"
              />
              <input
                type="number"
                value={customFood.cost}
                onChange={(e) => setCustomFood({ ...customFood, cost: e.target.value })}
                placeholder="₹ Cost"
                className="input-field text-xs py-2"
              />
              <input
                type="number"
                value={customFood.protein}
                onChange={(e) => setCustomFood({ ...customFood, protein: e.target.value })}
                placeholder="Protein"
                className="input-field text-xs py-2"
              />
              <input
                type="number"
                value={customFood.quantity}
                onChange={(e) => setCustomFood({ ...customFood, quantity: e.target.value })}
                placeholder="Qty"
                className="input-field text-xs py-2"
                min="1"
              />
            </div>
          </div>
        )}
      </div>

      {/* Totals */}
      {(selectedList.length > 0 || hasCustom) && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 mb-3">
          <div className="flex items-center gap-4 text-xs">
            <span className="text-emerald-400 font-semibold">🔥 {totalCal} cal</span>
            <span className="text-amber-400 font-semibold">💰 ₹{totalCost}</span>
            <span className="text-cyan-400 font-semibold">🥩 {totalProtein}g</span>
          </div>
          <span className="text-[10px] text-slate-500">
            {selectedList.length + (hasCustom ? 1 : 0)} items
          </span>
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={isLogging || (selectedList.length === 0 && !hasCustom)}
        className="btn-primary w-full text-center text-sm"
      >
        {isLogging ? 'Saving...' : `Save ${meta.label}`}
      </button>
    </div>
  );
}
