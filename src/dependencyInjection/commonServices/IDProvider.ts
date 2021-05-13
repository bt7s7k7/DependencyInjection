import { DIService } from "../DIService"

export class IDProvider extends DIService.define<{
    getID(): string
}>() { }

export namespace IDProvider {
    export class Incremental extends IDProvider {
        public getID() {
            return (this.nextID++).toString()
        }

        protected nextID = 0
    }
}