import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, SendHorizonal, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { askAdvisor } from "@/lib/advisor.functions";
import { chatMessagesQuery, coursesQuery, profileQuery, upcomingItemsQuery } from "@/lib/queries";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function AdvisorChat() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const ask = useServerFn(askAdvisor);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useQuery(chatMessagesQuery());
  const { data: courses = [] } = useQuery(coursesQuery());
  const { data: profile } = useQuery(profileQuery(user?.id));
  const { data: upcoming = [] } = useQuery(upcomingItemsQuery());

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function buildContext() {
    const lines = [
      profile?.major ? `Major: ${profile.major}` : "",
      profile?.current_term ? `Current term: ${profile.current_term}` : "",
      profile?.overall_gpa ? `Overall GPA: ${profile.overall_gpa}` : "",
      "Courses:",
      ...courses
        .slice(0, 60)
        .map(
          (c) =>
            `- ${c.code ?? ""} ${c.name} | ${c.status} | ${c.category} | credits: ${c.credits ?? "?"} | grade: ${c.final_grade ?? "-"} | prereqs: ${c.prerequisites.join(", ") || "-"}`,
        ),
      "Upcoming deadlines:",
      ...upcoming.slice(0, 20).map((i) => `- ${i.due_date ?? "?"} ${i.title} (${i.courses?.name ?? ""})`),
    ];
    return lines.filter(Boolean).join("\n");
  }

  const send = useMutation({
    mutationFn: async (text: string) => {
      if (!user) throw new Error("no user");
      await supabase.from("chat_messages").insert({ user_id: user.id, role: "user", content: text });
      await qc.invalidateQueries({ queryKey: ["chat"] });
      const res = (await ask({
        data: {
          message: text,
          lang,
          context: buildContext(),
          history: messages.slice(-10).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
        },
      })) as { text: string };
      await supabase.from("chat_messages").insert({ user_id: user.id, role: "assistant", content: res.text });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat"] }),
    onError: (e: Error) => {
      if (e.message.includes("RATE_LIMIT")) toast.error(t("aiRateLimit"));
      else if (e.message.includes("NO_CREDITS")) toast.error(t("aiCredits"));
      else toast.error(t("aiFailed"));
    },
  });

  const clear = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await supabase.from("chat_messages").delete().eq("user_id", user.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat"] }),
  });

  function submit(text: string) {
    const value = text.trim();
    if (!value || send.isPending) return;
    setInput("");
    send.mutate(value);
  }

  return (
    <div className="panel-glass flex h-[calc(100vh-9rem)] flex-col">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <Sparkles className="size-4 text-accent" />
        <div className="min-w-0">
          <h2 className="font-semibold">{t("advisorTitle")}</h2>
          <p className="truncate text-xs text-muted-foreground">{t("advisorHint")}</p>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="icon" className="ms-auto" onClick={() => clear.mutate()} title={t("clearChat")}>
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 && (
          <div className="grid gap-2 sm:grid-cols-3">
            {(["suggestion1", "suggestion2", "suggestion3"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => submit(t(s))}
                className="rounded-xl border border-border bg-card/60 p-3 text-start text-sm transition-colors hover:border-accent"
              >
                {t(s)}
              </button>
            ))}
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap",
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
              )}
            >
              {m.content}
            </div>
          </div>
        ))}

        {send.isPending && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {t("thinking")}
          </p>
        )}
        <div ref={endRef} />
      </div>

      <div className="flex items-end gap-2 border-t border-border p-4">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(input);
            }
          }}
          rows={2}
          placeholder={t("askPlaceholder")}
          className="min-h-11 resize-none"
        />
        <Button onClick={() => submit(input)} disabled={send.isPending || !input.trim()} size="icon" className="size-11 shrink-0">
          <SendHorizonal className="size-4" />
        </Button>
      </div>
    </div>
  );
}
