export function hasValidDiscount(
  price: number | null | undefined,
  discountPrice: number | null | undefined,
): boolean {
  const base = Number(price ?? 0);
  const discount = Number(discountPrice ?? 0);

  return discount > 0 && discount < base;
}

export function getDiscountAmount(
  price: number | null | undefined,
  discountPrice: number | null | undefined,
): number {
  const base = Number(price ?? 0);
  const discount = Number(discountPrice ?? 0);

  return Math.max(base - discount, 0);
}

export function getDiscountPercentage(
  price: number | null | undefined,
  discountPrice: number | null | undefined,
): number {
  const base = Number(price ?? 0);

  if (!hasValidDiscount(price, discountPrice)) {
    return 0;
  }

  return Math.round((getDiscountAmount(price, discountPrice) / base) * 100);
}

export function formatDiscountBadge(
  price: number | null | undefined,
  discountPrice: number | null | undefined,
): string {
  const percentage = getDiscountPercentage(price, discountPrice);

  return percentage > 0 ? `Diskon ${percentage}%` : "Diskon";
}
