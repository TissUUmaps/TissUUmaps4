import { useCallback, useRef } from "react";

import { Field, FieldControl, FieldLabel } from "@/components/common/field";
import { Fieldset, FieldsetLegend } from "@/components/common/fieldset";
import { useConfirmDialog } from "@/components/dialogs/ConfirmDialog/hooks";
import { usePromptDialog } from "@/components/dialogs/PromptDialog/hooks";
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
  clearProjectURLParam,
  loadProjectFromFile,
  loadProjectFromFileHandle,
  loadProjectFromURL,
  saveAndDownloadProjectToJSON,
  setProjectURLParam,
} from "@/data/io/project";
import {
  isWorkspaceSupported,
  pickProjectFile,
  pickWorkspace,
} from "@/data/io/workspace";
import { useAppStore } from "@/stores/app";
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
  const workspace = useAppStore((state) => state.workspace);
  const setWorkspace = useAppStore((state) => state.setWorkspace);
  const confirm = useConfirmDialog();
  const prompt = usePromptDialog();
  const workspaceSupported = isWorkspaceSupported();

  const promptLoadProjectFromURL = useCallback(() => {
    void prompt({ title: "Enter project URL to load" }).then((value) => {
      const projectUrl = value?.trim();
      if (!projectUrl) {
        return;
      }
      loadProjectFromURL(projectUrl)
        .then(() => {
          setProjectURLParam(projectUrl);
        })
        .catch((error) => {
          console.error("Failed to load project from URL", error);
        });
    });
  }, [prompt]);

  const confirmClearProject = useCallback(() => {
    void confirm({
      title: "Clear project",
      body: "Are you sure you want to clear the project? All unsaved changes will be lost.",
    }).then((confirmed) => {
      if (confirmed) {
        clearProject();
        clearProjectURLParam();
      }
    });
  }, [clearProject, confirm]);

  const openWorkspace = useCallback(() => {
    void pickWorkspace()
      .then((directory) => {
        if (directory !== null) {
          setWorkspace(directory);
        }
      })
      .catch((error) => {
        console.error("Failed to open workspace", error);
      });
  }, [setWorkspace]);

  const confirmCloseWorkspace = useCallback(() => {
    void confirm({
      title: "Close workspace",
      body: "Are you sure you want to close the workspace? Data loaded from it will no longer be available until you open it again.",
    }).then((confirmed) => {
      if (confirmed) {
        setWorkspace(null);
      }
    });
  }, [confirm, setWorkspace]);

  // Only a file handle can be located within the workspace
  const loadProjectFile = useCallback(() => {
    if (workspace === null) {
      loadProjectFileInputRef.current?.click();
      return;
    }
    void pickProjectFile()
      .then(async (projectFile) => {
        if (projectFile === null) {
          return;
        }
        await loadProjectFromFileHandle(projectFile, workspace);
        clearProjectURLParam();
      })
      .catch((error) => {
        console.error("Failed to load project from file", error);
      });
  }, [workspace]);

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
            aria-label="Load project from file"
            type="file"
            onChange={(event) => {
              const files = event.target.files;
              if (files !== null && files.length > 0) {
                loadProjectFromFile(files[0]!)
                  .then(() => {
                    clearProjectURLParam();
                  })
                  .catch((error) => {
                    console.error("Failed to load project from file", error);
                  });
              }
            }}
            hidden
          />
          <FieldControl
            render={
              <Button onClick={() => loadProjectFile()}>
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
      <div className="grid grid-cols-2">
        <div className="flex items-end">
          {!workspaceSupported ? (
            <p className="text-xs text-muted-foreground mx-1">
              Workspaces are not supported by this browser.
            </p>
          ) : (
            <p
              className="text-sm truncate min-w-0"
              title={workspace ? workspace.name : undefined}
            >
              {workspace
                ? `Current workspace: ${workspace.name}`
                : "No current workspace."}
            </p>
          )}
        </div>

        <Field>
          <FieldControl
            render={
              <Button
                disabled={!workspaceSupported}
                onClick={() =>
                  workspace ? confirmCloseWorkspace() : openWorkspace()
                }
              >
                {workspace ? "Close workspace" : "Open workspace"}
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
