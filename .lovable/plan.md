# Disconnect the old projects from the shared Supabase backend

Your live StoryMaster app shares one Supabase backend with older copies of the project. The goal is to leave only this project connected, so nothing else can overwrite its settings.

## What I found

Four older copies exist under your account, all created from the same original prompt:

- [Storymaster123](/projects/1ad775cd-4a89-4d4c-be30-13ed11da8622)
- [storymaster123](/projects/9f53e10f-c713-425a-84ff-901a9d969a68)
- [storymaster123-46640](/projects/fb1dd13d-400a-45cd-b23c-b849015213c0)
- [storymaster123-53352](/projects/b95879f0-35ed-44dd-aa2f-c732c11e9d41)

The warning named two of them as sharing this backend.

## Important limitation

I can only act inside this project. Disconnecting a backend from another project has to be done from inside that project — I cannot reach into it, and there is no tool that does it remotely. So this is a short set of steps you do, and I can help verify the result afterwards.

## Steps for you

For each old project listed above:

1. Open the project.
2. Go to its settings and find the Supabase/backend connection.
3. Disconnect it. This only unlinks that copy — it does not delete the database, your users, or any stories.
4. If you are sure the copy is dead, delete the project entirely; that removes the risk permanently.

Do NOT disconnect this project — it is the one serving storymaster.app.

## What I do afterwards

Once you have disconnected them, tell me and I will:

1. Confirm this project still reaches the database (run a read against your live tables).
2. Confirm your deployed functions are still present and responding.
3. Confirm the shared-instance warning is gone.

## Safety notes

- Disconnecting is reversible and does not touch data.
- No code changes in this project are needed.
- Deleting an old copy is the only irreversible step; skip it if you are unsure.
