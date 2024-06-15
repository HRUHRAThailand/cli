import {writeAppLogsToFile} from './write-app-logs.js'
import {useConcurrentOutputContext} from '@shopify/cli-kit/node/ui/components'
import {partnersFqdn} from '@shopify/cli-kit/node/context/fqdn'
import {fetch} from '@shopify/cli-kit/node/http'
import {outputContent, outputDebug, outputToken, outputWarn} from '@shopify/cli-kit/node/output'
import {Writable} from 'stream'

const POLLING_INTERVAL_MS = 450
const POLLING_ERROR_RETRY_INTERVAL_MS = 5 * 1000
const POLLING_THROTTLE_RETRY_INTERVAL_MS = 60 * 1000
const ONE_MILLION = 1000000
const LOG_TYPE_FUNCTION_RUN = 'function_run'

const generateFetchAppLogUrl = async (cursor?: string) => {
  const fqdn = await partnersFqdn()
  const url = `https://${fqdn}/app_logs/poll`
  return url + (cursor ? `?cursor=${cursor}` : '')
}

export interface AppLogData {
  shop_id: number
  api_client_id: number
  payload: string
  log_type: string
  source: string
  source_namespace: string
  cursor: string
  status: 'success' | 'failure'
  log_timestamp: string
}

export const pollAppLogs = async ({
  stdout,
  appLogsFetchInput: {jwtToken, cursor},
  apiKey,
  resubscribeCallback,
}: {
  stdout: Writable
  appLogsFetchInput: {jwtToken: string; cursor?: string}
  apiKey: string
  resubscribeCallback: () => Promise<void>
}) => {
  try {
    const url = await generateFetchAppLogUrl(cursor)
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${jwtToken}`,
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        await resubscribeCallback()
      } else if (response.status === 429) {
        outputWarn(`Request throttled while polling app logs.`)
        outputWarn(`Retrying in ${POLLING_THROTTLE_RETRY_INTERVAL_MS / 1000} seconds.`)
        setTimeout(() => {
          pollAppLogs({
            stdout,
            appLogsFetchInput: {
              jwtToken,
              cursor: undefined,
            },
            apiKey,
            resubscribeCallback,
          }).catch((error) => {
            outputDebug(`Unexpected error during polling: ${error}}\n`)
          })
        }, POLLING_THROTTLE_RETRY_INTERVAL_MS)
      } else {
        throw new Error(`Unhandled bad response: ${response.status}`)
      }
      return
    }

    const data = (await response.json()) as {
      app_logs?: AppLogData[]
      cursor?: string
      errors?: string[]
    }

    if (data.app_logs) {
      const {app_logs: appLogs} = data

      for (const log of appLogs) {
        const payload = JSON.parse(log.payload)

        // eslint-disable-next-line no-await-in-loop
        await useConcurrentOutputContext({outputPrefix: log.source, stripAnsi: false}, async () => {
          if (log.log_type === LOG_TYPE_FUNCTION_RUN) {
            const fuel = (payload.fuel_consumed / ONE_MILLION).toFixed(4)

            if (log.status === 'success') {
              stdout.write(`Function executed successfully using ${fuel}M instructions.`)
            } else if (log.status === 'failure') {
              stdout.write(`❌ Function failed to execute with error: ${payload.error_type}`)
            }

            const logs = payload.logs
            if (logs.length > 0) {
              stdout.write(
                logs
                  .split('\n')
                  .filter(Boolean)
                  .map((line: string) => outputContent`${outputToken.gray('│ ')}${line}`.value)
                  .join('\n'),
              )
            }
          } else {
            stdout.write(JSON.stringify(payload))
          }

          const logPath = await writeAppLogsToFile({
            appLog: log,
            apiKey,
            stdout,
          })
          stdout.write(
            outputContent`${outputToken.gray('└ ')}${outputToken.link(
              'Open log file',
              `file://${logPath}`,
              `Log: ${logPath}`,
            )}\n`.value,
          )
        })
      }
    }

    const cursorFromResponse = data?.cursor

    setTimeout(() => {
      pollAppLogs({
        stdout,
        appLogsFetchInput: {
          jwtToken,
          cursor: cursorFromResponse,
        },
        apiKey,
        resubscribeCallback,
      }).catch((error) => {
        outputDebug(`Unexpected error during polling: ${error}}\n`)
      })
    }, POLLING_INTERVAL_MS)
    // eslint-disable-next-line no-catch-all/no-catch-all
  } catch (error) {
    outputWarn(`Error while polling app logs.`)
    outputWarn(`Retrying in ${POLLING_ERROR_RETRY_INTERVAL_MS / 1000} seconds.`)
    outputDebug(`${error}}\n`)

    setTimeout(() => {
      pollAppLogs({
        stdout,
        appLogsFetchInput: {
          jwtToken,
          cursor: undefined,
        },
        apiKey,
        resubscribeCallback,
      }).catch((error) => {
        outputDebug(`Unexpected error during polling: ${error}}\n`)
      })
    }, POLLING_ERROR_RETRY_INTERVAL_MS)
  }
}
