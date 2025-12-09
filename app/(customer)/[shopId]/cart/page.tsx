"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

const LOCAL_CART_KEY = "hukumatu-cart";

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

export default function CartPage() {
  const router = useRouter();
  const params = useParams();
  const search = useSearchParams();

  const shopId = params.shopId as string;
  const table = search.get("table");
  const lang = search.get("lang") ?? "ja";
  const people = search.get("people") ?? "1";
  const tableNumber = Number(table || "0");

  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  const totalCount = useMemo(
    () => items.reduce((sum, item) => sum + (item.quantity || 0), 0),
    [items]
  );
  const totalPrice = useMemo(
    () => items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0),
    [items]
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_CART_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as CartItem[];
      if (Array.isArray(parsed)) {
        setItems(parsed);
      }
    } catch (e) {
      console.error("Failed to load cart", e);
    }
  }, []);

  const persist = (next: CartItem[]) => {
    setItems(next);
    localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(next));
  };

  const increase = (index: number) => {
    persist(
      items.map((item, i) =>
        i === index ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  };

  const decrease = (index: number) => {
    persist(
      items
        .map((item, i) =>
          i === index ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const goMenu = () => {
    router.push(`/${shopId}/menu?table=${table ?? ""}&lang=${lang}&people=${people}`);
  };

  const goHistory = () => {
    router.push(`/${shopId}/history?table=${table ?? ""}&lang=${lang}&people=${people}`);
  };

  const goCheckout = () => {
    router.push(`/${shopId}/checkout?table=${table ?? ""}&lang=${lang}&people=${people}`);
  };

  const submitOrder = async () => {
    if (items.length === 0) {
      alert("カートが空です");
      return;
    }
    if (!tableNumber) {
      alert("席番号が取得できませんでした");
      return;
    }
    setLoading(true);
    try {
      const startRes = await fetch("/api/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId, tableNumber }),
      });
      const startData = await startRes.json();
      if (!startRes.ok) {
        alert(`セッション作成に失敗しました: ${startData.error || startRes.status}`);
        return;
      }
      if (!startData.sessionId) {
        alert("セッションIDが取得できませんでした");
        return;
      }

      const itemNumbers: number[] = [];
      items.forEach((item) => {
        const num = Number(item.code);
        if (!Number.isFinite(num)) return;
        for (let i = 0; i < item.quantity; i += 1) {
          itemNumbers.push(num);
        }
      });

      if (itemNumbers.length === 0) {
        alert("送信できるメニュー番号がありません");
        return;
      }

      const orderRes = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId,
          tableNumber,
          sessionId: startData.sessionId,
          items: itemNumbers,
        }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        alert(`注文送信に失敗しました: ${orderData.error || orderRes.status}`);
        return;
      }

      localStorage.removeItem(LOCAL_CART_KEY);
      setItems([]);
      alert("注文を送信しました");
    } catch (e) {
      console.error("Order error", e);
      alert("注文送信中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={topBar}>他に注文があれば「追加」、なければ「注文」</div>

      <div style={cartBox}>
        {items.length === 0 ? (
          <div style={emptyText}>注文かごは空です</div>
        ) : (
          items.map((item, idx) => (
            <div key={`${item.code}-${idx}`} style={cartRow}>
              <div style={cartName}>{item.name}</div>
              <div style={cartQtyBox}>
                <button style={qtyBtn} onClick={() => decrease(idx)}>
                  －
                </button>
                <div style={qtyValue}>{item.quantity}</div>
                <button style={qtyBtn} onClick={() => increase(idx)}>
                  ＋
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={summaryRow}>
        <div style={summaryText}>{totalCount} 点</div>
        <div style={summaryText}>合計 {totalPrice.toLocaleString()} 円（税込）</div>
      </div>

      <div style={actionsRow}>
        <button style={addBtn} onClick={goMenu} disabled={loading}>
          追 加
        </button>
        <button style={orderBtn} onClick={submitOrder} disabled={loading || items.length === 0}>
          注 文
        </button>
      </div>

      <div style={bottomBar}>
        <div style={bottomBtn} onClick={goMenu}>
          注文追加
        </div>
        <div style={{ ...bottomBtn, ...bottomBtnActive }}>
          <span style={{ position: "relative", display: "inline-block" }}>
            注文かご
            {totalCount > 0 && <span style={badge}>{totalCount}</span>}
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
    </div>
  );
}

//
// Styles
//

const pageStyle: React.CSSProperties = {
  background: "#ffffff",
  minHeight: "100vh",
  padding: "0 16px 24px",
  fontSize: 18,
  color: "#000",
  fontWeight: "bold",
  display: "flex",
  flexDirection: "column",
};

const topBar: React.CSSProperties = {
  marginTop: 16,
  background: "#2E7D32",
  color: "#fff",
  padding: "12px 12px",
  borderRadius: 14,
  textAlign: "center",
};

const cartBox: React.CSSProperties = {
  marginTop: 18,
  border: "3px solid #2E7D32",
  borderRadius: 10,
  minHeight: 260,
  padding: 14,
  display: "flex",
  flexDirection: "column",
  gap: 16,
  background: "#F9FBF7",
};

const cartRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  paddingBottom: 10,
  borderBottom: "1px solid #C8E6C9",
};

const cartName: React.CSSProperties = {
  fontSize: 18,
  color: "#000",
  fontWeight: "bold",
  maxWidth: "60%",
};

const cartQtyBox: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const qtyBtn: React.CSSProperties = {
  width: 46,
  height: 38,
  borderRadius: 8,
  border: "2px solid #2E7D32",
  background: "#fff",
  color: "#1B5E20",
  fontSize: 22,
  fontWeight: "bold",
};

const qtyValue: React.CSSProperties = {
  width: 38,
  textAlign: "center",
  border: "2px solid #BDBDBD",
  borderRadius: 8,
  padding: "8px 0",
  fontSize: 18,
  fontWeight: "bold",
  background: "#fff",
};

const emptyText: React.CSSProperties = {
  textAlign: "center",
  color: "#666",
  padding: "40px 0",
  fontWeight: "normal",
};

const summaryRow: React.CSSProperties = {
  marginTop: 14,
  display: "flex",
  justifyContent: "space-between",
  padding: "0 8px",
};

const summaryText: React.CSSProperties = {
  fontSize: 18,
  color: "#000",
  fontWeight: "bold",
};

const actionsRow: React.CSSProperties = {
  marginTop: 16,
  display: "flex",
  gap: 14,
};

const addBtn: React.CSSProperties = {
  flex: 1,
  background: "linear-gradient(180deg, #6BCD86 0%, #1B8D3A 100%)",
  border: "2px solid #1B8D3A",
  padding: "14px 10px",
  fontSize: 20,
  color: "#fff",
  borderRadius: 10,
  fontWeight: "bold",
};

const orderBtn: React.CSSProperties = {
  flex: 1,
  background: "linear-gradient(180deg, #E85B4B 0%, #C62828 100%)",
  border: "2px solid #C62828",
  padding: "14px 10px",
  fontSize: 20,
  color: "#fff",
  borderRadius: 10,
  fontWeight: "bold",
};

const bottomBar: React.CSSProperties = {
  marginTop: "auto",
  display: "flex",
  justifyContent: "space-between",
  paddingTop: 26,
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
