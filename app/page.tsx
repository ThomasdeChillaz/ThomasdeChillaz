import type { Metadata } from "next";
import PortfolioExperience from "./PortfolioExperience";

export const metadata: Metadata = {
  title: "Thomas de Chillaz | AI, Computational Biology & Space",
  description:
    "The animated CV of Thomas de Chillaz: AI researcher, computational biology builder, astronomy explorer, and founder of The Curious Minds.",
};

export default function Home() {
  return <PortfolioExperience />;
}
