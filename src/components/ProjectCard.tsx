import type { Project } from "@/lib/portfolio";

export default function ProjectCard({ title, description, tags, link, repo, year }: Project) {
  return (
    <article className="card group flex h-full flex-col p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-xl font-semibold text-white transition-colors group-hover:text-indigo-300">
          {title}
        </h3>
        <span className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">
          {year}
        </span>
      </div>
      <p className="mb-4 leading-relaxed text-zinc-400">{description}</p>
      <div className="mb-5 flex flex-wrap gap-2">
        {tags.map((t) => (
          <span
            key={t}
            className="rounded-md bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-300"
          >
            {t}
          </span>
        ))}
      </div>
      <div className="mt-auto flex gap-4 text-sm font-medium">
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-lime-300 underline-offset-4 transition-all hover:-translate-y-0.5 hover:text-lime-200 hover:underline"
          >
            Посмотреть сайт →
          </a>
        ) : null}
        {repo ? (
          <a
            href={repo}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 underline-offset-4 transition-all hover:-translate-y-0.5 hover:text-zinc-200 hover:underline"
          >
            Код на GitHub →
          </a>
        ) : null}
      </div>
    </article>
  );
}
