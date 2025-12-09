"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

const LOCAL_CART_KEY = "hukumatu-cart";

type HistoryItem = {
  code: string;
  name: string;
  price: number;
  quantity: number;
};

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

export default function HistoryPage() {
  const router = useRouter();
  const params = useParams();
  const search = useSearchParams();

  const shopId = params.shopId as string;
  const table = search.get("table");
  const lang = search.get("lang") ?? "ja";
  const people = search.get("people") ?? "1";
  const tableNumber = Number(table || "0");

  const [items, setItems] = useState<HistoryItem[]>([]);
  const [cartCount, setCartCount] = useState(0);
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
    // cart badge
    try {
      const raw = localStorage.getItem(LOCAL_CART_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartItem[];
        if (Array.isArray(parsed)) {
          const count = parsed.reduce(
            (sum, item) => sum + (item.quantity || 0),
            0
          );
          setCartCount(count);
        }
      }
    } catch (e) {
      console.error("Failed to read cart", e);
    }
  }, []);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!tableNumber) return;
      setLoading(true);
      try {
        // ensure session
        const startRes = await fetch("/api/session/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shopId, tableNumber }),
        });
        const startData = await startRes.json();
        if (!startRes.ok || !startData.sessionId) {
          console.error("session error", startData);
          return;
        }

        const historyRes = await fetch(
          `/api/order/history?shopId=${encodeURIComponent(
            shopId
          )}&sessionId=${encodeURIComponent(startData.sessionId)}`
        );
        const historyData = await historyRes.json();
        if (!historyRes.ok) {
          console.error("history error", historyData);
          return;
        }
        setItems(historyData.items || []);
      } catch (e) {
        console.error("Failed to fetch history", e);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [shopId, tableNumber]);

  const goMenu = () => {
    router.push(`/${shopId}/menu?table=${table ?? ""}&lang=${lang}&people=${people}`);
  };

  const goCart = () => {
    router.push(`/${shopId}/cart?table=${table ?? ""}&lang=${lang}&people=${people}`);
  };

  const goHistory = () => {
    router.push(`/${shopId}/history?table=${table ?? ""}&lang=${lang}&people=${people}`);
  };

  const goCheckout = () => {
    router.push(`/${shopId}/checkout?table=${table ?? ""}&lang=${lang}&people=${people}`);
  };

  return (
    <div style={pageStyle}>
      <div style={topBar}>注文内容をご確認ください</div>

      <div style={listBox}>
        <div style={headerRow}>
          <div style={{ ...cellBase, flex: 2 }}>メニュー名</div>
          <div style={{ ...cellBase, flex: 1, textAlign: "center" }}>数量</div>
          <div style={{ ...cellBase, flex: 1, textAlign: "center" }}>価格</div>
        </div>

        {loading ? (
          <div style={emptyText}>読み込み中...</div>
        ) : items.length === 0 ? (
          <div style={emptyText}>まだ注文履歴がありません</div>
        ) : (
          items.map((item) => (
            <div key={item.code} style={row}>
              <div style={{ ...rowCell, flex: 2 }}>{item.name}</div>
              <div style={{ ...rowCell, flex: 1, textAlign: "center" }}>
                {item.quantity}
              </div>
              <div style={{ ...rowCell, flex: 1, textAlign: "center" }}>
                {item.price}
              </div>
            </div>
          ))
        )}
      </div>

      <div style={noteText}>注文の反映には数分かかることがございます</div>

      <div style={summaryRow}>
        <div style={summaryText}>{totalCount} 点</div>
        <div style={summaryText}>合計 {totalPrice.toLocaleString()} 円（税込）</div>
      </div>

      <div style={bottomBar}>
        <div style={bottomBtn} onClick={goMenu}>
          注文追加
        </div>
        <div style={bottomBtn} onClick={goCart}>
          <span style={{ position: "relative", display: "inline-block" }}>
            注文かご
            {cartCount > 0 && <span style={badge}>{cartCount}</span>}
          </span>
        </div>
        <div style={{ ...bottomBtn, ...bottomBtnActive }} onClick={goHistory}>
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

const listBox: React.CSSProperties = {
  marginTop: 18,
  border: "3px solid #2E7D32",
  borderRadius: 10,
  minHeight: 260,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  background: "#F9FBF7",
};

const headerRow: React.CSSProperties = {
  display: "flex",
  background: "#E0E0E0",
  borderBottom: "2px solid #C8E6C9",
  borderTopLeftRadius: 8,
  borderTopRightRadius: 8,
  overflow: "hidden",
};

const cellBase: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 16,
  color: "#000",
};

const row: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  borderBottom: "1px solid #C8E6C9",
  minHeight: 52,
  padding: "4px 0",
};

const rowCell: React.CSSProperties = {
  padding: "6px 12px",
  fontSize: 17,
  color: "#000",
  display: "flex",
  alignItems: "center",
  gap: 6,
};

const emptyText: React.CSSProperties = {
  textAlign: "center",
  color: "#666",
  padding: "36px 0",
  fontWeight: "normal",
};

const noteText: React.CSSProperties = {
  marginTop: 12,
  textAlign: "center",
  fontSize: 14,
  color: "#444",
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
