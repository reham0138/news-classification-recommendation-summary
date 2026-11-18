import { catStyle, prettyCategory } from "../lib";

export default function CategoryChip({ category, className = "" }: { category: string; className?: string }) {
  return (
    <span className={`cat inline-block rounded-sm px-2 py-0.5 text-xs font-medium ${className}`} style={catStyle(category)}>
      {prettyCategory(category)}
    </span>
  );
}
