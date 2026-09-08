export type Project = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  link: string;
  repo: string;
  year: string;
};

export type Profile = {
  name: string;
  title: string;
  about: string;
  location: string;
  email: string;
  phone: string;
  telegram: string;
  github: string;
  website: string;
};

export type Portfolio = {
  profile: Profile;
  skills: string[];
  projects: Project[];
};

/** Простая валидация структуры перед сохранением из админки. */
export function isPortfolio(v: unknown): v is Portfolio {
  if (typeof v !== "object" || v === null) return false;
  const d = v as Portfolio;
  if (typeof d.profile !== "object" || d.profile === null) return false;
  const p = d.profile as Record<string, unknown>;
  const strFields = ["name", "title", "about", "location", "email", "phone", "telegram", "github", "website"];
  if (!strFields.every((f) => typeof p[f] === "string")) return false;
  if (!Array.isArray(d.skills) || !d.skills.every((s) => typeof s === "string")) return false;
  if (!Array.isArray(d.projects)) return false;
  return d.projects.every(
    (pr) =>
      typeof pr === "object" &&
      pr !== null &&
      typeof (pr as Project).id === "string" &&
      typeof (pr as Project).title === "string" &&
      typeof (pr as Project).description === "string" &&
      Array.isArray((pr as Project).tags) &&
      typeof (pr as Project).link === "string" &&
      typeof (pr as Project).repo === "string" &&
      typeof (pr as Project).year === "string"
  );
}
