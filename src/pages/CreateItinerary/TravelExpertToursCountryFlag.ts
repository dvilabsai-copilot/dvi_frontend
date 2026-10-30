// Converts the nationality dropdown's country label into a visible flag.
// Unknown or non-country values are deliberately represented by a globe.
// DVI_TE_TOURS_MARKED_FIX_V1
const ALIASES: Record<string, string> = {
  india: "IN", indian: "IN", bharat: "IN",
  "united states": "US", "united states of america": "US", america: "US", american: "US", usa: "US", us: "US",
  "united kingdom": "GB", uk: "GB", british: "GB", britain: "GB", england: "GB", scotland: "GB", wales: "GB",
  "united arab emirates": "AE", uae: "AE", emirates: "AE", emirati: "AE",
  saudi: "SA", "saudi arabia": "SA", saudiarabia: "SA",
  australian: "AU", australia: "AU", canadian: "CA", canada: "CA",
  german: "DE", germany: "DE", french: "FR", france: "FR",
  singaporean: "SG", singapore: "SG", malaysian: "MY", malaysia: "MY",
  "sri lankan": "LK", "sri lanka": "LK", nepalese: "NP", nepali: "NP", nepal: "NP",
  chinese: "CN", china: "CN", japanese: "JP", japan: "JP",
  italian: "IT", italy: "IT", spanish: "ES", spain: "ES",
  thai: "TH", thailand: "TH", indonesian: "ID", indonesia: "ID",
  "south korean": "KR", "south korea": "KR", korean: "KR",
  "new zealand": "NZ", "new zealander": "NZ", "south africa": "ZA",
  qatar: "QA", qatari: "QA", oman: "OM", omani: "OM", kuwait: "KW", kuwaiti: "KW",
  bahrain: "BH", bahraini: "BH", bangladesh: "BD", bangladeshi: "BD",
  pakistan: "PK", pakistani: "PK", russia: "RU", russian: "RU",
  switzerland: "CH", swiss: "CH", brazil: "BR", brazilian: "BR",
};
const normalize = (value: string): string =>
  String(value || "").toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z ]/g, " ")
    .replace(/\s+/g, " ").trim();

const englishRegionNameCodes = (() => {
  const result = new Map<string, string>();
  try {
    const DisplayNames = (Intl as unknown as { DisplayNames?: new (locales: string[], options: { type: string }) => { of: (code: string) => string | undefined } }).DisplayNames;
    if (!DisplayNames) return result;
    const regions = new DisplayNames(["en"], { type: "region" });
    for (let first = 65; first <= 90; first++) {
      for (let second = 65; second <= 90; second++) {
        const code = String.fromCharCode(first, second);
        const name = regions.of(code);
        if (name && normalize(name) !== normalize(code)) result.set(normalize(name), code);
      }
    }
  } catch {
    // Browser without Intl.DisplayNames uses ALIASES above.
  }
  return result;
})();

export function getTravelExpertToursFlag(countryLabel: string): string {
  const key = normalize(countryLabel);
  if (!key) return "🌐";
  const code = ALIASES[key] || englishRegionNameCodes.get(key) || "";
  if (!/^[A-Z]{2}$/.test(code)) return "🌐";
  return String.fromCodePoint(...Array.from(code).map(letter => 127397 + letter.charCodeAt(0)));
}

// DVI_TE_TOURS_REMAINING_UI_V3: real image flags avoid Windows displaying regional emoji as "IN".
// Uses the existing aliases and Intl country-name mapping from V2.
export function getTravelExpertToursFlagUrl(countryLabel: string): string {
  const key = normalize(countryLabel);
  const code = ALIASES[key] || englishRegionNameCodes.get(key) || '';
  return /^[A-Z]{2}$/.test(code)
    ? `https://flagcdn.com/w40/${code.toLowerCase()}.png`
    : '';
}
