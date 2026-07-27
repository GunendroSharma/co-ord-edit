import { StoreFooter, StoreHeader } from "@/components/store/Chrome";
import { baseUrl } from "@/constants/testIds";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function ContentPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  useEffect(() => { api.get(`${baseUrl}/pages/${slug}`).then((r) => setPage(r.data)).catch(() => setPage({ title: "Not found", body_html: "" })); }, [slug]);
  return (
    <div>
      <StoreHeader />
      <div className="max-w-3xl mx-auto px-6 py-16" data-testid="content-page">
        <h1 className="font-serif-display text-5xl mb-8 font-light">{page?.title}</h1>
        <div className="prose prose-neutral" dangerouslySetInnerHTML={{ __html: page?.body_html || "" }} />
      </div>
      <StoreFooter />
    </div>
  );
}
