import { Button, Flex } from "@sanity/ui";
import type { DateRange } from "../types";

const OPTIONS: { value: DateRange; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

type Props = {
  value: DateRange;
  onChange: (value: DateRange) => void;
};

export function DateRangeSelector({ value, onChange }: Props) {
  return (
    <Flex gap={2} wrap="wrap">
      {OPTIONS.map((option) => (
        <Button
          key={option.value}
          mode={value === option.value ? "default" : "ghost"}
          tone={value === option.value ? "primary" : "default"}
          text={option.label}
          onClick={() => onChange(option.value)}
        />
      ))}
    </Flex>
  );
}
