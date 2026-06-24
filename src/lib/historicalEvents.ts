export interface HistoricalEventDefinition {
  slug: string;
  title: string;
  periodLabel: string;
  summary: string;
  startDate: string;
  endDate: string;
  aliases: string[];
  keywords: string[];
  regions?: string[];
  nyplUuids?: string[];
}

export interface HistoricalEventMatch {
  event: HistoricalEventDefinition;
  score: number;
}

const LEGACY_HISTORICAL_EVENT_ALIASES: Record<string, string> = {
  'berlin-wall-1989': 'fall-of-berlin-wall',
  'hiroshima-1945': 'hiroshima-nagasaki',
  'india-partition-1947': 'india-independence-partition',
  'iranian-revolution-1979': 'iranian-revolution',
  'israel-founded-1948': 'arab-israeli-war-1948',
  'kargil-war-1999': 'kargil-war',
  'korean-war-1950': 'korean-war',
  'september-11-2001': 'september-11',
  'tiananmen-1989': 'tiananmen-square',
};

export interface HistoricalEventCandidateInput {
  title?: string | null;
  summary?: string | null;
  description?: string | null;
  tags?: string | null;
  eventName?: string | null;
  country?: string | null;
  region?: string | null;
  date?: string | null;
}

export const MAJOR_HISTORICAL_EVENTS: HistoricalEventDefinition[] = [
  {
    slug: 'world-war-i',
    title: 'World War I',
    periodLabel: '1914-1918',
    summary: 'Mobilization, trench warfare, diplomacy, and the armistice that reshaped Europe and the Middle East.',
    startDate: '1914-01-01',
    endDate: '1919-12-31',
    aliases: ['world war i', 'world war 1', 'great war', 'armistice'],
    keywords: ['western front', 'allied troops', 'trench warfare', 'kaiser', 'verdun', 'somme'],
    regions: ['Europe', 'Middle East'],
  },
  {
    slug: 'great-depression',
    title: 'Great Depression',
    periodLabel: '1929-1939',
    summary: 'Crash, unemployment, bank failures, and the social fallout of the global economic collapse.',
    startDate: '1929-01-01',
    endDate: '1939-12-31',
    aliases: ['great depression', 'economic crash', 'wall street crash'],
    keywords: ['bank collapse', 'bread line', 'unemployment', 'new deal', 'depression era'],
    regions: ['United States', 'Europe'],
  },
  {
    slug: 'world-war-ii',
    title: 'World War II',
    periodLabel: '1939-1945',
    summary: 'Global war across Europe, Asia, and North Africa, from invasion and occupation to liberation and surrender.',
    startDate: '1939-01-01',
    endDate: '1945-12-31',
    aliases: ['world war ii', 'world war 2', 'second world war', 'wwii'],
    keywords: ['nazis', 'hitler', 'allied', 'axis', 'occupation', 'liberation'],
    regions: ['Europe', 'Asia', 'Middle East'],
  },
  {
    slug: 'wwii-end',
    title: 'World War II Ends',
    periodLabel: '1945',
    summary: 'The collapse of Nazi Germany, Japan\'s surrender, and the transition into the postwar world.',
    startDate: '1945-01-01',
    endDate: '1946-12-31',
    aliases: ['victory in europe', 've day', 'v-j day', 'japan surrender', 'world war ii ends'],
    keywords: ['surrender', 'peace celebrations', 'occupation ends', 'postwar', 'armistice'],
    regions: ['Europe', 'Asia'],
  },
  {
    slug: 'hiroshima-nagasaki',
    title: 'Atomic Bombings of Hiroshima and Nagasaki',
    periodLabel: '1945',
    summary: 'Nuclear destruction in Japan and the dramatic final chapter of the Pacific War.',
    startDate: '1945-08-01',
    endDate: '1946-12-31',
    aliases: ['hiroshima', 'nagasaki', 'atomic bombing', 'atomic bombings'],
    keywords: ['a bomb', 'mushroom cloud', 'japan surrender', 'nuclear attack'],
    regions: ['Japan', 'Asia'],
  },
  {
    slug: 'india-independence-partition',
    title: 'India Independence and Partition',
    periodLabel: '1947-1948',
    summary: 'Independence, partition, migration, violence, and the emergence of India and Pakistan.',
    startDate: '1947-01-01',
    endDate: '1948-12-31',
    aliases: ['partition of india', 'independence of india', 'partition', 'india independence'],
    keywords: ['pakistan', 'refugees', 'mountbatten', 'new delhi', 'communal violence'],
    regions: ['South Asia', 'India', 'Pakistan'],
  },
  {
    slug: 'arab-israeli-war-1948',
    title: 'Arab-Israeli War',
    periodLabel: '1948-1949',
    summary: 'The first Arab-Israeli war after the establishment of Israel and the reordering of the region.',
    startDate: '1948-01-01',
    endDate: '1949-12-31',
    aliases: ['arab israeli war', '1948 war', 'war of 1948', 'first arab israeli war'],
    keywords: ['palestine war', 'israel declares independence', 'jerusalem fighting', 'naqba'],
    regions: ['Middle East'],
  },
  {
    slug: 'korean-war',
    title: 'Korean War',
    periodLabel: '1950-1953',
    summary: 'Conflict across the Korean peninsula, Cold War escalation, and an armistice without peace.',
    startDate: '1950-01-01',
    endDate: '1954-12-31',
    aliases: ['korean war'],
    keywords: ['north korea', 'south korea', 'pyongyang', 'seoul', 'armistice'],
    regions: ['Korea', 'Asia'],
  },
  {
    slug: 'suez-crisis',
    title: 'Suez Crisis',
    periodLabel: '1956',
    summary: 'War over the Suez Canal and the end of old imperial assumptions in the Middle East.',
    startDate: '1956-01-01',
    endDate: '1957-12-31',
    aliases: ['suez crisis', 'suez canal crisis'],
    keywords: ['nasser', 'suez canal', 'egypt', 'sinai', 'anglo french invasion'],
    regions: ['Middle East', 'Egypt'],
  },
  {
    slug: 'cuban-missile-crisis',
    title: 'Cuban Missile Crisis',
    periodLabel: '1962',
    summary: 'Nuclear brinkmanship between Washington and Moscow over missiles in Cuba.',
    startDate: '1962-01-01',
    endDate: '1963-12-31',
    aliases: ['cuban missile crisis'],
    keywords: ['cuba', 'kennedy', 'khrushchev', 'blockade', 'missile sites'],
    regions: ['Caribbean', 'United States'],
  },
  {
    slug: 'india-china-war',
    title: 'India-China War',
    periodLabel: '1962',
    summary: 'The Sino-Indian border war and the crisis over the Himalayan frontier.',
    startDate: '1962-01-01',
    endDate: '1963-12-31',
    aliases: ['india china war', 'sino indian war'],
    keywords: ['himalayan border', 'ladakh', 'arunachal', 'border clashes'],
    regions: ['South Asia', 'India', 'China'],
  },
  {
    slug: 'jfk-assassination',
    title: 'JFK Assassination',
    periodLabel: '1963',
    summary: 'The assassination of President John F. Kennedy and the shock that followed in the United States and abroad.',
    startDate: '1963-01-01',
    endDate: '1964-12-31',
    aliases: ['jfk assassination', 'kennedy assassination', 'john f kennedy assassination'],
    keywords: ['dallas', 'dealey plaza', 'oswald', 'president kennedy'],
    regions: ['United States'],
  },
  {
    slug: 'vietnam-war',
    title: 'Vietnam War',
    periodLabel: '1955-1975',
    summary: 'Escalation, protest, battlefield reporting, and the long end of the war in Vietnam.',
    startDate: '1955-01-01',
    endDate: '1975-12-31',
    aliases: ['vietnam war'],
    keywords: ['saigon', 'viet cong', 'tet offensive', 'hanoi', 'indochina'],
    regions: ['Southeast Asia', 'Vietnam'],
    nyplUuids: [
      'd4321570-c5af-012f-5aa6-58d385a7bc34',
      '894c5790-1db8-0137-94a3-7b1f76a2a392',
      '908ec330-1db8-0137-8868-11367174f14d',
    ],
  },
  {
    slug: 'india-pakistan-war-1965',
    title: 'India-Pakistan War',
    periodLabel: '1965',
    summary: 'The 1965 war between India and Pakistan and the regional crisis over Kashmir.',
    startDate: '1965-01-01',
    endDate: '1966-12-31',
    aliases: ['india pakistan war', 'indo pak war', '1965 war'],
    keywords: ['kashmir', 'tashkent', 'lahore front', 'pakistan army', 'indian army'],
    regions: ['South Asia', 'India', 'Pakistan'],
  },
  {
    slug: 'six-day-war',
    title: 'Six-Day War',
    periodLabel: '1967',
    summary: 'A rapid Middle Eastern war that transformed borders, occupation, and regional politics.',
    startDate: '1967-01-01',
    endDate: '1968-12-31',
    aliases: ['six day war', '1967 war'],
    keywords: ['golan', 'west bank', 'sinai', 'arab israeli conflict', 'jerusalem'],
    regions: ['Middle East'],
  },
  {
    slug: 'moon-landing',
    title: 'Apollo 11 Moon Landing',
    periodLabel: '1969',
    summary: 'The mission that put humans on the Moon and turned space exploration into global front-page news.',
    startDate: '1969-01-01',
    endDate: '1970-12-31',
    aliases: ['moon landing', 'apollo 11'],
    keywords: ['armstrong', 'buzz aldrin', 'nasa', 'lunar module'],
    regions: ['United States', 'Global'],
  },
  {
    slug: 'bangladesh-war-1971',
    title: 'Bangladesh Liberation War',
    periodLabel: '1971',
    summary: 'War, independence, and the birth of Bangladesh amid the 1971 India-Pakistan conflict.',
    startDate: '1971-01-01',
    endDate: '1972-12-31',
    aliases: ['bangladesh liberation war', '1971 war', 'east pakistan crisis'],
    keywords: ['bangladesh', 'dhaka', 'mukti bahini', 'east pakistan'],
    regions: ['South Asia', 'Bangladesh', 'India', 'Pakistan'],
  },
  {
    slug: 'yom-kippur-war',
    title: 'Yom Kippur War',
    periodLabel: '1973',
    summary: 'The October 1973 war across Sinai and the Golan Heights, with global political consequences.',
    startDate: '1973-01-01',
    endDate: '1974-12-31',
    aliases: ['yom kippur war', 'october war', '1973 war'],
    keywords: ['golan heights', 'sinai front', 'egypt', 'syria', 'arab israeli war'],
    regions: ['Middle East'],
  },
  {
    slug: 'oil-crisis-1973',
    title: '1970s Oil Crisis',
    periodLabel: '1973-1974',
    summary: 'The OPEC embargo, fuel shortages, and the global economic shock of the oil crisis.',
    startDate: '1973-01-01',
    endDate: '1975-12-31',
    aliases: ['oil crisis', 'oil embargo', '1973 oil crisis', 'energy crisis'],
    keywords: ['opec', 'fuel shortages', 'petrol rationing', 'gas lines', 'petroleum crisis'],
    regions: ['Middle East', 'Global'],
  },
  {
    slug: 'iranian-revolution',
    title: 'Iranian Revolution',
    periodLabel: '1978-1979',
    summary: 'Mass protest, the fall of the Shah, and the revolutionary transformation of Iran.',
    startDate: '1978-01-01',
    endDate: '1980-12-31',
    aliases: ['iranian revolution', 'iran revolution'],
    keywords: ['shah', 'ayatollah khomeini', 'tehran protests', 'islamic republic'],
    regions: ['Middle East', 'Iran'],
  },
  {
    slug: 'soviet-afghan-war',
    title: 'Soviet-Afghan War',
    periodLabel: '1979-1989',
    summary: 'Soviet intervention, resistance, and one of the defining conflicts of the late Cold War.',
    startDate: '1979-01-01',
    endDate: '1989-12-31',
    aliases: ['soviet afghan war', 'afghan war'],
    keywords: ['afghanistan', 'mujahideen', 'kabul', 'soviet troops'],
    regions: ['South Asia', 'Middle East', 'Afghanistan'],
  },
  {
    slug: 'falklands-war',
    title: 'Falklands War',
    periodLabel: '1982',
    summary: 'War between Britain and Argentina in the South Atlantic.',
    startDate: '1982-01-01',
    endDate: '1983-12-31',
    aliases: ['falklands war', 'malvinas war'],
    keywords: ['argentina', 'britain', 'south atlantic', 'task force'],
    regions: ['Latin America', 'Europe'],
  },
  {
    slug: 'chernobyl',
    title: 'Chernobyl Disaster',
    periodLabel: '1986',
    summary: 'The nuclear accident, its cover-up, and the long shadow cast across Europe.',
    startDate: '1986-01-01',
    endDate: '1987-12-31',
    aliases: ['chernobyl'],
    keywords: ['nuclear disaster', 'reactor', 'ukraine', 'radiation'],
    regions: ['Europe'],
  },
  {
    slug: 'tiananmen-square',
    title: 'Tiananmen Square Protests',
    periodLabel: '1989',
    summary: 'Student-led protest, military crackdown, and one of the defining images of the late twentieth century.',
    startDate: '1989-01-01',
    endDate: '1990-12-31',
    aliases: ['tiananmen', 'tiananmen square'],
    keywords: ['beijing protests', 'student movement', 'tank man', 'martial law'],
    regions: ['China', 'Asia'],
  },
  {
    slug: 'fall-of-berlin-wall',
    title: 'Fall of the Berlin Wall',
    periodLabel: '1989',
    summary: 'The collapse of the wall and the symbolic unraveling of the Cold War in Europe.',
    startDate: '1989-01-01',
    endDate: '1991-12-31',
    aliases: ['fall of the berlin wall', 'berlin wall'],
    keywords: ['east germany', 'west germany', 'reunification', 'cold war ends'],
    regions: ['Europe'],
  },
  {
    slug: 'gulf-war',
    title: 'Gulf War',
    periodLabel: '1990-1991',
    summary: 'Iraq\'s invasion of Kuwait, the coalition response, and the opening war of the post-Cold War era.',
    startDate: '1990-01-01',
    endDate: '1992-12-31',
    aliases: ['gulf war', 'persian gulf war'],
    keywords: ['kuwait', 'saddam hussein', 'desert storm', 'coalition forces', 'iraq invasion'],
    regions: ['Middle East'],
  },
  {
    slug: 'yugoslav-wars',
    title: 'Yugoslav Wars',
    periodLabel: '1991-1999',
    summary: 'Conflict, siege, ethnic cleansing, and state fragmentation in the Balkans.',
    startDate: '1991-01-01',
    endDate: '1999-12-31',
    aliases: ['yugoslav wars', 'bosnian war', 'kosovo war'],
    keywords: ['sarajevo', 'balkans', 'bosnia', 'croatia', 'kosovo'],
    regions: ['Europe'],
  },
  {
    slug: 'september-11',
    title: 'September 11 Attacks',
    periodLabel: '2001',
    summary: 'The attacks on New York and Washington and the global political realignment that followed.',
    startDate: '2001-01-01',
    endDate: '2002-12-31',
    aliases: ['9/11', 'september 11', 'world trade center attacks'],
    keywords: ['twin towers', 'pentagon attack', 'new york attacks'],
    regions: ['United States'],
  },
  {
    slug: 'arab-spring',
    title: 'Arab Spring',
    periodLabel: '2010-2012',
    summary: 'Protests and uprisings from Tunisia to Egypt, Libya, Syria, and beyond.',
    startDate: '2010-01-01',
    endDate: '2013-12-31',
    aliases: ['arab spring'],
    keywords: ['tahrir square', 'tunisia protests', 'egypt uprising', 'libya uprising', 'syria protests'],
    regions: ['Middle East', 'North Africa'],
  },
  {
    slug: 'amritsar-massacre',
    title: 'Amritsar Massacre',
    periodLabel: '1919',
    summary: 'The Jallianwala Bagh massacre and a major turning point in India\'s anti-colonial movement.',
    startDate: '1919-01-01',
    endDate: '1920-12-31',
    aliases: ['amritsar massacre', 'jallianwala bagh', 'jallianwala massacre'],
    keywords: ['punjab', 'martial law', 'general dyer', 'indian nationalism'],
    regions: ['South Asia', 'India'],
  },
  {
    slug: 'russian-revolution',
    title: 'Russian Revolution',
    periodLabel: '1917',
    summary: 'The collapse of the tsarist order, the Bolshevik seizure of power, and the remaking of Russia and Europe.',
    startDate: '1917-01-01',
    endDate: '1919-12-31',
    aliases: ['russian revolution', 'bolshevik revolution', 'october revolution'],
    keywords: ['lenin', 'petrograd', 'tsar', 'soviet power'],
    regions: ['Europe'],
  },
  {
    slug: 'turkish-war-of-independence',
    title: 'Turkish War of Independence',
    periodLabel: '1919-1923',
    summary: 'National resistance, partition challenges, and the creation of modern Turkey.',
    startDate: '1919-01-01',
    endDate: '1924-12-31',
    aliases: ['turkish war of independence', 'war of independence turkey'],
    keywords: ['ankara', 'mustafa kemal', 'smyrna', 'greek turkish war'],
    regions: ['Middle East', 'Europe'],
  },
  {
    slug: 'great-kanto-earthquake',
    title: 'Great Kanto Earthquake',
    periodLabel: '1923',
    summary: 'The earthquake and fires that devastated Tokyo and Yokohama and reshaped modern Japan.',
    startDate: '1923-01-01',
    endDate: '1924-12-31',
    aliases: ['great kanto earthquake', 'kanto earthquake'],
    keywords: ['tokyo', 'yokohama', 'earthquake', 'firestorm', 'japan'],
    regions: ['Japan', 'East Asia'],
  },
  {
    slug: 'spanish-civil-war',
    title: 'Spanish Civil War',
    periodLabel: '1936-1939',
    summary: 'Civil war, international brigades, and the prelude to wider European conflict.',
    startDate: '1936-01-01',
    endDate: '1939-12-31',
    aliases: ['spanish civil war'],
    keywords: ['franco', 'republicans', 'nationalists', 'madrid', 'guernica'],
    regions: ['Europe'],
  },
  {
    slug: 'second-sino-japanese-war',
    title: 'Second Sino-Japanese War',
    periodLabel: '1937-1945',
    summary: 'Japan\'s invasion of China and the conflict that merged into the wider Pacific War.',
    startDate: '1937-01-01',
    endDate: '1945-12-31',
    aliases: ['second sino japanese war', 'sino japanese war'],
    keywords: ['nanjing', 'shanghai', 'beijing', 'china war', 'japan invasion'],
    regions: ['East Asia', 'China', 'Japan'],
  },
  {
    slug: 'holocaust-liberation',
    title: 'Holocaust and Liberation',
    periodLabel: '1940s',
    summary: 'Deportation, genocide, liberation, and the documentation of Nazi crimes across Europe.',
    startDate: '1940-01-01',
    endDate: '1946-12-31',
    aliases: ['holocaust', 'liberation of concentration camps', 'liberation'],
    keywords: ['auschwitz', 'ghetto', 'nuremberg', 'concentration camps', 'survivors'],
    regions: ['Europe'],
  },
  {
    slug: 'chinese-civil-war-end',
    title: 'Chinese Civil War Ends',
    periodLabel: '1949',
    summary: 'The communist victory in mainland China and the retreat of the Nationalists to Taiwan.',
    startDate: '1948-01-01',
    endDate: '1950-12-31',
    aliases: ['chinese civil war', 'communist victory in china'],
    keywords: ['beijing', 'mao', 'chiang kai-shek', 'taiwan', 'people\'s republic of china'],
    regions: ['East Asia', 'China'],
  },
  {
    slug: 'civil-rights-movement',
    title: 'Civil Rights Movement',
    periodLabel: '1950s-1960s',
    summary: 'Desegregation, voting rights, protests, and landmark court and street battles in the United States.',
    startDate: '1954-01-01',
    endDate: '1968-12-31',
    aliases: ['civil rights movement', 'desegregation', 'march on washington'],
    keywords: ['montgomery', 'selma', 'mlk', 'civil rights', 'voting rights'],
    regions: ['United States'],
  },
  {
    slug: 'hungarian-revolution',
    title: 'Hungarian Revolution',
    periodLabel: '1956',
    summary: 'The uprising against Soviet control and its crushing by Soviet forces.',
    startDate: '1956-01-01',
    endDate: '1957-12-31',
    aliases: ['hungarian revolution', 'budapest uprising'],
    keywords: ['budapest', 'soviet troops', 'reform movement', 'imre nagy'],
    regions: ['Europe'],
  },
  {
    slug: 'prague-spring',
    title: 'Prague Spring',
    periodLabel: '1968',
    summary: 'Reform, liberalization, and the Soviet-led invasion that ended the Czechoslovak experiment.',
    startDate: '1968-01-01',
    endDate: '1969-12-31',
    aliases: ['prague spring'],
    keywords: ['dubcek', 'czechoslovakia', 'soviet invasion', 'liberalization'],
    regions: ['Europe'],
  },
  {
    slug: 'cultural-revolution',
    title: 'Cultural Revolution',
    periodLabel: '1966-1976',
    summary: 'Mass mobilization, Red Guards, political purges, and upheaval in Maoist China.',
    startDate: '1966-01-01',
    endDate: '1976-12-31',
    aliases: ['cultural revolution'],
    keywords: ['red guards', 'mao', 'china', 'political purge', 'beijing'],
    regions: ['China', 'East Asia'],
  },
  {
    slug: 'watergate',
    title: 'Watergate',
    periodLabel: '1972-1974',
    summary: 'The break-in, cover-up, hearings, and resignation that transformed American politics.',
    startDate: '1972-01-01',
    endDate: '1975-12-31',
    aliases: ['watergate'],
    keywords: ['nixon', 'hearings', 'white house', 'resignation', 'election'],
    regions: ['United States'],
  },
  {
    slug: 'lebanese-civil-war',
    title: 'Lebanese Civil War',
    periodLabel: '1975-1990',
    summary: 'A long civil war in Lebanon involving militias, regional powers, and repeated ceasefires.',
    startDate: '1975-01-01',
    endDate: '1990-12-31',
    aliases: ['lebanese civil war'],
    keywords: ['beirut', 'militia', 'civil war', 'lebanon', 'taif'],
    regions: ['Middle East'],
  },
  {
    slug: 'iran-iraq-war',
    title: 'Iran-Iraq War',
    periodLabel: '1980-1988',
    summary: 'A prolonged war of attrition and mass mobilization across the Persian Gulf region.',
    startDate: '1980-01-01',
    endDate: '1989-12-31',
    aliases: ['iran iraq war', 'persian gulf war 1980s', 'first gulf war'],
    keywords: ['saddam hussein', 'khorramshahr', 'basra', 'chemical weapons', 'front line'],
    regions: ['Middle East', 'Iran', 'Iraq'],
  },
  {
    slug: 'first-intifada',
    title: 'First Intifada',
    periodLabel: '1987-1993',
    summary: 'The Palestinian uprising, street protests, and the political turn toward negotiations.',
    startDate: '1987-01-01',
    endDate: '1994-12-31',
    aliases: ['first intifada', 'palestinian uprising'],
    keywords: ['gaza', 'west bank', 'stone throwing', 'uprising', 'intifada'],
    regions: ['Middle East'],
  },
  {
    slug: 'oslo-accords',
    title: 'Oslo Accords',
    periodLabel: '1993',
    summary: 'Secret talks, public agreements, and a turning point in the Israeli-Palestinian process.',
    startDate: '1993-01-01',
    endDate: '1994-12-31',
    aliases: ['oslo accords', 'oslo agreement'],
    keywords: ['rabin', 'rafat', 'palestinian authority', 'white house signing'],
    regions: ['Middle East'],
  },
  {
    slug: 'kosovo-war',
    title: 'Kosovo War',
    periodLabel: '1998-1999',
    summary: 'The armed conflict, displacement, and NATO intervention in the Balkans.',
    startDate: '1998-01-01',
    endDate: '1999-12-31',
    aliases: ['kosovo war'],
    keywords: ['belgrade', 'pristina', 'nato', 'balkans', 'ethnic cleansing'],
    regions: ['Europe'],
  },
  {
    slug: 'kargil-war',
    title: 'Kargil War',
    periodLabel: '1999',
    summary: 'The high-altitude conflict between India and Pakistan in Kashmir.',
    startDate: '1999-01-01',
    endDate: '2000-12-31',
    aliases: ['kargil war', 'kargil conflict'],
    keywords: ['kargil', 'kashmir', 'india pakistan', 'mountain conflict'],
    regions: ['South Asia', 'India', 'Pakistan'],
  },
  {
    slug: 'oklahoma-city-bombing',
    title: 'Oklahoma City Bombing',
    periodLabel: '1995',
    summary: 'The domestic terror attack that became one of the defining U.S. events of the 1990s.',
    startDate: '1995-01-01',
    endDate: '1996-12-31',
    aliases: ['oklahoma city bombing', 'murrah bombing'],
    keywords: ['timothy mcveigh', 'federal building', 'domestic terrorism'],
    regions: ['United States'],
  },
];

function normalizeText(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function includesNormalized(haystack: string, needle: string): boolean {
  const normalizedNeedle = normalizeText(needle);
  return normalizedNeedle.length > 0 && haystack.includes(normalizedNeedle);
}

function isDateInRange(date: string | null | undefined, startDate: string, endDate: string): boolean {
  if (!date) return false;
  return date >= startDate && date <= endDate;
}

export function getHistoricalEventBySlug(slug: string | null | undefined): HistoricalEventDefinition | null {
  if (!slug) return null;
  const normalizedSlug = LEGACY_HISTORICAL_EVENT_ALIASES[slug] ?? slug;
  return MAJOR_HISTORICAL_EVENTS.find((event) => event.slug === normalizedSlug) ?? null;
}

export function getHistoricalEventByName(name: string | null | undefined): HistoricalEventDefinition | null {
  const normalizedName = normalizeText(name);
  if (!normalizedName) return null;

  return MAJOR_HISTORICAL_EVENTS.find((event) => {
    if (normalizeText(event.title) === normalizedName) return true;
    return event.aliases.some((alias) => normalizeText(alias) === normalizedName);
  }) ?? null;
}

export function resolveHistoricalEvent(input: {
  slug?: string | null;
  name?: string | null;
  title?: string | null;
  summary?: string | null;
  description?: string | null;
  tags?: string | null;
  country?: string | null;
  region?: string | null;
  date?: string | null;
  allowHeuristic?: boolean;
}): HistoricalEventDefinition | null {
  const bySlug = getHistoricalEventBySlug(input.slug);
  if (bySlug) return bySlug;

  const byName = getHistoricalEventByName(input.name ?? input.title);
  if (byName) return byName;

  if (input.allowHeuristic === false) {
    return null;
  }

  const matched = matchHistoricalEvent({
    eventName: input.name,
    title: input.title,
    summary: input.summary,
    description: input.description,
    tags: input.tags,
    country: input.country,
    region: input.region,
    date: input.date,
  });

  return matched?.event ?? null;
}

export function matchHistoricalEvent(candidate: HistoricalEventCandidateInput): HistoricalEventMatch | null {
  const haystack = normalizeText([
    candidate.eventName,
    candidate.title,
    candidate.summary,
    candidate.description,
    candidate.tags,
    candidate.country,
    candidate.region,
  ].filter(Boolean).join(' '));

  if (!haystack) return null;

  let bestMatch: HistoricalEventMatch | null = null;

  for (const event of MAJOR_HISTORICAL_EVENTS) {
    let score = 0;
    let aliasMatches = 0;
    let keywordMatches = 0;
    let regionMatches = 0;

    for (const alias of event.aliases) {
      if (includesNormalized(haystack, alias)) {
        score += 28;
        aliasMatches += 1;
      }
    }

    for (const keyword of event.keywords) {
      if (includesNormalized(haystack, keyword)) {
        score += 12;
        keywordMatches += 1;
      }
    }

    for (const region of event.regions ?? []) {
      if (includesNormalized(haystack, region)) {
        score += 4;
        regionMatches += 1;
      }
    }

    const dateMatches = isDateInRange(candidate.date, event.startDate, event.endDate);
    if (dateMatches) {
      score += aliasMatches > 0 || keywordMatches > 0 ? 10 : 0;
    }

    const hasStrongAlias = aliasMatches > 0 && (dateMatches || keywordMatches > 0 || regionMatches > 0);
    const hasStrongKeywords = keywordMatches >= 2 && dateMatches;
    const hasVeryStrongKeywords = keywordMatches >= 3;

    if (!(hasStrongAlias || hasStrongKeywords || hasVeryStrongKeywords) || score < 32) {
      continue;
    }

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { event, score };
    }
  }

  return bestMatch;
}
