"use client";

import { useRouter, useSearchParams, useParams } from "next/navigation";

export default function LanguagePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();

  const table = searchParams.get("table");
  const shopId = params.shopId as string;

  const selectLanguage = (lang: string) => {
    router.push(`/${shopId}/people?table=${table}&lang=${lang}`);
  };

  return (
    <div
      style={{
        padding: "40px",
        color: "white",
        fontSize: "28px",
      }}
    >
      <h1 style={{ marginBottom: "40px" }}>言語を選択してください</h1>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          width: "300px",
        }}
      >
        <button
          style={btn}
          onClick={() => selectLanguage("ja")}
        >
          日本語
        </button>

        <button
          style={btn}
          onClick={() => selectLanguage("en")}
        >
          English
        </button>

        <button
          style={btn}
          onClick={() => selectLanguage("zh")}
        >
          中文
        </button>

        <button
          style={btn}
          onClick={() => selectLanguage("ko")}
        >
          한국어
        </button>
      </div>
    </div>
  );
}

const btn: React.CSSProperties = {
  padding: "20px",
  fontSize: "22px",
  borderRadius: "8px",
  background: "#444",
  color: "white",
  border: "1px solid #666",
};