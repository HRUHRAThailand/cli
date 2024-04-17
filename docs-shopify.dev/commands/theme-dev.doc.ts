// This is an autogenerated file. Don't edit this file manually.
import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs'

const data: ReferenceEntityTemplateSchema = {
  name: 'theme dev',
  description: `
  Uploads the current theme as the specified theme, or a [development theme](https://shopify.dev/docs/themes/tools/cli#development-themes), to a store so you can preview it.

This command returns the following information:

- A link to your development theme at http://127.0.0.1:9292. This URL can hot reload local changes to CSS and sections, or refresh the entire page when a file changes, enabling you to preview changes in real time using the store's data.

  You can specify a different network interface and port using \`--host\` and \`--port\`.

- A link to the [editor](https://shopify.dev/docs/themes/tools/online-editor) for the theme in the Shopify admin.

- A [preview link](https://help.shopify.com/manual/online-store/themes/adding-themes?shpxid=cee12a89-AA22-4AD3-38C8-91C8FC0E1FB0#share-a-theme-preview-with-others) that you can share with other developers.

If you already have a development theme for your current environment, then this command replaces the development theme with your local theme. You can override this using the \`--theme-editor-sync\` flag.

> Note: You can't preview checkout customizations using http://127.0.0.1:9292.

Development themes are deleted when you run \`shopify auth logout\`. If you need a preview link that can be used after you log out, then you should [share](https://shopify.dev/docs/api/shopify-cli/theme/theme-share) your theme or [push](https://shopify.dev/docs/api/shopify-cli/theme/theme-push) to an unpublished theme on your store.

You can run this command only in a directory that matches the [default Shopify theme folder structure](https://shopify.dev/docs/themes/tools/cli#directory-structure).`,
  overviewPreviewDescription: `Uploads the current theme as a development theme to the connected store, then prints theme editor and preview URLs to your terminal. While running, changes will push to the store in real time.`,
  type: 'command',
  isVisualComponent: false,
  defaultExample: {
    codeblock: {
      tabs: [
        {
          title: 'theme dev',
          code: './examples/theme-dev.example.sh',
          language: 'bash',
        },
      ],
      title: 'theme dev',
    },
  },
  definitions: [
  {
    title: 'Flags',
    description: 'The following flags are available for the `theme dev` command:',
    type: 'themedev',
  },
  ],
  category: 'theme',
  related: [
  ],
}

export default data