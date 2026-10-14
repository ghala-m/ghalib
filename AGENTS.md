<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep briefing save/reset scoped to its profile fields and derive its saved summary from persisted locations, so unrelated account data remains untouched and the summary survives reloads.
- Keep expanded study-file parsing in a browser-only study adapter, leaving syllabus and major-sheet acceptance unchanged; uploaded HTML and source code are extracted as inert text, never executed.
- Share study availability validation and prompt construction between study tools and course plans so dates, quantity and time budgets follow the same rules.
- Render study text with a shared safe Markdown document and prepare PDF blobs before download/share clicks to preserve mobile user activation.
- Store the selected university's stable official name in the existing profile field and resolve its academic system through the university catalog; all catalog entries currently use the existing system.
