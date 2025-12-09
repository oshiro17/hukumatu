"use client";

import { useEffect, useState } from "react";

type MenuItem = {
  menuNumber: number;
};

type StartSessionResponse = {
  sessionId: string;
  shopId: string;
  tableNumber: number;
};

type OrderResponse = {
  orderId: string;
  total: number;
  message: string;
};

export default function CustomerPageClient({
  shopId,
  table,
}: {
  shopId: string;
  table?: string;
}) {
  const tableNumber = Number(table || "0");

  const [session, setSession] = useState<StartSessionResponse | null>(null);
  const [menuNumberInput, setMenuNumberInput] = useState("");
  const [cart, setCart] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tableNumber) return;

    const startSession = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/session/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shopId, tableNumber }),
        });

        const data = await res.json();
        if (res.ok) {
          setSession(data);
        } else {
          alert("セッション作成に失敗しました");
        }
      } finally {
        setLoading(false);
      }
    };

    startSession();
  }, [shopId, tableNumber]);

  const addToCart = () => {
    const num = Number(menuNumberInput);
    if (!num) return;
    setCart((prev) => [...prev, { menuNumber: num }]);
    setMenuNumberInput("");
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const submitOrder = async () => {
    if (!session || cart.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId,
          tableNumber,
          sessionId: session.sessionId,
          items: cart.map((c) => c.menuNumber),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(`注文失敗: ${data.error}`);
        return;
      }

      alert(`注文成功！ orderId: ${data.orderId}`);
      setCart([]);
    } catch (e) {
      console.error(e);
      alert("注文エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const checkoutQrUrl = session
    ? `${location.origin}/api/checkout?sessionId=${session.sessionId}`
    : "";

  return (
    <main className="min-h-screen bg-black text-white px-4 py-6">
      <h1 className="text-2xl font-bold mb-2">福松そば オーダー</h1>
      <p className="mb-2">店舗: {shopId}</p>
      <p className="mb-4">席番号: {tableNumber}</p>

      {session ? (
        <p className="mb-4 text-sm text-green-400">
          セッションID: {session.sessionId}
        </p>
      ) : (
        <p className="mb-4 text-sm text-yellow-400">
          セッションを初期化しています…
        </p>
      )}

      <section className="mb-6">
        <label className="block mb-2 text-sm">メニュー番号を入力</label>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded px-3 py-2 text-black"
            value={menuNumberInput}
            onChange={(e) => setMenuNumberInput(e.target.value)}
            placeholder="例: 101"
          />
          <button
            onClick={addToCart}
            className="px-4 py-2 rounded bg-blue-500 disabled:bg-gray-600"
            disabled={!menuNumberInput}
          >
            追加
          </button>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-xl mb-2">カート</h2>
        {cart.length === 0 ? (
          <p className="text-sm text-gray-400">まだ何も入っていません。</p>
        ) : (
          <ul className="mb-4">
            {cart.map((item, i) => (
              <li
                key={`${item.menuNumber}-${i}`}
                className="flex justify-between items-center border-b border-gray-700 py-2"
              >
                <span>番号: {item.menuNumber}</span>
                <button
                  className="text-red-400 text-sm"
                  onClick={() => removeFromCart(i)}
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          onClick={submitOrder}
          disabled={!session || cart.length === 0 || loading}
          className="w-full py-3 rounded bg-green-600 disabled:bg-gray-600"
        >
          {loading ? "送信中..." : "注文する"}
        </button>
      </section>

      {session && (
        <section className="mt-8 border-t border-gray-700 pt-4">
          <h2 className="text-xl mb-2">お会計用QR</h2>
          <div className="p-3 bg-gray-900 rounded text-xs break-all">
            {checkoutQrUrl}
          </div>
        </section>
      )}
    </main>
  );
}