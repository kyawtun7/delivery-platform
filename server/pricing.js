// Simple demo pricing rules
// Cities: "Tokyo", "Osaka", "Nagoya"
const BASE_PRICES = {
  Tokyo: 5,
  Osaka: 4,
  Nagoya: 3
};

function calculatePrice(pickupCity, dropCity) {
  if (!BASE_PRICES[pickupCity] || !BASE_PRICES[dropCity]) {
    throw new Error('Unsupported city');
  }

  const base = (BASE_PRICES[pickupCity] + BASE_PRICES[dropCity]) / 2;

  // Extra if cities are different
  const isInterCity = pickupCity !== dropCity;
  const distanceFee = isInterCity ? 3 : 0;

  // Round to 2 decimals
  const price = Number((base + distanceFee).toFixed(2));
  return price;
}

module.exports = { calculatePrice };
