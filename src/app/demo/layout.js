import DemoShell from "@/components/DemoShell";

export const metadata = {
  title: "Demo | Libertrade LOOP",
  description: "Explore Libertrade LOOP with seeded sample trading data. No account required.",
  robots: { index: false, follow: false },
};

export default function DemoLayout({ children }) {
  return <DemoShell>{children}</DemoShell>;
}
