## Fix: Homepage Darkening Left-to-Right

**Problem**: The "For Parents" section (line 507) uses `bg-gradient-to-r from-background to-muted/30`, which creates a visible left-to-right darkening effect. The "For Kids" section (line 601) uses `bg-gradient-to-l from-background to-accent/10`, creating a similar horizontal gradient in the opposite direction.

**Fix**: Replace horizontal gradients on section backgrounds with uniform or vertical-only backgrounds, back to where they were before they were changed.

### Changes (1 file: `src/pages/Index.tsx`)

1. **Line 507** — Change the Parents section background from `bg-gradient-to-r from-background to-muted/30` to `bg-muted/10` (uniform, subtle tint).
2. **Line 601** — Change the Kids section background from `bg-gradient-to-l from-background to-accent/10` to `bg-accent/5` (uniform, subtle tint).

These are the only two horizontal section gradients causing the darkening effect. All other `bg-gradient-to-r` instances are on buttons or small UI elements, not full-width sections.