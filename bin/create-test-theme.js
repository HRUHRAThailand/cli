#! /usr/bin/env node

import * as readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { createRequire } from "module"
import { fileURLToPath } from "url"
import { execa } from "execa"
import path from "path"
import os from "os"
import fs from "fs"

const require = createRequire(import.meta.url)
const { program } = require("commander")

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const homeDir = os.homedir()
const today = new Date().toISOString().split("T")[0]

const installationTypes = os.platform() == "darwin" ? ["homebrew", "local", "npm"] : ["local", "npm"]

program
  .description("Creates a test theme.")
  .option(
    "-i, --install <type>",
    `installation type: ${installationTypes.join(", ")}`,
    "local"
  )
  .requiredOption(
    "-s, --store <store>",
    `your dev store's name (e.g. my-awesome-dev-store)`
  )
  .option(
    "--name <name>",
    "name of your theme. It will be placed on your Desktop",
    `nightly-theme-${today}`
  )
  .option(
    "--cleanup",
    "delete temp theme and nightly dependencies afterwards",
    false
  )
  .action(async (options) => {
    // helpers
    const log = (message) => {
      console.log(`\r\n🧪 ${message}`)
    }

    // main
    let shopifyExec
    let defaultOpts = { stdio: "inherit" }

    const themeName = options.name
    const themePath = path.join(homeDir, "Desktop", themeName)

    delete process.env.GEM_HOME
    delete process.env.GEM_PATH

    switch (options.install) {
      case "homebrew":
        log("Updating homebrew...")
        await execa("brew", ["update"], defaultOpts)
        log("Installing latest shopify-cli nightly via homebrew...")
        await execa("brew", ["install", "shopify-cli-nightly"], defaultOpts)
        shopifyExec = (args, path = themePath) => {
          const pathOpts = path ? { cwd: path } : {}
          return execa("shopify-nightly", args, { ...pathOpts, ...defaultOpts })
        }
        break
      case "local":
        log("Building latest release...")
        await execa("pnpm", ["nx", "build", "cli"])
        const devPath = path.resolve(__dirname, "..", "packages", "cli", "bin", "dev.js")
        shopifyExec = (args, path = themePath) => {
          const pathArgs = path ? ["--path", path] : []
          return execa("node", [devPath, ...args, ...pathArgs], defaultOpts)
        }
        break
      case "npm":
        try {
          const { stdout } = await execa(os.platform() == "win32" ? "where.exe" : "which", ["shopify"])
          if (stdout !== "") {
            log(
              `Found existing global shopify: ${stdout}. Please uninstall and try again.`
            )
            process.exit(1)
          }
        } catch (error) {}

        log("Installing @shopify/cli@nightly via npm...")
        await execa(
          "npm",
          ["install", "-g", "@shopify/cli@nightly"],
          defaultOpts
        )
        shopifyExec = (args, path = themePath) => {
          const pathOpts = path ? { cwd: path } : {}
          return execa("shopify", args, { ...pathOpts, ...defaultOpts })
        }
        break
      default:
        log(`Invalid installation type: ${options.install}. Must be one of ${installationTypes.join(", ")}.`)
        process.exit(1)
    }

    if (fs.existsSync(themePath)) {
      const rl = readline.createInterface({ input, output })
      const answer = await rl.question(`\r\n🙋‍♀️ I've found a theme in ${themePath}. Should I remove it and keep going? (Y/n)`);
      rl.close();

      if (answer.toLowerCase() === 'y' || answer === '') {
        log(`Removing theme in '${themePath}'...`)
        fs.rmSync(themePath, { recursive: true })
      } else {
        process.exit(0)
      }
    }

    log(`Creating new theme '${themeName}'...`)
    await shopifyExec(
      ["theme", "init", themeName],
      path.join(homeDir, "Desktop")
    )

    log(`Checking your theme...`)
    await shopifyExec(["theme", "check", "--fail-level", "crash"])

    log(`Packaging your theme...`)
    await shopifyExec(["theme", "package"])

    log(`Serving your theme on store ${options.store}...`)
    const devProcess = shopifyExec(["theme", "dev", "--store", options.store])
    process.on("SIGINT", function () {
      devProcess.cancel()
    })
    try {
      await devProcess
    } catch (error) {
      if (!error.isCanceled) throw error
    }

    log(`Pushing your theme to your dev store...`)
    await shopifyExec(["theme", "push"])

    log(`Listing all your themes...`)
    await shopifyExec(["theme", "list"], false)

    if (options.cleanup) {
      switch (options.install) {
        case "homebrew":
          log("Uninstalling shopify-cli-nightly via homebrew...")
          await execa("brew", ["uninstall", "shopify-cli-nightly"], defaultOpts)
          break
        case "local":
          // nothing to do here
          break
        case "npm":
          log("Uninstalling @shopify/cli via npm...")
          await execa(
            "npm",
            ["uninstall", "-g", "@shopify/cli"],
            defaultOpts
          )
          break
        default:
          throw new Error(
            `Did not handle cleanup for this installation type: ${options.install}`
          )
      }

      log(`Removing theme in '${themePath}'...`)
      fs.rmSync(themePath, { recursive: true })
    }

    log("All done! 🎉")
  })

// run it
program.parse()
