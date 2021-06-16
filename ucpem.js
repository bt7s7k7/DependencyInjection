/// <reference path="./.vscode/config.d.ts" />

const { project, github } = require("ucpem")

const src = project.prefix("src")
const dependencyInjection = src.res("dependencyInjection",
    github("bt7s7k7/EventLib").res("eventLib")
)
src.res("dependencyInjectionVue",
    dependencyInjection
)


project.prefix("test").use(github("bt7s7k7/TestUtil").res("testUtil"))