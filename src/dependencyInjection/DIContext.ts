import { Disposable, DISPOSE } from "../eventLib/Disposable"
import { DIService } from "./DIService"
import { DependencyNotProvidedError, NoContextError, ServiceInstanceExistsError } from "./Errors"
import { EventBus } from "./EventBus"

let currContext: DIContext | null = null
let idNext = 0

function getDefName(def: DIService.ServiceDefinition) {
    if ("name" in def) {
        return def.name
    } else {
        return "<unnamed>"
    }
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

    public provide<T extends DIService.ServiceDefinition, F extends () => DIService.GetServiceDefinitionService<T>>(def: T, factory: F) {
        if (this.definitions.has(def)) throw new ServiceInstanceExistsError(getDefName(def))

        const service = this.instantiate(factory)
        this.definitions.set(def, service)

        return service as ReturnType<F>
    }

    public instantiate<T>(factory: () => T) {
        try {
            currContext = this
            const ret = factory()
            currContext = null
            return ret
        } finally {
            currContext = null
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

    protected definitions = new Map<DIService.ServiceDefinition, unknown>()
    protected readonly id = idNext++
    protected readonly ids = new Set<number>()
    protected readonly eventBus = this.parent ? this.inject(EventBus) : this.provide(EventBus, () => new EventBus())

    protected lookup(def: DIService.ServiceDefinition): unknown | null {
        const local = this.definitions.get(def)

        if (local) return local
        else if (this.parent) return this.parent.lookup(def)
        else return null
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
        if (!currContext) throw new NoContextError()
        return currContext
    }
}

