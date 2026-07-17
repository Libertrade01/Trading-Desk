import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isFounderUser } from "@/lib/founder-migration";
import { loadAdminMetrics } from "@/lib/admin-metrics";
import AdminDashboard from "@/components/AdminDashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isFounderUser(user)) redirect("/home");

  try {
    const metrics = await loadAdminMetrics();
    return <AdminDashboard metrics={metrics} />;
  } catch (error) {
    console.error("admin/dashboard:", error);
    return <AdminDashboard error="The operational metrics could not be loaded. Try refreshing in a moment." />;
  }
}
