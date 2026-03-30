import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { apiClient } from "@/shared/lib/api-client";
import { createOnDropHandler } from "@headless-tree/core";
import { SectionTreeItem } from "./useSectionTree";
import { UpdateSectionRequest } from "@/shared/types/api";

export function useSectionReorder(onComplete: () => void) {
  const { data: session } = useSession();

  const onDrop = useMemo(
    () =>
      createOnDropHandler<SectionTreeItem>(
        async (parentItem, newChildrenIds) => {
          if (!session?.accessToken) return;
          const parentId = parentItem.getId();
          const parentValue = parentId === "root" ? null : parentId;
          const oldChildrenIds = parentItem.getItemData().childrenIds;

          const updates: Promise<unknown>[] = [];
          for (let i = 0; i < newChildrenIds.length; i++) {
            const childId = newChildrenIds[i];
            const oldIndex = oldChildrenIds.indexOf(childId);
            const parentChanged = oldIndex === -1;
            const orderChanged = oldIndex !== i;

            if (!parentChanged && !orderChanged) continue;

            const payload: UpdateSectionRequest = { sort_order: i };
            if (parentChanged) {
              payload.parent_id = parentValue;
            }
            updates.push(
              apiClient.sections.update(childId, payload, session.accessToken)
            );
          }

          if (updates.length > 0) {
            await Promise.all(updates);
            onComplete();
          }
        }
      ),
    [session?.accessToken, onComplete]
  );

  return { onDrop };
}
