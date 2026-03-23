import packageJson from "../../package.json";

export function Footer() {
  const version = packageJson.version;
  const year = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 py-3 px-4 text-center text-xs text-gray-500 dark:text-gray-400">
      <span>Fleet Dashboard v{version}</span>
      <span className="mx-2" aria-hidden="true">
        ·
      </span>
      <span>© {year}</span>
    </footer>
  );
}
