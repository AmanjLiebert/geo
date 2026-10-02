import { RecordEditor } from "@/components/dashboard/record-editor/record-editor";

export function generateStaticParams() {
  return [{ id: "draft" }];
}

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditRecordPage({ params }: Props) {
  const { id } = await params;
  return <RecordEditor mode="edit" recordId={id} />;
}
