// app/api/checkout/route.ts
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    const sessionRef = adminDb.collection("sessions").doc(sessionId);
    const sessionSnap = await sessionRef.get();

    if (!sessionSnap.exists) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const session = sessionSnap.data() as {
      shopId: string;
      tableNumber: number;
      totalAmount: number;
      status: string;
    };

    const ordersSnap = await adminDb
      .collection("orders")
      .where("sessionId", "==", sessionId)
      .get();

    const orders = ordersSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
    }));

    return NextResponse.json({
      sessionId,
      shopId: session.shopId,
      tableNumber: session.tableNumber,
      totalAmount: session.totalAmount,
      status: session.status,
      orders,
    });
  } catch (error) {
    console.error("Checkout GET error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}