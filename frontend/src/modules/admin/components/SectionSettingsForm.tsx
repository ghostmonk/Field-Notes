import { useState } from "react";
import { Button } from "@/components/admin-ui/button";
import { Input } from "@/components/admin-ui/input";
import { Label } from "@/components/admin-ui/label";
import { Switch } from "@/components/admin-ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/admin-ui/select";
import IconPicker from "@/components/IconPicker";
import { SectionIcon } from "@/shared/lib/navIcons";
import {
  Section,
  UpdateSectionRequest,
  DisplayType,
  NavVisibility,
} from "@/shared/types/api";
import {
  CONTENT_TYPE_DISPLAYS,
  CONTENT_TYPE_LABELS,
  DISPLAY_TYPE_LABELS,
  DISPLAY_TYPE_OPTIONS,
  NAV_VISIBILITY_OPTIONS,
} from "@/shared/constants/sectionTypes";

interface SectionSettingsFormProps {
  section: Section;
  onSubmit: (data: UpdateSectionRequest) => Promise<void>;
  disabled?: boolean;
}

export function SectionSettingsForm({
  section,
  onSubmit,
  disabled = false,
}: SectionSettingsFormProps) {
  const [title, setTitle] = useState(section.title);
  const [slug, setSlug] = useState(section.slug);
  const [displayType, setDisplayType] = useState<DisplayType>(
    section.display_type
  );
  const [navVisibility, setNavVisibility] = useState<NavVisibility>(
    section.nav_visibility
  );
  const [sortOrder, setSortOrder] = useState(section.sort_order);
  const [isPublished, setIsPublished] = useState(section.is_published);
  const [icon, setIcon] = useState<SectionIcon>(
    (section.icon || "default") as SectionIcon
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const contentType = section.content_type;
  const validDisplayTypes = contentType
    ? (CONTENT_TYPE_DISPLAYS[contentType] ??
      DISPLAY_TYPE_OPTIONS.map((o) => o.value))
    : DISPLAY_TYPE_OPTIONS.map((o) => o.value);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setSaved(false);
    try {
      await onSubmit({
        title: title.trim(),
        slug: slug.trim(),
        display_type: displayType,
        nav_visibility: navVisibility,
        sort_order: sortOrder,
        is_published: isPublished,
        icon,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 max-w-xl"
      data-testid="section-settings-form"
    >
      <div className="space-y-2">
        <Label htmlFor="settings-title">Title</Label>
        <Input
          id="settings-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={disabled}
          required
          data-testid="settings-title"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="settings-slug">Slug</Label>
        <Input
          id="settings-slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          disabled={disabled}
          data-testid="settings-slug"
        />
        <p className="text-xs text-muted-foreground">
          Changing the slug creates an automatic redirect from the old URL.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Content Type</Label>
        <p
          className="text-sm text-muted-foreground"
          data-testid="settings-content-type"
        >
          {contentType
            ? (CONTENT_TYPE_LABELS[contentType] ?? contentType)
            : "None"}
        </p>
      </div>

      {validDisplayTypes.length > 1 && (
        <div className="space-y-2">
          <Label>Display Type</Label>
          <Select
            value={displayType}
            onValueChange={(v) => setDisplayType(v as DisplayType)}
            disabled={disabled}
          >
            <SelectTrigger
              className="w-full"
              data-testid="settings-display-type"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              {validDisplayTypes.map((dt) => (
                <SelectItem key={dt} value={dt}>
                  {DISPLAY_TYPE_LABELS[dt] ?? dt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>Navigation Visibility</Label>
        <Select
          value={navVisibility}
          onValueChange={(v) => setNavVisibility(v as NavVisibility)}
          disabled={disabled}
        >
          <SelectTrigger
            className="w-full"
            data-testid="settings-nav-visibility"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            {NAV_VISIBILITY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="settings-sort-order">Sort Order</Label>
        <Input
          id="settings-sort-order"
          type="number"
          min={0}
          value={sortOrder}
          onChange={(e) => setSortOrder(Number(e.target.value))}
          disabled={disabled}
          className="w-24"
          data-testid="settings-sort-order"
        />
      </div>

      <div className="space-y-2">
        <Label>Icon</Label>
        <IconPicker value={icon} onChange={setIcon} disabled={disabled} />
      </div>

      <div className="flex items-center gap-3">
        <Switch
          id="settings-published"
          checked={isPublished}
          onCheckedChange={setIsPublished}
          disabled={disabled}
          data-testid="settings-published"
        />
        <Label htmlFor="settings-published">Published</Label>
      </div>

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={disabled || saving || !title.trim()}
          data-testid="settings-save"
        >
          {saving ? "Saving..." : "Save Settings"}
        </Button>
        {saved && (
          <span className="text-sm text-green-600" data-testid="settings-saved">
            Saved
          </span>
        )}
      </div>
    </form>
  );
}
