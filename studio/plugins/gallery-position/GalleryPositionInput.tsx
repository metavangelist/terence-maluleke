import { useCallback, useEffect, useRef, useState } from "react";
import { Stack, Text, TextInput } from "@sanity/ui";
import type { NumberInputProps } from "sanity";
import { set, useClient, useFormValue } from "sanity";
import { canonicalArtworkId, flatEntryOrder } from "../../lib/gallery-grid-entries";
import { fetchGridDocs } from "../../lib/fetch-grid-docs";
import { commitMoveToPosition } from "../../lib/reorder-artworks";

function parsePosition(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

export function GalleryPositionInput(props: NumberInputProps) {
  const { value, onChange, readOnly } = props;
  const client = useClient({ apiVersion: "2024-01-01" });
  const documentId = useFormValue(["_id"]) as string | undefined;
  const documentType = useFormValue(["_type"]) as "artwork" | "assamblage" | undefined;
  const medium = useFormValue(["medium"]) as string | undefined;
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const syncedPositionRef = useRef<number | null>(null);

  const scope =
    documentType === "artwork" && /^print/i.test(String(medium || "").trim())
      ? "prints"
      : "gallery";

  const applyPosition = useCallback(
    async (targetPosition: number) => {
      if (!documentId || !documentType || readOnly) return;
      const position = parsePosition(targetPosition);

      setBusy(true);
      setStatus(null);
      try {
        const docs = await fetchGridDocs(client, documentType, scope);
        await commitMoveToPosition(client, docs, canonicalArtworkId(documentId), position);
        syncedPositionRef.current = position;
        setStatus(`Gallery position updated to ${position}.`);
      } catch (err) {
        setStatus(err instanceof Error ? err.message : "Could not update gallery position.");
      } finally {
        setBusy(false);
      }
    },
    [client, documentId, documentType, readOnly, scope]
  );

  useEffect(() => {
    if (!documentId || !documentType) return;

    let cancelled = false;
    (async () => {
      try {
        const docs = await fetchGridDocs(client, documentType, scope);
        const id = canonicalArtworkId(documentId);
        const order = flatEntryOrder(docs);
        const currentIndex = order.indexOf(id);

        if (cancelled) return;

        if (currentIndex >= 0) {
          const currentPosition = currentIndex + 1;
          syncedPositionRef.current = currentPosition;
          if (value == null) onChange(set(currentPosition));
          return;
        }

        syncedPositionRef.current = null;
      } catch {
        if (!cancelled) syncedPositionRef.current = null;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [client, documentId, documentType, onChange, scope, value]);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const next = parsePosition(event.currentTarget.value);
      onChange(set(next));
      setStatus(null);
    },
    [onChange]
  );

  const handleBlur = useCallback(() => {
    if (value == null) return;
    const position = parsePosition(value);
    if (syncedPositionRef.current === position) return;
    void applyPosition(position);
  }, [applyPosition, value]);

  return (
    <Stack space={3}>
      <TextInput
        type="number"
        min={1}
        step={1}
        inputMode="numeric"
        value={value == null ? "" : String(value)}
        placeholder="1"
        readOnly={readOnly || busy}
        onChange={handleChange}
        onBlur={handleBlur}
      />
      <Text size={1} muted>
        1 = first in the gallery grid. Lower numbers appear earlier. Reordering only happens when
        you change this number and leave the field.
      </Text>
      {status ? (
        <Text size={1} muted>
          {status}
        </Text>
      ) : null}
    </Stack>
  );
}
