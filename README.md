# 福松そば オーダーシステム（開発版）

このプロジェクトは、飲食店「福松そば」のために開発している **テーブル別オンライン注文システム** です。  
Next.js（App Router）＋ Firebase（Firestore / Admin SDK）をベースに構築しています。

---

## 🔥 目的

- お客様が自分のスマホで注文できる
- 店側の会計処理がスムーズになる
- 追加注文もまとめて「1世帯」として管理できる
- 席番号と店舗IDを元に **セッション（世帯）** を発行する仕組みを採用する

---

## 📌 現在の機能一覧（2025/11 時点）

### ✔ 顧客側
- 店舗ページ読み込み
- 席番号ごとの **世帯セッション初期化**
- 複数メニューの追加注文
- Firestore に注文を保存
- “注文が送信されました” ダイアログ表示

### ✔ 店舗側（今後実装）
- セッション一覧表示
- 注文中の世帯の合計金額計算
- 会計完了 → セッション終了（status = closed）

---

## 🏗 アーキテクチャ構成

```
hukumatu/
├── app/
│   ├── (customer)/[shopId]/page.tsx  # 顧客注文画面
│   ├── api/
│   │   ├── session/start/route.ts    # セッション初期化API
│   │   ├── order/route.ts            # 注文送信API
├── lib/
│   ├── firebase-admin.ts             # Firebase Admin SDK 初期化
│   ├── firestore.ts                  # Firestore（client SDK）
├── seed/                             # 初期メニュー投入用
├── serviceAccountKey.json            # Firebase サービスアカウント
└── .env.local                        # 環境変数（API用）
```

---

## 🔐 環境変数 `.env.local`

```
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account", ... }'
```

サービスアカウントの JSON を **1行の文字列として格納**しています。

---

## 🔥 Firestore 構造

### ① sessions（世帯管理）
```
sessions/
  {sessionId}/
    shopId: "hukumatu"
    tableNumber: 5
    status: "active" | "closed"
    createdAt: Timestamp
    updatedAt: Timestamp
```

### ② orders（注文データ）
```
orders/
  {orderId}/
    sessionId: "xxxxx"
    shopId: "hukumatu"
    tableNumber: 5
    items: [
      { number: 101, price: 700 },
      ...
    ]
    total: 1400
    createdAt: Timestamp
```

### ③ menu（メニュー）
```
menu/
  {menuId}/
    shopId: "hukumatu"
    number: 101
    name: "ソーキそば"
    price: 800
```

---

## 🚀 セッションの仕組み（重要）

### ✔ ページを開いた瞬間に `/api/session/start` が実行  
- active なセッションを検索  
- あればそれを返す  
- なければ新しい sessionId を発行する  

### ✔ 追加注文はすべて同じ sessionId に紐づく  
→ 席に座ってから会計までは1世帯扱い

---

## 📡 API の一覧

### 🔷 1. セッション開始  
`POST /api/session/start`

リクエスト例：
```
{ "shopId": "hukumatu", "tableNumber": 3 }
```

レスポンス：
```
{ "sessionId": "xxxx", "tableNumber": 3 }
```

---

### 🔷 2. 注文送信  
`POST /api/order`

リクエスト例：
```
{
  "sessionId": "xxxx",
  "shopId": "hukumatu",
  "tableNumber": 3,
  "items": [101, 101, 201]
}
```

レスポンス：
```
{ "orderId": "BGbSrDoczy2YtXirvCOp" }
```

---

## 🛠 これから追加する機能（次のステップ）

- 店舗側ダッシュボード（注文一覧）
- 会計処理（合計金額計算）
- セッション終了（status: closed）
- 管理者ログイン（Firebase Auth or LINE Login）

---

## 📄 開発メモ

- Next.js App Router で同期パラメータを useEffect で unwrap する必要あり
- Firestore Admin SDK は必ずサーバーAPI側でのみ使用
- 金額の計算は server 側で行い、フロントの不正改変を防ぐ

---

## 💬 開発者メモ（のんちゃん専用）

- セッションIDは **客が席についたタイミングだけ** 変わる
- 追加注文は同じセッション
- このREADMEは次のチャットへ引き継ぎ可能なように設計済み

---

 http://localhost:3000/?table=1

