export type Festival = {
  name: string;
  date: string; // YYYY-MM-DD
  emoji: string;
};

export const INDIAN_FESTIVALS_2026: Festival[] = [
  { name: "New Year's Day", date: "2026-01-01", emoji: "🎉" },
  { name: "Makar Sankranti / Pongal", date: "2026-01-14", emoji: "🪁" },
  { name: "Republic Day", date: "2026-01-26", emoji: "🇮🇳" },
  { name: "Maha Shivaratri", date: "2026-02-15", emoji: "🔱" },
  { name: "Holi", date: "2026-03-03", emoji: "🎨" },
  { name: "Ugadi / Gudi Padwa", date: "2026-03-19", emoji: "🥭" },
  { name: "Rama Navami", date: "2026-03-27", emoji: "🏹" },
  { name: "Good Friday", date: "2026-04-03", emoji: "✝️" },
  { name: "Ambedkar Jayanti", date: "2026-04-14", emoji: "📚" },
  { name: "Eid al-Fitr", date: "2026-03-20", emoji: "🌙" },
  { name: "Buddha Purnima", date: "2026-05-01", emoji: "🌸" },
  { name: "Eid al-Adha", date: "2026-05-27", emoji: "🐐" },
  { name: "Kabir Jayanti", date: "2026-06-29", emoji: "📜" },
  { name: "Independence Day", date: "2026-08-15", emoji: "🇮🇳" },
  { name: "Raksha Bandhan", date: "2026-08-28", emoji: "📿" },
  { name: "Janmashtami", date: "2026-09-04", emoji: "🏺" },
  { name: "Ganesh Chaturthi", date: "2026-09-14", emoji: "🐘" },
  { name: "Gandhi Jayanti", date: "2026-10-02", emoji: "👓" },
  { name: "Dussehra", date: "2026-10-20", emoji: "🏹" },
  { name: "Karwa Chauth", date: "2026-10-28", emoji: "🌙" },
  { name: "Diwali / Deepavali", date: "2026-11-08", emoji: "🪔" },
  { name: "Bhai Dooj", date: "2026-11-10", emoji: "🌸" },
  { name: "Guru Nanak Jayanti", date: "2026-11-24", emoji: "☬" },
  { name: "Christmas Day", date: "2026-12-25", emoji: "🎄" }
];

/**
 * Returns Indian festivals falling in the specified year and month index.
 * @param year - e.g. 2026
 * @param monthIndex - 0-based month index (0 = January)
 */
export function getFestivalsForMonth(year: number, monthIndex: number): Festival[] {
  return INDIAN_FESTIVALS_2026.filter((f) => {
    const fDate = new Date(f.date);
    return fDate.getFullYear() === year && fDate.getMonth() === monthIndex;
  });
}
