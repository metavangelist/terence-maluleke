import { useState } from "react";
import { Button } from "@sanity/ui";
import { EditIcon, TrashIcon } from "@sanity/icons";
import { useClient } from "sanity";
import { ConfirmDeleteDialog } from "sanity/structure";
import { canonicalDocumentId, deleteDocumentVersions } from "../../lib/delete-document";

export function DocumentRowActions({
  docId,
  documentType,
  isSelected,
  compact = true,
  disabled,
  onOpen,
  onDeleted,
  onError,
}: {
  docId: string;
  documentType: string;
  isSelected?: boolean;
  compact?: boolean;
  disabled?: boolean;
  onOpen: (publishedId: string) => void;
  onDeleted: (publishedId: string) => void;
  onError?: (message: string) => void;
}) {
  const client = useClient({ apiVersion: "2025-06-27" });
  const publishedId = canonicalDocumentId(docId);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async (versions: string[]) => {
    setDeleting(true);
    try {
      await deleteDocumentVersions(client, publishedId, versions);
      setConfirmOpen(false);
      onDeleted(publishedId);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Failed to remove item");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Button
        fontSize={1}
        padding={2}
        mode={isSelected ? "default" : "ghost"}
        tone="primary"
        icon={EditIcon}
        text={compact ? undefined : "Details"}
        title="View and edit"
        aria-label="View and edit"
        disabled={disabled}
        style={compact ? { justifyContent: "center", minWidth: 0 } : undefined}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onOpen(publishedId);
        }}
        onMouseDown={(event) => event.stopPropagation()}
      />
      <Button
        fontSize={1}
        padding={2}
        mode="ghost"
        tone="critical"
        icon={TrashIcon}
        text={compact ? undefined : "Remove"}
        title="Remove from website"
        aria-label="Remove from website"
        disabled={disabled || deleting}
        style={compact ? { justifyContent: "center", minWidth: 0 } : undefined}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setConfirmOpen(true);
        }}
        onMouseDown={(event) => event.stopPropagation()}
      />
      {confirmOpen ? (
        <ConfirmDeleteDialog
          action="delete"
          id={publishedId}
          type={documentType}
          onCancel={() => {
            if (!deleting) setConfirmOpen(false);
          }}
          onConfirm={handleConfirm}
        />
      ) : null}
    </>
  );
}
