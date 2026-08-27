import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@growthos/ui/components/accordion";
import { FAQ as ITEMS, type FaqItem } from "./faq-data";

export function FaqList({ items }: { items: FaqItem[] }) {
  return (
    <Accordion type="single" collapsible className="border-t">
      {items.map((item) => (
        <AccordionItem key={item.q} value={item.q}>
          <AccordionTrigger className="font-display tracking-tight">{item.q}</AccordionTrigger>
          <AccordionContent>{item.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

/** The landing-page section shows the six questions buyers ask first; /faq carries all of them. */
export function FAQSection() {
  return (
    <section id="faq" className="mx-auto max-w-6xl px-6 py-24">
      <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div>
          <p className="font-mono text-[11px] tracking-[0.18em] text-primary">FAQ</p>
          <h2 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            The questions that come up first
          </h2>
          <p className="mt-5 leading-relaxed text-muted-foreground">
            Still deciding?{" "}
            <Link href="/faq" className="text-primary underline underline-offset-4">
              Read the full FAQ
            </Link>{" "}
            — or start the trial and find out with your own accounts connected.
          </p>
        </div>

        <FaqList items={ITEMS.slice(0, 6)} />
      </div>
    </section>
  );
}
