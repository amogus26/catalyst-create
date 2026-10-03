/**
 * The flag capes: one for every member state of the United Nations, by ISO 3166 code - except the
 * countries in [LEFT_OUT], whose own law forbids selling or wearing their flag, or whose flag carries
 * scripture or cannot be shown everywhere a player might be. The textures are made by
 * scripts/make-capes.mjs from the flag-icons artwork (MIT); the launcher reads the same list from its
 * resources/cosmetics/flags.json, which that script writes.
 *
 * Not legal advice: this is a careful default. Move a country between the two lists to change it.
 */

export const FLAG_PRICE = 200;

export const FLAGS: readonly (readonly [code: string, country: string])[] = [
  ["al", "Albania"], ["dz", "Algeria"], ["ad", "Andorra"], ["ao", "Angola"], ["ag", "Antigua and Barbuda"],
  ["ar", "Argentina"], ["am", "Armenia"], ["au", "Australia"], ["at", "Austria"], ["az", "Azerbaijan"],
  ["bs", "Bahamas"], ["bh", "Bahrain"], ["bd", "Bangladesh"], ["bb", "Barbados"], ["by", "Belarus"],
  ["be", "Belgium"], ["bz", "Belize"], ["bj", "Benin"], ["bt", "Bhutan"], ["bo", "Bolivia"],
  ["ba", "Bosnia and Herzegovina"], ["bw", "Botswana"], ["bn", "Brunei"], ["bg", "Bulgaria"], ["bf", "Burkina Faso"],
  ["bi", "Burundi"], ["cv", "Cabo Verde"], ["kh", "Cambodia"], ["cm", "Cameroon"], ["ca", "Canada"],
  ["cf", "Central African Republic"], ["td", "Chad"], ["cl", "Chile"], ["co", "Colombia"], ["km", "Comoros"],
  ["cg", "Congo"], ["cd", "DR Congo"], ["cr", "Costa Rica"], ["ci", "Côte d'Ivoire"], ["hr", "Croatia"],
  ["cu", "Cuba"], ["cy", "Cyprus"], ["cz", "Czechia"], ["dk", "Denmark"], ["dj", "Djibouti"],
  ["dm", "Dominica"], ["do", "Dominican Republic"], ["ec", "Ecuador"], ["eg", "Egypt"], ["sv", "El Salvador"],
  ["gq", "Equatorial Guinea"], ["er", "Eritrea"], ["ee", "Estonia"], ["sz", "Eswatini"], ["et", "Ethiopia"],
  ["fj", "Fiji"], ["fi", "Finland"], ["fr", "France"], ["ga", "Gabon"], ["gm", "Gambia"],
  ["ge", "Georgia"], ["de", "Germany"], ["gh", "Ghana"], ["gr", "Greece"], ["gd", "Grenada"],
  ["gt", "Guatemala"], ["gn", "Guinea"], ["gw", "Guinea-Bissau"], ["gy", "Guyana"], ["ht", "Haiti"],
  ["hn", "Honduras"], ["hu", "Hungary"], ["is", "Iceland"], ["id", "Indonesia"], ["ie", "Ireland"],
  ["il", "Israel"], ["it", "Italy"], ["jm", "Jamaica"], ["jp", "Japan"], ["jo", "Jordan"],
  ["kz", "Kazakhstan"], ["ke", "Kenya"], ["ki", "Kiribati"], ["kr", "South Korea"], ["kw", "Kuwait"],
  ["kg", "Kyrgyzstan"], ["la", "Laos"], ["lv", "Latvia"], ["lb", "Lebanon"], ["ls", "Lesotho"],
  ["lr", "Liberia"], ["ly", "Libya"], ["li", "Liechtenstein"], ["lt", "Lithuania"], ["lu", "Luxembourg"],
  ["mg", "Madagascar"], ["mw", "Malawi"], ["mv", "Maldives"], ["ml", "Mali"], ["mt", "Malta"],
  ["mh", "Marshall Islands"], ["mr", "Mauritania"], ["mu", "Mauritius"], ["fm", "Micronesia"], ["md", "Moldova"],
  ["mc", "Monaco"], ["mn", "Mongolia"], ["me", "Montenegro"], ["ma", "Morocco"], ["mz", "Mozambique"],
  ["mm", "Myanmar"], ["na", "Namibia"], ["nr", "Nauru"], ["np", "Nepal"], ["nl", "Netherlands"],
  ["nz", "New Zealand"], ["ni", "Nicaragua"], ["ne", "Niger"], ["ng", "Nigeria"], ["mk", "North Macedonia"],
  ["no", "Norway"], ["om", "Oman"], ["pk", "Pakistan"], ["pw", "Palau"], ["pa", "Panama"],
  ["pg", "Papua New Guinea"], ["py", "Paraguay"], ["pe", "Peru"], ["pl", "Poland"], ["pt", "Portugal"],
  ["qa", "Qatar"], ["ro", "Romania"], ["ru", "Russia"], ["rw", "Rwanda"], ["kn", "Saint Kitts and Nevis"],
  ["lc", "Saint Lucia"], ["vc", "Saint Vincent and the Grenadines"], ["ws", "Samoa"], ["sm", "San Marino"], ["st", "São Tomé and Príncipe"],
  ["sn", "Senegal"], ["rs", "Serbia"], ["sc", "Seychelles"], ["sl", "Sierra Leone"], ["sk", "Slovakia"],
  ["si", "Slovenia"], ["sb", "Solomon Islands"], ["so", "Somalia"], ["za", "South Africa"], ["ss", "South Sudan"],
  ["es", "Spain"], ["lk", "Sri Lanka"], ["sd", "Sudan"], ["sr", "Suriname"], ["se", "Sweden"],
  ["ch", "Switzerland"], ["sy", "Syria"], ["tj", "Tajikistan"], ["tz", "Tanzania"], ["th", "Thailand"],
  ["tl", "Timor-Leste"], ["tg", "Togo"], ["to", "Tonga"], ["tt", "Trinidad and Tobago"], ["tn", "Tunisia"],
  ["tr", "Türkiye"], ["tm", "Turkmenistan"], ["tv", "Tuvalu"], ["ug", "Uganda"], ["ua", "Ukraine"],
  ["ae", "United Arab Emirates"], ["gb", "United Kingdom"], ["us", "United States"], ["uy", "Uruguay"], ["uz", "Uzbekistan"],
  ["vu", "Vanuatu"], ["ve", "Venezuela"], ["vn", "Vietnam"], ["ye", "Yemen"], ["zm", "Zambia"],
  ["zw", "Zimbabwe"],
];

/** Member states left out, and why. */
export const LEFT_OUT: Readonly<Record<string, string>> = {
  in: "India: the Emblems and Names Act bars commercial use of the national flag without permission",
  cn: "China: the National Flag Law and market rules bar commercial use of the flag",
  br: "Brazil: Law 5.700 forbids using the flag as clothing",
  mx: "Mexico: the law on national symbols restricts commercial use of the flag and its coat of arms",
  ph: "Philippines: the Flag Law forbids wearing the flag as a costume or putting it on merchandise",
  sg: "Singapore: the national symbols law restricts commercial use of the flag",
  my: "Malaysia: the Emblems and Names Act bars use of the flag in trade",
  sa: "Saudi Arabia: the flag carries the Shahada, and its law bars commercial use",
  iq: "Iraq: the flag carries scripture",
  ir: "Iran: the flag carries scripture",
  af: "Afghanistan: the flag carries scripture and which flag is the country's is disputed",
  kp: "North Korea: showing its flag is a crime in South Korea",
};

/** "Germany Flag": the shop's name for a country's cape. */
export function flagName(country: string): string {
  return `${country} Flag`;
}
