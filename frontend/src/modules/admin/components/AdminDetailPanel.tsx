import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/admin-ui/tabs";
import { ScrollArea } from "@/components/admin-ui/scroll-area";

interface AdminDetailPanelProps {
  selectedSectionId: string | null;
}

export function AdminDetailPanel({
  selectedSectionId,
}: AdminDetailPanelProps) {
  if (!selectedSectionId) {
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
            <p
              className="text-muted-foreground"
              data-testid="admin-content-placeholder"
            >
              Content list will render here
            </p>
          </TabsContent>
          <TabsContent value="assets" className="p-6 mt-0">
            <p
              className="text-muted-foreground"
              data-testid="admin-assets-placeholder"
            >
              Assets grid will render here
            </p>
          </TabsContent>
          <TabsContent value="settings" className="p-6 mt-0">
            <p
              className="text-muted-foreground"
              data-testid="admin-settings-placeholder"
            >
              Section settings will render here
            </p>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
