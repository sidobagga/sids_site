import XcExplorer from "@/components/XcExplorer";

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <XcExplorer initialRoute={{ type: "team", id }} />;
}
