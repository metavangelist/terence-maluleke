import { useCallback, useEffect, useState } from "react";
import { RestoreIcon } from "@sanity/icons";
import { Badge, Box, Button, Card, Flex, Stack, Text } from "@sanity/ui";
import type { ImageInputProps } from "sanity";
import { unset, useClient } from "sanity";
import { useFormValue } from "sanity";
import {
  HOME_BUBBLE_DEFAULT,
  HOME_BUBBLE_DOC_ID,
  isDefaultHomeBubbleArtwork,
  type SanityImageValue,
} from "../../lib/home-bubble-default";
import { ensureHomeBubbleDefault } from "./ensureHomeBubbleDefault";

export function HomeBubbleArtworkInput(props: ImageInputProps) {
  const client = useClient({ apiVersion: "2025-06-27" });
  const defaultArtwork = useFormValue(["defaultArtwork"]) as SanityImageValue | undefined;
  const currentArtwork = props.value as SanityImageValue | undefined;
  const [ready, setReady] = useState(Boolean(defaultArtwork?.asset?._ref));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    ensureHomeBubbleDefault(client)
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message || "Could not prepare the default artwork.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [client]);

  const usingDefault =
    !currentArtwork?.asset?._ref ||
    isDefaultHomeBubbleArtwork(currentArtwork, defaultArtwork);

  const restoreDefault = useCallback(async () => {
    setBusy(true);
    setError(null);

    try {
      await ensureHomeBubbleDefault(client);
      props.onChange(unset());
      await client
        .patch(HOME_BUBBLE_DOC_ID)
        .set({ objectPosition: "" })
        .commit({ autoGenerateArrayKeys: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not restore the default artwork.");
    } finally {
      setBusy(false);
    }
  }, [client, props]);

  const clearCustomArtwork = useCallback(() => {
    props.onChange(unset());
  }, [props]);

  return (
    <Stack space={4}>
      <Card border padding={4} radius={2} tone="transparent">
        <Flex align="flex-start" gap={4} wrap="wrap">
          <Box style={{ width: 132, flexShrink: 0 }}>
            <img
              src={HOME_BUBBLE_DEFAULT.previewPath}
              alt={HOME_BUBBLE_DEFAULT.title}
              style={{
                display: "block",
                width: "100%",
                height: "auto",
                borderRadius: 8,
              }}
            />
          </Box>

          <Stack space={3} style={{ flex: 1, minWidth: 220 }}>
            <Stack space={2}>
              <Flex align="center" gap={2} wrap="wrap">
                <Text size={1} weight="semibold">
                  Site default artwork
                </Text>
                {usingDefault ? <Badge tone="positive">Active on site</Badge> : null}
              </Flex>
              <Text size={1} muted>
                {HOME_BUBBLE_DEFAULT.title} · {HOME_BUBBLE_DEFAULT.filename}
              </Text>
              <Text size={1} muted>
                This is the original homepage bubble painting. Upload a different image
                below to try alternatives, then use Restore default to return the live
                site to this artwork.
              </Text>
            </Stack>

            <Flex gap={2} wrap="wrap">
              <Button
                icon={RestoreIcon}
                text={usingDefault ? "Default already active" : "Restore default artwork"}
                tone="primary"
                disabled={busy || usingDefault || !ready}
                loading={busy}
                onClick={() => void restoreDefault()}
              />
              {!usingDefault && currentArtwork?.asset?._ref ? (
                <Button
                  text="Remove custom image"
                  mode="bleed"
                  tone="critical"
                  disabled={busy}
                  onClick={clearCustomArtwork}
                />
              ) : null}
            </Flex>

            {error ? (
              <Text size={1} style={{ color: "var(--card-badge-caution-fg-color)" }}>
                {error}
              </Text>
            ) : null}
          </Stack>
        </Flex>
      </Card>

      <Stack space={3}>
        <Stack space={2}>
          <Text size={1} weight="semibold">
            Custom bubble artwork
          </Text>
          <Text size={1} muted>
            Optional. When set and published, this replaces the default on the live site.
          </Text>
        </Stack>
        {props.renderDefault(props)}
      </Stack>
    </Stack>
  );
}
