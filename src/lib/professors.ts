import { supabase } from "@/integrations/supabase/client";

export const professorsQuery = () => ({
  queryKey: ["professors"],
  queryFn: async () => {
    const { data, error } = await supabase.from("professors").select("id,name,university,department").order("name").limit(1000);
    if (error) throw error;
    return data ?? [];
  },
});
export const professorSummaryQuery = () => ({
  queryKey: ["professor-summary"],
  queryFn: async () => {
    const { data, error } = await supabase.rpc("professor_rating_summary");
    if (error) throw error;
    return data ?? [];
  },
});
export const professorReviewsQuery = (id: string) => ({
  queryKey: ["professor-reviews", id],
  enabled: Boolean(id),
  queryFn: async () => {
    const { data, error } = await supabase.rpc("list_professor_reviews", { p_professor_id: id });
    if (error) throw error;
    return data ?? [];
  },
});