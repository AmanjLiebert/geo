"use client";

import {
  BookOpen,
  FilePenLine,
  FlaskConical,
  Images,
  Link2,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import styles from "./record-editor.module.css";

export type RecordWorkspaceSectionId =
  "details" | "scientific" | "sources" | "location" | "related" | "media";

export type RecordWorkspaceSection = {
  id: RecordWorkspaceSectionId;
  label: string;
  description: string;
};

const icons: Record<RecordWorkspaceSectionId, LucideIcon> = {
  details: FilePenLine,
  scientific: FlaskConical,
  sources: BookOpen,
  location: MapPin,
  related: Link2,
  media: Images,
};

export const defaultRecordWorkspaceSections: RecordWorkspaceSection[] = [
  {
    id: "details",
    label: "Record details",
    description: "Title and explanation",
  },
  {
    id: "scientific",
    label: "Scientific fields",
    description: "Type-specific observations",
  },
  {
    id: "sources",
    label: "Sources",
    description: "Books, articles, and websites",
  },
  {
    id: "location",
    label: "Location",
    description: "Place and public visibility",
  },
  {
    id: "related",
    label: "Related items",
    description: "Connected records and research",
  },
  {
    id: "media",
    label: "Images and files",
    description: "Visual evidence and documents",
  },
];

export function RecordWorkspaceNav({
  sections,
  activeSection,
  onSelect,
}: {
  sections: RecordWorkspaceSection[];
  activeSection: RecordWorkspaceSectionId;
  onSelect: (section: RecordWorkspaceSectionId) => void;
}) {
  return (
    <nav className={styles.workspaceNav} aria-label="Record sections">
      <p className={styles.workspaceNavLabel}>Record workspace</p>
      <div
        className={styles.workspaceNavList}
        role="tablist"
        aria-orientation="vertical"
      >
        {sections.map((section, index) => {
          const Icon = icons[section.id];
          const selected = activeSection === section.id;
          return (
            <button
              key={section.id}
              id={`record-tab-${section.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`record-panel-${section.id}`}
              className={
                selected
                  ? styles.workspaceNavButtonActive
                  : styles.workspaceNavButton
              }
              onClick={() => onSelect(section.id)}
            >
              <span className={styles.workspaceNavNumber}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <Icon className={styles.workspaceNavIcon} aria-hidden="true" />
              <span className={styles.workspaceNavCopy}>
                <strong>{section.label}</strong>
                <small>{section.description}</small>
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
