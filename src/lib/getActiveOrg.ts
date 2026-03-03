import { supabase } from "./supabase";

export async function getActiveOrgId(): Promise<string | null> {
  const { data: authData } = await supabase.auth.getUser();
  const uid = authData.user?.id;
  if (!uid) return null;

  const { data } = await supabase
    .from("profiles")
    .select("active_org_id")
    .eq("user_id", uid)
    .single();

  return (data?.active_org_id as string) || null;
}