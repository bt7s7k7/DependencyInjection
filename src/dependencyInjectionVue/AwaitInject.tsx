import { defineComponent, PropType } from "vue"
import { DIService } from "../dependencyInjection/DIService"
import { useContext } from "./hooks"

export const AwaitInject = (defineComponent({
    name: "AwaitInject",
    props: {
        def: {
            type: null as unknown as PropType<DIService.ServiceDefinition>,
            required: true
        }
    },
    setup(props, ctx) {
        const context = useContext()

        const state = context.tryInject(props.def)

        return () => (
            <>
                {ctx.slots[state.value ? "default" : "pending"]?.()}
            </>
        )
    }
}))