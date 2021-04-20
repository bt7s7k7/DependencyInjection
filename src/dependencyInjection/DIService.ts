import { DIContext } from "./DIContext"

export class DIService {
    public context: DIContext

    constructor() {
        this.context = DIContext.current
    }
}

export namespace DIService {
    export function define<T>() {
        return DIService as unknown as { new(): T & DIService }
    }

    export type CtorServiceDefinition = { new(...args: any[]): any }
    export type FactoryServiceDefinition = { make(...args: any[]): any }

    export type ServiceDefinition = CtorServiceDefinition | FactoryServiceDefinition
    export type GetServiceDefinitionService<T extends ServiceDefinition> =
        T extends { new(...args: any[]): infer U } ? U
        : T extends { make(...args: any[]): infer U } ? U
        : never
}