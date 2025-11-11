import countries, { LocaleData } from 'i18n-iso-countries'

// register Spanish names (use dynamic import for ESM compatibility)
;(async () => {
  try {
    const localeModule = await import('i18n-iso-countries/langs/es.json')
  // prefer the `default` export when present (ESM interop), otherwise use the module itself
  const loc = ((localeModule as unknown) as { default?: LocaleData }).default ?? (localeModule as unknown as LocaleData)
  // registerLocale expects LocaleData
  countries.registerLocale(loc)
  } catch {
    // ignore - locales may already be registered or not available in some environments
  }
})()

type CountriesMap = Record<string, string>
const all = (countries.getNames('es', { select: 'official' }) || {}) as CountriesMap

export const COUNTRIES: { code: string; name: string }[] = Object.keys(all).map(code => ({ code, name: all[code] }))

export default COUNTRIES
