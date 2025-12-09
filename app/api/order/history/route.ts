// app/api/order/history/route.ts
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const shopId = searchParams.get("shopId");

    if (!sessionId || !shopId) {
      return NextResponse.json(
        { error: "sessionId and shopId are required" },
        { status: 400 }
      );
    }

    // 価格/名前マップ
    const menuSnap = await adminDb
      .collection("menu")
      .where("shopId", "==", shopId)
      .get();

    const priceMap: Record<number, number> = {};
    const nameMap: Record<number, string> = {};
    menuSnap.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const d = doc.data() as { menuNumber: number; price: number; name: string };
      priceMap[d.menuNumber] = d.price;
      nameMap[d.menuNumber] = d.name;
    });

    // 注文取得
    const ordersSnap = await adminDb
      .collection("orders")
      .where("sessionId", "==", sessionId)
      // orderBy を付けると composite index が必要になるため省略
      .get();

    const counter: Record<
      number,
      { quantity: number; price: number; name: string }
    > = {};

    ordersSnap.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const d = doc.data() as { items: number[] };
      (d.items || []).forEach((num) => {
        if (!Number.isFinite(num)) return;
        const price = priceMap[num] ?? 0;
        const name = nameMap[num] ?? `#${num}`;
        if (!counter[num]) {
          counter[num] = { quantity: 0, price, name };
        }
        counter[num].quantity += 1;
        // price/name keep first encounter
      });
    });

    const items = Object.entries(counter).map(([code, info]) => ({
      code,
      name: info.name,
      price: info.price,
      quantity: info.quantity,
    }));

    const total = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return NextResponse.json({ items, total, totalCount });
  } catch (error) {
    console.error("Order history error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
