import type { Metadata } from "next";
import LandingPage from "./LandingPage";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

const faqData = [
  {
    question: "What is OpenLoom?",
    answer:
      "OpenLoom is an open-source, self-hosted alternative to Loom. It lets you record your screen with camera overlay and store recordings on your own backend (Supabase, with Convex and Firebase coming soon).",
  },
  {
    question: "Is OpenLoom free?",
    answer:
      "Yes. OpenLoom is 100% free and open-source under the MIT license. You only pay for your own backend storage (Supabase free tier works for most users).",
  },
  {
    question: "Where are my recordings stored?",
    answer:
      "Your recordings are stored on your own backend — currently Supabase, with Convex and Firebase support coming soon. No third-party servers, no vendor lock-in.",
  },
  {
    question: "How do I install OpenLoom?",
    answer:
      "Download the OpenLoom Chrome extension, load it into Chrome, and connect your Supabase backend with your project URL and access token. You're ready to record in minutes.",
  },
  {
    question: "Can I share recordings with others?",
    answer:
      "Yes. You get a shareable link instantly when you stop recording. You can optionally protect it with a password.",
  },
  {
    question: "What can viewers do on shared videos?",
    answer:
      "Viewers can leave timestamped emoji reactions that appear directly on the video timeline.",
  },
  {
    question: "Is OpenLoom private?",
    answer:
      "Yes. Since recordings live on your own infrastructure, you control the data. No third-party analytics or tracking on the video player.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqData.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <LandingPage />
    </>
  );
}
