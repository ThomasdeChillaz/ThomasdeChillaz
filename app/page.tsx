import type { Metadata } from "next";
import PortfolioExperience from "./PortfolioExperience";

const siteUrl = "https://thomasdechillaz.com/";
const personId = `${siteUrl}#person`;
const researchNoteId = `${siteUrl}#mit-csail-research-note`;

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": personId,
      name: "Thomas de Chillaz",
      url: siteUrl,
      image: `${siteUrl}thomas-de-chillaz.webp`,
      jobTitle: "AI and computational biology researcher",
      affiliation: [
        { "@type": "Organization", name: "MIT Computer Science and Artificial Intelligence Laboratory" },
        { "@type": "CollegeOrUniversity", name: "CentraleSupélec" },
        { "@type": "CollegeOrUniversity", name: "ESSEC Business School" },
      ],
      sameAs: [
        "https://www.linkedin.com/in/thomas-de-chillaz-9382b62a0",
        "https://github.com/ThomasdeChillaz",
      ],
      knowsAbout: [
        "Artificial intelligence",
        "Computational biology",
        "Single-cell RNA sequencing",
        "Multimodal machine learning",
        "Astronomy",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}#website`,
      name: "Thomas de Chillaz",
      url: siteUrl,
      author: { "@id": personId },
      inLanguage: "en",
    },
    {
      "@type": "Article",
      "@id": `${researchNoteId}#article`,
      headline: "A summer of AI and computational biology research at MIT CSAIL",
      description:
        "Thomas de Chillaz reflects on collaborative AI research, scientific interfaces, and workshop paper submissions at MIT CSAIL.",
      mainEntityOfPage: researchNoteId,
      author: { "@id": personId },
      image: [
        `${siteUrl}mit-csail-stata-center.webp`,
        `${siteUrl}mit-csail-collaborators.webp`,
      ],
      inLanguage: "en",
    },
  ],
};

export const metadata: Metadata = {
  title: "Thomas de Chillaz | AI, Computational Biology & Space",
  description:
    "The animated CV of Thomas de Chillaz: AI researcher, computational biology builder, astronomy explorer, and founder of The Curious Minds.",
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <PortfolioExperience />
    </>
  );
}
