"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type AdminResult = {
  sessionId: string;
  tableNumber: number;
  totalAmount: number;
  status: string;
  orders: { id: string; items: number[]; subTotal?: number }[];
};

export default function AdminPage() {
  const [shopId, setShopId] = useState("hukumatu");
  // デフォルトパスワードはサーバー側と合わせて "adminpass"（環境変数 ADMIN_PASSWORD で上書き可）
  const [password, setPassword] = useState("adminpass");
  const [isAuthed, setIsAuthed] = useState(false);
  const [sessionIdInput, setSessionIdInput] = useState("");
  const [settleResult, setSettleResult] = useState<AdminResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // camera
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [scanning, setScanning] = useState(false);
  const detectorSupported = typeof window !== "undefined" && "BarcodeDetector" in window;

  useEffect(() => {
    if (!scanning) return;
    let stop = false;
    const video = videoRef.current;
    let stream: MediaStream | null = null;
    const detector = detectorSupported ? new (window as any).BarcodeDetector({ formats: ["code_39", "code_128", "qr_code"] }) : null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (video) {
          video.srcObject = stream;
          await video.play();
        }

        const tick = async () => {
          if (stop || !video || video.readyState < 2 || !detector) return;
          try {
            const codes = await detector.detect(video);
            if (codes && codes.length > 0) {
              const raw = codes[0].rawValue;
              if (raw) {
                setSessionIdInput(raw);
                setScanning(false);
                stopStream();
                return;
              }
            }
          } catch (err) {
            console.error("detect error", err);
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      } catch (err) {
        console.error("camera error", err);
        setError("カメラの起動に失敗しました");
        stopStream();
      }
    };

    const stopStream = () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };

    startCamera();
    return () => {
      stop = true;
      stopStream();
    };
  }, [scanning, detectorSupported]);

  const login = () => {
    if (!shopId || !password) {
      setError("店舗名とパスワードを入力してください");
      return;
    }
    setIsAuthed(true);
    setError(null);
  };

  const settle = async () => {
    if (!sessionIdInput || !isAuthed) {
      setError("セッションIDを入力してください");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionIdInput.trim(),
          shopId: shopId.trim(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "エラーが発生しました");
        setSettleResult(null);
        return;
      }
      setSettleResult(data);
    } catch (err) {
      console.error(err);
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const ordersFlatten = useMemo(() => {
    if (!settleResult) return [];
    const counts: Record<number, number> = {};
    settleResult.orders.forEach((o) => {
      (o.items || []).forEach((n) => {
        if (!Number.isFinite(n)) return;
        counts[n] = (counts[n] || 0) + 1;
      });
    });
    return Object.entries(counts).map(([code, qty]) => ({
      code: Number(code),
      quantity: qty,
    }));
  }, [settleResult]);

  return (
    <div style={pageStyle}>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>管理者会計</h1>

      {!isAuthed ? (
        <div style={card}>
          <div style={field}>
            <label style={label}>店舗名</label>
            <input
              style={input}
              value={shopId}
              onChange={(e) => setShopId(e.target.value)}
              placeholder="hukumatu"
            />
          </div>
          <div style={field}>
            <label style={label}>パスワード</label>
            <input
              style={input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="****"
            />
          </div>
          <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
            デフォルトパスワード: adminpass（環境変数 ADMIN_PASSWORD で変更可）
          </div>
          <button style={primaryBtn} onClick={login}>
            ログイン
          </button>
        </div>
      ) : (
        <>
          <div style={card}>
            <div style={field}>
              <label style={label}>バーコード/セッションID</label>
              <input
                style={input}
                value={sessionIdInput}
                onChange={(e) => setSessionIdInput(e.target.value)}
                placeholder="スキャンまたは手入力"
              />
            </div>
            {detectorSupported ? (
              <div style={{ marginBottom: 12 }}>
                <button
                  style={secondaryBtn}
                  onClick={() => setScanning((s) => !s)}
                >
                  {scanning ? "カメラ停止" : "カメラで読み取る"}
                </button>
                {scanning && (
                  <div style={videoBox}>
                    <video ref={videoRef} style={{ width: "100%" }} />
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: "#666", fontSize: 14 }}>
                BarcodeDetector 非対応ブラウザです。手入力をご利用ください。
              </div>
            )}
            <button style={primaryBtn} onClick={settle} disabled={loading}>
              {loading ? "処理中..." : "会計する"}
            </button>
            {error && <div style={errorText}>{error}</div>}
          </div>

          {settleResult && (
            <div style={card}>
              <div style={{ fontSize: 18, marginBottom: 8 }}>
                会計完了: セッション {settleResult.sessionId}
              </div>
              <div style={{ marginBottom: 8 }}>
                席番号: {settleResult.tableNumber} / 合計{" "}
                {settleResult.totalAmount.toLocaleString()} 円
              </div>
              <div style={{ fontSize: 14, color: "#444", marginBottom: 8 }}>
                ステータス: {settleResult.status}
              </div>
              <div style={{ fontWeight: "bold", marginTop: 10, marginBottom: 6 }}>
                明細
              </div>
              <div style={detailList}>
                {ordersFlatten.length === 0 ? (
                  <div style={{ color: "#666" }}>明細がありません</div>
                ) : (
                  ordersFlatten.map((item) => (
                    <div key={item.code} style={detailRow}>
                      <div>#{item.code}</div>
                      <div style={{ marginLeft: "auto" }}>x {item.quantity}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

//
// Styles
//

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f5f5f5",
  padding: "24px",
  fontFamily: "Arial, sans-serif",
};

const card: React.CSSProperties = {
  background: "#fff",
  padding: "16px",
  borderRadius: 12,
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  marginBottom: 16,
};

const field: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  marginBottom: 12,
};

const label: React.CSSProperties = {
  fontWeight: "bold",
  fontSize: 14,
  color: "#333",
};

const input: React.CSSProperties = {
  border: "1px solid #ccc",
  borderRadius: 8,
  padding: "10px",
  fontSize: 16,
};

const primaryBtn: React.CSSProperties = {
  background: "#1976d2",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "12px",
  fontSize: 16,
  fontWeight: "bold",
  width: "100%",
  cursor: "pointer",
};

const secondaryBtn: React.CSSProperties = {
  background: "#fff",
  color: "#1976d2",
  border: "2px solid #1976d2",
  borderRadius: 10,
  padding: "10px",
  fontSize: 15,
  fontWeight: "bold",
  cursor: "pointer",
  marginBottom: 8,
};

const videoBox: React.CSSProperties = {
  border: "1px solid #ccc",
  borderRadius: 10,
  overflow: "hidden",
  marginTop: 8,
};

const errorText: React.CSSProperties = {
  marginTop: 8,
  color: "#d32f2f",
  fontSize: 14,
};

const detailList: React.CSSProperties = {
  border: "1px solid #eee",
  borderRadius: 8,
  padding: 10,
  maxHeight: 260,
  overflowY: "auto",
};

const detailRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  padding: "8px 0",
  borderBottom: "1px solid #f0f0f0",
  fontSize: 15,
};
