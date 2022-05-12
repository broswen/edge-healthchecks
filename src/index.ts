export { Account } from './Account'
export { Healthcheck } from './Healthcheck'

function missing(message: string): Response {
    return new Response(message, {status: 404})
}

function json(object: any, status = 200): Response {
    return new Response(JSON.stringify(object), {status})
}

export type RouteHandler = (request: Request, env: Env, matches: RegExpMatchArray, ctx?: ExecutionContext) => Promise<any>

export interface Route {
    pattern: RegExp
    methods: string[]
    handler: RouteHandler
}

export class Router {
    routes: Route[]
    constructor() {
        this.routes = []
    }

    get(pattern: RegExp, handler: RouteHandler) {
        this.routes.push({
            pattern,
            methods: ['GET'],
            handler
        })
    }

    post(pattern: RegExp, handler: RouteHandler) {
        this.routes.push({
            pattern,
            methods: ['POST'],
            handler
        })
    }

    put(pattern: RegExp, handler: RouteHandler) {
        this.routes.push({
            pattern,
            methods: ['PUT'],
            handler
        })
    }

    delete(pattern: RegExp, handler: RouteHandler) {
        this.routes.push({
            pattern,
            methods: ['DELETE'],
            handler
        })
    }

    all(pattern: RegExp, handler: RouteHandler) {
        this.routes.push({
            pattern,
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            handler
        })
    }

    handle = async (request: Request, env: Env, ctx?: ExecutionContext) => {
        const url = new URL(request.url)
        for (const route of this.routes) {
           const matches = url.pathname.match(route.pattern)
           if (route.methods.includes(request.method) && matches) {
               return route.handler(request, env, matches, ctx)
           }
        }
        return missing('no route found')
    }
}

const router = new Router()


router.post(/^\/account\/?$/, async (request: Request, env: Env, matches: RegExpMatchArray) => {
    const id = env.ACCOUNT.newUniqueId()
    await env.ACCOUNTS.put(id.toString(), JSON.stringify([]))
    return json({id: id.toString()})
})

router.get(/^\/account\/(\w+)\/?$/, async (request: Request, env: Env, matches: RegExpMatchArray) => {
    const accountId = await getAccount(matches[1], env.ACCOUNTS)
    if (!accountId) {
        return missing('not found')
    }
    const id = env.ACCOUNT.idFromString(accountId)
    const obj = env.ACCOUNT.get(id)
    return obj.fetch(request)
})

router.post(/^\/account\/(\w+)\/healthcheck\/?$/, async (request: Request, env: Env, matches: RegExpMatchArray) => {
    const accountId = await getAccount(matches[1], env.ACCOUNTS)
    if (!accountId) {
        return missing('not found')
    }
    const id = env.ACCOUNT.idFromString(accountId)
    const obj = env.ACCOUNT.get(id)
    return obj.fetch(request)
})


router.put(/^\/account\/(\w+)\/healthcheck\/?$/, async (request: Request, env: Env, matches: RegExpMatchArray) => {
    const accountId = await getAccount(matches[1], env.ACCOUNTS)
    if (!accountId) {
        return missing('not found')
    }
    const id = env.ACCOUNT.idFromString(accountId)
    const obj = env.ACCOUNT.get(id)
    return obj.fetch(request)
})

router.get(/^\/account\/(\w+)\/healthcheck\/(\w+)\/?$/, async (request: Request, env: Env, matches: RegExpMatchArray) => {
    const accountId = await getAccount(matches[1], env.ACCOUNTS)
    if (!accountId) {
        return missing('not found')
    }
    const id = env.ACCOUNT.idFromString(accountId)
    const obj = env.ACCOUNT.get(id)
    return obj.fetch(request)
})


router.put(/^\/account\/(\w+)\/healthcheck\/(\w+)\/?$/, async (request: Request, env: Env, matches: RegExpMatchArray) => {
    const accountId = await getAccount(matches[1], env.ACCOUNTS)
    if (!accountId) {
        return missing('not found')
    }
    const id = env.ACCOUNT.idFromString(accountId)
    const obj = env.ACCOUNT.get(id)
    return obj.fetch(request)
})

router.delete(/^\/account\/(\w+)\/healthcheck\/(\w+)\/?$/, async (request: Request, env: Env, matches: RegExpMatchArray) => {
    const accountId = await getAccount(matches[1], env.ACCOUNTS)
    if (!accountId) {
        return missing('not found')
    }
    const id = env.ACCOUNT.idFromString(accountId)
    const obj = env.ACCOUNT.get(id)
    return obj.fetch(request)
})

export default {
    fetch: router.handle
}

async function getAccountKeys(id: string, namespace: KVNamespace): Promise<string[] | null> {
  return await namespace.get<string[]>(id, 'json')
}

async function getAccount(id: string, namespace: KVNamespace): Promise<string | null> {
    return await namespace.get<string[]>(id, 'json') === null ? null : id
}

export interface Env {
  ACCOUNT: DurableObjectNamespace
  ACCOUNTS: KVNamespace
  HEALTHCHECK: DurableObjectNamespace
}
