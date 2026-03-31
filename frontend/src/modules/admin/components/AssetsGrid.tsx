import Image from "next/image";
import { Film } from "lucide-react";
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

export function AssetsGrid({ assets }: AssetsGridProps) {
  if (assets.length === 0) {
    return (
      <p className="text-muted-foreground text-sm" data-testid="assets-empty">
        No media assets found in this section&apos;s content.
      </p>
    );
  }

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
      data-testid="assets-grid"
    >
      {assets.map((asset) => (
        <a
          key={asset.url}
          href={asset.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-border overflow-hidden bg-muted/30 hover:border-primary transition-colors"
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
        </a>
      ))}
    </div>
  );
}
