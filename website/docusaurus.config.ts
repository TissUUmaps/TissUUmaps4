import type * as Preset from "@docusaurus/preset-classic";
import type { Config } from "@docusaurus/types";
import { themes as prismThemes } from "prism-react-renderer";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

function injectTypeDocSidebar(items) {
  return items.map((item) => {
    if (item.link?.id === "api/index") {
      return {
        ...item,
        items: require("./docs/api/typedoc-sidebar.cjs"),
      };
    }
    return item;
  });
}

const config: Config = {
  title: "TissUUmaps",
  tagline: "spatial omics visualization made simple",
  favicon: "img/favicon.ico",

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: "https://tissuumaps.github.io",
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: process.env.DOCUSAURUS_BASE_URL ?? "/",

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: "TissUUmaps", // Usually your GitHub org/user name.
  projectName: "TissUUmaps4", // Usually your repo name.

  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          editUrl: "https://github.com/TissUUmaps/TissUUmaps4/tree/main/docs/",
          // https://www.typedoc-plugin-markdown.org/plugins/docusaurus/guides/sidebar
          async sidebarItemsGenerator({
            defaultSidebarItemsGenerator,
            ...args
          }) {
            return injectTypeDocSidebar(
              await defaultSidebarItemsGenerator(args),
            );
          },
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    navbar: {
      title: "TissUUmaps",
      logo: {
        alt: "TissUUmaps Logo",
        src: "img/logo.svg",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "docsSidebar",
          label: "Documentation",
          position: "left",
        },
        {
          href: "https://github.com/TissUUmaps/TissUUmaps4",
          label: "GitHub",
          position: "right",
        },
        {
          href: "https://tissuumaps.github.io/TissUUmaps4/live",
          label: "Live",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "TissUUmaps",
          items: [
            {
              label: "Documentation",
              to: "/docs/intro",
            },
          ],
        },
        {
          title: "Community",
          items: [
            {
              label: "SciLifeLab BioImage Informatics Unit",
              href: "https://www.scilifelab.se/units/bioimage-informatics/",
            },
          ],
        },
        {
          title: "More",
          items: [
            {
              label: "GitHub",
              href: "https://github.com/TissUUmaps/TissUUmaps4",
            },
            {
              href: "https://tissuumaps.github.io/TissUUmaps4/live",
              label: "Live",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} TissUUmaps Team. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
  plugins: [
    [
      "docusaurus-plugin-typedoc",
      {
        name: "API",
        tsconfig: "../tsconfig.json",
        entryPoints: ["../src"],
        entryPointStrategy: "expand",
        exclude: ["../src/main.tsx", "../src/vite-env.d.ts", "**/*.test.*"],
        router: "module",
        readme: "none",
        pageTitleTemplates: {
          module: (args: { name: string }) => args.name.split("/").pop(),
        },
      },
    ],
  ],
};

export default config;
