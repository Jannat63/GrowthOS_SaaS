"use client";

import { useEffect, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@growthos/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@growthos/ui/components/dialog";
import { Input } from "@growthos/ui/components/input";
import { Label } from "@growthos/ui/components/label";
import { ImageAddressField, isUsableImageAddress } from "@/components/admin/blog/ImageAddressField";

/**
 * Insert an image into a post.
 *
 * Alt text is a required field, not an optional one. An image without it is invisible to a screen
 * reader and to a search engine, and this is a marketing page whose whole job is to be found — so
 * the cost of getting it wrong lands squarely on the thing the post exists for.
 */
export function ImageDialog({
  open,
  onOpenChange,
  onInsert,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (image: { src: string; alt: string; caption: string }) => void;
}) {
  const [src, setSrc] = useState("");
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");

  // Cleared on open rather than on close, so a mis-typed address is still there if the dialog is
  // dismissed by accident and reopened straight away.
  useEffect(() => {
    if (open) {
      setSrc("");
      setAlt("");
      setCaption("");
    }
  }, [open]);

  const ready = isUsableImageAddress(src) && alt.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add an image</DialogTitle>
          <DialogDescription>
            Paste an address, or commit the file to <code className="font-mono">public/blog/</code>{" "}
            and use its path.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <ImageAddressField id="post-image" label="Image address" value={src} onChange={setSrc} />

          <div className="space-y-1.5">
            <Label htmlFor="post-image-alt">
              Alt text <span className="text-muted-foreground">— required</span>
            </Label>
            <Input
              id="post-image-alt"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="What the image shows, for someone who cannot see it"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="post-image-caption">Caption</Label>
            <Input
              id="post-image-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Optional, printed under the image"
            />
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <UploadSoon />
          <Button
            disabled={!ready}
            onClick={() => {
              onInsert({ src: src.trim(), alt: alt.trim(), caption: caption.trim() });
              onOpenChange(false);
            }}
          >
            Insert image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The upload affordance, deliberately built and deliberately switched off.
 *
 * There is no file storage in this project yet. It sits here rather than being left out entirely so
 * the shape of the finished thing is settled — and because whatever ships later (R2 is the cheap
 * option) will produce a URL and write to the same field, meaning no schema change and no
 * re-migration when it arrives.
 *
 * A disabled control with no explanation is worse than no control, so it says what it is waiting
 * for rather than just refusing to be pressed.
 */
function UploadSoon() {
  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" disabled className="gap-2">
        <Upload className="h-4 w-4" />
        Upload
      </Button>
      <span className="rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-warning">
        Coming soon
      </span>
    </div>
  );
}
