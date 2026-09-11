export const workoutTypes = [
  { id: "visit", category: "visit", label: "図書館に行った", shortLabel: "VISIT", inputType: "check", controlsDay: true, primary: true, icon: '<path d="M3 20h18M5 20V8l7-4 7 4v12M9 20v-7h6v7M8 9h.01M12 9h.01M16 9h.01" />' },
  { id: "borrow", category: "borrow", label: "本を借りた", shortLabel: "BORROW", inputType: "quantity", unit: "books", step: 1, max: 99, primary: true, icon: '<path d="M5 4h14v5H5zM3 10h14v5H3zM6 16h15v5H6z" />' },
  { id: "read", category: "reading", label: "本を読んだ", shortLabel: "READ", inputType: "quantity", unit: "minutes", step: 5, max: 1440, holdToRepeat: true, primary: true, icon: '<path d="M3 5.5c2.5-1.4 5.4-1.1 8 .8V20c-2.6-1.9-5.5-2.2-8-.8V5.5ZM21 5.5c-2.5-1.4-5.4-1.1-8 .8V20c2.6-1.9 5.5-2.2 8-.8V5.5ZM12 6.3V20" />' },
  { id: "browse", category: "discovery", label: "棚をブラウジングした", shortLabel: "BROWSE", inputType: "quantity", unit: "minutes", step: 5, max: 1440, holdToRepeat: true, primary: true, icon: '<path d="M5 18h14M7 7v11M12 5v13M17 9v9" />' },
  { id: "study", category: "study", label: "勉強した", shortLabel: "STUDY", inputType: "quantity", unit: "minutes", step: 5, max: 1440, holdToRepeat: true, primary: true, icon: '<path d="m3 17 11-11 4 4L7 21H3v-4ZM12.5 7.5l4 4M16 4l1.5-1.5L21.5 6 20 7.5" />' },
  { id: "lookup", category: "discovery", label: "辞書・事典を引いた", shortLabel: "LOOK UP", inputType: "check" },
  { id: "shortStory", category: "reading", label: "短編を読んだ", shortLabel: "SHORT STORY", inputType: "check" },
  { id: "article", category: "reading", label: "論文を読んだ", shortLabel: "ARTICLE", inputType: "check" },
  { id: "magazine", category: "reading", label: "新聞・雑誌を読んだ", shortLabel: "MAGAZINE", inputType: "check" },
  { id: "search", category: "discovery", label: "資料を検索した", shortLabel: "SEARCH", inputType: "check" },
  { id: "ask", category: "discovery", label: "図書館員に聞いた", shortLabel: "ASK", inputType: "check" },
  { id: "note", category: "making", label: "メモをとった", shortLabel: "NOTE", inputType: "check" },
  { id: "exhibition", category: "visit", label: "展示を見た", shortLabel: "EXHIBITION", inputType: "check" },
];

export const unitLabels = {
  books: "books",
  minutes: "min",
};

export const storageKey = "library-workout-data-v1";
