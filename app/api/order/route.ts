// app/api/order/route.ts
import { NextResponse } from "next/server";
import { adminDb, FieldValue, Timestamp } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { shopId, tableNumber, sessionId, items } = body as {
      shopId: string;
      tableNumber: number;
      sessionId: string;
      items: number[];
    };

    if (!shopId || !tableNumber || !sessionId || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Invalid parameters" },
        { status: 400 }
      );
    }

    // メニュー一覧を取得して番号→金額マップを作る
    const menuSnap = await adminDb
      .collection("menu")
      .where("shopId", "==", shopId)
      .get();

    const priceMap: Record<number, number> = {};
    menuSnap.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const d = doc.data() as { menuNumber: number; price: number };
      priceMap[d.menuNumber] = d.price;
    });

    // 合計計算
    let subTotal = 0;
    for (const num of items) {
      const price = priceMap[num];
      if (!price) {
        return NextResponse.json(
          { error: `メニュー番号 ${num} が存在しません` },
          { status: 400 }
        );
      }
      subTotal += price;
    }

    const now = Timestamp.now();

    // 注文ドキュメント作成
    const orderRef = await adminDb.collection("orders").add({
      shopId,
      tableNumber,
      sessionId,
      items,
      subTotal,
      createdAt: now,
    });

    // セッションの合計金額を更新（存在しない場合は作成）
    const sessionRef = adminDb.collection("sessions").doc(sessionId);
    await sessionRef.set(
      {
        shopId,
        tableNumber,
        status: "active",
        totalAmount: FieldValue.increment(subTotal),
        createdAt: now,
        updatedAt: now,
      },
      { merge: true }
    );

    return NextResponse.json({
      orderId: orderRef.id,
      total: subTotal,
      message: "注文を受け付けました",
    });
  } catch (error) {
    console.error("Order API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
