import XcExplorer from "@/components/XcExplorer";

export default async function RacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <XcExplorer initialRoute={{ type: "race", id }} />;
}
