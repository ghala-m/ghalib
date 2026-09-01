import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MessageSquarePlus, SendHorizonal, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { askAdvisor } from "@/lib/advisor.functions";
import { chatMessagesQuery, chatSessionsQuery, coursesQuery, profileQuery, upcomingItemsQuery, type ChatSession } from "@/lib/queries";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

function relativeDay(iso: string, lang: "ar" | "en") {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return lang === "ar" ? "اليوم" : "Today";
  if (days === 1) return lang === "ar" ? "أمس" : "Yesterday";
  return new Intl.DateTimeFormat(lang === "ar" ? "ar" : "en", { month: "short", day: "numeric", calendar: "gregory" }).format(d);
}

export function AdvisorChat() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const ask = useServerFn(askAdvisor);
  const [input, setInput] = useState("");
  // Deliberately never restored from storage — landing on the advisor page always starts a
  // fresh conversation, while past ones stay one click away in the sidebar.
  const [sessionId, setSessionId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const { data: sessions = [] } = useQuery(chatSessionsQuery());
  const { data: messages = [] } = useQuery(chatMessagesQuery(sessionId));
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

      let activeSessionId = sessionId;
      if (!activeSessionId) {
        const title = text.length > 48 ? `${text.slice(0, 48)}…` : text;
        const { data, error } = await supabase.from("chat_sessions").insert({ user_id: user.id, title }).select("id").single();
        if (error) throw error;
        activeSessionId = data.id;
        setSessionId(activeSessionId);
      }

      await supabase.from("chat_messages").insert({ user_id: user.id, session_id: activeSessionId, role: "user", content: text });
      await qc.invalidateQueries({ queryKey: ["chat", activeSessionId] });

      const res = (await ask({
        data: {
          message: text,
          lang,
          context: buildContext(),
          history: messages.slice(-10).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
        },
      })) as { text: string };

      await supabase.from("chat_messages").insert({ user_id: user.id, session_id: activeSessionId, role: "assistant", content: res.text });
      await supabase.from("chat_sessions").update({ updated_at: new Date().toISOString() }).eq("id", activeSessionId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat", sessionId] });
      qc.invalidateQueries({ queryKey: ["chat-sessions"] });
    },
    onError: (e: Error) => {
      if (e.message.includes("Missing LOVABLE_API_KEY")) toast.error(t("aiKeyMissing"));
      else if (e.message.includes("RATE_LIMIT")) toast.error(t("aiRateLimit"));
      else if (e.message.includes("NO_CREDITS")) toast.error(t("aiCredits"));
      else toast.error(t("aiChatFailed"));
    },
  });

  const deleteSession = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chat_sessions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["chat-sessions"] });
      if (id === sessionId) setSessionId(null);
    },
  });

  function submit(text: string) {
    const value = text.trim();
    if (!value || send.isPending) return;
    setInput("");
    send.mutate(value);
  }

  return (
    <div className="panel-glass flex h-[calc(100vh-9rem)] overflow-hidden">
      {/* Session sidebar */}
      <div className="flex w-64 shrink-0 flex-col border-e border-border">
        <div className="p-3">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => {
              setSessionId(null);
              setInput("");
            }}
          >
            <MessageSquarePlus className="size-4" />
            {t("newChat")}
          </Button>
        </div>
        <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
          {sessions.length === 0 && <p className="px-2 py-4 text-center text-xs text-muted-foreground">{t("noChatsYet")}</p>}
          {sessions.map((s: ChatSession) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSessionId(s.id)}
              className={cn(
                "group flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-start text-sm transition-colors",
                s.id === sessionId ? "bg-accent/15 text-foreground" : "text-muted-foreground hover:bg-muted/60",
              )}
            >
              <span className="min-w-0 flex-1 truncate">{s.title || t("untitledChat")}</span>
              <span className="shrink-0 text-[10px] text-muted-foreground">{relativeDay(s.updated_at, lang)}</span>
              <span
                role="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSession.mutate(s.id);
                }}
                className="shrink-0 rounded p-0.5 opacity-0 hover:bg-destructive/15 hover:text-destructive group-hover:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Active conversation */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <Sparkles className="size-4 text-accent" />
          <div className="min-w-0">
            <h2 className="truncate font-semibold">
              {sessionId ? sessions.find((s) => s.id === sessionId)?.title || t("advisorTitle") : t("advisorTitle")}
            </h2>
            <p className="truncate text-xs text-muted-foreground">{t("advisorHint")}</p>
          </div>
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
    </div>
  );
}
