// Runs before paint so a dark-mode user never sees a white flash. Kept as a
// raw string because it must execute ahead of hydration.
const SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    var mode = stored === "light" || stored === "dark" ? stored
      : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", mode);
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "light");
  }
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
