import { useTissUUmaps } from "@/store";
import { useCallback } from "react";

export function useDownloadProject() {
  const projectName = useTissUUmaps((state) => state.projectName);
  const saveProjectToJSON = useTissUUmaps((state) => state.saveProjectToJSON);

  const downloadProject = useCallback(() => {
    const sanitizedProjectName = projectName
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9-_]+/g, "")
      .replace(/^[-_]+|[-_]+$/g, "");
    const projectJSON = saveProjectToJSON();
    const projectBlob = new Blob([projectJSON], { type: "application/json" });
    const projectUrl = URL.createObjectURL(projectBlob);
    try {
      const projectLink = document.createElement("a");
      projectLink.download = `${sanitizedProjectName || "Untitled"}.tmap`;
      projectLink.href = projectUrl;
      projectLink.click();
    } finally {
      URL.revokeObjectURL(projectUrl);
    }
  }, [projectName, saveProjectToJSON]);

  return { downloadProject };
}
