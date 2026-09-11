export const workoutTypes = [
  { id: "visit", category: "visit", label: "図書館に行った", shortLabel: "VISIT", inputType: "check", controlsDay: true, primary: true },
  { id: "borrow", category: "borrow", label: "本を借りた", shortLabel: "BORROW", inputType: "quantity", unit: "books", step: 1, primary: true },
  { id: "read", category: "reading", label: "本を読んだ", shortLabel: "READ", inputType: "quantity", unit: "minutes", step: 5, holdToRepeat: true, primary: true },
  { id: "browse", category: "discovery", label: "棚をブラウジングした", shortLabel: "BROWSE", inputType: "quantity", unit: "minutes", step: 5, holdToRepeat: true, primary: true },
  { id: "study", category: "study", label: "勉強した", shortLabel: "STUDY", inputType: "quantity", unit: "minutes", step: 5, holdToRepeat: true, primary: true },
  { id: "lookup", category: "discovery", label: "辞書・事典を引いた", shortLabel: "LOOK UP", inputType: "check" },
  { id: "shortStory", category: "reading", label: "短編を読んだ", shortLabel: "SHORT STORY", inputType: "quantity", unit: "stories", step: 1 },
  { id: "article", category: "reading", label: "論文を読んだ", shortLabel: "ARTICLE", inputType: "quantity", unit: "articles", step: 1 },
  { id: "magazine", category: "reading", label: "新聞・雑誌を読んだ", shortLabel: "MAGAZINE", inputType: "quantity", unit: "issues", step: 1 },
  { id: "search", category: "discovery", label: "資料を検索した", shortLabel: "SEARCH", inputType: "check" },
  { id: "ask", category: "discovery", label: "図書館員に聞いた", shortLabel: "ASK", inputType: "check" },
  { id: "note", category: "making", label: "メモをとった", shortLabel: "NOTE", inputType: "check" },
  { id: "exhibition", category: "visit", label: "展示を見た", shortLabel: "EXHIBITION", inputType: "check" },
];

export const unitLabels = {
  books: "books",
  minutes: "min",
  stories: "stories",
  articles: "articles",
  issues: "issues",
  count: "",
};

export const storageKey = "library-workout-data-v1";
