import { redirect } from "next/navigation";

export default async function Home(props: {
  searchParams: Promise<{ table?: string }>;
}) {
  const searchParams = await props.searchParams;
  const table = searchParams.table;

  if (!table) {
    return <div style={{ padding: 24, fontSize: 18 }}>席番号が指定されていません</div>;
  }

  redirect(`/hukumatu/language?table=${table}`);
}
