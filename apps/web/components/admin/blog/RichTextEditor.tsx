"use client";

import { useEffect, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
// v3 moved the menus out of the package root into their own entry point.
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extensions";
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Minus,
  Quote,
  SquareCode,
} from "lucide-react";
import type { RichTextDoc } from "@growthos/types";
import { cn } from "@/lib/utils/cn";
import { ImageDialog } from "@/components/admin/blog/ImageDialog";

/**
 * The writing surface.
 *
 * **The toolbar is derived from what the public page can render, not from what Tiptap can do.**
 * `PostBody.tsx` handles exactly this set of nodes and marks and silently ignores the rest, so a
 * button for anything else would be a control that appears to work and then produces nothing on the
 * published page. That is why StarterKit is configured *down* here — h1, strike and underline are
 * switched off rather than left on and hoped about.
 *
 * The editor carries `prose-signal`, the same stylesheet the published post uses. What you type is
 * the size, face and leading it will ship at, which is why there is no preview tab: a preview tab
 * is an admission that the editor lies.
 */

const EMPTY_DOC: RichTextDoc = { type: "doc", content: [{ type: "paragraph" }] };

export function RichTextEditor({
  value,
  onChange,
  onWordCount,
}: {
  value: RichTextDoc | null;
  onChange: (doc: RichTextDoc) => void;
  onWordCount?: (words: number) => void;
}) {
  const [imageOpen, setImageOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // No h1: the post title is the page's h1, and a second one is a structural error a writer
        // should not be able to make by pressing a button.
        heading: { levels: [2, 3] },
        // Neither survives the renderer, and underlined prose reads as a broken link anyway.
        strike: false,
        underline: false,
        link: {
          openOnClick: false,
          autolink: true,
          // Matches PostBody's own guard. Two places, because the editor should refuse the paste
          // rather than accept it and have the page quietly drop it later.
          protocols: ["http", "https", "mailto", "tel"],
        },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({
        placeholder: "Start writing. Select any text to format it.",
      }),
    ],
    content: value ?? EMPTY_DOC,
    // Next renders this on the server first; rendering the editor there produces a hydration
    // mismatch, because a contenteditable's DOM is not the DOM React thinks it wrote.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        // The measure. Prose is read, not scanned, and a 1,200-word post set across the full width
        // of a console is unreadable no matter how good the type is.
        class: "max-w-[68ch] focus:outline-none",
      },
    },
    onUpdate: ({ editor: e }) => {
      onChange(e.getJSON() as RichTextDoc);
      onWordCount?.(countWords(e.getText()));
    },
  });

  // The document arrives after the first render (it is fetched), so the editor has to be told once
  // it lands. Guarded on identity, or every keystroke would re-seed the editor from the value it
  // just produced and collapse the cursor to the top.
  const [seeded, setSeeded] = useState(false);
  useEffect(() => {
    if (!editor || seeded || !value) return;
    editor.commands.setContent(value);
    onWordCount?.(countWords(editor.getText()));
    setSeeded(true);
  }, [editor, value, seeded, onWordCount]);

  if (!editor) {
    // Reserves the writing column's height so the page does not jump when the editor mounts.
    return <div className="min-h-96 animate-pulse rounded-lg bg-muted/40" aria-hidden="true" />;
  }

  return (
    <div>
      <BlockToolbar editor={editor} onInsertImage={() => setImageOpen(true)} />

      {/* The bubble is where inline formatting lives, so the fixed bar above stays down to the
          seven block controls and the writing column keeps its air. */}
      <BubbleMenu
        editor={editor}
        className="flex items-center gap-0.5 rounded-lg border bg-popover p-1 shadow-lg"
      >
        <Tool editor={editor} label="Bold" active="bold" onClick={(e) => e.chain().focus().toggleBold().run()}>
          <Bold className="h-3.5 w-3.5" />
        </Tool>
        <Tool editor={editor} label="Italic" active="italic" onClick={(e) => e.chain().focus().toggleItalic().run()}>
          <Italic className="h-3.5 w-3.5" />
        </Tool>
        <Tool editor={editor} label="Inline code" active="code" onClick={(e) => e.chain().focus().toggleCode().run()}>
          <Code className="h-3.5 w-3.5" />
        </Tool>
        <span className="mx-0.5 h-4 w-px bg-border" aria-hidden="true" />
        <LinkTool editor={editor} />
      </BubbleMenu>

      <div className="prose-signal mt-6">
        <EditorContent editor={editor} />
      </div>

      <ImageDialog
        open={imageOpen}
        onOpenChange={setImageOpen}
        onInsert={({ src, alt, caption }) => {
          editor.chain().focus().setImage({ src, alt, title: caption }).run();
        }}
      />
    </div>
  );
}

// ── Toolbars ────────────────────────────────────────────────────────────────

function BlockToolbar({ editor, onInsertImage }: { editor: Editor; onInsertImage: () => void }) {
  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-0.5 border-b bg-background/90 px-1 py-2 backdrop-blur"
    >
      <Tool
        editor={editor}
        label="Heading"
        active={{ name: "heading", attrs: { level: 2 } }}
        onClick={(e) => e.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="h-4 w-4" />
      </Tool>
      <Tool
        editor={editor}
        label="Subheading"
        active={{ name: "heading", attrs: { level: 3 } }}
        onClick={(e) => e.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="h-4 w-4" />
      </Tool>

      <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />

      <Tool editor={editor} label="Bulleted list" active="bulletList" onClick={(e) => e.chain().focus().toggleBulletList().run()}>
        <List className="h-4 w-4" />
      </Tool>
      <Tool editor={editor} label="Numbered list" active="orderedList" onClick={(e) => e.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="h-4 w-4" />
      </Tool>
      <Tool editor={editor} label="Quote" active="blockquote" onClick={(e) => e.chain().focus().toggleBlockquote().run()}>
        <Quote className="h-4 w-4" />
      </Tool>
      <Tool editor={editor} label="Code block" active="codeBlock" onClick={(e) => e.chain().focus().toggleCodeBlock().run()}>
        <SquareCode className="h-4 w-4" />
      </Tool>

      <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />

      <Tool editor={editor} label="Divider" onClick={(e) => e.chain().focus().setHorizontalRule().run()}>
        <Minus className="h-4 w-4" />
      </Tool>
      <Tool editor={editor} label="Image" onClick={onInsertImage}>
        <ImagePlus className="h-4 w-4" />
      </Tool>
    </div>
  );
}

/**
 * A link is the one inline control that needs an argument, so it gets its own button rather than
 * sharing the plain toggle. Selecting a link and pressing it removes it — the same gesture both
 * ways, which is how every other mark in this toolbar behaves.
 */
function LinkTool({ editor }: { editor: Editor }) {
  const active = editor.isActive("link");
  return (
    <Tool
      editor={editor}
      label={active ? "Remove link" : "Add link"}
      active="link"
      onClick={(e) => {
        if (active) {
          e.chain().focus().extendMarkRange("link").unsetLink().run();
          return;
        }
        const url = window.prompt("Link address");
        if (!url) return;
        e.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
      }}
    >
      {active ? <Link2Off className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
    </Tool>
  );
}

type ActiveCheck = string | { name: string; attrs: Record<string, unknown> };

function Tool({
  editor,
  label,
  active,
  onClick,
  children,
}: {
  editor: Editor;
  label: string;
  active?: ActiveCheck;
  onClick: (editor: Editor) => void;
  children: React.ReactNode;
}) {
  const on =
    active === undefined
      ? false
      : typeof active === "string"
        ? editor.isActive(active)
        : editor.isActive(active.name, active.attrs);

  return (
    <button
      type="button"
      // A toolbar button that steals focus deselects the text it is about to format.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onClick(editor)}
      aria-label={label}
      aria-pressed={active === undefined ? undefined : on}
      title={label}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        on ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}
