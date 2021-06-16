import { computed, inject, InjectionKey, provide, ref, Ref } from "vue"
import { DIContext } from "../dependencyInjection/DIContext"
import { DIService } from "../dependencyInjection/DIService"

const CONTEXT_INJECTION_KEY: InjectionKey<DIContext> = Symbol("CONTEXT_INJECTION_KEY")

export interface ContextHookReturn {
    instance: Ref<DIContext>
    provide<T extends DIService.ServiceDefinition, F extends () => DIService.GetServiceDefinitionService<T>>(def: T, factory: F): Ref<ReturnType<F>>
    provide<T extends DIService.ServiceDefinition>(def: T, mode: "default"): Ref<DIService.GetServiceDefinitionService<T>>
    inject<T extends DIService.ServiceDefinition>(def: T): Ref<DIService.GetServiceDefinitionService<T>>
    tryInject<T extends DIService.ServiceDefinition>(def: T): Ref<DIService.GetServiceDefinitionService<T> | null>
    ensureCurrent(): void
}

export function useContext() {
    const parent = inject(CONTEXT_INJECTION_KEY, null)

    let current: DIContext | null = null

    const instance = ref(parent) as Ref<DIContext>

    const ensureCurrent = () => {
        if (!current) {
            current = new DIContext(parent)
            instance.value = current
            provide(CONTEXT_INJECTION_KEY, current)
        }

        return current
    }

    if (!parent) ensureCurrent()

    return {
        instance,
        ensureCurrent,
        provide(def: any, factoryOrMode: any) {
            ensureCurrent()
            const ret = computed(() => instance.value.provide(def, factoryOrMode))
            ret.value
            return ret
        },
        inject(def) {
            return computed(() => instance.value.inject(def))
        },
        tryInject(def) {
            return computed(() => instance.value.tryInject(def))
        }
    } as ContextHookReturn
}