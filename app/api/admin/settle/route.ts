// app/api/admin/settle/route.ts
import { NextResponse } from "next/server";
import { adminDb, Timestamp, FieldValue } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, shopId, password } = body as {
      sessionId?: string;
      shopId?: string;
      password?: string;
    };

    if (!sessionId || !shopId || !password) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    // 簡易認証（本番では環境変数やAuthに置き換えること）
    const allowed = (process.env.ADMIN_PASSWORD || "adminpass").trim();
    if (password.trim() !== allowed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // セッション確認
    const sessionRef = adminDb.collection("sessions").doc(sessionId);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    const session = sessionSnap.data() as {
      tableNumber: number;
      status?: string;
      totalAmount?: number;
    };

    // 注文一覧取得
    const ordersSnap = await adminDb
      .collection("orders")
      .where("sessionId", "==", sessionId)
      .get();

    let total = 0;
    ordersSnap.forEach((doc) => {
      const d = doc.data() as { subTotal?: number };
      total += d.subTotal || 0;
    });

    await sessionRef.set(
      {
        status: "paid",
        totalAmount: total,
        paidAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );

    return NextResponse.json({
      sessionId,
      shopId,
      tableNumber: session.tableNumber,
      totalAmount: total,
      status: "paid",
      orders: ordersSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })),
    });
  } catch (error) {
    console.error("Admin settle error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
