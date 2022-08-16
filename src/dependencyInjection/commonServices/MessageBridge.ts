import { DISPOSE } from "../../eventLib/Disposable"
import { EventEmitter } from "../../eventLib/EventEmitter"
import { DIService } from "../DIService"
import { IDProvider } from "./IDProvider"

export class MessageBridgeDisposedError extends Error {
    constructor() {
        super("Request canceled because MessageBridge was disposed")
        this.name = "MessageBridgeDisposedError"
    }
}

export class MessageBridge extends DIService.define<{
    sendMessage(message: MessageBridge.Message): Promise<void>
}>() {
    public onMessage = new EventEmitter<MessageBridge.Message>()
    public onRequest = new EventEmitter<MessageBridge.RequestHandle>()
    public obfuscateHandlerErrors = true
    protected idProvider = this.context.tryInject(IDProvider) ?? new IDProvider.Incremental()

    public [DISPOSE]() {
        const error = new MessageBridgeDisposedError()
        for (const pending of Object.values(this.pendingRequests)) {
            pending.reject(error)
        }

        super[DISPOSE]()
    }

    public sendRequest(type: string, data: any) {
        return new Promise<any>((resolve, reject) => {
            try {
                const id = this.idProvider.getID()
                const pendingRequest: MessageBridge.PendingRequest = { resolve, reject }

                this.pendingRequests[id] = pendingRequest
                this.sendMessage({
                    data, type, id,
                    direction: "request"
                }).catch(e => reject(e))
            } catch (err) {
                reject(err)
            }
        })
    }

    constructor() {
        super()

        this.onMessage.add(this, msg => {
            if (msg.direction == "request") {
                const handle: MessageBridge.RequestHandle = {
                    type: msg.type,
                    handled: false,
                    handle: (handler) => {
                        if (handle.handled) throw new Error("Request handled already")
                        handle.handled = true

                        handler(msg.data).then(response => {
                            this.sendMessage({
                                direction: "response",
                                id: msg.id,
                                data: response,
                                error: null
                            })
                        }, error => {
                            const isClientError = typeof error == "object" && error._isClientError
                            if (!isClientError) {
                                // eslint-disable-next-line no-console
                                console.error(error)
                            }

                            const message = isClientError || this.obfuscateHandlerErrors == false ? error.message
                                : "Internal server error"

                            this.sendMessage({
                                direction: "response",
                                id: msg.id,
                                data: null,
                                error: message
                            })
                        })
                    }
                }

                this.onRequest.emit(handle)

                if (!handle.handled) {
                    const error = new Error(`Request of type ${JSON.stringify(msg.type)} not supported`)
                    // eslint-disable-next-line no-console
                    console.error(error)
                    this.sendMessage({
                        direction: "response",
                        id: msg.id,
                        data: null,
                        error: error.message
                    })
                }
            } else if (msg.direction == "response") {
                if (msg.id in this.pendingRequests) {
                    const request = this.pendingRequests[msg.id]
                    delete this.pendingRequests[msg.id]

                    if (msg.error) {
                        request.reject(new MessageBridge.ServerError("Server Error: " + msg.error))
                    } else {
                        request.resolve(msg.data)
                    }
                }
            }
        })
    }

    protected pendingRequests: Record<string, MessageBridge.PendingRequest> = {}
}

export namespace MessageBridge {
    export interface Request {
        direction: "request"
        type: string
        id: string
        data: any
    }

    export interface Response {
        direction: "response"
        id: string
        data: any
        error: string | null
    }

    export interface RequestHandle {
        type: string
        handled: boolean
        handle(handler: (data: any) => Promise<any>): void
    }

    export interface PendingRequest {
        resolve: (data: any) => void
        reject: (error: any) => void
    }

    export type Message = Request | Response | { direction: null } & Record<string, any>

    export class Dummy extends MessageBridge {
        public async sendMessage(message: Message) {
            if (this.logger) this.logger(message)
            this.onMessage.emit(JSON.parse(JSON.stringify(message)))
        }

        constructor(
            protected readonly logger?: (msg: MessageBridge.Message) => void
        ) {
            super()
        }
    }

    type GenericBus = {
        postMessage(msg: Message): void,
        addEventListener(event: "message", listener: (event: { data: Message }) => void): void
    } | {
        send(msg: Message): void,
        on(event: "message", handler: (msg: Message) => void): void
    } | {
        send(msg: Message): void,
        onMessage: EventEmitter<Message>
    }

    export class Generic extends MessageBridge {
        public async sendMessage(message: Message) {
            if ("send" in this.bus) this.bus.send(message)
            else if ("postMessage" in this.bus) this.bus.postMessage(message)
        }

        constructor(
            public readonly bus: GenericBus
        ) {
            super()

            if ("on" in bus) {
                bus.on("message", msg => this.onMessage.emit(msg))
            } else if ("addEventListener" in bus) {
                bus.addEventListener("message", event => this.onMessage.emit(event.data))
            } else if ("onMessage" in bus) {
                bus.onMessage.add(this, msg => this.onMessage.emit(msg))
            }

        }
    }

    export class ClientError extends Error {
        public readonly _isClientError = true
    }

    export class ServerError extends Error {
        public name = "ServerError"
    }
}