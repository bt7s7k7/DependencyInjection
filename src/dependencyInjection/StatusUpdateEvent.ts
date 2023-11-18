import { DIService } from "./DIService"
import { EventBus } from "./EventBus"

interface ProcessStatusInfoBase {
    type: string
}

interface ProcessNotStartedInfo extends ProcessStatusInfoBase {
    type: "notStarted"
}

interface ProcessProgressInfo extends ProcessStatusInfoBase {
    type: "progress"
    message: string
    progress: number | null
}

interface ProcessErrorInfo extends ProcessStatusInfoBase {
    type: "error"
    error: Error
}

interface ProcessFinishedInfo<T> extends ProcessStatusInfoBase {
    type: "done"
    instance: T
}

export type ProcessStatusInfo<T = any> = ProcessProgressInfo | ProcessErrorInfo | ProcessFinishedInfo<T> | ProcessNotStartedInfo

export interface IStatusUpdateEvent<T> {
    status: ProcessStatusInfo<T>
}

function makeEventType<T extends DIService.ServiceDefinition>(type: T): EventBus.EventType<IStatusUpdateEvent<DIService.GetServiceDefinitionService<T>>> {
    return class StatusUpdateEvent extends EventBus.defineEvent<IStatusUpdateEvent<DIService.GetServiceDefinitionService<T>>>() { }
}

const eventTypeStore = new Map<any, any>()

export namespace StatusUpdateEvent {
    export function get<T extends DIService.ServiceDefinition>(type: T) {
        const exists = eventTypeStore.has(type)
        const eventType = exists ? (eventTypeStore.get(type) as never) : makeEventType(type)
        if (!exists) eventTypeStore.set(type, eventType)
        return eventType
    }
}
