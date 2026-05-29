import { useCallback, useRef } from "react";

import { Field, FieldControl, FieldLabel } from "@/components/common/field";
import { Fieldset, FieldsetLegend } from "@/components/common/fieldset";
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

import { LayersWidget } from "./LayersWidget";
import { ProjectSettingsDialog } from "./ProjectSettingsDialog";

export type ProjectPanelProps = {
  className?: string;
};

export function ProjectPanel({ className }: ProjectPanelProps) {
  const loadProjectFileInputRef = useRef<HTMLInputElement | null>(null);

  const projectName = useTissUUmaps((state) => state.projectName);
  const setProjectName = useTissUUmaps((state) => state.setProjectName);
  const loadProjectFromFile = useTissUUmaps(
    (state) => state.loadProjectFromFile,
  );
  const clearProject = useTissUUmaps((state) => state.clearProject);

  const { downloadProject } = useProjectDownload();

  const confirmClearProject = useCallback(() => {
    if (
      // TODO replace by dialog overlay
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
              const files = event.target.files;
              if (files !== null && files.length > 0) {
                loadProjectFromFile(files[0]!).catch((error) => {
                  console.error("Failed to load project from file", error);
                });
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
      <Fieldset className="mt-4 flex flex-col gap-y-2">
        <FieldsetLegend className="font-medium text-foreground">
          Project Layers
        </FieldsetLegend>
        <LayersWidget />
      </Fieldset>
    </div>
  );
}
