<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- Ultralytics inference runs only in the `predict` server function (`src/lib/predict.functions.ts`), reading `ULTRALYTICS_API_KEY` / `ULTRALYTICS_ENDPOINT` from env — keeps credentials out of the browser bundle.
- Response mapping lives in `src/lib/predictions.ts` (`parsePredictions`) with tests beside it — one place to adapt if the API shape changes.
- Uploaded images are never persisted (no storage bucket or table) — the app promises users it does not store them.
- AI explanations run only in `explainDetections` (`src/lib/explain.functions.ts`) via `@lovable.dev/ai-gateway`, with prompt, input schema and output schema in `src/lib/explain.ts` — the no-identification rules live in one tested place.
- The image sent for AI explanation is a downscaled JPEG with numbered boxes only (no class names drawn) — limits payload size and avoids nudging the model toward identities.
