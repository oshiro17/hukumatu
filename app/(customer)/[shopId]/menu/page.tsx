"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { getMenuMap } from "@/lib/firestore"; // Firestore からローカルにメニューを取得する関数（前段で作成）

const LOCAL_CART_KEY = "hukumatu-cart";
const LOCAL_PENDING_KEY = "hukumatu-pending-item";

type CartItem = {
  code: string;
  name: string;
  price: number;
  quantity: number;
  shopId?: string;
  table?: string | null;
  lang?: string | null;
  people?: string | null;
  addedAt?: string;
};

export default function MenuPage() {
  const router = useRouter();
  const params = useParams();
  const search = useSearchParams();

  const shopId = params.shopId as string;
  const table = search.get("table");
  const lang = search.get("lang") ?? "ja";
  const people = search.get("people") ?? "1";

  const [code, setCode] = useState("");
  const [menuMap, setMenuMap] = useState<Record<
    number,
    { name: string; price: number; isActive: boolean }
  > | null>(null);

  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState<number | null>(null);
  const [isSoldOut, setIsSoldOut] = useState(false);
  const [showQuantityStep, setShowQuantityStep] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [cartCount, setCartCount] = useState(0);

  // --- Firestore からメニューを最初に一度だけ取得 ---
  useEffect(() => {
    (async () => {
      const res = await getMenuMap(shopId);
      setMenuMap(res);
    })();
  }, [shopId]);

  // --- ローカル注文数を読み込み ---
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_CART_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as CartItem[];
      if (Array.isArray(parsed)) {
        const total = parsed.reduce(
          (sum, item) => sum + (item.quantity || 0),
          0
        );
        setCartCount(total);
      }
    } catch (e) {
      console.error("Failed to read cart", e);
    }
  }, []);

  // --- 保持している数量選択状態を復元 ---
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(LOCAL_PENDING_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        code: string;
        itemName: string;
        itemPrice: number;
        quantity: number;
      };
      if (!saved?.code) return;
      setCode(saved.code);
      setItemName(saved.itemName);
      setItemPrice(saved.itemPrice);
      setIsSoldOut(false);
      setQuantity(saved.quantity || 1);
      setShowQuantityStep(true);
    } catch (e) {
      console.error("Failed to restore pending item", e);
    }
  }, []);

  // --- コード入力のたびにローカル検索 ---
  useEffect(() => {
    if (!menuMap) return;

    if (!code) {
      setItemName("");
      setItemPrice(null);
      setIsSoldOut(false);
      return;
    }

    const codeNum = Number(code);
    const hit = menuMap[codeNum];

    if (!hit) {
      setItemName("");
      setItemPrice(null);
      setIsSoldOut(false);
      return;
    }

    setItemName(hit.name);
    setItemPrice(hit.price);
    setIsSoldOut(!hit.isActive);
  }, [code, menuMap]);

  const press = (num: string) => {
    setCode((prev) => (prev + num).slice(0, 6)); // 最大6桁
  };

  const clear = () => setCode("");

  const goNext = () => {
    if (!itemName || isSoldOut || itemPrice === null) return;
    setQuantity(1);
    setShowQuantityStep(true);
    sessionStorage.setItem(
      LOCAL_PENDING_KEY,
      JSON.stringify({
        code,
        itemName,
        itemPrice,
        quantity: 1,
      })
    );
  };

  const backToInput = () => {
    setShowQuantityStep(false);
    sessionStorage.removeItem(LOCAL_PENDING_KEY);
  };

  const decreaseQty = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  const increaseQty = () => {
    setQuantity((prev) => prev + 1);
  };

  const addToCart = () => {
    if (!itemName || itemPrice === null || !code) return;

    const newItem: CartItem = {
      code,
      name: itemName,
      price: itemPrice,
      quantity,
      shopId,
      table,
      lang,
      people,
      addedAt: new Date().toISOString(),
    };

    try {
      const raw = localStorage.getItem(LOCAL_CART_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const next: CartItem[] = Array.isArray(parsed) ? parsed : [];
      next.push(newItem);
      localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(next));

      const total = next.reduce((sum, item) => sum + (item.quantity || 0), 0);
      setCartCount(total);
    } catch (e) {
      console.error("Failed to save cart locally", e);
    }

    setShowQuantityStep(false);
    sessionStorage.removeItem(LOCAL_PENDING_KEY);
    setCode("");
    setItemName("");
    setItemPrice(null);
    setIsSoldOut(false);
    setQuantity(1);
    router.push(
      `/${shopId}/cart?table=${table ?? ""}&lang=${lang}&people=${people}`
    );
  };

  const keypad = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
  const instruction = showQuantityStep
    ? "数量を選択してください"
    : "メニューブックから番号を入力してください";
  const isOrderTabActive = true; // 番号入力〜注文追加までのフェーズで常時ハイライト
  const goCart = () =>
    router.push(`/${shopId}/cart?table=${table ?? ""}&lang=${lang}&people=${people}`);
  const goHistory = () =>
    router.push(
      `/${shopId}/history?table=${table ?? ""}&lang=${lang}&people=${people}`
    );
  const goCheckout = () =>
    router.push(
      `/${shopId}/checkout?table=${table ?? ""}&lang=${lang}&people=${people}`
    );

  return (
    <div style={pageStyle}>
      {/* 上の説明バー */}
      <div style={topBar}>{instruction}</div>

      {/* 数量選択フェーズ */}
      {showQuantityStep && itemPrice !== null ? (
        <div style={quantityBox}>
          <div style={quantityItemRow}>
            <div style={quantityItemName}>{itemName}</div>
            <div style={quantityItemPrice}>{itemPrice}円</div>
          </div>

          <div style={quantityControlRow}>
            <button style={quantityBtn} onClick={decreaseQty}>
              －
            </button>
            <div style={quantityValue}>{quantity}</div>
            <button style={quantityBtn} onClick={increaseQty}>
              ＋
            </button>
          </div>

          <div style={actionRow}>
            <button style={backBtn} onClick={backToInput}>
              もどる
            </button>
            <button style={addCartBtn} onClick={addToCart}>
              注文かごへ追加する
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 商品名表示欄 */}
          <div style={itemBox}>
            {itemName ? (
              isSoldOut ? (
                <span style={{ color: "red" }}>売り切れです</span>
              ) : (
                itemName
              )
            ) : (
              ""
            )}
          </div>

          {/* 次へ進むボタン（商品がヒット && 在庫あり の時だけ表示） */}
          {itemName && !isSoldOut ? (
            <button style={nextBtn} onClick={goNext}>
              次へ進む
            </button>
          ) : (
            <div style={{ height: 55 }} />
          )}

          {/* 番号表示欄 */}
          <div style={codeBox}>{code || "----"}</div>

          {/* テンキー */}
          <div style={keypadGrid}>
            {keypad.map((n) => (
              <button key={n} onClick={() => press(n)} style={keyBtn}>
                {n}
              </button>
            ))}

            {/* 削除 */}
            <button onClick={clear} style={deleteBtn}>
              削除
            </button>
          </div>
        </>
      )}

      {/* 下のメニューバー（ダミー） */}
      <div style={bottomBar}>
        <div style={{ ...bottomBtn, ...(isOrderTabActive ? bottomBtnActive : {}) }}>
          注文追加
        </div>
        <div style={bottomBtn} onClick={goCart}>
          <span style={{ position: "relative", display: "inline-block" }}>
            注文かご
            {cartCount > 0 && (
              <span style={badge}>{cartCount}</span>
            )}
          </span>
        </div>
        <div style={bottomBtn} onClick={goHistory}>
          注文履歴
        </div>
        <div style={bottomBtn}>店員呼出</div>
        <div style={bottomBtn} onClick={goCheckout}>
          会計する
        </div>
      </div>
      {/* --- デバッグ表示 --- */}
      {!showQuantityStep && (
        <div
          style={{
            marginTop: 40,
            padding: 20,
            background: "#eee",
            color: "#000",
            fontSize: 14,
            borderRadius: 8,
          }}
        >
          <div>DEBUG</div>
          <div>shopId: {shopId}</div>
          <div>table: {table}</div>
          <div>lang: {lang}</div>
          <div>people: {people}</div>
          <div>code: {code}</div>
          <div>
            menuMap keys: {menuMap ? Object.keys(menuMap).join(", ") : "null"}
          </div>
          <div>hit item: {itemName || "なし"}</div>
        </div>
      )}
    </div>
    
  );
}

//
// --- Styles ---
//

const pageStyle: React.CSSProperties = {
  background: "#ffffff",
  minHeight: "100vh",
  padding: "0 20px",
  fontSize: 20,
  color: "#000",
  fontWeight: "bold",
  display: "flex",
  flexDirection: "column",
};

const topBar: React.CSSProperties = {
  background: "#2E7D32",
  color: "#fff",
  padding: "10px 12px",
  borderRadius: 5,
  marginTop: 15,
  textAlign: "center",
  fontWeight: "bold",
};

const itemBox: React.CSSProperties = {
  marginTop: 20,
  background: "#E8F5E9",
  padding: "12px 15px",
  fontSize: 24,
  borderRadius: 5,
  minHeight: 40,
  color: "#000",
  fontWeight: "bold",
};

const nextBtn: React.CSSProperties = {
  marginTop: 15,
  background: "#c62828",
  padding: "12px 20px",
  fontSize: 22,
  color: "white",
  borderRadius: 8,
  width: "100%",
  fontWeight: "bold",
};

const codeBox: React.CSSProperties = {
  marginTop: 20,
  background: "white",
  border: "3px solid #388E3C",
  padding: "10px",
  textAlign: "center",
  fontSize: 36,
  borderRadius: 8,
  color: "#000",
  fontWeight: "bold",
};

const quantityBox: React.CSSProperties = {
  marginTop: 30,
  display: "flex",
  flexDirection: "column",
  gap: 40,
  alignItems: "center",
};

const quantityItemRow: React.CSSProperties = {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
};

const quantityItemName: React.CSSProperties = {
  fontSize: 26,
  color: "#000",
  fontWeight: "bold",
};

const quantityItemPrice: React.CSSProperties = {
  fontSize: 22,
  color: "#000",
  fontWeight: "bold",
};

const quantityControlRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
};

const quantityBtn: React.CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: 12,
  border: "3px solid #388E3C",
  background: "#fff",
  fontSize: 32,
  color: "#1B5E20",
  fontWeight: "bold",
};

const quantityValue: React.CSSProperties = {
  minWidth: 70,
  textAlign: "center",
  fontSize: 28,
  border: "3px solid #BDBDBD",
  borderRadius: 8,
  padding: "10px 14px",
  color: "#000",
  fontWeight: "bold",
  background: "#fff",
};

const actionRow: React.CSSProperties = {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
};

const backBtn: React.CSSProperties = {
  flex: 1,
  background: "linear-gradient(180deg, #6BCD86 0%, #1B8D3A 100%)",
  border: "2px solid #1B8D3A",
  padding: "14px 10px",
  fontSize: 20,
  color: "#fff",
  borderRadius: 10,
  fontWeight: "bold",
};

const addCartBtn: React.CSSProperties = {
  flex: 1.6,
  background: "linear-gradient(180deg, #E85B4B 0%, #C62828 100%)",
  border: "2px solid #C62828",
  padding: "14px 10px",
  fontSize: 20,
  color: "#fff",
  borderRadius: 10,
  fontWeight: "bold",
};

const keypadGrid: React.CSSProperties = {
  marginTop: 25,
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 12,
};

const keyBtn: React.CSSProperties = {
  background: "#F1F8E9",
  border: "2px solid #C5E1A5",
  borderRadius: 10,
  padding: "18px 0",
  fontSize: 26,
  color: "#000",
  fontWeight: "bold",
};

const deleteBtn: React.CSSProperties = {
  gridColumn: "span 3",
  background: "#81C784",
  border: "2px solid #4CAF50",
  borderRadius: 10,
  padding: "18px 0",
  fontSize: 26,
  color: "#000",
  fontWeight: "bold",
};

const bottomBar: React.CSSProperties = {
  marginTop: "auto",
  display: "flex",
  justifyContent: "space-between",
  paddingTop: 32,
};

const bottomBtn: React.CSSProperties = {
  background: "#E0F2F1",
  border: "2px solid #80CBC4",
  padding: "10px 6px",
  borderRadius: 6,
  fontSize: 14,
  color: "#000",
  fontWeight: "bold",
  cursor: "pointer",
};

const bottomBtnActive: React.CSSProperties = {
  border: "3px solid #F9A825",
  boxShadow: "0 0 12px rgba(249, 168, 37, 0.75)",
  background: "#FFF8E1",
};

const badge: React.CSSProperties = {
  position: "absolute",
  top: -10,
  right: -16,
  background: "#E53935",
  color: "#fff",
  borderRadius: "50%",
  width: 22,
  height: 22,
  fontSize: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "bold",
  boxShadow: "0 0 6px rgba(0,0,0,0.2)",
};
