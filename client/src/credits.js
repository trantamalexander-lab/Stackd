// Simple localStorage-based credit store
export function getCredits() {
  return parseInt(localStorage.getItem('stackd_credits') || '0', 10)
}

export function addCredits(n) {
  const current = getCredits()
  localStorage.setItem('stackd_credits', String(current + n))
  return current + n
}

export function useCredit() {
  const current = getCredits()
  if (current <= 0) return false
  localStorage.setItem('stackd_credits', String(current - 1))
  return true
}
