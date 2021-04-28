/// <reference path="./.vscode/config.d.ts" />

const { project, github } = require("ucpem")

const dependencyInjection = project.prefix("src").res("dependencyInjection")
project.prefix("src").res("dependencyInjectionEventLib",
    dependencyInjection,
    github("bt7s7k7/EventLib").res("eventLib")
)

project.prefix("test").use(github("bt7s7k7/TestUtil").res("testUtil"))