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

- Resolve report assignments through `dashboard-data`: prefer named dashboards, falling back to the signed-in user's profile link only when none exist, to preserve original account assignments without duplicating reports.
- Authorize administrators through `has_role` backed by `user_roles`; report links never determine privileges.
