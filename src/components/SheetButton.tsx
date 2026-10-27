"use client";

import { useState, type ReactNode } from "react";
import { Button } from "./ui";
import { Sheet } from "./Sheet";

// A button that opens server-rendered content in a sheet — for screens that
// are otherwise server components, like a GET filter form, where the content
// carries its own submit and needs no state of its own.
export function SheetButton({
  label,
  title,
  description,
  children,
}: {
  label: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" block onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title={title} description={description}>
        <div className="pb-4">{children}</div>
      </Sheet>
    </>
  );
}
