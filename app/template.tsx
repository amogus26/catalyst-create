import { PageTransition } from "@/components/site/motion";

/** Remounted on every page change (unlike the layout), so each page fades and rises in as it arrives. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
