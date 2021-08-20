import { Disposable, DISPOSE } from "../eventLib/Disposable"
import { AsyncServiceFactory } from "./AsyncServiceFactory"
import { DIService } from "./DIService"
import { DependencyNotProvidedError, NoContextError, ServiceInstanceExistsError } from "./Errors"
import { EventBus } from "./EventBus"
import { IStatusUpdateEvent, ProcessStatusInfo, StatusUpdateEvent } from "./StatusUpdateEvent"

let currContext: DIContext[] = []
let idNext = 0

function getDefName(def: DIService.ServiceDefinition) {
    if ("name" in def) {
        return def.name
    } else {
        return "<unnamed>"
    }
}

type ProcessStatusReport<T> = ProcessStatusInfo<T> & {
    listen(): EventBus.EventBusListener<EventBus.MakeEventInstance<IStatusUpdateEvent<T>>>
    whenFinished(): Promise<T>
}

export class DIContext extends Disposable {
    public inject<T extends DIService.ServiceDefinition>(def: T) {
        const service = this.tryInject(def)

        if (service) return service
        else throw new DependencyNotProvidedError(getDefName(def))
    }

    public tryInject<T extends DIService.ServiceDefinition>(def: T) {
        const result = this.lookup(def)

        if (result) return result as DIService.GetServiceDefinitionService<T>
        else return null
    }


    public provide<T extends DIService.ServiceDefinition, F extends () => DIService.GetServiceDefinitionService<T>>(def: T, factory: F): ReturnType<F>
    public provide<T extends DIService.ServiceDefinition>(def: T, mode: "default"): DIService.GetServiceDefinitionService<T>
    public provide<T extends DIService.ServiceDefinition, F extends () => DIService.GetServiceDefinitionService<T>>(def: T, factory: F | "default") {
        if (this.definitions.has(def)) throw new ServiceInstanceExistsError(getDefName(def))

        const service = factory == "default" ? (() => {
            const ctor = def as any
            if ("make" in ctor) return this.instantiate(() => ctor.make())
            if (typeof ctor == "function") return this.instantiate(() => new ctor())
        })() : this.instantiate(factory)
        this.definitions.set(def, service)

        return service as ReturnType<F>
    }

    public provideAsync<T extends DIService.ServiceDefinition>(def: T, factory: AsyncServiceFactory<T>) {
        factory.run(this, v => this.setStatus(def, v))
    }

    public instantiate<T>(factory: () => T) {
        try {
            currContext.push(this)
            const ret = factory()
            return ret
        } finally {
            currContext.pop()
        }
    }

    public [DISPOSE]() {
        super[DISPOSE]()

        for (const service of this.definitions.values() as IterableIterator<any>) {
            if (DISPOSE in service) service[DISPOSE]()
        }
    }

    public listen<T extends EventBus.EventInstance>(type: { new(...args: any[]): T }) {
        return new EventBus.EventBusListener<T>(type, { id: this.id, ids: this.ids }, this.eventBus)
    }

    public emit<T extends EventBus.EventInstance>(event: T, direction: EventBus.Direction = "down") {
        this.eventBus.emit(event, { direction, id: this.id, ids: this.ids })
    }

    public getStatus<T extends DIService.ServiceDefinition>(def: T): ProcessStatusReport<DIService.GetServiceDefinitionService<T>> {
        const local = this.asyncStates.get(def)
        const info: ProcessStatusInfo<DIService.GetServiceDefinitionService<T>> = local ? local
            : this.parent ? this.parent.getStatus(def)
                : { type: "notStarted" }

        return {
            ...info, listen: () => {
                const event = StatusUpdateEvent.get(def)
                return this.listen(event)
            },
            whenFinished() {
                if (info.type == "done") return Promise.resolve(info.instance)

                return new Promise((resolve, reject) => {
                    this.listen().onEvent.add(null, (event, self) => {
                        if (event.status.type == "error") {
                            reject(event.status.error)
                            self[DISPOSE]()
                        } else if (event.status.type == "done") {
                            resolve(event.status.instance)
                            self[DISPOSE]()
                        }
                    })
                })
            }
        }
    }

    protected definitions = new Map<DIService.ServiceDefinition, unknown>()
    protected asyncStates = new Map<DIService.ServiceDefinition, ProcessStatusInfo>()
    protected readonly id = idNext++
    protected readonly ids = new Set<number>()
    protected readonly eventBus = this.parent ? this.inject(EventBus) : this.provide(EventBus, () => new EventBus())

    protected lookup(def: DIService.ServiceDefinition): unknown | null {
        const local = this.definitions.get(def)

        if (local) return local
        else if (this.parent) return this.parent.lookup(def)
        else return null
    }

    protected setStatus(def: DIService.ServiceDefinition, status: ProcessStatusInfo) {
        this.asyncStates.set(def, status)
        if (status.type == "done") {
            this.provide(def, () => status.instance)
        }

        const UpdateEvent = StatusUpdateEvent.get(def)

        this.emit(new UpdateEvent({ status }))
    }

    constructor(
        protected parent: DIContext | null = null
    ) {
        super()

        if (parent) {
            parent.ids.forEach(v => this.ids.add(v))
        }

        this.ids.add(this.id)
    }

    public static get current() {
        if (currContext.length == 0) throw new NoContextError()
        return currContext[currContext.length - 1]
    }

    public static async asyncFactoryHelper<T extends DIService.ServiceDefinition, F extends DIService.GetServiceDefinitionService<T>>(context: DIContext, definition: T, factory: () => Promise<F>) {
        const instance = await context.instantiate(factory)
        context.provide(definition, () => instance)
        return instance
    }
}

