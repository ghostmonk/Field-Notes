import { useState } from "react";
import Image from "next/image";
import { ArrowLeft, Film } from "lucide-react";
import { Button } from "@/components/admin-ui/button";
import { AssetInfo } from "../hooks/useSectionAssets";

interface AssetsGridProps {
  assets: AssetInfo[];
}

function filenameFromUrl(url: string): string {
  try {
    const path = new URL(url, "https://placeholder.local").pathname;
    return path.split("/").pop() ?? url;
  } catch {
    return url;
  }
}

function AssetPreview({
  asset,
  onBack,
}: {
  asset: AssetInfo;
  onBack: () => void;
}) {
  return (
    <div className="space-y-4" data-testid="asset-preview">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        data-testid="asset-preview-back"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back
      </Button>
      {asset.type === "image" ? (
        <div className="relative w-full aspect-video">
          <Image
            src={asset.url}
            alt=""
            fill
            className="object-contain rounded-lg"
            sizes="(max-width: 1024px) 100vw, 60vw"
          />
        </div>
      ) : (
        <video
          src={asset.url}
          controls
          className="w-full rounded-lg"
          data-testid="asset-preview-video"
        />
      )}
      <div className="space-y-1">
        <p className="text-sm font-medium">{filenameFromUrl(asset.url)}</p>
        <p className="text-sm text-muted-foreground">
          From: {asset.fromContentTitle}
        </p>
      </div>
    </div>
  );
}

export function AssetsGrid({ assets }: AssetsGridProps) {
  const [selected, setSelected] = useState<AssetInfo | null>(null);

  if (assets.length === 0) {
    return (
      <p className="text-muted-foreground text-sm" data-testid="assets-empty">
        No media assets found in this section&apos;s content.
      </p>
    );
  }

  if (selected) {
    return <AssetPreview asset={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
      data-testid="assets-grid"
    >
      {assets.map((asset) => (
        <button
          key={asset.url}
          type="button"
          onClick={() => setSelected(asset)}
          className="rounded-lg border border-border overflow-hidden bg-muted/30 hover:border-primary transition-colors text-left"
          data-testid="asset-card"
        >
          {asset.type === "image" ? (
            <div className="relative w-full h-32">
              <Image
                src={asset.url}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
            </div>
          ) : (
            <div className="w-full h-32 flex items-center justify-center bg-muted">
              <Film className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <div className="p-2 space-y-1">
            <p className="text-xs font-medium truncate">
              {filenameFromUrl(asset.url)}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {asset.fromContentTitle}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
