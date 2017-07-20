import { Chrome, Command, ChromelessOptions, Client } from '../types'
import * as CDP from 'chrome-remote-interface'
import LocalRuntime from './local-runtime'

export interface Props {
  chromelessOptions: ChromelessOptions
}

interface RuntimeClient {
  client: Client
  runtime: LocalRuntime
}

export default class LocalChrome implements Chrome {

  private chromelessOptions: ChromelessOptions
  private runtimeClientPromise: Promise<RuntimeClient>

  constructor(props: Props) {
    this.chromelessOptions = {
      ...props.chromelessOptions,
      viewport: {
        scale: 1,
        width: 1920,
        height: 1080,
        ...props.chromelessOptions.viewport,
      }
    }

    this.runtimeClientPromise = this.initRuntimeClient()
  }

  private async initRuntimeClient(): Promise<RuntimeClient> {
    const target = await CDP.New()
    const client = await CDP({target})

    this.setViewport(client)

    const runtime = new LocalRuntime(client, this.chromelessOptions)

    return {client, runtime}
  }

  private async setViewport(client: Client) {
    const {viewport} = this.chromelessOptions
    await client.Emulation.setDeviceMetricsOverride({
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 0,
      mobile: false,
      fitWindow: false,
      scale: viewport.scale,
    })
  }

  async process<T extends any>(command: Command): Promise<T> {
    const {runtime} = await this.runtimeClientPromise

    return await runtime.run(command) as T
  }

  async close(): Promise<void> {
    const {client} = await this.runtimeClientPromise

    if (this.chromelessOptions.closeTab) {
      CDP.Close({id: client.target.id})
    }

    await client.close()
  }

}