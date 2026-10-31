import { useState } from "react";

// Keep editable text intact, including a trailing comma and intermediate space.
export function TagInput({
  value,
  onChange,
  ...props
}: {
  value: string[];
  onChange: (value: string[]) => void;
  "aria-label"?: string;
  placeholder?: string;
}) {
  const [text, setText] = useState(value.join(", "));
  return (
    <input
      {...props}
      value={text}
      onChange={(event) => {
        setText(event.target.value);
        onChange([
          ...new Set(
            event.target.value
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
          ),
        ]);
      }}
    />
  );
}
