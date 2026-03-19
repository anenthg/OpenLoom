import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { parseSlug } from "@/lib/slug";
import { fetchVideoMeta } from "@/lib/api";
import VideoViewerPage from "./ViewerClient";

interface Props {
  params: Promise<{ slug: string[] }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const parsed = parseSlug(slug);
  if (!parsed) return {};

  const url = `https://openloom.live/v/${slug.join("/")}`;

  try {
    const meta = await fetchVideoMeta(parsed.projectId, parsed.code, parsed.provider);
    return {
      title: meta.title,
      description: meta.description ?? `Watch "${meta.title}" on OpenLoom`,
      alternates: { canonical: url },
      robots: { index: false },
      openGraph: {
        title: meta.title,
        description: meta.description ?? `Watch "${meta.title}" on OpenLoom`,
        url,
        siteName: "OpenLoom",
        type: "video.other",
      },
      twitter: {
        card: "summary",
        title: meta.title,
        description: meta.description ?? `Watch "${meta.title}" on OpenLoom`,
      },
    };
  } catch {
    return {
      title: "Video — OpenLoom",
      alternates: { canonical: url },
      robots: { index: false },
    };
  }
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const parsed = parseSlug(slug);
  if (!parsed) notFound();

  return (
    <VideoViewerPage
      provider={parsed.provider}
      projectId={parsed.projectId}
      code={parsed.code}
    />
  );
}
