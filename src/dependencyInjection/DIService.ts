import { EventListener } from "../eventLib/EventListener"
import { DIContext } from "./DIContext"

export class DIService extends EventListener {
    public context: DIContext

    constructor() {
        super()
        this.context = DIContext.current
    }
}

export namespace DIService {
    export function define<T>() {
        return DIService as unknown as { new(): T & DIService }
    }

    export type CtorServiceDefinition = abstract new (...args: any) => any
    export type FactoryServiceDefinition = { make(...args: any[]): any } | { (...args: any[]): any }

    export type ServiceDefinition = CtorServiceDefinition | FactoryServiceDefinition
    export type GetServiceDefinitionService<T extends ServiceDefinition> =
        T extends abstract new (...args: any) => infer U ? U
        : T extends { make(...args: any[]): infer U } ? U
        : T extends { (...args: any[]): infer U } ? U
        : never
}