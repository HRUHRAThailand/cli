import {errorHandler, registerCleanBugsnagErrorsFromWithinPlugins} from './error-handler.js'
import {isDevelopment} from '../environment/local.js'
import {addPublic} from '../metadata.js'
import {hashString} from '../string.js'
import {Command, Interfaces} from '@oclif/core'

abstract class BaseCommand extends Command {
  public static analyticsNameOverride(): string | undefined {
    return undefined
  }

  async catch(error: Error & {exitCode?: number | undefined}) {
    await errorHandler(error, this.config)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected async init(): Promise<any> {
    if (!isDevelopment()) {
      // This function runs just prior to `run`
      await registerCleanBugsnagErrorsFromWithinPlugins(this.config)
    }
    return super.init()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected async parse<TFlags extends {path?: string; verbose?: boolean}, TArgs extends {[name: string]: any}>(
    options?: Interfaces.Input<TFlags> | undefined,
    argv?: string[] | undefined,
  ): Promise<Interfaces.ParserOutput<TFlags, TArgs>> {
    const result = await super.parse<TFlags, TArgs>(options, argv)
    await addFromParsedFlags(result.flags)
    return result
  }
}

export default BaseCommand

export async function addFromParsedFlags(flags: {
  path?: string
  verbose?: boolean
  reset?: boolean
  'skip-dependencies-installation'?: boolean
}) {
  await addPublic(() => ({
    cmd_all_verbose: flags.verbose,
    cmd_all_path_override: flags.path !== undefined,
    cmd_all_path_override_hash: flags.path === undefined ? undefined : hashString(flags.path),
    cmd_app_dependency_installation_skipped: flags['skip-dependencies-installation'],
    cmd_app_reset_used: flags.reset,
  }))
}
