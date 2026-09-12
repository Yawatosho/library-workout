export const workoutTypes = [
  { id: "visit", category: "visit", label: "図書館に行った", shortLabel: "VISIT", inputType: "check", controlsDay: true, primary: true, chartScaleMonth: 8, icon: '<path d="M3 20h18M5 20V8l7-4 7 4v12M9 20v-7h6v7M8 9h.01M12 9h.01M16 9h.01" />' },
  { id: "borrow", category: "borrow", label: "本を借りた", shortLabel: "BORROW", inputType: "quantity", unit: "books", step: 1, max: 99, primary: true, chartScaleMonth: 10, icon: '<path d="M5 4h14v5H5zM3 10h14v5H3zM6 16h15v5H6z" />' },
  { id: "read", category: "reading", label: "本を読んだ", shortLabel: "READ", inputType: "quantity", unit: "minutes", step: 5, max: 1440, holdToRepeat: true, primary: true, chartScaleMonth: 600, icon: '<path d="M3 5.5c2.5-1.4 5.4-1.1 8 .8V20c-2.6-1.9-5.5-2.2-8-.8V5.5ZM21 5.5c-2.5-1.4-5.4-1.1-8 .8V20c2.6-1.9 5.5-2.2 8-.8V5.5ZM12 6.3V20" />' },
  { id: "browse", category: "discovery", label: "棚をブラウジングした", shortLabel: "BROWSE", inputType: "quantity", unit: "minutes", step: 5, max: 1440, holdToRepeat: true, primary: true, chartScaleMonth: 180, icon: '<path d="M3 19h18M5 18V8h3v10M10 18V6h3v12M15 18V9h3v9" />' },
  { id: "study", category: "study", label: "勉強した", shortLabel: "STUDY", inputType: "quantity", unit: "minutes", step: 5, max: 1440, holdToRepeat: true, primary: true, chartScaleMonth: 600, icon: '<path d="m3 17 11-11 4 4L7 21H3v-4ZM12.5 7.5l4 4M16 4l1.5-1.5L21.5 6 20 7.5" />' },
  { id: "lookup", category: "discovery", label: "辞書・事典を引いた", shortLabel: "LOOK UP", inputType: "check", chartScaleMonth: 4 },
  { id: "search", category: "discovery", label: "資料を検索した", shortLabel: "SEARCH", inputType: "check", chartScaleMonth: 4 },
  { id: "ask", category: "discovery", label: "図書館員に聞いた", shortLabel: "ASK", inputType: "check", chartScaleMonth: 4 },

  { id: "shortStory", category: "reading", label: "短編を読んだ", shortLabel: "SHORT STORY", inputType: "check", chartScaleMonth: 4 },
  { id: "article", category: "reading", label: "論文を読んだ", shortLabel: "ARTICLE", inputType: "check", chartScaleMonth: 4 },
  { id: "magazine", category: "reading", label: "新聞・雑誌を読んだ", shortLabel: "MAGAZINE", inputType: "check", chartScaleMonth: 4 },
  { id: "media", category: "reading", label: "映像・音声資料を利用した", shortLabel: "MEDIA", inputType: "check", chartScaleMonth: 4 },

  { id: "note", category: "making", label: "メモをとった", shortLabel: "NOTE", inputType: "check", chartScaleMonth: 4 },
  { id: "copy", category: "making", label: "資料をコピーした", shortLabel: "COPY", inputType: "check", chartScaleMonth: 4 },

  { id: "groupStudy", category: "study", label: "グループ学習をした", shortLabel: "GROUP STUDY", inputType: "check", chartScaleMonth: 4 },

  { id: "exhibition", category: "visit", label: "展示を見た", shortLabel: "EXHIBITION", inputType: "check", chartScaleMonth: 4 },
  { id: "event", category: "visit", label: "イベント・講座に参加した", shortLabel: "EVENT", inputType: "check", chartScaleMonth: 4 },
];

export const unitLabels = {
  books: "books",
  minutes: "min",
};

export const storageKey = "library-workout-data-v1";
