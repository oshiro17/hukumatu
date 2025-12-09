import { redirect } from "next/navigation";

export default async function CustomerTop(props: {
  params: Promise<{ shopId: string }>;
  searchParams: Promise<{ table?: string }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  const shopId = params.shopId;
  const table = searchParams.table;

  if (!table) {
    return <div>席番号が指定されていません</div>;
  }

  redirect(`/${shopId}/language?table=${table}`);
}