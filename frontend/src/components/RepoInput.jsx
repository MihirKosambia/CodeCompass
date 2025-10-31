import plusIcon from "@/assets/icons/plus.svg";

export default function RepoInput({ value, onChange, onAdd, disabled }) {
  return (
    <section className="panel p-3">
      <div className="mb-2 flex items-center gap-2 font-pixel text-sm md:text-base">
        <img src={plusIcon} alt="" className="h-4 w-4" />
        Add Repository
      </div>
      <div className="space-y-2">
        <label htmlFor="repo-url" className="sr-only">
          GitHub repository URL
        </label>
        <input
          id="repo-url"
          type="url"
          className="input w-full"
          placeholder="https://github.com/owner/repo"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-label="GitHub repository URL"
          autoComplete="off"
          inputMode="url"
        />
        <button
          className="btn flex w-full items-center justify-center gap-2"
          onClick={onAdd}
          disabled={disabled}
          aria-label="Add repository"
        >
          <img src={plusIcon} alt="" className="h-4 w-4" />
          <span className="text-sm">Add Repository</span>
        </button>
      </div>
    </section>
  );
}
