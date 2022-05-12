import {Env} from "./index";

export const MAX_HISTORY = 10

export interface HealthcheckResult {
  accountId: string
  id: string
  health: 'healthy' | 'unhealthy'
  reason: string
  code: number
  latency: number
  timestamp: number
}

export interface HealthcheckConfig {
  accountId: string
  url: string
  enabled: boolean
  period: number
}

const DEFAULT_CONFIG: HealthcheckConfig = {
  accountId: '',
  url: '',
  enabled: false,
  period: 60
}

export interface CreateHealthcheckRequest {
  accountId: string
  url: string
  enabled: boolean
  period: number
}

export class Healthcheck {
  state: DurableObjectState
  env: Env
  config: HealthcheckConfig  = DEFAULT_CONFIG
  history: HealthcheckResult[] = []
  constructor(state: DurableObjectState, env: Env) {
    this.state = state
    this.env = env
    this.state.blockConcurrencyWhile(async () => {
      this.config = await this.state.storage?.get<HealthcheckConfig>('config') ?? DEFAULT_CONFIG
      this.history = await this.state.storage?.get<HealthcheckResult[]>('history') ?? []
    })
}

  async fetch(request: Request) {
    const url = new URL(request.url)
    if (request.method === 'POST' || request.method === 'PUT') {
      const body = await request.json<CreateHealthcheckRequest>()
      this.config.accountId = body.accountId
      this.config.url = body.url
      this.config.enabled = body.enabled
      this.config.period = body.period
      this.state.storage?.put('config', this.config)

      if (this.config.enabled) {
        console.log(`alarm set for: ${this.config.url}`)
        this.state.storage?.setAlarm(Date.now() + (this.config.period * 1000))
      } else {
        console.log(`alarm deleted for: ${this.config.url}`)
        this.state.storage?.deleteAlarm()
      }

      return new Response(JSON.stringify({id: this.state.id.toString()}))
    } else if (request.method === 'GET') {
      // return details with status history
      return new Response(JSON.stringify({
        ...this.config,
        history: this.history
      }), {
        headers: {
          'Content-Type': 'application/json'
        }
      })
    } else if (request.method === 'DELETE') {
      this.state.storage?.deleteAll()
      this.state.storage?.deleteAlarm()
      return new Response(JSON.stringify({id: this.state.id.toString()}))
    }
    return new Response('not allowed', {status: 405})
  }

  async alarm() {
    try {
      console.log({
        message: 'alarm trigger',
        id: this.state.id.toString(),
        timestamp: Date.now(),
      })
      const result = await this.checkHealth()
      this.history.push(result)
      if (this.history.length > MAX_HISTORY) {
        this.history.shift()
      }
      this.state.storage?.put('history', this.history)

      try {
        const id = this.env.ACCOUNT.idFromString(this.config.accountId)
        const obj = this.env.ACCOUNT.get(id)

        await obj.fetch('https://edge-healthchecks.com/_update', {method: 'POST', body: JSON.stringify(result)})

      } catch (e) {
        console.log(e)
      }

      this.state.storage?.setAlarm(Date.now() + this.config.period * 1000)
    } catch (e) {
      console.log(e)
    }

  }

  async checkHealth(): Promise<HealthcheckResult> {
    const result: HealthcheckResult = {
      health: 'unhealthy',
      id: this.state.id.toString(),
      accountId: this.config.accountId,
      latency: -1,
      code: 0,
      reason: '',
      timestamp: Date.now()
    }

    try {
      const resp = await fetch(this.config.url)
      result.code = resp.status
      result.health = resp.ok ? 'healthy' : 'unhealthy'
      result.reason = resp.statusText
    } catch (e) {
      result.reason = 'exception'
      console.log(e)
    }

    return result
  }
}
