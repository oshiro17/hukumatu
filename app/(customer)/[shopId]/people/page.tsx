"use client";

import { useRouter, useSearchParams, useParams } from "next/navigation";

export default function PeoplePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();

  const lang = searchParams.get("lang") ?? "ja";
  const table = searchParams.get("table");
  const shopId = params.shopId as string;

  const selectPeople = (num: number) => {
    router.push(`/${shopId}/menu?table=${table}&lang=${lang}&people=${num}`);
  };

  return (
    <div
      style={{
        padding: "40px",
        color: "white",
        fontSize: "28px",
      }}
    >
      <h1 style={{ marginBottom: "40px" }}>
        {lang === "ja" && "人数を選択してください"}
        {lang === "en" && "Select number of people"}
        {lang === "zh" && "请选择人数"}
        {lang === "ko" && "인원을 선택하세요"}
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "20px",
          width: "300px",
        }}
      >
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            onClick={() => selectPeople(n)}
            style={btn}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

const btn: React.CSSProperties = {
  padding: "20px",
  fontSize: "26px",
  borderRadius: "10px",
  background: "#444",
  color: "white",
  border: "1px solid #666",
};