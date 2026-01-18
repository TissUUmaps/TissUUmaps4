import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useCallback, useRef } from "react";

import { useTissUUmaps } from "../../../store";
import { ProjectSettingsDialog } from "./ProjectSettingsDialog";

export function ProjectPanel({ className }: { className?: string }) {
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
    <FieldGroup className={className}>
      <FieldGroup>
        <Field>
          <FieldLabel>Project name</FieldLabel>
          <Input
            type="text"
            placeholder="My awesome project"
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
          />
        </Field>
        <Field>
          <Dialog>
            <DialogTrigger render={<Button />}>
              Show project settings
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Project settings</DialogTitle>
              </DialogHeader>
              <ProjectSettingsDialog />
            </DialogContent>
          </Dialog>
        </Field>
      </FieldGroup>
      <FieldSeparator />
      <FieldGroup className="grid grid-cols-2">
        <Field>
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
          <Button
            onClick={(event) => {
              event.preventDefault();
              loadProjectFileInputRef.current?.click();
            }}
          >
            Load project
          </Button>
        </Field>
        <Field>
          <Button
            onClick={(event) => {
              event.preventDefault();
              downloadProject();
            }}
          >
            Save project
          </Button>
        </Field>
      </FieldGroup>
    </FieldGroup>
  );
}
