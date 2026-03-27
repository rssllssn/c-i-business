const moneyFormatter = new Intl.NumberFormat("en-PH", {
  currency: "PHP",
  style: "currency",
  maximumFractionDigits: 2,
});

export function formatMoney(value: number) {
  return moneyFormatter.format(value);
}
