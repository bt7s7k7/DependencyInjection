import { AUTO_DISPOSE } from "../eventLib/Disposable"
import { EventEmitter } from "../eventLib/EventEmitter"
import { EventListener } from "../eventLib/EventListener"
import { DIService } from "./DIService"

type ContextInfo = { id: number, ids: Set<number> }
type EventRoutingInfo = ContextInfo & { direction: EventBus.Direction } | { global: true }

class EventWrapper {
    constructor(
        public readonly event: EventBus.EventInstance,
        public readonly routing: EventRoutingInfo
    ) { }
}

const EVENT_INSTANCE_TAG = Symbol("eventInstanceTag")
const GET_EVENT_BUS_EMITTER = Symbol("getEventBusEmitter")

export class EventBus extends DIService {
    public emit(event: EventBus.EventInstance, routing: EventRoutingInfo) {
        const wrapper = new EventWrapper(event, routing)

        this.emitter.emit(wrapper)
    }

    public [GET_EVENT_BUS_EMITTER]() {
        return this.emitter
    }

    protected readonly emitter = new EventEmitter<EventWrapper>()
}

export namespace EventBus {
    export type EventInstance = {
        [EVENT_INSTANCE_TAG]: true
    }

    export type MakeEventInstance<T> = EventInstance & T

    export type Direction = "up" | "down"

    export function defineEvent<T>() {
        return class Event {
            public [EVENT_INSTANCE_TAG] = true
            constructor(options: any) { Object.assign(this, options) }
        } as unknown as { new(options: T): T & EventInstance }
    }

    export class EventBusListener<T extends EventBus.EventInstance> extends EventListener {
        public onEvent = new EventEmitter<T>()

        protected [AUTO_DISPOSE] = true

        constructor(
            type: { new(...args: any[]): T },
            info: ContextInfo,
            eventBus: EventBus
        ) {
            super()

            eventBus[GET_EVENT_BUS_EMITTER]().add(this, wrapper => {
                if (EVENT_INSTANCE_TAG in wrapper.event && wrapper.event instanceof type) {
                    if ("global" in wrapper.routing) {
                        this.onEvent.emit(wrapper.event)
                    } else {
                        const routing = wrapper.routing

                        if (routing.direction == "up") {
                            if (routing.ids.has(info.id)) {
                                this.onEvent.emit(wrapper.event)
                            }
                        } else {
                            if (info.ids.has(routing.id)) {
                                this.onEvent.emit(wrapper.event)
                            }
                        }
                    }
                }
            })
        }
    }
}
