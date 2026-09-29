import { json, publicConfig } from "@/lib/supabase-server";
export async function GET() {
  return json(publicConfig());
}
