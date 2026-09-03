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
import {
  loadProjectFromFile,
  loadProjectFromURL,
  saveAndDownloadProjectToJSON,
} from "@/data/io/project";
import { useProjectStore } from "@/stores/project";

import { LayersWidget } from "./LayersWidget";
import { ProjectSettingsDialog } from "./ProjectSettingsDialog";

export type ProjectPanelProps = {
  className?: string;
};

export function ProjectPanel({ className }: ProjectPanelProps) {
  const loadProjectFileInputRef = useRef<HTMLInputElement | null>(null);

  const name = useProjectStore((state) => state.name);
  const setName = useProjectStore((state) => state.setName);
  const clearProject = useProjectStore((state) => state.clear);

  const promptLoadProjectFromURL = useCallback(() => {
    // TODO replace by dialog overlay
    const projectUrl = window.prompt("Enter project URL to load")?.trim();
    if (!projectUrl) {
      return;
    }
    loadProjectFromURL(projectUrl)
      .then(() => {
        const url = new URL(window.location.href);
        url.searchParams.set("project", projectUrl);
        window.history.replaceState({}, "", url);
      })
      .catch((error) => {
        console.error(`Failed to load project from ${projectUrl}:`, error);
      });
  }, []);

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
                value={name}
                onChange={(event) => setName(event.target.value)}
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
                Load project from file
              </Button>
            }
          />
        </Field>
        <Field>
          <FieldControl
            render={
              <Button onClick={() => promptLoadProjectFromURL()}>
                Load project from URL
              </Button>
            }
          />
        </Field>
        <Field>
          <FieldControl
            render={
              <Button onClick={() => saveAndDownloadProjectToJSON()}>
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
