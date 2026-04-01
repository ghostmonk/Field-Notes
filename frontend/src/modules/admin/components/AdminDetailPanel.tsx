import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/admin-ui/tabs";
import { ScrollArea } from "@/components/admin-ui/scroll-area";
import { Section, UpdateSectionRequest } from "@/shared/types/api";
import { useSectionMutations } from "@/modules/sections/hooks/useSectionMutations";
import { SectionTreeData } from "../hooks/useSectionTree";
import { useSectionAssets } from "../hooks/useSectionAssets";
import { ContentTab } from "./ContentTab";
import { SectionSettingsForm } from "./SectionSettingsForm";
import { AssetsGrid } from "./AssetsGrid";
import { ResumeTailorPanel } from "./ResumeTailorPanel";
import { ResumeBuilderPanel } from "./ResumeBuilderPanel";

interface AdminDetailPanelProps {
  section: Section | null;
  treeData: SectionTreeData;
  onSelectSection: (id: string) => void;
  onRefetchTree: () => void;
  activeTab?: string;
  onActiveTabConsumed?: () => void;
}

export function AdminDetailPanel({
  section,
  treeData,
  onSelectSection,
  onRefetchTree,
  activeTab,
  onActiveTabConsumed,
}: AdminDetailPanelProps) {
  const { data: session } = useSession();
  const [tab, setTab] = useState("content");
  const { updateSection } = useSectionMutations();
  const { assets, loading: assetsLoading } = useSectionAssets(
    tab === "assets" ? (section?.id ?? null) : null,
    section?.content_type
  );

  useEffect(() => {
    if (activeTab) {
      setTab(activeTab);
      onActiveTabConsumed?.();
    } else {
      setTab("content");
    }
  }, [section?.id, activeTab, onActiveTabConsumed]);

  const handleUpdateSection = async (data: UpdateSectionRequest) => {
    if (!section) return;
    await updateSection(section.id, data);
    onRefetchTree();
  };

  if (!section) {
    return (
      <div
        className="flex flex-1 flex-col min-h-0"
        data-testid="admin-dashboard"
      >
        <Tabs
          defaultValue="resume-tailor"
          className="flex flex-1 flex-col min-h-0"
        >
          <div className="border-b border-border px-6 pt-4">
            <TabsList>
              <TabsTrigger
                value="resume-tailor"
                data-testid="admin-tab-resume-tailor"
              >
                Resume Tailor
              </TabsTrigger>
              <TabsTrigger
                value="resume-builder"
                data-testid="admin-tab-resume-builder"
              >
                Resume Builder
              </TabsTrigger>
            </TabsList>
          </div>
          <ScrollArea className="flex-1 overflow-hidden">
            <TabsContent value="resume-tailor" className="p-6 mt-0">
              <ResumeTailorPanel token={session?.accessToken || ""} />
            </TabsContent>
            <TabsContent value="resume-builder" className="p-6 mt-0">
              <ResumeBuilderPanel token={session?.accessToken || ""} />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0" data-testid="admin-detail-panel">
      <Tabs value={tab} onValueChange={setTab} className="flex flex-1 flex-col min-h-0">
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
        <ScrollArea className="flex-1 overflow-hidden">
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
