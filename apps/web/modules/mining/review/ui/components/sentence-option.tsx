import type { ReviewOption } from "../../types";

export function SentenceOption({
  checked,
  label,
  onChoose,
  option,
  showTranslation,
}: {
  checked: boolean;
  label: string;
  onChoose: () => void;
  option: ReviewOption;
  showTranslation: boolean;
}) {
  return (
    <label className="grid min-h-14 cursor-pointer grid-cols-[1rem_4.5rem_minmax(0,1fr)] items-start gap-3 py-4">
      <input
        className="mt-1.5 size-4 accent-primary"
        type="radio"
        name="sentence-option"
        value={option.key}
        checked={checked}
        onChange={onChoose}
      />
      <span className="pt-0.5 text-xs leading-5 font-semibold text-muted-foreground">{label}</span>
      <span className="min-w-0">
        <span className="block leading-7">{option.sentence}</span>
        {showTranslation && option.translation ? (
          <span className="mt-1 block text-sm text-muted-foreground">{option.translation}</span>
        ) : null}
      </span>
    </label>
  );
}
