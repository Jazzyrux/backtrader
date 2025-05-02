/**
 * Formate un nombre avec la précision appropriée et les séparateurs de milliers
 */
export const formatNumber = (value: number, precision: number = 2): string => {
  // Pour les grands nombres, utiliser des séparateurs de milliers
  if (Math.abs(value) >= 1000) {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    });
  }

  // Pour les petits nombres, adapter la précision en fonction de la valeur
  if (Math.abs(value) < 0.01) {
    return value.toFixed(8);
  }
  if (Math.abs(value) < 1) {
    return value.toFixed(6);
  }

  return value.toFixed(precision);
};

/**
 * Formate un prix en fonction de sa valeur
 */
export const formatPrice = (price: number): string => {
  if (price >= 1000) {
    return formatNumber(price, 2);
  }
  if (price >= 1) {
    return formatNumber(price, 4);
  }
  if (price >= 0.1) {
    return formatNumber(price, 6);
  }
  return formatNumber(price, 8);
};

/**
 * Formate un pourcentage
 */
export const formatPercent = (value: number): string => {
  return `${value >= 0 ? '+' : ''}${formatNumber(value, 2)}%`;
};

/**
 * Formate une valeur monétaire
 */
export const formatCurrency = (value: number): string => {
  return `$${formatNumber(value, 2)}`;
};
