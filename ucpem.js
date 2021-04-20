/// <reference path="./.vscode/config.d.ts" />

const { project, github } = require("ucpem")

project.prefix("src").res("dependencyInjection")

project.prefix("test").use(github("bt7s7k7/TestUtil").res("testUtil"))