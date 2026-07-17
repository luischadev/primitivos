// =============================================================================
// src/components/ProjectSelector.tsx
// Header project picker with create / rename / delete.
// =============================================================================

import { useState } from "react";
import { Picker, PickerItem } from "@react-spectrum/s2/Picker";
import { Button } from "@react-spectrum/s2/Button";
import { TextField } from "@react-spectrum/s2/TextField";
import { Dialog, DialogContainer, Heading, Content, Footer } from "@react-spectrum/s2/Dialog";
import type { StoredProject } from "../storage/projectStorage";

interface Props {
  projects: StoredProject[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onCreateProject: () => void;
  onDuplicateProject: () => void;
  onRenameProject: (id: string, name: string) => void;
  onDeleteProject: (id: string) => void;
}

export function ProjectSelector({
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onDuplicateProject,
  onRenameProject,
  onDeleteProject,
}: Props) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const active = projects.find((p) => p.id === activeProjectId);

  const openRename = () => {
    if (!active) return;
    setRenameValue(active.name);
    setRenameOpen(true);
  };

  const confirmRename = () => {
    if (!active) return;
    onRenameProject(active.id, renameValue);
    setRenameOpen(false);
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <Picker
          label="Proyecto"
          labelPosition="side"
          selectedKey={activeProjectId}
          onSelectionChange={(key) => {
            if (key) onSelectProject(String(key));
          }}
          items={projects}
          UNSAFE_style={{ minWidth: 180 }}
        >
          {(project) => <PickerItem id={project.id}>{project.name}</PickerItem>}
        </Picker>
        <Button variant="secondary" fillStyle="outline" onPress={onCreateProject}>
          Nuevo
        </Button>
        <Button variant="secondary" fillStyle="outline" onPress={onDuplicateProject}>
          Duplicar
        </Button>
        <Button variant="secondary" fillStyle="outline" onPress={openRename}>
          Renombrar
        </Button>
        {projects.length > 1 && (
          <Button
            variant="secondary"
            fillStyle="outline"
            onPress={() => onDeleteProject(activeProjectId)}
          >
            Eliminar
          </Button>
        )}
      </div>

      <DialogContainer onDismiss={() => setRenameOpen(false)}>
        {renameOpen && (
          <Dialog size="S" isDismissible>
            <Heading>Renombrar proyecto</Heading>
            <Content>
              <TextField
                label="Nombre"
                value={renameValue}
                onChange={setRenameValue}
                autoFocus
              />
            </Content>
            <Footer>
              <Button variant="secondary" fillStyle="outline" onPress={() => setRenameOpen(false)}>
                Cancelar
              </Button>
              <Button variant="accent" onPress={confirmRename}>
                Guardar
              </Button>
            </Footer>
          </Dialog>
        )}
      </DialogContainer>
    </>
  );
}
