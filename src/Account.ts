import {Env, Router} from "./index";
import {CreateHealthcheckRequest, HealthcheckConfig, HealthcheckResult} from "./Healthcheck";



export class Account {
  state: DurableObjectState
  env: Env
  healthchecks: {
    [key: string]: HealthcheckConfig
  } = {}
  updates: {
    [key: string]: HealthcheckResult
  } = {}
  router: Router = new Router()
  constructor(state: DurableObjectState, env: Env) {
    this.state = state
    this.env = env

    this.state.blockConcurrencyWhile(async () => {
      this.healthchecks = await this.state.storage?.get('healthchecks') ?? {}
      this.updates = await this.state.storage?.get('updates') ?? {}
    })

    this.router.get(/^\/account\/(\w+)\/?$/, async (request: Request, env: Env, matches: RegExpMatchArray) => {
      return new Response(JSON.stringify({
        healthchecks: this.healthchecks,
        updates: this.updates
      }), {
        headers: {
          'Content-Type': 'application/json'
        }
      })
    })

    this.router.post(/^\/account\/(\w+)\/healthcheck\/?$/, async (request: Request, env: Env, matches: RegExpMatchArray) => {
      const body = await request.json<CreateHealthcheckRequest>()
      body.accountId = this.state.id.toString()
      //TODO validate request
      const id = this.env.HEALTHCHECK.newUniqueId()
      const obj = this.env.HEALTHCHECK.get(id)
      this.healthchecks[id.toString()] = body
      this.state.storage?.put('healthchecks', this.healthchecks)
      return obj.fetch(new Request(request.url, {method: 'POST', body: JSON.stringify(body)}))
    })

    this.router.get(/^\/account\/(\w+)\/healthcheck\/(\w+)\/?$/, async (request: Request, env: Env, matches: RegExpMatchArray) => {
      if (!(matches[2] in this.healthchecks)) {
        return new Response('not found', {status: 404})
      }
      const id = this.env.HEALTHCHECK.idFromString(matches[2])
      const obj = this.env.HEALTHCHECK.get(id)
      const resp = obj.fetch(request)
      return resp
    })

    this.router.put(/^\/account\/(\w+)\/healthcheck\/(\w+)\/?$/, async (request: Request, env: Env, matches: RegExpMatchArray) => {
      if (!(matches[2] in this.healthchecks)) {
        return new Response('not found', {status: 404})
      }
      const body = await request.json<CreateHealthcheckRequest>()
      //TODO: validate request
      body.accountId = this.state.id.toString()
      const id = this.env.HEALTHCHECK.idFromString(matches[2])
      const obj = this.env.HEALTHCHECK.get(id)
      this.healthchecks[id.toString()] = body
      this.state.storage?.put('healthchecks', this.healthchecks)
      const resp = obj.fetch(new Request(request.url, {method: 'PUT', body: JSON.stringify(body)}))
      return resp
    })

    this.router.post(/^\/_update\/?$/, async (request: Request, env: Env, matches: RegExpMatchArray) => {
      const body = await request.json<HealthcheckResult>()
      this.updates[body.id] = body
      this.state.storage?.put('updates', this.updates)
      return new Response('ok')
    })

    this.router.delete(/^\/account\/(\w+)\/healthcheck\/(\w+)\/?$/, async (request: Request, env: Env, matches: RegExpMatchArray) => {
      const id = this.env.HEALTHCHECK.idFromString(matches[2])
      const obj = this.env.HEALTHCHECK.get(id)
      const resp = await obj.fetch(request)
      if (resp.ok) {
        delete this.healthchecks[matches[2]]
        delete this.updates[matches[2]]
      }
      this.state.storage?.put('healthchecks', this.healthchecks)
      this.state.storage?.put('updates', this.updates)
      return resp
    })
  }

  fetch(request: Request) {
    return this.router.handle(request, this.env)
  }
}
