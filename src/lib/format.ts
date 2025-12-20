
export function formatCLP(value: unknown): string {
	if (value === null || value === undefined) return '0'

	const n = Number(String(value).replace(/[^0-9.-]/g, ''))
	if (!Number.isFinite(n) || Number.isNaN(n)) return '0'

	const rounded = Math.round(n)
	return new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(rounded)
}

export default formatCLP
