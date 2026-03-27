import { layoutRegistry } from "./layoutRegistry.js";

export function getAvailableLayouts(project) {

  const allLayouts = Object.keys(layoutRegistry);

  if (!project) return allLayouts;

  const mode = project.meta?.mode || "faceless";

  const orientation =
    project.meta?.orientation ||
    (project.meta?.width > project.meta?.height
      ? "horizontal"
      : "vertical");

  const layouts = Object.entries(layoutRegistry)
    .filter(([name, layout]) => {

      const orientations =
        layout.orientations ?? ["vertical", "horizontal"];

      if (!orientations.includes(orientation)) return false;

      if (mode === "faceless") {

        const avatarSlots =
          layout.capability?.avatarSlots ?? 0;

        const assetSlots =
          layout.capability?.assetSlots ?? 0;

        if (avatarSlots > 0 && assetSlots === 0)
          return false;

      }

      return true;

    })
    .map(([name]) => name);

  return layouts.length ? layouts : allLayouts;

}