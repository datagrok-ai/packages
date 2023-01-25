// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Datagrok',
  tagline: 'Datagrok: Swiss Army Knife for Data',
  url: 'https://datagrok.ai',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'throw',
  favicon: 'favicon/favicon.ico',
  staticDirectories: ['static'],

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  plugins: [
    [
      'docusaurus-plugin-typedoc',
      {
        entryPoints: ['../js-api/dg.ts', '../js-api/ui.ts', '../js-api/grok.ts'],
        tsconfig: '../js-api/tsconfig.json',
        readme: '../help/develop/js-api.md',
        out: '../../js-api/docs',
        plugin: ['typedoc-plugin-replace-text'],
        replaceText: {
          replacements: [
              {
                  "pattern": "\\(\\.\\.\\/(?!help)(.*)\\.md(#.*)?\\)",
                  "replace": "(https://datagrok.ai/help/$1$2)"
              },
              {
                  "pattern": "\\(\\./(?!help)(.*)\\.md(#.*)?\\)",
                  "replace": "(https://datagrok.ai/help/develop/$1$2)"
              },
              {
                  "pattern": "\\(\\.\\.\\/(?!help)(.*)\\.(png|gif|jpg|jpeg)",
                  "flags": "gi",
                  "replace": "(../../help/$1.$2"
              },
              {
                  "pattern": "\\(\\./(?!help)(.*)\\.(png|gif|jpg|jpeg)",
                  "flags": "gi",
                  "replace": "(../../help/develop/$1.$2"
              },
          ]
        }
      },
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'api',
        path: '../js-api/docs',
        routeBasePath: '/js-api',
      }
    ],
  ],
  themes: ['docusaurus-theme-search-typesense'],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/datagrok-ai/public/tree/master/help',
          path: '../help',
          routeBasePath: 'help',
          exclude: ['**/_*/**', '_*/**', '**/_*', '**/*-test.md'],
        },
      }),
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'Datagrok',
      logo: {
        alt: 'Datagrok',
        src: 'img/logo.svg',
        href: 'https://datagrok.ai', // Default to `siteConfig.baseUrl`.
      },
      items: [
        {
          type: 'doc',
          docId: 'home',
          position: 'left',
          label: 'Help',
        },
        {
          to: 'js-api',
          label: 'API',
          position: 'left',
        },
        {
          href: 'https://public.datagrok.ai',
          label: 'Launch',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          label: 'Help',
          to: '/help/home',
        },
        {
          label: 'API Docs',
          to: '/js-api',
        },
        {
          label: 'Community',
          to: 'https://community.datagrok.ai',
        },
        {
          label: 'Contact Us',
          to: 'mailto:info@datagrok.ai',
        }
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Datagrok, Inc.`,
    },
    prism: {
      theme: lightCodeTheme,
      darkTheme: darkCodeTheme,
    },
    typesense: {
      typesenseCollectionName: 'Datagrok',
      typesenseServerConfig: {
        nodes: [
          {
            host: 'typesense.datagrok.ai',
            port: 443,
            protocol: 'https',
          }
        ],
        apiKey: '3LbGdYhCmSueDct7u9AQDv3Ga9Z2u4HA',
      },

      // Optional: Typesense search parameters: https://typesense.org/docs/0.21.0/api/search.md#search-parameters
      typesenseSearchParameters: {},

      // Optional
      contextualSearch: true,
    }
  }
};

module.exports = config;
