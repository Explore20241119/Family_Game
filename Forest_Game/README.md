# Forest Study Trail

A small iPad-friendly browser game for family use. The child moves through forest paths, collects stars, and avoids silly forest goblins.

## Run locally

Because this is a static website, you can open `index.html` directly in a browser for a quick look.

For a local web server, you can also run:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Publish on GitHub Pages

1. Create a new GitHub repository.
2. Put these files in the repository root.
3. Commit and push your code.
4. In GitHub, open `Settings` -> `Pages`.
5. Under `Build and deployment`, choose:
   - `Source`: `Deploy from a branch`
   - `Branch`: `main`
   - `Folder`: `/ (root)`
6. Save.
7. Wait about one minute and GitHub will give you a website address.

After that, open the URL on the iPad in Safari and use `Add to Home Screen` if you want it to feel more like an app.

## Easy things to change with children

- In `index.html`, change the game title and story text.
- In `style.css`, change colors.
- In `game.js`, change:
  - round time
  - player speed
  - number of stars
  - enemy speed
  - bonus stars from study time
