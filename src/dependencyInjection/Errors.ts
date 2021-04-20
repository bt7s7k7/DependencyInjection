export class NoContextError extends Error {
    constructor() {
        super("No context provided")
    }
}

export class DependencyNotProvidedError extends Error {
    constructor(
        public readonly serviceName: string
    ) {
        super(`Cannot find service "${serviceName}" depended upon`)
    }
}

export class ServiceInstanceExistsError extends Error {
    constructor(
        public readonly serviceName: string
    ) {
        super(`Tried to instantiate a service "${serviceName}" but an instance of the service exists already`)
    }
}