import { DICompat } from "../dependencyInjection/DICompat"
import { DISPOSE } from "../eventLib/Disposable"

export class EventLibServiceDisposer extends DICompat.ServiceDisposer {
    public disposeService(service: any) {
        if (DISPOSE in service) {
            service[DISPOSE]()
        }
    }
}