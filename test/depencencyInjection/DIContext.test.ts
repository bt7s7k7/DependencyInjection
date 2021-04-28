import { expect } from "chai"
import { DIContext } from "../../src/dependencyInjection/DIContext"
import { DIService } from "../../src/dependencyInjection/DIService"
import { EventBus } from "../../src/dependencyInjection/EventBus"
import { Disposable, DISPOSE } from "../../src/eventLib/Disposable"
import { describeMember } from "../testUtil/describeMember"
import { tracker } from "../testUtil/tracker"

function createService(context: DIContext) {
    class Service extends DIService.define<{
        trigger(): void
    }>() { }

    const serviceTracker = tracker("serviceTracker")

    class ServiceImpl extends Service {
        public trigger() {
            serviceTracker.trigger()
            expect(this.context).to.equal(context)
        }
    }

    return { Service, ServiceImpl, serviceTracker }
}

describeMember(() => DIContext, () => {
    it("Should be able to instantiate and provide a context", () => {
        const context = new DIContext()
        const factory = () => {
            return { context: DIContext.current }
        }

        const res = context.instantiate(() => factory())

        expect(res.context).to.equal(context)
    })

    it("Should be able to instantiate a service", () => {
        const context = new DIContext()

        const { Service, ServiceImpl, serviceTracker } = createService(context)

        context.provide(Service, () => new ServiceImpl())

        const service = context.inject(Service)
        service.trigger()

        serviceTracker.check()
    })

    it("Should be able to inherit service impl from parent", () => {
        const parent = new DIContext()

        const { Service, ServiceImpl, serviceTracker } = createService(parent)

        parent.provide(Service, () => new ServiceImpl())

        const child = new DIContext(parent)

        const service = child.inject(Service)
        service.trigger()

        serviceTracker.check()
    })

    it("Should throw when service not be provided", () => {
        const context = new DIContext()

        const { Service } = createService(context)

        expect(() => {
            context.inject(Service)
        }).to.throw(`Cannot find service "Service" depended upon`)
    })

    it("Should dispose services", () => {
        const context = new DIContext()

        const disposeTracker = tracker("disposeTracker")

        class Service extends Disposable {
            public [DISPOSE]() {
                super[DISPOSE]()
                disposeTracker.trigger()
            }
        }

        context.provide(Service, () => new Service())

        context.dispose()
        disposeTracker.check()
    })

    it("Should be able to emit events in both directions", () => {
        class EventType extends EventBus.defineEvent<{}>() { }

        const top = new DIContext()
        const middle = new DIContext(top)
        const bottom = new DIContext(middle)

        const topListener = top.listen(EventType)
        const middleListener = middle.listen(EventType)
        const bottomListener = bottom.listen(EventType)

        const topTracker = tracker("topTracker")
        const middleTracker = tracker("middleTracker")
        const bottomTracker = tracker("bottomTracker")

        topListener.onEvent.add(null, () => {
            topTracker.trigger()
        })

        middleListener.onEvent.add(null, () => {
            middleTracker.trigger()
        })

        bottomListener.onEvent.add(null, () => {
            bottomTracker.trigger()
        })

        top.emit(new EventType({}), "down")
        topTracker.check(1)
        middleTracker.check(1)
        bottomTracker.check(1)

        middle.emit(new EventType({}), "down")
        topTracker.check(1)
        middleTracker.check(2)
        bottomTracker.check(2)

        bottom.emit(new EventType({}), "down")
        topTracker.check(1)
        middleTracker.check(2)
        bottomTracker.check(3)

        top.emit(new EventType({}), "up")
        topTracker.check(2)
        middleTracker.check(2)
        bottomTracker.check(3)

        middle.emit(new EventType({}), "up")
        topTracker.check(3)
        middleTracker.check(3)
        bottomTracker.check(3)

        bottom.emit(new EventType({}), "up")
        topTracker.check(4)
        middleTracker.check(4)
        bottomTracker.check(4)
    })
})