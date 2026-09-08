import type { Metadata } from "next";
import { getPortfolio } from "@/lib/storage";
import ProjectCard from "@/components/ProjectCard";

export const metadata: Metadata = { title: "Проекты" };
export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const { projects } = await getPortfolio();

  return (
    <section className="relative mx-auto w-full max-w-6xl flex-1 px-6 py-16">
      <div className="glow right-[-80px] top-[-60px] h-72 w-72 bg-indigo-500" />
      <h1 className="relative text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
        Мои <span className="gradient-text">проекты</span>
      </h1>
      <p className="relative mt-4 max-w-2xl text-lg text-zinc-400">
        Сайты, которыми я горжусь. Нажмите «Посмотреть сайт», чтобы открыть живой пример.
      </p>
      <div className="relative mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p, i) => (
          <div key={p.id} className="reveal" style={{ transitionDelay: `${i * 80}ms` }}>
            <ProjectCard {...p} />
          </div>
        ))}
      </div>
    </section>
  );
}
