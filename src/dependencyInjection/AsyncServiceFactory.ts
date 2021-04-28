import { DIContext } from "./DIContext"
import { DIService } from "./DIService"
import { ProcessStatusInfo } from "./StatusUpdateEvent"

export class AsyncServiceFactory<T extends DIService.ServiceDefinition> {

    public run(context: DIContext, setStatus: (status: ProcessStatusInfo) => void) {
        const reporter = new AsyncServiceFactory.StatusReporter<T>(context, setStatus)
        const promise = this.callback(context, reporter)
        if (promise) {
            promise.then(result => {
                reporter.done(result)
            }, error => {
                reporter.error(error)
                throw error
            })
        }
    }

    constructor(
        protected callback: (context: DIContext, reporter: AsyncServiceFactory.StatusReporter<T>) => void | Promise<DIService.GetServiceDefinitionService<T>>
    ) {

    }
}

export namespace AsyncServiceFactory {
    export class StatusReporter<T extends DIService.ServiceDefinition> {

        public progress(message: string, progress: number | null = null) {
            this.setStatus({
                type: "progress",
                message, progress
            })
        }

        public done(instance: DIService.GetServiceDefinitionService<T>) {
            this.setStatus({
                type: "done",
                instance
            })
        }

        public error(error: Error) {
            this.setStatus({
                type: "error",
                error
            })
        }

        constructor(
            protected readonly context: DIContext,
            protected readonly setStatus: (status: ProcessStatusInfo) => void
        ) { }
    }
}