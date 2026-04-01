import { useState } from "react";
import { ChevronDown, ChevronRight, Copy, Check, Image, Film } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/admin-ui/table";
import { Badge } from "@/components/admin-ui/badge";
import { Button } from "@/components/admin-ui/button";
import { AssetGroup } from "@/shared/types/api";
import { useSectionAssetBrowser } from "../hooks/useSectionAssetBrowser";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function CopyUrlButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  const url = `/uploads/${path}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable (iframe, permissions denied)
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      title={url}
      data-testid="copy-url-btn"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy URL"}
    </button>
  );
}

function AssetRow({ asset }: { asset: AssetGroup }) {
  const [expanded, setExpanded] = useState(false);

  const thumbnailVariant = asset.variants.find((v) => v.variant === "thumbnails");
  const thumbnailUrl = thumbnailVariant
    ? `/uploads/${thumbnailVariant.path}`
    : null;

  return (
    <>
      <TableRow
        className="cursor-pointer"
        onClick={() => setExpanded(!expanded)}
        data-testid="asset-row"
      >
        <TableCell className="w-12">
          {thumbnailUrl && asset.type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnailUrl}
              alt=""
              className="h-8 w-8 rounded object-cover"
            />
          ) : (
            <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
              {asset.type === "video" ? (
                <Film className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Image className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          )}
        </TableCell>
        <TableCell className="font-mono text-xs">
          {expanded ? (
            <ChevronDown className="inline h-3 w-3 mr-1" />
          ) : (
            <ChevronRight className="inline h-3 w-3 mr-1" />
          )}
          {asset.asset_id}
        </TableCell>
        <TableCell>
          <Badge variant="outline" className="text-xs">
            {asset.type}
          </Badge>
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {asset.variants.length} files
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {formatBytes(asset.total_size_bytes)}
        </TableCell>
        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
          {asset.referenced_by?.map((ref) => ref.title).join(", ") || "—"}
        </TableCell>
      </TableRow>
      {expanded &&
        asset.variants.map((variant) => (
          <TableRow
            key={variant.path}
            className="bg-muted/20"
            data-testid="variant-row"
          >
            <TableCell />
            <TableCell className="pl-8 font-mono text-xs text-muted-foreground">
              {variant.variant}/
            </TableCell>
            <TableCell className="text-xs text-muted-foreground" colSpan={2}>
              {variant.path.split("/").pop()}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {formatBytes(variant.size_bytes)}
            </TableCell>
            <TableCell>
              <CopyUrlButton path={variant.path} />
            </TableCell>
          </TableRow>
        ))}
    </>
  );
}

interface AssetBrowserProps {
  sectionId: string;
}

export function AssetBrowser({ sectionId }: AssetBrowserProps) {
  const { items, loading, error, hasMore, totalCount, loadMore } =
    useSectionAssetBrowser(sectionId);

  if (error) {
    return (
      <p className="text-destructive text-sm" data-testid="assets-error">
        {error}
      </p>
    );
  }

  if (!loading && items.length === 0) {
    return (
      <p className="text-muted-foreground text-sm" data-testid="assets-empty">
        No media assets found in this section&apos;s content.
      </p>
    );
  }

  return (
    <div className="space-y-4" data-testid="asset-browser">
      {totalCount > 0 && (
        <p className="text-xs text-muted-foreground">
          {totalCount} asset{totalCount !== 1 ? "s" : ""}
        </p>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12" />
            <TableHead>Asset ID</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Variants</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Referenced By</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((asset) => (
            <AssetRow key={asset.asset_id} asset={asset} />
          ))}
        </TableBody>
      </Table>
      {loading && (
        <p className="text-muted-foreground text-sm text-center">Loading...</p>
      )}
      {hasMore && !loading && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={loadMore}
            data-testid="load-more-assets"
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
