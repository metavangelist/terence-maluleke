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
  const syncedRef = useRef(false);
  const lastAppliedRef = useRef<number | null>(null);

  const scope =
    documentType === "artwork" && /^print/i.test(String(medium || "").trim())
      ? "prints"
      : "gallery";

  const applyPosition = useCallback(
    async (targetPosition: number, { silent = false } = {}) => {
      if (!documentId || !documentType || readOnly) return;
      const position = parsePosition(targetPosition);
      if (lastAppliedRef.current === position) return;

      setBusy(true);
      if (!silent) setStatus(null);
      try {
        const docs = await fetchGridDocs(client, documentType, scope);
        await commitMoveToPosition(client, docs, canonicalArtworkId(documentId), position);
        lastAppliedRef.current = position;
        if (!silent) setStatus(`Gallery position updated to ${position}.`);
      } catch (err) {
        setStatus(err instanceof Error ? err.message : "Could not update gallery position.");
      } finally {
        setBusy(false);
      }
    },
    [client, documentId, documentType, readOnly, scope]
  );

  useEffect(() => {
    if (!documentId || !documentType || syncedRef.current) return;

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
          if (value == null) onChange(set(currentPosition));
          lastAppliedRef.current = currentPosition;
          syncedRef.current = true;
          return;
        }

        const initialPosition = parsePosition(value ?? 1);
        if (initialPosition === 1) {
          await commitMoveToPosition(client, docs, id, 1);
          if (cancelled) return;
          onChange(set(1));
          lastAppliedRef.current = 1;
          setStatus("Placed at position 1 in the gallery.");
        }
        syncedRef.current = true;
      } catch {
        if (!cancelled) syncedRef.current = true;
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
    void applyPosition(parsePosition(value ?? 1));
  }, [applyPosition, value]);

  return (
    <Stack space={3}>
      <TextInput
        type="number"
        min={1}
        step={1}
        inputMode="numeric"
        value={value == null ? "1" : String(value)}
        readOnly={readOnly || busy}
        onChange={handleChange}
        onBlur={handleBlur}
      />
      <Text size={1} muted>
        1 = first in the gallery grid. Lower numbers appear earlier. Changes apply when you leave
        this field.
      </Text>
      {status ? (
        <Text size={1} muted>
          {status}
        </Text>
      ) : null}
    </Stack>
  );
}
