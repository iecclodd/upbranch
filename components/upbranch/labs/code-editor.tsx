"use client";

import { useMemo, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { html } from "@codemirror/lang-html";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorState, Prec } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { tags } from "@lezer/highlight";

const editorTheme = EditorView.theme(
  {
    "&": { color: "#e0e7f2", backgroundColor: "#141c2a", fontSize: "13px" },
    ".cm-scroller": {
      fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
      lineHeight: "1.6",
      minHeight: "360px",
      overflow: "auto",
    },
    ".cm-content": { caretColor: "#f4f7ff", padding: "10px 0" },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#f4f7ff" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection":
      { backgroundColor: "#38577c" },
    ".cm-activeLine": { backgroundColor: "#202d40" },
    ".cm-gutters": {
      backgroundColor: "#192333",
      color: "#8493aa",
      border: "none",
    },
    ".cm-activeLineGutter": { backgroundColor: "#26364b", color: "#e0e7f2" },
  },
  { dark: true },
);

const colors = HighlightStyle.define([
  { tag: tags.tagName, color: "#7dcfff" },
  { tag: tags.attributeName, color: "#e8b96e" },
  { tag: [tags.string, tags.attributeValue], color: "#a8d995" },
  {
    tag: [tags.propertyName, tags.definition(tags.propertyName)],
    color: "#c8a7f4",
  },
  { tag: [tags.number, tags.integer, tags.float], color: "#f0ad83" },
  { tag: tags.comment, color: "#8fa3a5", fontStyle: "italic" },
  { tag: [tags.keyword, tags.operator], color: "#e6a8d0" },
]);

export function CodeEditor({
  path,
  value,
  onChange,
  onRun,
}: {
  path: string;
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
}) {
  const runRef = useRef(onRun);
  runRef.current = onRun;
  const extensions = useMemo(
    () => [
      ...(path.endsWith(".html") ? [html()] : []),
      syntaxHighlighting(colors),
      EditorView.lineWrapping,
      EditorView.contentAttributes.of({ "aria-label": `Edit ${path}` }),
      EditorState.transactionFilter.of((transaction) => {
        if (!transaction.docChanged) return transaction;
        const doc = transaction.newDoc;
        return doc.length <= 40000 &&
          new TextEncoder().encode(doc.toString()).length <= 40 * 1024
          ? transaction
          : [];
      }),
      Prec.highest(
        keymap.of([
          {
            key: "Mod-Enter",
            run: () => {
              runRef.current();
              return true;
            },
          },
        ]),
      ),
    ],
    [path],
  );

  return (
    <CodeMirror
      key={path}
      value={value}
      onChange={onChange}
      extensions={extensions}
      theme={editorTheme}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLine: true,
        highlightActiveLineGutter: true,
      }}
    />
  );
}
