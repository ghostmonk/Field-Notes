import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/admin-ui/tabs";
import { ScrollArea } from "@/components/admin-ui/scroll-area";
import {
  Section,
  SectionContentType,
  UpdateSectionRequest,
} from "@/shared/types/api";
import { useSectionMutations } from "@/modules/sections/hooks/useSectionMutations";
import { SectionTreeData } from "../hooks/useSectionTree";
import { useSectionAssets } from "../hooks/useSectionAssets";
import { ContentTab } from "./ContentTab";
import { SectionSettingsForm } from "./SectionSettingsForm";
import { AssetsGrid } from "./AssetsGrid";

interface AdminDetailPanelProps {
  section: Section | null;
  treeData: SectionTreeData;
  onSelectSection: (id: string) => void;
  onRefetchTree: () => void;
}

export function AdminDetailPanel({
  section,
  treeData,
  onSelectSection,
  onRefetchTree,
}: AdminDetailPanelProps) {
  const { updateSection } = useSectionMutations();
  const { assets, loading: assetsLoading } = useSectionAssets(
    section?.id ?? null,
    section?.content_type as SectionContentType | undefined
  );

  const handleUpdateSection = async (data: UpdateSectionRequest) => {
    await updateSection(section!.id, data);
    onRefetchTree();
  };

  if (!section) {
    return (
      <div
        className="flex flex-1 items-center justify-center"
        data-testid="admin-dashboard"
      >
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-semibold text-foreground">
            Command Center
          </h1>
          <p className="text-lg text-muted-foreground">
            Select a section to manage its content, or view site-wide stats
            here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col" data-testid="admin-detail-panel">
      <Tabs defaultValue="content" className="flex flex-1 flex-col">
        <div className="border-b border-border px-6 pt-4">
          <TabsList>
            <TabsTrigger value="content" data-testid="admin-tab-content">
              Content
            </TabsTrigger>
            <TabsTrigger value="assets" data-testid="admin-tab-assets">
              Assets
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="admin-tab-settings">
              Settings
            </TabsTrigger>
          </TabsList>
        </div>
        <ScrollArea className="flex-1">
          <TabsContent value="content" className="p-6 mt-0">
            <ContentTab
              section={section}
              treeData={treeData}
              onSelectSection={onSelectSection}
              onRefetchTree={onRefetchTree}
            />
          </TabsContent>
          <TabsContent value="assets" className="p-6 mt-0">
            {assetsLoading ? (
              <p className="text-muted-foreground text-sm">Loading...</p>
            ) : (
              <AssetsGrid assets={assets} />
            )}
          </TabsContent>
          <TabsContent value="settings" className="p-6 mt-0">
            <SectionSettingsForm
              key={section.id}
              section={section}
              onSubmit={handleUpdateSection}
            />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
