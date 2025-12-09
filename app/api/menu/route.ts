import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const shopId = searchParams.get("shopId");

  if (!shopId) {
    return NextResponse.json(
      { error: "shopId is required" },
      { status: 400 }
    );
  }

  const snap = await adminDb
    .collection("menu")
    .where("shopId", "==", shopId)
    .where("isActive", "==", true)
    .get();

  const items = snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  return NextResponse.json(items);
}
