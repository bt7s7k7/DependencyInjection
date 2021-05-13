import { EventEmitter } from "../../eventLib/EventEmitter"
import { DIService } from "../DIService"
import { IDProvider } from "./IDProvider"

export class MessageBridge extends DIService.define<{
    sendMessage(message: MessageBridge.Message): Promise<void>
}>() {
    public onMessage = new EventEmitter<MessageBridge.Message>()
    public onRequest = new EventEmitter<MessageBridge.RequestHandle>()

    public sendRequest(type: string, data: any) {
        return new Promise<any>((resolve, reject) => {
            const id = this.context.inject(IDProvider).getID()
            const pendingRequest: MessageBridge.PendingRequest = { resolve, reject }

            this.pendingRequests[id] = pendingRequest
            this.sendMessage({
                data, type, id,
                direction: "request"
            })
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
                            // eslint-disable-next-line no-console
                            console.error(error)
                            if (error.message) error = error.message

                            this.sendMessage({
                                direction: "response",
                                id: msg.id,
                                data: null,
                                error
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
                        request.reject(new Error("Server Error: " + msg.error))
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

    export type Message = Request | Response

    export class Dummy extends MessageBridge {
        public async sendMessage(message: Message) {
            this.onMessage.emit(JSON.parse(JSON.stringify(message)))
        }
    }
}