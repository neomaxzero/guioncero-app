## Format and data shown (UI aesthetics)

- We need to show first the severity with somo color coding. Use standard color coding for logs:
  - Red for errors.
  - Yellow for warnings.
  - Blue for info.
- Then we should show the time with a muted color unless the row is hovered.
- For the body let's use monospacing font.
- On mobile, the table should be determining the scrolling of the vertical spacing.
- Use slightly smaller font to fit more data.
- Let's use virtualisation to save memory. Do not render things that are not in the screen.
- logs should be ordered by the time, more recent to latest.
