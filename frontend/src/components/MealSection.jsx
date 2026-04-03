import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { scanMealImage } from '../api';

const MotionSection = motion.section;
const MotionButton = motion.button;
const MotionDiv = motion.div;

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
  const [scanMsg, setScanMsg] = useState('');
  const [scanBusy, setScanBusy] = useState(false);
  const [quickAddBusyId, setQuickAddBusyId] = useState(null);
  const [customFood, setCustomFood] = useState({
    name: '', calories: '', cost: '', protein: '', quantity: '1',
  });

  const mealLabels = {
    breakfast: { icon: '🌅', label: 'Breakfast' },
    lunch: { icon: '☀️', label: 'Lunch' },
    dinner: { icon: '🌙', label: 'Dinner' },
  };

  const meta = mealLabels[mealType] || { icon: '🍽️', label: mealType };

  const recNames = useMemo(
    () => new Set((recommendations?.meal_suggestions || []).map((s) => s.name)),
    [recommendations],
  );

  const selectedList = useMemo(() => Object.entries(selectedItems).map(([name, val]) => {
    const food = foodItems.find((f) => f.name === name);
    if (!food) return null;
    return {
      food_item: name,
      quantity: val.quantity,
      calories: food.calories * val.quantity,
      cost: food.cost * val.quantity,
      protein: (food.protein || 0) * val.quantity,
    };
  }).filter(Boolean), [selectedItems, foodItems]);

  let totalCal = selectedList.reduce((s, i) => s + i.calories, 0);
  let totalCost = selectedList.reduce((s, i) => s + i.cost, 0);
  let totalProtein = selectedList.reduce((s, i) => s + i.protein, 0);

  const customQty = parseInt(customFood.quantity, 10) || 1;
  const hasCustom = showCustom && customFood.name && customFood.calories;
  if (hasCustom) {
    totalCal += parseInt(customFood.calories, 10) * customQty;
    totalCost += parseFloat(customFood.cost || 0) * customQty;
    totalProtein += parseFloat(customFood.protein || 0) * customQty;
  }

  const toggleItem = (name) => {
    setSelectedItems((prev) => {
      const copy = { ...prev };
      if (copy[name]) delete copy[name];
      else copy[name] = { quantity: 1 };
      return copy;
    });
  };

  const setItemQuantity = (name, qty) => {
    setSelectedItems((prev) => ({
      ...prev,
      [name]: { quantity: Math.max(1, Math.min(20, qty)) },
    }));
  };

  const handleSave = async () => {
    const items = selectedList.map((i) => ({
      food_item: i.food_item,
      quantity: i.quantity,
    }));

    if (hasCustom) {
      items.push({
        food_item: customFood.name,
        quantity: customQty,
        calories: parseInt(customFood.calories, 10),
        cost: parseFloat(customFood.cost || 0),
        protein: parseFloat(customFood.protein || 0),
      });
    }

    if (items.length === 0) return;
    await onSaveMeal(mealType, items);

    setSelectedItems({});
    setShowCustom(false);
    setCustomFood({ name: '', calories: '', cost: '', protein: '', quantity: '1' });
  };

  const loggedCal = loggedMeals.reduce((s, m) => s + m.total_calories, 0);
  const loggedCost = loggedMeals.reduce((s, m) => s + m.total_cost, 0);

  const handleScan = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setScanBusy(true);
    setScanMsg('');
    try {
      const result = await scanMealImage(file);
      const a = result.analysis || {};

      const promptedCost = window.prompt(
        `Detected ${a.food_name || 'food item'}. Enter total cost (INR):`,
        ''
      );

      if (promptedCost === null) {
        setScanMsg('Scan cancelled before cost confirmation.');
        return;
      }

      const numericCost = parseFloat(promptedCost);
      if (!Number.isFinite(numericCost) || numericCost < 0) {
        setScanMsg('Invalid cost entered. Please scan again and enter a valid number.');
        return;
      }

      const detectedItem = {
        food_item: a.food_name || `Scanned ${meta.label} item`,
        quantity: 1,
        calories: Number(a.calories || 0),
        protein: Number(a.protein_g || 0),
        carbs: Number(a.carbs_g || 0),
        fat: Number(a.fat_g || 0),
        cost: numericCost,
      };

      setShowCustom(true);
      setCustomFood({
        name: detectedItem.food_item,
        calories: String(detectedItem.calories),
        cost: String(detectedItem.cost),
        protein: String(detectedItem.protein),
        quantity: '1',
      });

      await onSaveMeal(mealType, [detectedItem]);

      setSelectedItems({});
      setShowCustom(false);
      setCustomFood({ name: '', calories: '', cost: '', protein: '', quantity: '1' });

      const macroLine = `cal:${detectedItem.calories} | p:${detectedItem.protein}g | c:${detectedItem.carbs}g | f:${detectedItem.fat}g`;
      setScanMsg(`Added automatically: ${detectedItem.food_item} (₹${detectedItem.cost}) • ${macroLine}`);
    } catch (err) {
      setScanMsg(err.message || 'Scan failed');
    } finally {
      setScanBusy(false);
      event.target.value = '';
    }
  };

  const handleQuickAddLogged = async (loggedItem) => {
    const itemKey = loggedItem.id || `${loggedItem.food_item}-${loggedItem.quantity}`;
    setQuickAddBusyId(itemKey);
    try {
      const matchedFood = foodItems.find((f) => f.name === loggedItem.food_item);
      if (matchedFood) {
        await onSaveMeal(mealType, [{
          food_item: matchedFood.name,
          quantity: Number(loggedItem.quantity || 1),
        }]);
      } else {
        const qty = Math.max(1, Number(loggedItem.quantity || 1));
        await onSaveMeal(mealType, [{
          food_item: loggedItem.food_item,
          quantity: qty,
          calories: Number(loggedItem.total_calories || 0) / qty,
          cost: Number(loggedItem.total_cost || 0) / qty,
          protein: Number(loggedItem.total_protein || 0) / qty,
          carbs: Number(loggedItem.total_carbs || 0) / qty,
          fat: Number(loggedItem.total_fat || 0) / qty,
        }]);
      }
      setScanMsg(`Quick added ${loggedItem.food_item} to ${meta.label}.`);
    } catch (err) {
      setScanMsg(err.message || 'Quick add failed.');
    } finally {
      setQuickAddBusyId(null);
    }
  };

  return (
    <MotionSection
      id={`meal-section-${mealType}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      className="glass-card rounded-[var(--radius-bento)] border border-white/10 p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Visual Plate</p>
          <h3 className="text-2xl font-bold text-white">{meta.icon} {meta.label}</h3>
          <p className="text-xs text-[var(--text-soft)] mt-1">{loggedCal} cal logged • ₹{loggedCost}</p>
        </div>

        <label className="scan-meal-btn cursor-pointer" htmlFor={`scan-${mealType}`}>
          {scanBusy ? 'Scanning...' : 'Scan Meal'}
          <input
            id={`scan-${mealType}`}
            type="file"
            accept="image/*"
            onChange={handleScan}
            className="hidden"
          />
        </label>
      </div>

      {scanMsg && <p className="text-xs text-[var(--soft-lavender)] mb-3">{scanMsg}</p>}

      {loggedMeals.length > 0 && (
        <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)] mb-2">Quick Add From Logged</p>
          <div className="flex flex-wrap gap-2">
            {loggedMeals.slice(0, 8).map((m, idx) => {
              const itemKey = m.id || `${m.food_item}-${m.quantity}-${idx}`;
              const loading = quickAddBusyId === itemKey;
              return (
                <button
                  key={itemKey}
                  type="button"
                  onClick={() => handleQuickAddLogged(m)}
                  disabled={loading || isLogging}
                  className="command-chip"
                >
                  {loading ? 'Adding...' : `+ ${m.food_item}`}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="food-gallery-grid">
        {foodItems.map((food) => {
          const isSelected = !!selectedItems[food.name];
          const isRecommended = recNames.has(food.name);

          return (
            <MotionButton
              type="button"
              key={food.name}
              onClick={() => toggleItem(food.name)}
              whileTap={{ scale: 0.98 }}
              whileHover={{ y: -2 }}
              transition={{ type: 'spring', stiffness: 100, damping: 20 }}
              className={`food-card ${isSelected ? 'food-card-selected' : ''} ${isRecommended ? 'food-card-recommended' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-white">{food.name}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">{food.category}</p>
                </div>
                {isRecommended && <span className="ai-tag">AI</span>}
              </div>

              <div className="mt-3 flex items-center gap-3 text-xs">
                <span className="text-[var(--electric-emerald)]">{food.calories} cal</span>
                <span className="text-[var(--vivid-amber)]">₹{food.cost}</span>
                <span className="text-[var(--soft-lavender)]">{food.protein || 0}g</span>
              </div>

              {isSelected && (
                <div className="mt-3 inline-flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="qty-btn" onClick={() => setItemQuantity(food.name, selectedItems[food.name].quantity - 1)}>−</button>
                  <span className="text-sm text-white w-6 text-center">{selectedItems[food.name].quantity}</span>
                  <button type="button" className="qty-btn" onClick={() => setItemQuantity(food.name, selectedItems[food.name].quantity + 1)}>+</button>
                </div>
              )}
            </MotionButton>
          );
        })}
      </div>

      <div className="mt-4">
        <button type="button" onClick={() => setShowCustom((v) => !v)} className="text-xs text-[var(--soft-lavender)] font-medium">
          {showCustom ? 'Hide custom item' : 'Add custom item'}
        </button>

        <AnimatePresence>
          {showCustom && (
            <MotionDiv
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ type: 'spring', stiffness: 100, damping: 20 }}
              className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 grid grid-cols-2 md:grid-cols-5 gap-2"
            >
              <input type="text" value={customFood.name} onChange={(e) => setCustomFood({ ...customFood, name: e.target.value })} placeholder="Name" className="input-field col-span-2 md:col-span-1" />
              <input type="number" value={customFood.calories} onChange={(e) => setCustomFood({ ...customFood, calories: e.target.value })} placeholder="Calories" className="input-field" />
              <input type="number" value={customFood.cost} onChange={(e) => setCustomFood({ ...customFood, cost: e.target.value })} placeholder="Cost" className="input-field" />
              <input type="number" value={customFood.protein} onChange={(e) => setCustomFood({ ...customFood, protein: e.target.value })} placeholder="Protein" className="input-field" />
              <input type="number" min="1" value={customFood.quantity} onChange={(e) => setCustomFood({ ...customFood, quantity: e.target.value })} placeholder="Qty" className="input-field" />
            </MotionDiv>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {(selectedList.length > 0 || hasCustom) && (
          <MotionDiv
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-4 text-xs">
              <span className="text-[var(--electric-emerald)]">{totalCal} cal</span>
              <span className="text-[var(--vivid-amber)]">₹{totalCost}</span>
              <span className="text-[var(--soft-lavender)]">{Math.round(totalProtein)}g protein</span>
            </div>
            <span className="text-xs text-[var(--text-muted)]">{selectedList.length + (hasCustom ? 1 : 0)} items</span>
          </MotionDiv>
        )}
      </AnimatePresence>

      <MotionButton
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        onClick={handleSave}
        disabled={isLogging || (selectedList.length === 0 && !hasCustom)}
        className="btn-primary w-full mt-4"
      >
        {isLogging ? 'Logging meal...' : `Log ${meta.label}`}
      </MotionButton>
    </MotionSection>
  );
}
