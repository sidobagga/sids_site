import XcExplorer from "@/components/XcExplorer";

export default async function RunnerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <XcExplorer initialRoute={{ type: "runner", id }} />;
}
