import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useRef } from "react";

import { useDownloadProject } from "../../../hooks/useDownloadProject";
import { useTissUUmaps } from "../../../store";
import { Field, FieldControl, FieldLabel } from "../../common/field";
import { ProjectSettingsDialog } from "./ProjectSettingsDialog";

export type ProjectPanelProps = {
  className?: string;
};

export function ProjectPanel({ className }: ProjectPanelProps) {
  const loadProjectFileInputRef = useRef<HTMLInputElement | null>(null);

  const { downloadProject } = useDownloadProject();

  const projectName = useTissUUmaps((state) => state.projectName);
  const setProjectName = useTissUUmaps((state) => state.setProjectName);
  const loadProjectFromFile = useTissUUmaps(
    (state) => state.loadProjectFromFile,
  );

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
              event.preventDefault();
              const file = event.target.files?.[0];
              if (file !== undefined) {
                loadProjectFromFile(file).catch((error) => {
                  console.error("Failed to load project from file", error);
                });
              }
            }}
            hidden
          />
          <FieldControl
            render={
              <Button
                onClick={(event) => {
                  event.preventDefault();
                  loadProjectFileInputRef.current?.click();
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
              <Button
                onClick={(event) => {
                  event.preventDefault();
                  downloadProject();
                }}
              >
                Download project
              </Button>
            }
          />
        </Field>
      </div>
    </div>
  );
}
