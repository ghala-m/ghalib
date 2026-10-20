import { useEffect, useMemo, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  Bot,
  CalendarClock,
  Compass,
  History,
  Lightbulb,
  X,
  Loader2,
  MessageSquare,
  MessageSquarePlus,
  SendHorizonal,
  Sparkles,
  TrendingUp,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { askAdvisor } from "@/lib/advisor.functions";
import {
  allItemsQuery,
  chatMessagesQuery,
  chatSessionsQuery,
  coursesQuery,
  profileQuery,
  streakQuery,
  termsQuery,
  upcomingItemsQuery,
  type ChatSession,
} from "@/lib/queries";
import { computeInsights, type Insight } from "@/lib/insights";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { withAiDetail } from "@/lib/ai-error-detail";

const TONE_ICON: Record<Insight["tone"], typeof Lightbulb> = {
  tip: Lightbulb,
  warning: AlertTriangle,
  good: TrendingUp,
};
const TONE_CLASS: Record<Insight["tone"], string> = {
  tip: "bg-gradient-to-br from-amber-400 to-orange-500 text-white",
  warning: "bg-gradient-to-br from-rose-500 to-red-600 text-white",
  good: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white",
};
const TONE_CARD: Record<Insight["tone"], string> = {
  tip: "border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent hover:border-amber-500/70",
  warning:
    "border-rose-500/30 bg-gradient-to-br from-rose-500/10 to-transparent hover:border-rose-500/70",
  good: "border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent hover:border-emerald-500/70",
};
const SUGGESTION_STYLE = [
  "from-sky-500 to-blue-600",
  "from-violet-500 to-fuchsia-600",
  "from-emerald-500 to-teal-600",
] as const;

function relativeDay(iso: string, lang: "ar" | "en") {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return lang === "ar" ? "اليوم" : "Today";
  if (days === 1) return lang === "ar" ? "أمس" : "Yesterday";
  return new Intl.DateTimeFormat(lang === "ar" ? "ar" : "en", {
    month: "short",
    day: "numeric",
    calendar: "gregory",
  }).format(d);
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
  const [showSessions, setShowSessions] = useState(false);

  const { data: sessions = [] } = useQuery(chatSessionsQuery());
  const { data: messages = [] } = useQuery(chatMessagesQuery(sessionId));
  const { data: courses = [] } = useQuery(coursesQuery());
  const { data: profile } = useQuery(profileQuery(user?.id));
  const { data: upcoming = [] } = useQuery(upcomingItemsQuery());
  const { data: allItems = [] } = useQuery(allItemsQuery());
  const { data: streak = [] } = useQuery(streakQuery());
  const { data: terms = [] } = useQuery(termsQuery());

  const insights = useMemo(
    () => computeInsights({ courses, items: allItems, streak, terms, profile, lang }),
    [courses, allItems, streak, terms, profile, lang],
  );

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
      ...upcoming
        .slice(0, 20)
        .map((i) => `- ${i.due_date ?? "?"} ${i.title} (${i.courses?.name ?? ""})`),
    ];
    return lines.filter(Boolean).join("\n");
  }

  const send = useMutation({
    mutationFn: async (text: string) => {
      if (!user) throw new Error("no user");

      let activeSessionId = sessionId;
      if (!activeSessionId) {
        const title = text.length > 48 ? `${text.slice(0, 48)}…` : text;
        const { data, error } = await supabase
          .from("chat_sessions")
          .insert({ user_id: user.id, title })
          .select("id")
          .single();
        if (error) throw error;
        activeSessionId = data.id;
        setSessionId(activeSessionId);
      }

      await supabase
        .from("chat_messages")
        .insert({ user_id: user.id, session_id: activeSessionId, role: "user", content: text });
      await qc.invalidateQueries({ queryKey: ["chat", activeSessionId] });

      const res = (await ask({
        data: {
          message: text,
          lang,
          context: buildContext(),
          history: messages.slice(-10).map((m) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
          })),
        },
      })) as { text: string };

      await supabase.from("chat_messages").insert({
        user_id: user.id,
        session_id: activeSessionId,
        role: "assistant",
        content: res.text,
      });
      await supabase
        .from("chat_sessions")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", activeSessionId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat", sessionId] });
      qc.invalidateQueries({ queryKey: ["chat-sessions"] });
    },
    onError: (e: Error) => {
      if (e.message.includes("Missing LOVABLE_API_KEY")) toast.error(t("aiKeyMissing"));
      else if (e.message.includes("RATE_LIMIT")) toast.error(t("aiRateLimit"));
      else if (e.message.includes("NO_CREDITS")) toast.error(t("aiCredits"));
      else toast.error(withAiDetail(t("aiChatFailed"), e));
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
    <div className="panel-glass relative flex h-[calc(100dvh-10.5rem)] min-h-[28rem] overflow-hidden md:h-[calc(100dvh-9rem)]">
      {/* Session sidebar: always visible on desktop, slide-over on phones */}
      <div
        className={cn(
          "z-20 flex w-64 shrink-0 flex-col border-e border-border bg-card md:static md:bg-muted/10",
          showSessions ? "absolute inset-y-0 start-0 shadow-2xl" : "hidden md:flex",
        )}
      >
        <div className="flex items-center gap-2 p-3">
          <Button
            className="flex-1 justify-start gap-2 bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-sm hover:opacity-90"
            onClick={() => {
              setSessionId(null);
              setInput("");
              setShowSessions(false);
            }}
          >
            <MessageSquarePlus className="size-4" />
            {t("newChat")}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setShowSessions(false)}
            aria-label="close"
          >
            <X className="size-4" />
          </Button>
        </div>
        <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
          {sessions.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-2 py-8 text-center">
              <MessageSquare className="size-6 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">{t("noChatsYet")}</p>
            </div>
          )}
          {sessions.map((s: ChatSession) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setSessionId(s.id);
                setShowSessions(false);
              }}
              className={cn(
                "group relative flex w-full items-center gap-2 rounded-xl py-2.5 ps-3 pe-2.5 text-start text-sm transition-colors",
                s.id === sessionId
                  ? "bg-accent/15 font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/60",
              )}
            >
              {s.id === sessionId ? (
                <span className="absolute inset-y-2 start-0 w-1 rounded-full bg-gradient-to-b from-amber-400 to-orange-600" />
              ) : null}
              <span className="min-w-0 flex-1 truncate">{s.title || t("untitledChat")}</span>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {relativeDay(s.updated_at, lang)}
              </span>
              <span
                role="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSession.mutate(s.id);
                }}
                className="shrink-0 rounded p-0.5 opacity-60 hover:bg-destructive/15 hover:text-destructive md:opacity-0 md:group-hover:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </span>
            </button>
          ))}
        </div>
      </div>
      {showSessions && (
        <button
          type="button"
          aria-label="close"
          className="absolute inset-0 z-10 bg-black/40 md:hidden"
          onClick={() => setShowSessions(false)}
        />
      )}

      {/* Active conversation */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-border bg-gradient-to-l from-amber-500/15 via-transparent to-transparent px-4 py-3 sm:px-5 sm:py-4">
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 md:hidden"
            onClick={() => setShowSessions(true)}
            aria-label={t("newChat")}
          >
            <History className="size-4" />
          </Button>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-md">
            <Sparkles className="size-5" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-bold">
              {sessionId
                ? sessions.find((s) => s.id === sessionId)?.title || t("advisorTitle")
                : t("advisorTitle")}
            </h2>
            <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
              <span className="size-2 shrink-0 rounded-full bg-emerald-500" />
              {t("advisorHint")}
            </p>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {messages.length === 0 && (
            <div className="space-y-5">
              <div className="chat-in rounded-3xl bg-gradient-to-br from-amber-500/15 via-card to-violet-500/10 p-5 text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-lg">
                  <Bot className="size-7" />
                </div>
                <h3 className="mt-3 font-display text-lg font-bold">{t("advisorTitle")}</h3>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  {t("advisorHint")}
                </p>
              </div>

              {insights.length > 0 ? (
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Sparkles className="size-3.5 text-amber-500" />
                    {t("advisorInsightsTitle")}
                  </p>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {insights.map((ins) => {
                      const Icon = TONE_ICON[ins.tone];
                      return (
                        <button
                          key={ins.id}
                          type="button"
                          onClick={() => submit(ins.prompt)}
                          className={cn(
                            "chat-in flex items-start gap-3 rounded-2xl border p-3.5 text-start text-sm shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
                            TONE_CARD[ins.tone],
                          )}
                        >
                          <span
                            className={cn(
                              "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl shadow-sm",
                              TONE_CLASS[ins.tone],
                            )}
                          >
                            <Icon className="size-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block font-semibold">{ins.title}</span>
                            <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                              {ins.body}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div>
                {insights.length > 0 ? (
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">
                    {t("advisorMoreQuestions")}
                  </p>
                ) : null}
                <div className="grid gap-2.5 sm:grid-cols-3">
                  {(
                    [
                      { key: "suggestion1", icon: Compass },
                      { key: "suggestion2", icon: CalendarClock },
                      { key: "suggestion3", icon: Sparkles },
                    ] as const
                  ).map(({ key, icon: Icon }, idx) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => submit(t(key))}
                      className="chat-in flex flex-col items-start gap-2.5 rounded-2xl border border-border bg-card/70 p-3.5 text-start text-sm shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-md"
                    >
                      <span
                        className={cn(
                          "flex size-8 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm",
                          SUGGESTION_STYLE[idx],
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      {t(key)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "chat-in flex items-end gap-2",
                m.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              {m.role === "assistant" ? (
                <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-sm">
                  <Bot className="size-4" />
                </div>
              ) : null}
              <div
                className={cn(
                  "max-w-[88%] rounded-3xl px-4 py-3 text-sm leading-7 shadow-sm sm:max-w-[80%]",
                  m.role === "user"
                    ? "rounded-ee-md bg-gradient-to-br from-primary to-primary/80 text-primary-foreground whitespace-pre-wrap"
                    : "chat-md rounded-es-md border border-amber-500/20 bg-card text-foreground",
                )}
              >
                {m.role === "user" ? (
                  m.content
                ) : (
                  <Markdown remarkPlugins={[remarkGfm]}>{m.content}</Markdown>
                )}
              </div>
            </div>
          ))}

          {send.isPending && (
            <div className="chat-in flex items-end gap-2">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-sm">
                <Bot className="size-4" />
              </div>
              <p className="flex items-center gap-2 rounded-3xl rounded-es-md border border-amber-500/20 bg-card px-4 py-3 text-sm text-muted-foreground">
                <span className="flex gap-1">
                  <span className="typing-dot size-2 rounded-full bg-amber-500" />
                  <span className="typing-dot size-2 rounded-full bg-orange-500 [animation-delay:.15s]" />
                  <span className="typing-dot size-2 rounded-full bg-rose-500 [animation-delay:.3s]" />
                </span>
                {t("thinking")}
              </p>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="flex items-end gap-2 border-t border-border bg-muted/10 p-3 sm:p-4">
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
            className="min-h-11 resize-none rounded-2xl bg-card"
          />
          <Button
            onClick={() => submit(input)}
            disabled={send.isPending || !input.trim()}
            size="icon"
            aria-label={t("send")}
            className="size-11 shrink-0 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-md hover:opacity-90"
          >
            {send.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <SendHorizonal className="size-4 rtl:-scale-x-100" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
