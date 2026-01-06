import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCallback, useRef } from "react";

import { useTissUUmaps } from "../../../store";
import { ProjectSettings } from "./ProjectSettings";

export function ProjectTab() {
  const loadProjectFileInputRef = useRef<HTMLInputElement | null>(null);

  const projectName = useTissUUmaps((state) => state.projectName);
  const setProjectName = useTissUUmaps((state) => state.setProjectName);
  const loadProjectFromURL = useTissUUmaps((state) => state.loadProjectFromURL);
  const saveProject = useTissUUmaps((state) => state.saveProject);

  // TODO as store action?
  const loadProjectFromFile = useCallback(
    (projectFile: File) => {
      const projectUrl = URL.createObjectURL(projectFile); // TODO as store action?
      // TODO run in worker?
      loadProjectFromURL(projectUrl, {
        // TODO signal
      }).catch(() => {
        // TODO show alert
      });
    },
    [loadProjectFromURL],
  );

  // TODO as store action?
  const downloadProject = useCallback(() => {
    const project = saveProject();
    const projectData = JSON.stringify(project, null, 2); // TODO as store action?
    const projectBlob = new Blob([projectData], { type: "application/json" });
    const projectUrl = URL.createObjectURL(projectBlob);
    const downloadLink = document.createElement("a");
    downloadLink.href = projectUrl;
    downloadLink.download = "project.tmap"; // TODO remember file name
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(projectUrl);
  }, [saveProject]);

  return (
    <div>
      <div>
        <Label htmlFor="projectName">Project name</Label>
        <Input
          type="text"
          id="projectName"
          value={projectName}
          onChange={(event) => setProjectName(event.target.value)}
        />
      </div>
      <div>
        <Dialog>
          <DialogTrigger>
            <Button>Project settings</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Project settings</DialogTitle>
            </DialogHeader>
            <ProjectSettings />
          </DialogContent>
        </Dialog>
      </div>
      <div>
        <div>
          <Input
            ref={loadProjectFileInputRef}
            type="file"
            onChange={(event) => {
              event.preventDefault();
              const file = event.target.files?.[0];
              if (file !== undefined) {
                loadProjectFromFile(file);
              }
            }}
            hidden
          />
          <Button onClick={() => loadProjectFileInputRef.current?.click()}>
            Load project
          </Button>
        </div>
        <Button
          onClick={(event) => {
            event.preventDefault();
            downloadProject();
          }}
        >
          Save project
        </Button>
      </div>
    </div>
  );
}
