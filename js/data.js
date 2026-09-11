export const workoutTypes = [
  { id: "visit", category: "visit", label: "図書館に行った", shortLabel: "VISIT", unit: "count", step: 1, primary: true },
  { id: "borrow", category: "borrow", label: "本を借りた", shortLabel: "BORROW", unit: "books", step: 1, primary: true },
  { id: "read", category: "reading", label: "本を読んだ", shortLabel: "READ", unit: "minutes", step: 5, primary: true },
  { id: "browse", category: "discovery", label: "棚をブラウジングした", shortLabel: "BROWSE", unit: "minutes", step: 5, primary: true },
  { id: "lookup", category: "discovery", label: "辞書・事典を引いた", shortLabel: "LOOK UP", unit: "count", step: 1, primary: true },
  { id: "shortStory", category: "reading", label: "短編を読んだ", shortLabel: "SHORT STORY", unit: "stories", step: 1 },
  { id: "article", category: "reading", label: "論文を読んだ", shortLabel: "ARTICLE", unit: "articles", step: 1 },
  { id: "magazine", category: "reading", label: "新聞・雑誌を読んだ", shortLabel: "MAGAZINE", unit: "issues", step: 1 },
  { id: "search", category: "discovery", label: "資料を検索した", shortLabel: "SEARCH", unit: "count", step: 1 },
  { id: "ask", category: "discovery", label: "図書館員に聞いた", shortLabel: "ASK", unit: "count", step: 1 },
  { id: "note", category: "making", label: "メモをとった", shortLabel: "NOTE", unit: "count", step: 1 },
  { id: "exhibition", category: "visit", label: "展示を見た", shortLabel: "EXHIBITION", unit: "count", step: 1 },
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
