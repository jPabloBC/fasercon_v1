import countries, { LocaleData } from 'i18n-iso-countries'
// Synchronously register Spanish locale (tsconfig allows JSON imports)
import esLocale from 'i18n-iso-countries/langs/es.json'

const esLoc = (esLocale as unknown) as LocaleData
try {
  countries.registerLocale(esLoc)
} catch {
  // ignore if already registered
}

type CountriesMap = Record<string, string>
const all = (countries.getNames('es', { select: 'official' }) || {}) as CountriesMap

export const COUNTRIES: { code: string; name: string }[] = Object.keys(all).map(code => ({ code, name: all[code] }))

export default COUNTRIES
