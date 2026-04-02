import { useCallback, useRef } from "react";

import { Field, FieldControl, FieldLabel } from "@/components/common/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useProjectDownload } from "@/hooks/useProjectDownload";
import { useTissUUmaps } from "@/store";

import { ProjectSettingsDialog } from "./ProjectSettingsDialog";

export type ProjectPanelProps = {
  className?: string;
};

export function ProjectPanel({ className }: ProjectPanelProps) {
  const loadProjectFileInputRef = useRef<HTMLInputElement | null>(null);

  const { downloadProject } = useProjectDownload();

  const projectName = useTissUUmaps((state) => state.projectName);
  const setProjectName = useTissUUmaps((state) => state.setProjectName);
  const loadProjectFromFile = useTissUUmaps(
    (state) => state.loadProjectFromFile,
  );
  const clearProject = useTissUUmaps((state) => state.clearProject);

  const confirmClearProject = useCallback(() => {
    if (
      window.confirm(
        "Are you sure you want to clear the project? All unsaved changes will be lost.",
      )
    ) {
      clearProject();
      const url = new URL(window.location.href);
      url.searchParams.delete("project");
      window.history.replaceState({}, "", url);
    }
  }, [clearProject]);

  return (
    <div className={className}>
      <div>
        <Field>
          <FieldLabel>Project name</FieldLabel>
          <FieldControl
            render={
              <Input
                type="text"
                placeholder="My awesome project"
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
              />
            }
          />
        </Field>
        <Field>
          <Dialog>
            <DialogTrigger render={<FieldControl render={<Button />} />}>
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
      </div>
      <div className="grid grid-cols-2">
        <Field>
          <Input
            ref={loadProjectFileInputRef}
            type="file"
            onChange={(event) => {
              if (event.target.files !== null) {
                const file = event.target.files[0];
                if (file !== undefined) {
                  loadProjectFromFile(file).catch((error) => {
                    console.error("Failed to load project from file", error);
                  });
                }
              }
            }}
            hidden
          />
          <FieldControl
            render={
              <Button
                onClick={() => {
                  const loadProjectFileInput = loadProjectFileInputRef.current;
                  if (loadProjectFileInput !== null) {
                    loadProjectFileInput.click();
                  }
                }}
              >
                Load project
              </Button>
            }
          />
        </Field>
        <Field>
          <FieldControl
            render={
              <Button onClick={() => downloadProject()}>
                Download project
              </Button>
            }
          />
        </Field>
        <Field>
          <FieldControl
            render={
              <Button onClick={() => confirmClearProject()}>
                Clear project
              </Button>
            }
          />
        </Field>
      </div>
    </div>
  );
}
