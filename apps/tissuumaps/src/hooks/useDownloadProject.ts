import { useTissUUmaps } from "@/store";
import { useCallback } from "react";

export function useDownloadProject() {
  const projectName = useTissUUmaps((state) => state.projectName);
  const saveProjectToJSON = useTissUUmaps((state) => state.saveProjectToJSON);

  const downloadProject = useCallback(() => {
    const projectJSON = saveProjectToJSON();
    const projectBlob = new Blob([projectJSON], { type: "application/json" });
    const projectUrl = URL.createObjectURL(projectBlob);
    try {
      const projectLink = document.createElement("a");
      projectLink.href = projectUrl;
      const sanitizedBaseName = projectName
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9-_]+/g, "")
        .replace(/^[-_]+|[-_]+$/g, "");
      projectLink.download =
        sanitizedBaseName !== "" ? `${sanitizedBaseName}.tmap` : "Untitled.tmap";
      projectLink.click();
    } finally {
      URL.revokeObjectURL(projectUrl);
    }
  }, [projectName, saveProjectToJSON]);

  return { downloadProject };
}
