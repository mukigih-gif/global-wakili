export function formatCurrency(amount: number, currency: string = "KES") {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency }).format(amount);
}