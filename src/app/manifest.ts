import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DevShelf — полка работ разработчиков и креаторов",
    short_name: "DevShelf",
    description:
      "Портфолио из подтверждённых работ: процесс, команда, стек и результат.",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
