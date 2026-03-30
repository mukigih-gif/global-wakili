export const KenyaValidators = {
  // Simple check: PINs start with A, followed by 9 digits, then a letter
  isKRAPin: (pin: string) => /^[A-Z][0-9]{9}[A-Z]$/.test(pin),
  
  // Format: +254XXXXXXXXX
  isPhone: (phone: string) => /^\+254[71][0-9]{8}$/.test(phone),
  
  // Format Currency
  formatKshs: (amount: number) => 
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount)
};