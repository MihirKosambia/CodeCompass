import repoIcon from "@/assets/icons/repo.svg";

export default function RepoSelect({ repos, selected, onChange }) {
  return (
    <section className="panel p-3">
      <div className="mb-2 flex items-center gap-2 font-pixel text-sm md:text-base">
        <img src={repoIcon} alt="" className="h-4 w-4" />
        Repositories
      </div>
      {!repos || repos.length === 0 ? (
        <div className="text-xs text-black/60">No repositories yet. Add one above.</div>
      ) : (
        <>
          <label htmlFor="repo-select" className="sr-only">
            Select repository
          </label>
          <select
            id="repo-select"
            className="input w-full truncate text-xs"
            value={selected}
            onChange={(e) => onChange(e.target.value)}
            aria-label="Select repository"
            title={selected}
          >
            {repos.map((r) => (
              <option className="bg-white" key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </>
      )}
    </section>
  );
}
