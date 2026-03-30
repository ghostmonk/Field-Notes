import { useTree } from "@headless-tree/react";
import {
  syncDataLoaderFeature,
  selectionFeature,
  hotkeysCoreFeature,
  dragAndDropFeature,
  ItemInstance,
  DragTarget,
} from "@headless-tree/core";
import { SectionTreeData, SectionTreeItem } from "../hooks/useSectionTree";
import { ChevronRight, ChevronDown, Plus, Settings, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/admin-ui/context-menu";

interface SectionTreeProps {
  data: SectionTreeData;
  selectedSectionId: string | null;
  onSelectSection: (id: string | null) => void;
  onDrop?: (
    items: ItemInstance<SectionTreeItem>[],
    target: DragTarget<SectionTreeItem>
  ) => void | Promise<void>;
  filter?: string;
}

export function SectionTree({
  data,
  selectedSectionId,
  onSelectSection,
  onDrop,
  filter = "",
}: SectionTreeProps) {
  const tree = useTree<SectionTreeItem>({
    rootItemId: "root",
    getItemName: (item) => item.getItemData().title,
    isItemFolder: (item) => item.getItemData().childrenIds.length > 0,
    canReorder: true,
    onDrop,
    onPrimaryAction: (item) => {
      const id = item.getId();
      onSelectSection(id === "root" ? null : id);
    },
    dataLoader: {
      getItem: (itemId) => data[itemId],
      getChildren: (itemId) => data[itemId]?.childrenIds ?? [],
    },
    features: [
      syncDataLoaderFeature,
      selectionFeature,
      hotkeysCoreFeature,
      dragAndDropFeature,
    ],
  });

  if (!data["root"]) return null;

  const normalizedFilter = filter.toLowerCase();

  return (
    <div
      ref={tree.registerElement}
      className="py-2"
      data-testid="admin-section-tree"
    >
      {tree.getItems().map((item) => {
        if (item.getId() === "root") return null;
        const itemData = item.getItemData();

        if (
          normalizedFilter &&
          !itemData.title.toLowerCase().includes(normalizedFilter)
        ) {
          return null;
        }

        const level = item.getItemMeta().level - 1;
        const isSelected = item.getId() === selectedSectionId;
        const isFolder = itemData.childrenIds.length > 0;

        return (
          <ContextMenu key={item.getId()}>
            <ContextMenuTrigger asChild>
              <button
                {...item.getProps()}
                ref={item.registerElement}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  isSelected &&
                    "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                  item.isDraggingOver() && "bg-accent/50",
                  !itemData.is_published && "opacity-60"
                )}
                style={{ paddingLeft: `${level * 16 + 8}px` }}
                data-testid={`admin-tree-node-${itemData.slug}`}
              >
                {isFolder ? (
                  item.isExpanded() ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )
                ) : (
                  <span className="h-4 w-4 shrink-0" />
                )}
                <span className="truncate">{itemData.title}</span>
                {!itemData.is_published && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    Draft
                  </span>
                )}
              </button>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem
                data-testid={`ctx-add-content-${itemData.slug}`}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Content
              </ContextMenuItem>
              <ContextMenuItem
                data-testid={`ctx-add-child-${itemData.slug}`}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Child Section
              </ContextMenuItem>
              <ContextMenuItem
                data-testid={`ctx-edit-settings-${itemData.slug}`}
              >
                <Settings className="mr-2 h-4 w-4" />
                Edit Settings
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                variant="destructive"
                data-testid={`ctx-delete-${itemData.slug}`}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        );
      })}
    </div>
  );
}
