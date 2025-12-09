// app/api/session/start/route.ts
import { NextResponse } from "next/server";
import { adminDb, Timestamp } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { shopId, tableNumber } = await req.json();

    if (!shopId || !tableNumber) {
      return NextResponse.json(
        { error: "shopId and tableNumber are required" },
        { status: 400 }
      );
    }

    const tableDocId = `${shopId}_${tableNumber}`;
    const tableRef = adminDb.collection("tables").doc(tableDocId);
    const tableSnap = await tableRef.get();

    let sessionId: string;

    if (tableSnap.exists) {
      const data = tableSnap.data() as any;
      if (data.currentSessionId) {
        // 既存セッションを再利用
        sessionId = data.currentSessionId as string;
      } else {
        // 新規セッション作成
        const sessionRef = adminDb.collection("sessions").doc();
        sessionId = sessionRef.id;

        await sessionRef.set({
          shopId,
          tableNumber,
          status: "active",
          totalAmount: 0,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });

        await tableRef.update({
          shopId,
          tableNumber,
          currentSessionId: sessionId,
          isOccupied: true,
          updatedAt: Timestamp.now(),
        });
      }
    } else {
      // テーブルドキュメント自体がない→新規作成
      const sessionRef = adminDb.collection("sessions").doc();
      sessionId = sessionRef.id;

      await sessionRef.set({
        shopId,
        tableNumber,
        status: "active",
        totalAmount: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      await tableRef.set({
        shopId,
        tableNumber,
        currentSessionId: sessionId,
        isOccupied: true,
        updatedAt: Timestamp.now(),
      });
    }

    return NextResponse.json({
      shopId,
      tableNumber,
      sessionId,
    });
  } catch (error) {
    console.error("Session start error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}