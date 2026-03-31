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
        <div
          key={asset.url}
          className="rounded-lg border border-border overflow-hidden bg-muted/30"
          data-testid="asset-card"
        >
          {asset.type === "image" ? (
            <img
              src={asset.url}
              alt=""
              className="w-full h-32 object-cover"
              loading="lazy"
            />
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
        </div>
      ))}
    </div>
  );
}
