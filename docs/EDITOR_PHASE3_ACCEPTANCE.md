# Phase 3 editor acceptance

The release gate is all ten requested editor capabilities, with the following executable acceptance checks. Passing this matrix is feature acceptance for supported static HTML/CSS documents, not a claim of complete client readiness.

| Capability | Implementation | Regression evidence |
| --- | --- | --- |
| Precise placement | GrapesJS drag/layers; insertion into selected containers; accessible move up/down | `editor-completion.spec.ts`, `visual-editor.spec.ts` |
| Direct text editing | Canvas text editing, selected-element text and quick text fields; literal text is escaped | `editor-completion.spec.ts`, `visual-editor.spec.ts` |
| Image replacement | Public HTTPS source and image description controls | `editor-completion.spec.ts`, `visual-editor-controls.test.ts` |
| Visual styling | Colors, font, size, padding, margin, gap, corner radius and grid/flex/stacked layout | `editor-completion.spec.ts`, `visual-editor-controls.test.ts` |
| Buttons/destinations | Editable link text, destination and existing-page picker | `editor-completion.spec.ts` |
| Multi-page editing | Page selector commits each draft before switching; independent edits return together | `editor-completion.spec.ts` |
| Undo/redo | Native GrapesJS component/style history | `visual-editor.spec.ts`, `editor-completion.spec.ts` |
| Responsive previews | Real 1280/768/390 px viewports, fitted to available editor space | `visual-editor.spec.ts` |
| Generator round trip | Edited pages, siblings, business inputs and design choices retained; approval reset | `visual-editor.spec.ts`, `editor-completion.spec.ts`, `editor-generator-state.test.ts` |
| Export/publication validation | Parsed HTML sanitation, bounded CSS, single-page export, complete ZIP and internal-destination checks; publication still requires review | `visual-editor-adapter.test.ts`, `editor-completion.spec.ts`, existing publication tests |

Imported executable scripts, active embeds and unsafe/resource-loading CSS remain excluded. Editor previews are isolated and cannot execute imported scripts. Safe source language, description and Forge layout/experience attributes are retained. Unedited sibling pages remain intact on return; standalone ZIP export sanitizes every page.

Phase 4 must address safe regeneration of first-party immersive runtimes and richer spatial experiences. Never restore arbitrary imported JavaScript to make an immersive preview appear functional.
