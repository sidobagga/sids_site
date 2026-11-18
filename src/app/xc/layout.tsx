import type { Metadata } from "next";
import "./xc.css";

export const metadata: Metadata = {
  title: "PAUSATF Results Archives",
  description: "Pacific Association cross-country and road race results.",
};

export default function XcLayout({ children }: { children: React.ReactNode }) {
  return children;
}
