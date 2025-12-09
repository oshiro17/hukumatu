"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getMenuMap } from "@/lib/firestore";

type CheckoutOrder = {
  id: string;
  items: number[];
};

type MenuMap = Record<number, { name: string; price: number; isActive: boolean }>;

export default function CheckoutPage() {
  const router = useRouter();
  const params = useParams();
  const search = useSearchParams();

  const shopId = params.shopId as string;
  const table = search.get("table");
  const lang = search.get("lang") ?? "ja";
  const people = search.get("people") ?? "1";
  const tableNumber = Number(table || "0");

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [orders, setOrders] = useState<CheckoutOrder[]>([]);
  const [totalAmount, setTotalAmount] = useState<number | null>(null);
  const [menuMap, setMenuMap] = useState<MenuMap | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (!tableNumber) return;
      setLoading(true);
      try {
        const startRes = await fetch("/api/session/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shopId, tableNumber }),
        });
        const startData = await startRes.json();
        if (!startRes.ok || !startData.sessionId) {
          console.error("session start error", startData);
          return;
        }
        setSessionId(startData.sessionId);

        const checkoutRes = await fetch(
          `/api/checkout?sessionId=${encodeURIComponent(startData.sessionId)}`
        );
        const checkoutData = await checkoutRes.json();
        if (checkoutRes.ok) {
          setOrders(checkoutData.orders || []);
          setTotalAmount(checkoutData.totalAmount ?? null);
        } else {
          console.error("checkout error", checkoutData);
        }
      } catch (e) {
        console.error("checkout fetch error", e);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [shopId, tableNumber]);

  useEffect(() => {
    (async () => {
      try {
        const map = await getMenuMap(shopId);
        setMenuMap(map);
      } catch (e) {
        console.error("menu map error", e);
      }
    })();
  }, [shopId]);

  const detailItems = useMemo(() => {
    const counts: Record<number, number> = {};
    orders.forEach((o) => {
      (o.items || []).forEach((num) => {
        if (!Number.isFinite(num)) return;
        counts[num] = (counts[num] || 0) + 1;
      });
    });
    const list = Object.entries(counts).map(([code, qty]) => {
      const n = Number(code);
      const info = menuMap?.[n];
      return {
        code: n,
        name: info?.name || `#${code}`,
        price: info?.price ?? 0,
        quantity: qty,
      };
    });
    return list;
  }, [orders, menuMap]);

  const computedTotal =
    totalAmount ??
    detailItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const computedCount = detailItems.reduce((sum, item) => sum + item.quantity, 0);

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
      <div style={topBar}>会計用バーコードを提示してください</div>

      <div style={barcodeBox}>
        {sessionId ? (
          <Barcode value={sessionId} />
        ) : (
          <div style={placeholder}>
            {loading ? "バーコードを生成しています…" : "バーコードを生成できませんでした"}
          </div>
        )}
      </div>

      <button style={detailBtn} onClick={() => setShowDetail((v) => !v)}>
        明細を見る
      </button>

      {showDetail && (
        <div style={detailBox}>
          <div style={detailHeaderRow}>
            <div style={{ ...cellBase, flex: 2 }}>メニュー名</div>
            <div style={{ ...cellBase, flex: 1, textAlign: "center" }}>数量</div>
            <div style={{ ...cellBase, flex: 1, textAlign: "center" }}>価格</div>
          </div>
          {detailItems.length === 0 ? (
            <div style={emptyText}>まだ明細がありません</div>
          ) : (
            detailItems.map((item) => (
              <div key={item.code} style={detailRow}>
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
      )}

      <div style={summaryRow}>
        <div style={summaryText}>{computedCount} 点</div>
        <div style={summaryText}>
          合計 {computedTotal.toLocaleString()} 円（税込）
        </div>
      </div>

      <div style={bottomBar}>
        <div style={bottomBtn} onClick={goMenu}>
          注文追加
        </div>
        <div style={bottomBtn} onClick={goCart}>
          注文かご
        </div>
        <div style={bottomBtn} onClick={goHistory}>
          注文履歴
        </div>
        <div style={bottomBtn}>店員呼出</div>
        <div style={{ ...bottomBtn, ...bottomBtnActive }} onClick={goCheckout}>
          会計する
        </div>
      </div>
    </div>
  );
}

function Barcode({ value }: { value: string }) {
  const svg = useMemo(() => {
    return renderCode39(value);
  }, [value]);

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      {svg}
    </div>
  );
}

function renderCode39(text: string) {
  const map: Record<string, string> = {
    "0": "nnnwwnwnn",
    "1": "wnnwnnnnw",
    "2": "nnwwnnnnw",
    "3": "wnwwnnnnn",
    "4": "nnnwwnnnw",
    "5": "wnnwwnnnn",
    "6": "nnwwwnnnn",
    "7": "nnnwnnwnw",
    "8": "wnnwnnwnn",
    "9": "nnwwnnwnn",
    A: "wnnnnwnnw",
    B: "nnwnnwnnw",
    C: "wnwnnwnnn",
    D: "nnnnwwnnw",
    E: "wnnnwwnnn",
    F: "nnwnwwnnn",
    G: "nnnnnwwnw",
    H: "wnnnnwwnn",
    I: "nnwnnwwnn",
    J: "nnnnwwwnn",
    K: "wnnnnnnww",
    L: "nnwnnnnww",
    M: "wnwnnnnwn",
    N: "nnnnwnnww",
    O: "wnnnwnnwn",
    P: "nnwnwnnwn",
    Q: "nnnnnnwww",
    R: "wnnnnnwwn",
    S: "nnwnnnwwn",
    T: "nnnnwnwwn",
    U: "wwnnnnnnw",
    V: "nwwnnnnnw",
    W: "wwwnnnnnn",
    X: "nwnnwnnnw",
    Y: "wwnnwnnnn",
    Z: "nwwnwnnnn",
    "-": "nwnnnnwnw",
    ".": "wwnnnnwnn",
    " ": "nwwnnnwnn",
    $: "nwnwnwnnn",
    "/": "nwnwnnnwn",
    "+": "nwnnnwnwn",
    "%": "nnnwnwnwn",
    "*": "nwnnwnwnn",
  };

  const clean = `*${text.toUpperCase().replace(/[^0-9A-Z\\. \\-\\/$+%]/g, "-")}*`;
  const narrow = 2;
  const wide = narrow * 3;
  const gap = narrow;

  let x = 0;
  const bars: { x: number; width: number; black: boolean }[] = [];

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    const pattern = map[ch];
    if (!pattern) continue;
    for (let j = 0; j < pattern.length; j++) {
      const isBar = j % 2 === 0;
      const isWide = pattern[j] === "w";
      const width = isWide ? wide : narrow;
      if (isBar) {
        bars.push({ x, width, black: true });
      }
      x += width;
    }
    // inter-character gap
    x += gap;
  }

  const height = 120;
  const viewWidth = x + narrow;

  return (
    <svg width="280" height={height} viewBox={`0 0 ${viewWidth} ${height}`}>
      <rect x={0} y={0} width={viewWidth} height={height} fill="#fff" />
      {bars.map((b, idx) => (
        <rect
          key={`${b.x}-${idx}`}
          x={b.x}
          y={0}
          width={b.width}
          height={height - 20}
          fill="#000"
        />
      ))}
      <text
        x={viewWidth / 2}
        y={height - 5}
        fill="#000"
        fontSize="16"
        textAnchor="middle"
        fontFamily="monospace"
      >
        {text}
      </text>
    </svg>
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

const barcodeBox: React.CSSProperties = {
  marginTop: 18,
  border: "3px solid #2E7D32",
  borderRadius: 10,
  minHeight: 200,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#F9FBF7",
  padding: 16,
};

const placeholder: React.CSSProperties = {
  color: "#555",
  fontSize: 16,
};

const detailBtn: React.CSSProperties = {
  marginTop: 16,
  alignSelf: "center",
  background: "linear-gradient(180deg, #6BCD86 0%, #1B8D3A 100%)",
  border: "2px solid #1B8D3A",
  padding: "12px 20px",
  fontSize: 18,
  color: "#fff",
  borderRadius: 10,
  fontWeight: "bold",
  cursor: "pointer",
};

const detailBox: React.CSSProperties = {
  marginTop: 16,
  border: "3px solid #2E7D32",
  borderRadius: 10,
  background: "#F9FBF7",
  overflow: "hidden",
};

const detailHeaderRow: React.CSSProperties = {
  display: "flex",
  background: "#E0E0E0",
  borderBottom: "2px solid #C8E6C9",
};

const cellBase: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 16,
  color: "#000",
};

const detailRow: React.CSSProperties = {
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
  padding: "24px 0",
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
