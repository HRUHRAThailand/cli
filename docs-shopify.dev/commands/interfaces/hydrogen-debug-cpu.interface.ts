// This is an autogenerated file. Don't edit this file manually.
export interface hydrogendebugcpu {
  /**
   * Entry file for the worker. Defaults to `./server`.
   * @environment SHOPIFY_HYDROGEN_FLAG_ENTRY
   */
  '--entry <value>'?: string

  /**
   * Specify a path to generate the profile file. Defaults to "startup.cpuprofile".
   *
   */
  '--output <value>'?: string

  /**
   * The path to the directory of the Hydrogen storefront. Defaults to the current directory where the command is run.
   * @environment SHOPIFY_HYDROGEN_FLAG_PATH
   */
  '--path <value>'?: string
}
