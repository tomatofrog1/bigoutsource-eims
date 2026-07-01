# Resizable Table Columns Feature

## Overview
The Resizable Table Columns feature enables users to click and drag the borders of table column headers to manually adjust their widths. The behavior is intentionally designed to mimic Microsoft Excel:
- A subtle divider line appears when you hover over the right edge of a column header.
- Dragging the divider line smoothly resizes the active column.
- Expanding a column pushes the table's total width outward (causing horizontal scrolling if necessary) rather than squishing the surrounding columns to the left or right.

## Components Involved

### 1. `ResizableHeader.tsx` (New Component)
**Path:** `frontend/src/components/ResizableHeader.tsx`

This is a custom wrapper around the standard `<th>` HTML element. 
- It uses native DOM mouse events (`onMouseDown`, `mousemove`, `mouseup`) to track how far the user drags the mouse.
- It calculates the new width starting from the original width and reports it back to the parent component via the `onResize(columnKey, newWidth)` callback.
- **Styling Details:** It implements a `12px` wide invisible clickable area on the right edge. Inside this area, a `2px` visible line appears on hover (`group-hover`) or when active (`isResizing`), ensuring it is easy to click without requiring pixel-perfect cursor positioning.

### 2. State Management (`colWidths`)
**Path:** `frontend/src/pages/Directory.tsx` and `frontend/src/pages/Assets.tsx`

Both table pages manage a new React state to track explicit pixel widths for columns:
```typescript
const [colWidths, setColWidths] = useState<Record<string, number>>({});
```

The tables initially render columns using percentage widths (calculated via `columnWeights`). Once a user drags a column, the following logic kicks in:
1. **Freezing Column Widths:** On the very *first* drag event (when `colWidths` is empty), the script queries the DOM for all headers (`document.querySelectorAll('th[data-col-key]')`), reads their exact `getBoundingClientRect().width` in pixels, and caches them all into the `colWidths` state.
2. **Preventing Squishing:** This instantly converts every column in the table from a responsive percentage (`%`) to a hardcoded pixel (`px`) width. The table's total width becomes the exact sum of these pixels.
3. **Updating the Active Column:** As the mouse moves, only the specific column being dragged is updated in the state, making it wider or narrower.

### 3. Table Layout & CSS Classes
To prevent the table from stubbornly restricting its width to exactly 100% of the screen (which causes columns to squish), the table wrapper dynamically changes its Tailwind CSS classes:

```tsx
<table className={cn(
  "min-w-[920px] table-fixed border-collapse text-left", 
  Object.keys(colWidths).length > 0 ? "w-max" : "w-full"
)}>
```

- **`w-full` (Before Resize):** The table naturally spans the full width of the screen, evenly distributing the percentage widths of all columns.
- **`w-max` (After Resize):** Once `colWidths` is populated and pixel widths are assigned, the table drops the 100% constraint. The table expands horizontally (`w-max`) to comfortably contain all the fixed-pixel columns, allowing horizontal scrolling to happen natively and smoothly.

## Implementation Guide for Future Tables
If you need to add this feature to a new table in the future, follow these 3 steps:

1. Import `<ResizableHeader>` and replace your standard `<th>` tags.
2. Add the `colWidths` state and `handleResize` function exactly as they appear in `Directory.tsx`.
3. Apply the conditional `w-max` vs `w-full` tailwind classes to your parent `<table>` tag, and conditionally render the `<col>` width styles to use `px` when available.
