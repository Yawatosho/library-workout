# LIBRARY WORKOUT

図書館で行った小さな知的活動を、筋トレのワークアウトのような軽さで記録・振り返る静的Webアプリです。成果や達成度は評価せず、「図書館に行った」「本を読んだ」「棚を眺めた」といった活動そのものを残します。

第3稿では、VISITを起点にその日の入力を解放する流れ、READ／BROWSE／STUDYの加速付き長押し入力、月・年単位の振り返り、JSONバックアップに対応しています。活動定義は `inputType: "quantity"` と `inputType: "check"` に分かれ、チェック型は実施の有無のみを0/1で保存します。数量型には誤操作防止の上限を設けています。入力ボタンにはタッチ操作向けの設定を適用し、通常のピンチズームを残したまま連続タップ時の誤ズームを抑制します。

ヘッダーのヘルプではアプリの目的・使い方・データ保存方針を確認できます。保存済みの図書館名候補は、入力欄の **Manage** から履歴だけを削除できます。過去日の図書館名は変更されません。

## ローカルで確認する

外部ライブラリやビルド工程はありません。プロジェクトのルートで簡易HTTPサーバーを起動してください。

```bash
python3 -m http.server 8000
```

ブラウザで `http://localhost:8000` を開きます。ES Modulesを使用しているため、`index.html` の直接表示ではなくHTTPサーバー経由で確認してください。

## GitHub Pagesで公開する

1. リポジトリをGitHubへpushします。
2. リポジトリの **Settings → Pages** を開きます。
3. **Deploy from a branch** を選び、`main` ブランチの `/ (root)` を指定します。
4. 保存後に表示されるURLへアクセスします。

すべて相対パスで参照しているため、プロジェクトサイト形式のURLでも動作します。

## ファイル構成

```text
library-workout/
├── index.html          # 3画面と日別編集シートの構造
├── css/style.css       # モバイルファーストの外観とアニメーション
├── js/
│   ├── app.js          # UI、日付処理、カレンダー、集計
│   ├── data.js         # ワークアウト種別の定義
│   └── storage.js      # localStorageの読み書き
├── assets/             # ロゴ、ホーム画面アイコン、OGP画像
├── manifest.webmanifest
└── README.md
```

## データ保存

図書館名や活動記録などの入力データは、利用中のブラウザの `localStorage` にのみ保存し、運営者のサーバーやGoogle Analyticsへ送りません。通常のページ閲覧状況は、Google Analytics 4（測定ID `G-J6NS8CCNWN`）で計測します。キー名は次の通りです。

```text
library-workout-data-v1
```

保存形式は次のようなバージョン付きJSONです。日付キーはUTCではなく、ユーザー端末のローカル日付から生成します。

```json
{
  "version": 1,
  "entries": {
    "2026-09-11": {
      "library": "○○市立中央図書館",
      "activities": {
        "visit": 1,
        "borrow": 3,
        "browse": 20
      }
    }
  },
  "libraries": ["○○市立中央図書館"],
  "settings": {
    "favorites": ["visit", "borrow", "read", "browse", "study"]
  }
}
```

図書館名は各日の活動から独立した `library` として保持します。一度入力した名前は重複を除いて `libraries` 配列の先頭へ移動し、最近使った順に最大12件保存します。候補選択と自由入力のどちらも利用できます。

既存データは読み込み時に正規化され、活動または図書館名のある日に `visit` がなければ自動補完されます。チェック型は0/1に、数量型はstep単位かつ上限以内に収められます。STATS画面下部の **Export** で全データをJSONとして保存し、**Import** で復元できます。Importは `version: 1` と基本構造を検証し、確認後に現在のデータを置き換えます。不正なファイルでは既存データを変更しません。

## 開発用データ

通常画面には表示しない開発用ヘルパーをブラウザのコンソールから利用できます。

```js
LibraryWorkoutDev.loadSampleData() // 今月のサンプルデータを投入
LibraryWorkoutDev.clearAllData()   // 保存データを全消去
LibraryWorkoutDev.exportData()     // 現在のJSONを表示
```
