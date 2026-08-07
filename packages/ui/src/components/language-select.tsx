import { NativeSelect } from "@dango/ui/components/native-select";

type LanguageSelectProps<Value extends string> = {
  label: string;
  onValueChange: (value: Value) => void;
  options: readonly { label: string; value: Value }[];
  value: Value;
};

function LanguageSelect<Value extends string>({
  label,
  onValueChange,
  options,
  value,
}: LanguageSelectProps<Value>) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground lg:mt-6 lg:w-fit lg:flex-col lg:items-start">
      <span>{label}</span>
      <NativeSelect
        aria-label={label}
        className="h-9 min-w-32 py-0 text-sm font-semibold text-foreground"
        onChange={(event) => onValueChange(event.target.value as Value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </NativeSelect>
    </label>
  );
}

export { LanguageSelect };
