// lib/firestore.ts
// 顧客側メニュー取得用のラッパー。サーバー経由で Firestore(Admin) から取得する。
type ApiMenuItem = {
  id: string;
  menuNumber: number;
  name: string;
  price: number;
  isActive: boolean;
};

export async function getMenuMap(shopId: string) {
  const res = await fetch(`/api/menu?shopId=${encodeURIComponent(shopId)}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch menu: ${res.status}`);
  }

  const items = (await res.json()) as ApiMenuItem[];

  const menuMap: Record<number, { name: string; price: number; isActive: boolean }> =
    {};

  items.forEach((item) => {
    const key = Number(item.menuNumber);
    if (!Number.isFinite(key)) return;
    menuMap[key] = {
      name: item.name,
      price: item.price,
      isActive: item.isActive,
    };
  });

  return menuMap;
}
