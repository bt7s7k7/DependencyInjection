import { DIService } from "./DIService"

export namespace DICompat {
    export class ServiceDisposer extends DIService.define<{
        disposeService(service: any): void
    }>() { }
}